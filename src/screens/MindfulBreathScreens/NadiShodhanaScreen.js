// screens/NadiShodhanaScreen.js (or similar name)
// Modified from CustomMindfulBreath.js for Nadi Shodhana

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Platform,
    TouchableWithoutFeedback, // Kept in case needed later, but backdrop removed
    Dimensions,
    Alert,
    StatusBar,
    Easing,
    SafeAreaView,
} from 'react-native';
import Sound from 'react-native-sound';
import Slider from '@react-native-community/slider'; // Keep slider for potential future duration setting reintegration if desired
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

// --- Define Nadi Shodhana Phases ---
const BREATH_PHASES = {
    INHALE_LEFT: { key: 'INHALE_LEFT', label: 'Inhale Left', color: '#4CAF50' }, // Green for Inhale
    HOLD_1: { key: 'HOLD_1', label: 'Hold', color: '#FFC107' }, // Yellow for Hold
    EXHALE_RIGHT: { key: 'EXHALE_RIGHT', label: 'Exhale Right', color: '#2196F3' }, // Blue for Exhale
    INHALE_RIGHT: { key: 'INHALE_RIGHT', label: 'Inhale Right', color: '#4CAF50' }, // Green for Inhale
    HOLD_2: { key: 'HOLD_2', label: 'Hold', color: '#FFC107' }, // Yellow for Hold
    EXHALE_LEFT: { key: 'EXHALE_LEFT', label: 'Exhale Left', color: '#2196F3' }, // Blue for Exhale
};

// Nadi Shodhana phase order
const DEFAULT_PHASE_ORDER = [
    BREATH_PHASES.INHALE_LEFT.key,
    BREATH_PHASES.HOLD_1.key,
    BREATH_PHASES.EXHALE_RIGHT.key,
    BREATH_PHASES.INHALE_RIGHT.key,
    BREATH_PHASES.HOLD_2.key,
    BREATH_PHASES.EXHALE_LEFT.key,
];

// Default Idle State Values for Animation
const IDLE_SCALE = 0.8;
const IDLE_OPACITY = 0.3;

// Default Durations (can be adjusted if needed)
const DEFAULT_DURATIONS = {
    inhale: 4,
    hold: 4,
    exhale: 6,
};


