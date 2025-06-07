// screens/ChandraBhedanaScreen.js
// Adapted from SuryaBhedanaScreen.js for Chandra Bhedana Pranayama (Moon-Piercing Breath)

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

// --- Define Chandra Bhedana Phases ---
const BREATH_PHASES = {
    INHALE_LEFT: { key: 'INHALE_LEFT', label: 'Inhale Left', color: '#81D4FA' }, // Light Blue (Cooling, Moon)
    HOLD: { key: 'HOLD', label: 'Hold', color: '#E1BEE7' },        // Pale Lavender (Stillness)
    EXHALE_RIGHT: { key: 'EXHALE_RIGHT', label: 'Exhale Right', color: '#4FC3F7' }, // Slightly Deeper Blue (Release)
};

// Chandra Bhedana phase order
const DEFAULT_PHASE_ORDER = [
    BREATH_PHASES.INHALE_LEFT.key,
    BREATH_PHASES.HOLD.key,
    BREATH_PHASES.EXHALE_RIGHT.key,
];

// Default Idle State Values for Animation
const IDLE_SCALE = 0.8;
const IDLE_OPACITY = 0.3;
const ACTIVE_SCALE = 1.15; // Scale for Inhale and Hold

// Default Durations for Chandra Bhedana (can be adjusted - often longer exhale is preferred)
const DEFAULT_DURATIONS = {
    inhale: 4, // Duration for Inhale Left
    hold: 6,   // Duration for Hold
    exhale: 8, // Duration for Exhale Right (often longer for calming effect)
};


