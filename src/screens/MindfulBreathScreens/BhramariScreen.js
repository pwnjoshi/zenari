// screens/BhramariScreen.js
// Adapted from NadiShodhanaScreen.js for Bhramari Pranayama

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

// --- Define Bhramari Phases ---
const BREATH_PHASES = {
    INHALE: { key: 'INHALE', label: 'Inhale', color: '#4CAF50' }, // Green for Inhale
    EXHALE_HUM: { key: 'EXHALE_HUM', label: 'Exhale & Hum', color: '#2196F3' }, // Blue for Exhale/Hum
};

// Bhramari phase order
const DEFAULT_PHASE_ORDER = [
    BREATH_PHASES.INHALE.key,
    BREATH_PHASES.EXHALE_HUM.key,
];

// Default Idle State Values for Animation
const IDLE_SCALE = 0.8;
const IDLE_OPACITY = 0.3;

// Default Durations for Bhramari (Exhale typically longer)
const DEFAULT_DURATIONS = {
    inhale: 4,
    exhale: 8, // Make exhale longer for the hum
};


const BhramariScreen = ({ navigation }) => {
    // State Management
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true); // For background music
    const [currentPhaseKey, setCurrentPhaseKey] = useState(DEFAULT_PHASE_ORDER[0]); // Start with Inhale
    const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATIONS.inhale); // Initial time based on inhale
    const [phaseDurations] = useState(DEFAULT_DURATIONS);

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
                    Alert.alert('Sound Error', `Failed to load background music. Ensure file exists relative to BhramariScreen.js at ${audioPath}. ${error.message}`);
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
        Animated.parallel([
            Animated.timing(scaleValue, {
                toValue: targetScale,
                duration: durationMs,
                easing: Easing.bezier(0.4, 0, 0.2, 1),
                useNativeDriver: true,
            }),
            Animated.timing(opacityValue, {
                toValue: targetScale > IDLE_SCALE ? 0.9 : 0.5,
                duration: durationMs * 0.8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [scaleValue, opacityValue]);

    // --- Bhramari Cycle Logic ---
    const startBreathingCycle = useCallback(() => {
        clearAllTimers();
        let phaseIndex = 0;

        const runPhase = () => {
            if (!isPlayingRef.current) return; // Stop if paused

            const phaseKey = DEFAULT_PHASE_ORDER[phaseIndex];
            if (!phaseKey) { console.error("Invalid phase key."); return; }
            const phaseConfig = BREATH_PHASES[phaseKey];

            // Determine duration based on phase key
            let phaseDurationSec;
            if (phaseKey === BREATH_PHASES.INHALE.key) {
                phaseDurationSec = phaseDurations.inhale;
            } else if (phaseKey === BREATH_PHASES.EXHALE_HUM.key) {
                phaseDurationSec = phaseDurations.exhale; // Use 'exhale' key from durations
            } else {
                console.error(`Unknown phase key: ${phaseKey}`);
                phaseDurationSec = 4; // Fallback
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

            // Start visual animation
            if (phaseKey === BREATH_PHASES.INHALE.key) startVisualAnimation(1.15, phaseDurationMs);
            if (phaseKey === BREATH_PHASES.EXHALE_HUM.key) startVisualAnimation(0.8, phaseDurationMs);

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
                if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null;
                }
                if (!isPlayingRef.current) return;

                phaseIndex = (phaseIndex + 1) % DEFAULT_PHASE_ORDER.length;
                runPhase(); // Start next phase

            }, phaseDurationMs);
        };

        runPhase(); // Start the first phase

    }, [phaseDurations, clearAllTimers, startVisualAnimation]);

    // --- Play/Pause Handler ---
    const handlePlayPause = useCallback(() => {
        const nextIsPlaying = !isPlaying;
        setIsPlaying(nextIsPlaying);

        if (nextIsPlaying) {
            console.log("Starting Bhramari session...");
            if (isSoundOn && soundRef.current) {
                console.log("Playing background music on start.");
                // Optional: Seek to start or let it continue
                // soundRef.current.setCurrentTime(0);
                soundRef.current.play(success => !success && console.error('Background music playback failed.'));
            }
            scaleValue.setValue(IDLE_SCALE);
            opacityValue.setValue(IDLE_OPACITY);
            setCurrentPhaseKey(DEFAULT_PHASE_ORDER[0]); // Start with Inhale
            setTimeLeft(phaseDurations.inhale); // Set initial time

            requestAnimationFrame(() => {
                if (isPlayingRef.current) {
                    startBreathingCycle();
                }
            });

        } else {
            console.log("Pausing Bhramari session...");
            if (soundRef.current) {
                console.log("Pausing background music on stop.");
                soundRef.current.pause();
            }
            clearAllTimers();
            Animated.parallel([
                Animated.timing(scaleValue, { toValue: IDLE_SCALE, duration: 300, useNativeDriver: true, easing: Easing.ease }),
                Animated.timing(opacityValue, { toValue: IDLE_OPACITY, duration: 300, useNativeDriver: true, easing: Easing.ease })
            ]).start();
            // Reset displayed text/timer to initial state (Inhale)
            setCurrentPhaseKey(DEFAULT_PHASE_ORDER[0]);
            setTimeLeft(phaseDurations.inhale);
        }
    }, [isPlaying, isSoundOn, phaseDurations, clearAllTimers, startBreathingCycle, scaleValue, opacityValue]);

    // --- Render ---
    const currentPhaseLabel = BREATH_PHASES[currentPhaseKey]?.label || 'Ready';
    const currentPhaseColor = BREATH_PHASES[currentPhaseKey]?.color || '#CCCCCC';

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={styles.container.backgroundColor} />
            <LinearGradient colors={['#4A0E5B', '#882D9E']} style={StyleSheet.absoluteFill} /> {/* Optional: Bhramari-themed gradient */}

             {/* Header with Back Button, Title, and Sound Toggle */}
             <View style={styles.header}>
                 <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                     <Icon name="arrow-left" size={28} color="#FFF" />
                 </TouchableOpacity>
                 <Text style={styles.headerTitle}>Bhramari Pranayama</Text> {/* Updated Title */}
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
                    <Text style={styles.phaseText}>{currentPhaseLabel}</Text> {/* Shows Inhale / Exhale & Hum */}
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

// --- Styles --- (Mostly reused, check gradient colors if changed)
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#4A0E5B' }, // Adjusted default background slightly
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
        backgroundColor: 'rgba(255,255,255,0.15)', // Slightly adjusted alpha
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
        textAlign: 'center', // Ensure it centers if needed
        flex: 1, // Allow title to take space
        marginHorizontal: 10, // Add some space around title
    },
    circleContainer: { position: 'relative', marginBottom: 60, justifyContent: 'center', alignItems: 'center', width: 280, height: 280 },
    circle: { width: 280, height: 280, borderRadius: 140, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' }, // Slightly adjusted border
    progressRing: { ...StyleSheet.absoluteFillObject, borderWidth: 10, borderRadius: 140, borderColor: 'rgba(255,255,255,0.1)' }, // Slightly adjusted ring
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

export default BhramariScreen;