const NadiShodhanaScreen = ({ navigation }) => {
    // State Management
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true);
    const [currentPhaseKey, setCurrentPhaseKey] = useState(DEFAULT_PHASE_ORDER[0]); // Start with Inhale Left
    const [timeLeft, setTimeLeft] = useState(DEFAULT_DURATIONS.inhale); // Initial time based on inhale
    const [phaseDurations] = useState(DEFAULT_DURATIONS); // Using fixed defaults for now

    // Refs for Animations and Timers
    const scaleValue = useRef(new Animated.Value(IDLE_SCALE)).current;
    const opacityValue = useRef(new Animated.Value(IDLE_OPACITY)).current;
    const phaseTimeoutRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const soundRef = useRef(null);
    const isPlayingRef = useRef(isPlaying);

    // Keep isPlayingRef updated
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // --- Sound Loading Effect ---
    useEffect(() => {
        Sound.setCategory('Playback');
        // *** IMPORTANT: Update this path if the file location changes ***
        const audioPath = '../../assets/audio/calm_music.mp3'; // Relative path from THIS file
        console.log(`Attempting to load sound from: ${audioPath}`);

        try {
            const sound = new Sound(require(audioPath), (error) => {
                if (error) {
                    console.error('Failed to load sound', error);
                    Alert.alert('Sound Error', `Failed to load sound. Please ensure file exists relative to NadiShodhanaScreen.js at ${audioPath}. ${error.message}`);
                    return;
                }
                console.log("Sound loaded successfully. Duration:", sound.getDuration());
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
                console.log("Releasing sound resource on unmount...");
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

    // --- Sound Toggle ---
    const handleSoundToggle = () => {
        if (!soundRef.current) { console.warn("Sound not loaded yet."); return; }
        const newSoundOn = !isSoundOn;
        setIsSoundOn(newSoundOn);
        if (newSoundOn && isPlaying) {
            console.log("Playing sound.");
            soundRef.current.play(success => !success && console.error('Sound playback failed.'));
        } else {
            console.log("Pausing sound.");
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
                toValue: targetScale > IDLE_SCALE ? 0.9 : 0.5, // Higher opacity when inhaling/holding, lower when exhaling
                duration: durationMs * 0.8,
                useNativeDriver: true,
            }),
        ]).start();
    }, [scaleValue, opacityValue]);

    // --- Nadi Shodhana Cycle Logic ---
    const startBreathingCycle = useCallback(() => {
        clearAllTimers();
        let phaseIndex = 0;

        const runPhase = () => {
            if (!isPlayingRef.current) return; // Stop if paused

            const phaseKey = DEFAULT_PHASE_ORDER[phaseIndex];
            if (!phaseKey) { console.error("Invalid phase key."); return; } // Safety check
            const phaseConfig = BREATH_PHASES[phaseKey];

            // Determine duration based on phase type
            let phaseDurationSec;
            if (phaseKey.startsWith('INHALE')) {
                phaseDurationSec = phaseDurations.inhale;
            } else if (phaseKey.startsWith('HOLD')) {
                phaseDurationSec = phaseDurations.hold;
            } else if (phaseKey.startsWith('EXHALE')) {
                phaseDurationSec = phaseDurations.exhale;
            } else {
                console.error(`Unknown phase type for key: ${phaseKey}`);
                phaseDurationSec = 4; // Default fallback
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
            if (phaseKey.startsWith('INHALE')) startVisualAnimation(1.15, phaseDurationMs);
            if (phaseKey.startsWith('EXHALE')) startVisualAnimation(0.8, phaseDurationMs);
            // For HOLD phase, maintain the expanded state (no new animation needed, or re-apply inhale scale if desired)
             if (phaseKey.startsWith('HOLD')) {
                  // Optionally maintain the previous scale or set a specific hold scale/opacity
                  // Let's maintain the inhale scale by setting it again with short duration or no animation
                  startVisualAnimation(1.15, 100); // Quick set to inhale scale for hold
             }


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
                if (countdownIntervalRef.current) { // Clear interval if timeout fires before countdown finishes (unlikely with correct logic but safe)
                    clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null;
                }
                if (!isPlayingRef.current) return; // Check again if still playing

                phaseIndex = (phaseIndex + 1) % DEFAULT_PHASE_ORDER.length;
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
            console.log("Starting Nadi Shodhana session...");
            if (isSoundOn && soundRef.current) {
                console.log("Playing sound on start.");
                soundRef.current.setCurrentTime(0);
                soundRef.current.play(success => !success && console.error('Sound playback failed.'));
            }
            // Reset visuals to idle state before starting animation
            scaleValue.setValue(IDLE_SCALE);
            opacityValue.setValue(IDLE_OPACITY);
            // Set initial phase before starting cycle
            setCurrentPhaseKey(DEFAULT_PHASE_ORDER[0]); // Start with Inhale Left
            setTimeLeft(phaseDurations.inhale); // Set initial time

            requestAnimationFrame(() => {
                if (isPlayingRef.current) {
                    startBreathingCycle();
                }
            });

        } else {
            console.log("Pausing Nadi Shodhana session...");
            if (soundRef.current) {
                console.log("Pausing sound on stop.");
                soundRef.current.pause();
            }
            clearAllTimers();
            // Reset visuals smoothly to idle state
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
    const currentPhaseColor = BREATH_PHASES[currentPhaseKey]?.color || '#CCCCCC'; // Fallback color

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={styles.container.backgroundColor} />
            <LinearGradient colors={['#1D4D4F', '#1E3A8A']} style={StyleSheet.absoluteFill} />

             {/* Header with Back Button, Title, and Sound Toggle */}
             <View style={styles.header}>
                 <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                     <Icon name="arrow-left" size={28} color="#FFF" />
                 </TouchableOpacity>
                 <Text style={styles.headerTitle}>Nadi Shodhana</Text>
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
                            backgroundColor: currentPhaseColor // Use dynamic color based on phase
                        }
                    ]}
                >
                    <Text style={styles.timerText}>{Math.max(0, timeLeft)}</Text>
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

            {/* Settings Panel Removed */}

        </SafeAreaView>
    );
};

// --- Styles --- (Adapted)
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
    // safeArea removed as SafeAreaView is used directly
    header: {
        position: 'absolute',
        top: Platform.OS === 'android' ? (StatusBar.currentHeight || 10) + 10 : 60,
        left: 0,
        right: 0,
        paddingHorizontal: 20, // Increased padding
        flexDirection: 'row',
        justifyContent: 'space-between', // Space between items
        alignItems: 'center', // Center items vertically
        zIndex: 10
    },
    headerButton: { // Style for both back and sound buttons
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#FFF',
        // Allow title to take space, but buttons define edges
    },
    circleContainer: { position: 'relative', marginBottom: 60, justifyContent: 'center', alignItems: 'center', width: 280, height: 280 },
    circle: { width: 280, height: 280, borderRadius: 140, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
    progressRing: { ...StyleSheet.absoluteFillObject, borderWidth: 10, borderRadius: 140, borderColor: 'rgba(255,255,255,0.08)' },
    phaseText: { fontSize: 26, color: 'rgba(255,255,255,0.9)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, textAlign: 'center' }, // Added textAlign
    timerText: { fontSize: 72, color: 'rgba(255,255,255,0.95)', fontWeight: '200', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
    controlsContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 60 : 50,
        width: '100%', // Take full width to center the button easily
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', // Center the single button
    },
    mainButton: { borderRadius: 40, width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
    // iconButton style removed as it's replaced by headerButton or no longer needed
    gradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    // Settings Panel Styles Removed: settingsPanel, backdrop, settingItem, settingsTitle, settingHeader, settingLabel, sliderContainer, settingValue, slider
    shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
});

export default NadiShodhanaScreen;