const ChandraBhedanaScreen = ({ navigation }) => {
    // State Management
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true); // For background music
    const [currentPhaseKey, setCurrentPhaseKey] = useState(DEFAULT_PHASE_ORDER[0]); // Start with Inhale Left
    const [phaseDurations] = useState(DEFAULT_DURATIONS); // Using distinct durations
    const [timeLeft, setTimeLeft] = useState(phaseDurations.inhale); // Initial time based on inhale duration

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
        // *** IMPORTANT: Ensure this path is correct relative to THIS file ***
        const audioPath = '../../assets/audio/calm_music.mp3'; // Relative path
        console.log(`Attempting to load background music from: ${audioPath}`);

        try {
            // Use require for static assets in React Native
            const sound = new Sound(require(audioPath), (error) => {
                if (error) {
                    console.error('Failed to load background music', error);
                    Alert.alert('Sound Error', `Failed to load background music. Ensure file exists relative to ChandraBhedanaScreen.js at ${audioPath}. ${error.message}`);
                    return;
                }
                console.log("Background music loaded successfully.");
                sound.setNumberOfLoops(-1); // Loop indefinitely
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
        const targetOpacity = targetScale === ACTIVE_SCALE ? 0.9 : (targetScale === IDLE_SCALE ? 0.5 : IDLE_OPACITY);
        const opacityDuration = durationMs > 100 ? durationMs * 0.8 : durationMs;

        Animated.parallel([
            Animated.timing(scaleValue, {
                toValue: targetScale,
                duration: durationMs,
                easing: Easing.bezier(0.4, 0, 0.2, 1), // Smooth easing
                useNativeDriver: true,
            }),
            Animated.timing(opacityValue, {
                toValue: targetOpacity,
                duration: opacityDuration,
                useNativeDriver: true,
            }),
        ]).start();
    }, [scaleValue, opacityValue]);

    // --- Chandra Bhedana Cycle Logic ---
    const startBreathingCycle = useCallback(() => {
        clearAllTimers();
        let phaseIndex = 0;

        const runPhase = () => {
            if (!isPlayingRef.current) return; // Stop if paused

            const phaseKey = DEFAULT_PHASE_ORDER[phaseIndex];
            if (!phaseKey) { console.error("Invalid phase key."); return; }
            const phaseConfig = BREATH_PHASES[phaseKey];

            // Determine duration based on the current phase
            let phaseDurationSec;
            // *** UPDATED Phase Key Check ***
            if (phaseKey === BREATH_PHASES.INHALE_LEFT.key) {
                phaseDurationSec = phaseDurations.inhale;
            } else if (phaseKey === BREATH_PHASES.HOLD.key) {
                phaseDurationSec = phaseDurations.hold;
            } else if (phaseKey === BREATH_PHASES.EXHALE_RIGHT.key) {
                phaseDurationSec = phaseDurations.exhale;
            } else {
                console.error(`Unknown phase key for duration lookup: ${phaseKey}`);
                phaseDurationSec = 4; // Fallback duration
            }

             if (typeof phaseDurationSec !== 'number' || phaseDurationSec <= 0) {
                 console.error(`Invalid duration for phase ${phaseKey}: ${phaseDurationSec}s`);
                 setIsPlaying(false); isPlayingRef.current = false; clearAllTimers();
                 Alert.alert("Error", "Invalid breathing phase duration configured.");
                 return;
             }

            const phaseDurationMs = phaseDurationSec * 1000;
            console.log(`Starting Phase: ${phaseConfig?.label || phaseKey}, Duration: ${phaseDurationSec}s`);

            // Update UI State
            setCurrentPhaseKey(phaseKey);
            setTimeLeft(phaseDurationSec);

            // Start visual animation based on phase
            // *** UPDATED Phase Key Check for Animation ***
            if (phaseKey === BREATH_PHASES.INHALE_LEFT.key) startVisualAnimation(ACTIVE_SCALE, phaseDurationMs);
            if (phaseKey === BREATH_PHASES.HOLD.key) startVisualAnimation(ACTIVE_SCALE, 100); // Maintain active scale quickly
            if (phaseKey === BREATH_PHASES.EXHALE_RIGHT.key) startVisualAnimation(IDLE_SCALE, phaseDurationMs); // Contract to idle scale

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

                phaseIndex = (phaseIndex + 1) % DEFAULT_PHASE_ORDER.length; // Cycle through the 3 phases
                runPhase(); // Start next phase

            }, phaseDurationMs);
        };

        runPhase(); // Start the first phase

    }, [phaseDurations, clearAllTimers, startVisualAnimation]); // Dependencies

    // --- Play/Pause Handler ---
    const handlePlayPause = useCallback(() => {
        const nextIsPlaying = !isPlaying;
        setIsPlaying(nextIsPlaying);

        if (nextIsPlaying) {
            console.log("Starting Chandra Bhedana session...");
            if (isSoundOn && soundRef.current) {
                console.log("Playing background music on start.");
                soundRef.current.play(success => !success && console.error('Background music playback failed.'));
            }
            scaleValue.setValue(IDLE_SCALE);
            opacityValue.setValue(IDLE_OPACITY);
            setCurrentPhaseKey(DEFAULT_PHASE_ORDER[0]); // Start with Inhale Left
            setTimeLeft(phaseDurations.inhale); // Set initial time to inhale duration

            // Use requestAnimationFrame to ensure state update is processed before starting cycle
            requestAnimationFrame(() => {
                if (isPlayingRef.current) { // Check ref again inside frame
                    startBreathingCycle();
                }
            });

        } else {
            console.log("Pausing Chandra Bhedana session...");
            if (soundRef.current) {
                console.log("Pausing background music on stop.");
                soundRef.current.pause();
            }
            clearAllTimers();
            Animated.parallel([
                Animated.timing(scaleValue, { toValue: IDLE_SCALE, duration: 300, useNativeDriver: true, easing: Easing.ease }),
                Animated.timing(opacityValue, { toValue: IDLE_OPACITY, duration: 300, useNativeDriver: true, easing: Easing.ease })
            ]).start();
            // Reset displayed text/timer to initial state (Inhale Left)
            setCurrentPhaseKey(DEFAULT_PHASE_ORDER[0]);
            setTimeLeft(phaseDurations.inhale);
        }
    }, [isPlaying, isSoundOn, phaseDurations, clearAllTimers, startBreathingCycle, scaleValue, opacityValue]);

    // --- Render ---
    const currentPhaseLabel = BREATH_PHASES[currentPhaseKey]?.label || 'Ready';
    const currentPhaseColor = BREATH_PHASES[currentPhaseKey]?.color || '#CCCCCC'; // Grey fallback

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={styles.container.backgroundColor} />
            {/* Chandra Bhedana themed gradient (Cooling, Calming) */}
            <LinearGradient colors={['#5C6BC0', '#9FA8DA']} style={StyleSheet.absoluteFill} />

             {/* Header with Back Button, Title, and Sound Toggle */}
             <View style={styles.header}>
                 <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                     <Icon name="arrow-left" size={28} color="#FFF" />
                 </TouchableOpacity>
                 {/* Updated Title */}
                 <Text style={styles.headerTitle}>Chandra Bhedana</Text>
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
                            backgroundColor: currentPhaseColor // Dynamic color based on phase
                        }
                    ]}
                >
                    <Text style={styles.timerText}>{Math.max(0, timeLeft)}</Text>
                    {/* Label shows Inhale Left / Hold / Exhale Right */}
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

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#5C6BC0' }, // Cool background base
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
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF', // White title on cool background
        textAlign: 'center',
        flex: 1,
        marginHorizontal: 5,
        textShadowColor: 'rgba(0,0,0,0.2)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    circleContainer: { position: 'relative', marginBottom: 60, justifyContent: 'center', alignItems: 'center', width: 280, height: 280 },
    circle: { width: 280, height: 280, borderRadius: 140, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
    progressRing: { ...StyleSheet.absoluteFillObject, borderWidth: 10, borderRadius: 140, borderColor: 'rgba(255,255,255,0.15)' },
    phaseText: { fontSize: 24, color: 'rgba(255,255,255,0.95)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3, textAlign: 'center' },
    timerText: { fontSize: 72, color: 'rgba(255,255,255,1)', fontWeight: '200', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
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
    shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 7, elevation: 0 },
});

export default ChandraBhedanaScreen;