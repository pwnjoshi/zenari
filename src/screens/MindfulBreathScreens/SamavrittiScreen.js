// screens/SamavrittiScreen.js
// Adapted from BhramariScreen.js for Sama Vritti (Square Breathing)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Platform,
    Alert,
    StatusBar,
    Easing,
    SafeAreaView,
} from 'react-native';
import Sound from 'react-native-sound';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

// --- Define Sama Vritti Phases ---
const BREATH_PHASES = {
    INHALE: { key: 'INHALE', label: 'Inhale', color: '#4CAF50' },         // Green
    HOLD_FULL: { key: 'HOLD_FULL', label: 'Hold', color: '#FFEB3B' },    // Yellow (Hold after Inhale)
    EXHALE: { key: 'EXHALE', label: 'Exhale', color: '#2196F3' },         // Blue
    HOLD_EMPTY: { key: 'HOLD_EMPTY', label: 'Hold', color: '#90CAF9' },  // Light Blue (Hold after Exhale)
};

// Sama Vritti phase order (The "Square")
const DEFAULT_PHASE_ORDER = [
    BREATH_PHASES.INHALE.key,
    BREATH_PHASES.HOLD_FULL.key,
    BREATH_PHASES.EXHALE.key,
    BREATH_PHASES.HOLD_EMPTY.key,
];

// Default Idle State Values for Animation
const IDLE_SCALE = 0.8;
const IDLE_OPACITY = 0.3;
const ACTIVE_SCALE = 1.15; // Scale for Inhale and Hold Full

// Default Duration for EACH phase in Sama Vritti
const DEFAULT_EQUAL_DURATION = 4; // e.g., 4 seconds per phase


const SamavrittiScreen = ({ navigation }) => {
    // State Management
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true); // For background music
    const [currentPhaseKey, setCurrentPhaseKey] = useState(DEFAULT_PHASE_ORDER[0]); // Start with Inhale
    const [equalDuration] = useState(DEFAULT_EQUAL_DURATION); // Using fixed equal duration
    const [timeLeft, setTimeLeft] = useState(equalDuration); // Initial time based on the equal duration

    // Refs for Animations and Timers
    const scaleValue = useRef(new Animated.Value(IDLE_SCALE)).current;
    const opacityValue = useRef(new Animated.Value(IDLE_OPACITY)).current;
    const phaseTimeoutRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const soundRef = useRef(null); // For background music
    const isPlayingRef = useRef(isPlaying);

    // Keep isPlayingRef updated
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // --- Sound Loading Effect (Background Music) ---
    useEffect(() => {
        Sound.setCategory('Playback');
        // *** IMPORTANT: Update this path if the file location changes ***
        const audioPath = '../../assets/audio/calm_music.mp3'; // Relative path from THIS file
        console.log(`Attempting to load background music from: ${audioPath}`);

        try {
            const sound = new Sound(require(audioPath), (error) => {
                if (error) {
                    console.error('Failed to load background music', error);
                    Alert.alert('Sound Error', `Failed to load background music. Ensure file exists relative to SamavrittiScreen.js at ${audioPath}. ${error.message}`);
                    return;
                }
                console.log("Background music loaded successfully.");
                sound.setNumberOfLoops(-1);
                soundRef.current = sound;
            });
        } catch (error) {
             console.error('Error requiring audio file:', error);
             Alert.alert('Sound Error', `Could not require the audio file at ${audioPath}. Check the path and ensure the file is bundled.`);
        }

        return () => {
            clearAllTimers();
            if (soundRef.current) {
                console.log("Releasing background music resource on unmount...");
                soundRef.current.stop(() => {
                    soundRef.current.release();
                    soundRef.current = null;
                });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    // --- Timer Clearing Function ---
    const clearAllTimers = useCallback(() => {
        if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current); phaseTimeoutRef.current = null;
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null;
    }, []);

    // --- Background Sound Toggle ---
    const handleSoundToggle = () => {
        if (!soundRef.current) { console.warn("Background music not loaded yet."); return; }
        const newSoundOn = !isSoundOn;
        setIsSoundOn(newSoundOn);
        if (newSoundOn && isPlaying) {
            console.log("Playing background music.");
            soundRef.current.play(success => !success && console.error('Background music playback failed.'));
        } else {
            console.log("Pausing background music.");
            soundRef.current.pause();
        }
    };

    // --- Animation Function ---
    const startVisualAnimation = useCallback((targetScale, durationMs) => {
        // Determine target opacity based on scale
        const targetOpacity = targetScale === ACTIVE_SCALE ? 0.9 : (targetScale === IDLE_SCALE ? 0.5 : IDLE_OPACITY);
        const opacityDuration = durationMs > 100 ? durationMs * 0.8 : durationMs; // Faster opacity change for quick transitions

        Animated.parallel([
            Animated.timing(scaleValue, {
                toValue: targetScale,
                duration: durationMs,
                easing: Easing.bezier(0.4, 0, 0.2, 1), // Use smooth easing for transitions
                useNativeDriver: true,
            }),
            Animated.timing(opacityValue, {
                toValue: targetOpacity,
                duration: opacityDuration, // Adjust opacity duration
                useNativeDriver: true,
            }),
        ]).start();
    }, [scaleValue, opacityValue]); // Dependencies

    // --- Sama Vritti Cycle Logic ---
    const startBreathingCycle = useCallback(() => {
        clearAllTimers();
        let phaseIndex = 0;

        const runPhase = () => {
            if (!isPlayingRef.current) return; // Stop if paused

            const phaseKey = DEFAULT_PHASE_ORDER[phaseIndex];
            if (!phaseKey) { console.error("Invalid phase key."); return; }
            const phaseConfig = BREATH_PHASES[phaseKey];

            // Duration is always the same for Sama Vritti
            const phaseDurationSec = equalDuration;
            const phaseDurationMs = phaseDurationSec * 1000;

            console.log(`Starting Phase: ${phaseConfig?.label || phaseKey}, Duration: ${phaseDurationSec}s`);

            // Update UI State
            setCurrentPhaseKey(phaseKey);
            setTimeLeft(phaseDurationSec);

            // Start visual animation based on phase
            if (phaseKey === BREATH_PHASES.INHALE.key) startVisualAnimation(ACTIVE_SCALE, phaseDurationMs);
            if (phaseKey === BREATH_PHASES.HOLD_FULL.key) startVisualAnimation(ACTIVE_SCALE, 100); // Maintain active scale quickly
            if (phaseKey === BREATH_PHASES.EXHALE.key) startVisualAnimation(IDLE_SCALE, phaseDurationMs); // Contract to idle scale
            if (phaseKey === BREATH_PHASES.HOLD_EMPTY.key) startVisualAnimation(IDLE_SCALE, 100); // Maintain idle scale quickly

            // --- Start Countdown Timer ---
            countdownIntervalRef.current = setInterval(() => {
                if (!isPlayingRef.current) {
                    clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; return;
                }
                 setTimeLeft(prev => {
                     const newTime = prev - 1;
                    if (newTime <= 0) { // Clear interval when timer hits 0
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                    }
                    return Math.max(0, newTime); // Ensure timer doesn't go negative
                 });
            }, 1000);

            // --- Schedule Next Phase Transition ---
            phaseTimeoutRef.current = setTimeout(() => {
                if (countdownIntervalRef.current) { // Safety clear
                    clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null;
                }
                if (!isPlayingRef.current) return;

                phaseIndex = (phaseIndex + 1) % DEFAULT_PHASE_ORDER.length;
                runPhase(); // Start next phase

            }, phaseDurationMs);
        };

        runPhase(); // Start the first phase

    }, [equalDuration, clearAllTimers, startVisualAnimation]); // Dependencies

    // --- Play/Pause Handler ---
    const handlePlayPause = useCallback(() => {
        const nextIsPlaying = !isPlaying;
        setIsPlaying(nextIsPlaying);

        if (nextIsPlaying) {
            console.log("Starting Sama Vritti session...");
            if (isSoundOn && soundRef.current) {
                console.log("Playing background music on start.");
                soundRef.current.play(success => !success && console.error('Background music playback failed.'));
            }
            // Reset visuals to idle state before starting
            scaleValue.setValue(IDLE_SCALE);
            opacityValue.setValue(IDLE_OPACITY);
            // Set initial phase and time
            setCurrentPhaseKey(DEFAULT_PHASE_ORDER[0]); // Start with Inhale
            setTimeLeft(equalDuration);

            requestAnimationFrame(() => { // Ensure state is updated before starting cycle
                if (isPlayingRef.current) {
                    startBreathingCycle();
                }
            });

        } else {
            console.log("Pausing Sama Vritti session...");
            if (soundRef.current) {
                console.log("Pausing background music on stop.");
                soundRef.current.pause();
            }
            clearAllTimers();
            // Smoothly reset visuals to idle state
            Animated.parallel([
                Animated.timing(scaleValue, { toValue: IDLE_SCALE, duration: 300, useNativeDriver: true, easing: Easing.ease }),
                Animated.timing(opacityValue, { toValue: IDLE_OPACITY, duration: 300, useNativeDriver: true, easing: Easing.ease })
            ]).start();
            // Reset displayed text/timer to initial state (Inhale)
            setCurrentPhaseKey(DEFAULT_PHASE_ORDER[0]);
            setTimeLeft(equalDuration);
        }
    }, [isPlaying, isSoundOn, equalDuration, clearAllTimers, startBreathingCycle, scaleValue, opacityValue]);

    // --- Render ---
    const currentPhaseLabel = BREATH_PHASES[currentPhaseKey]?.label || 'Ready';
    const currentPhaseColor = BREATH_PHASES[currentPhaseKey]?.color || '#CCCCCC';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={styles.container.backgroundColor} />
            {/* Optional: Sama Vritti themed gradient (Calm, Balanced) */}
            <LinearGradient colors={['#2A4B7C', '#6C92C4']} style={StyleSheet.absoluteFill} />

             {/* Header with Back Button, Title, and Sound Toggle */}
             <View style={styles.header}>
                 <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                     <Icon name="arrow-left" size={28} color="#FFF" />
                 </TouchableOpacity>
                 {/* Updated Title */}
                 <Text style={styles.headerTitle}>Sama Vritti (Square Breath)</Text>
                 <TouchableOpacity onPress={handleSoundToggle} style={styles.headerButton}>
                     <Icon name={isSoundOn ? 'volume-high' : 'volume-off'} size={28} color="#FFF" />
                 </TouchableOpacity>
             </View>

            {/* Breathing Visual */}
            <View style={styles.circleContainer}>
                <Animated.View
                    style={[
                        styles.circle,
                        {
                            transform: [{ scale: scaleValue }],
                            opacity: opacityValue,
                            backgroundColor: currentPhaseColor
                        }
                    ]}
                >
                    <Text style={styles.timerText}>{Math.max(0, timeLeft)}</Text>
                     {/* Label shows Inhale / Hold / Exhale / Hold */}
                    <Text style={styles.phaseText}>{currentPhaseLabel}</Text>
                </Animated.View>
                <View style={styles.progressRing} />
            </View>

            {/* Controls Container - Centered Play/Pause Button */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity onPress={handlePlayPause} style={[styles.mainButton, styles.shadow]}>
                    <LinearGradient colors={isPlaying ? ['#FF6B6B', '#FF8E8E'] : ['#4ADE80', '#6EE7B7']} style={styles.gradient} >
                        <Icon name={isPlaying ? 'pause' : 'play'} size={40} color="#FFF" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

// --- Styles --- (Mostly reused, check gradient/background colors if changed)
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2A4B7C' }, // Adjusted default background
    header: {
        position: 'absolute',
        top: Platform.OS === 'android' ? (StatusBar.currentHeight || 10) + 10 : 60,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10
    },
    headerButton: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18, // Adjusted size slightly
        fontWeight: '600',
        color: '#FFF',
        textAlign: 'center',
        flex: 1,
        marginHorizontal: 5, // Adjusted spacing
    },
    circleContainer: { position: 'relative', marginBottom: 60, justifyContent: 'center', alignItems: 'center', width: 280, height: 280 },
    circle: { width: 280, height: 280, borderRadius: 140, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' },
    progressRing: { ...StyleSheet.absoluteFillObject, borderWidth: 10, borderRadius: 140, borderColor: 'rgba(255,255,255,0.1)' },
    phaseText: { fontSize: 26, color: 'rgba(255,255,255,0.9)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, textAlign: 'center' },
    timerText: { fontSize: 72, color: 'rgba(255,255,255,0.95)', fontWeight: '200', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
    controlsContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 60 : 50,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mainButton: { borderRadius: 40, width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
    gradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
});

export default SamavrittiScreen;