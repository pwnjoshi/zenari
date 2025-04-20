// screens/MindfulBreathScreens/CustomMindfulBreath.js
// (Assuming this is the file for the component named MindfulBreath)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated, // Using React Native's Animated API
    Platform,
    TouchableWithoutFeedback,
    Dimensions,
    Alert,
    StatusBar, // <<< Added StatusBar import
    Easing, // <<< Added Easing import
    SafeAreaView, // <<< Added SafeAreaView import
    ScrollView, // <<< Added ScrollView import
} from 'react-native';
import Sound from 'react-native-sound';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

// Define phases with keys for easier lookup
const BREATH_PHASES = {
    INHALE: { key: 'INHALE', label: 'Inhale', color: '#4CAF50' },
    HOLD: { key: 'HOLD', label: 'Hold', color: '#FFC107' },
    EXHALE: { key: 'EXHALE', label: 'Exhale', color: '#2196F3' },
};

// Default phase order
const DEFAULT_PHASE_ORDER = [BREATH_PHASES.INHALE.key, BREATH_PHASES.HOLD.key, BREATH_PHASES.EXHALE.key];

// Default Idle State Values for Animation
const IDLE_SCALE = 0.8;
const IDLE_OPACITY = 0.3;


const MindfulBreath = ({ navigation }) => {
    // State Management
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true);
    const [currentPhaseKey, setCurrentPhaseKey] = useState(BREATH_PHASES.INHALE.key); // Store key instead of label
    const [timeLeft, setTimeLeft] = useState(4); // Time left in the current phase
    const [showSettings, setShowSettings] = useState(false);
    const [phaseSettings, setPhaseSettings] = useState({
        inhale: 4,
        hold: 4,
        exhale: 6,
    });

    // Refs for Animations and Timers
    const scaleValue = useRef(new Animated.Value(IDLE_SCALE)).current; // Initialize with idle value
    const opacityValue = useRef(new Animated.Value(IDLE_OPACITY)).current; // Initialize with idle value
    const phaseTimeoutRef = useRef(null); // Use specific name for phase transition timeout
    const countdownIntervalRef = useRef(null); // Use specific name for countdown interval
    const soundRef = useRef(null);
    // Ref to track play state reliably inside timers
    const isPlayingRef = useRef(isPlaying);

    // Keep isPlayingRef updated
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // --- Sound Loading Effect ---
    useEffect(() => {
        Sound.setCategory('Playback');
        // IMPORTANT: Verify this relative path is correct from CustomMindfulBreath.js
        const audioPath = '../../assets/audio/calm_music.mp3';
        console.log(`Attempting to load sound from: ${audioPath}`);

        try {
            // Ensure the asset exists before trying to load it
            const sound = new Sound(require(audioPath), (error) => {
                if (error) {
                    console.error('Failed to load sound', error);
                    Alert.alert('Sound Error', `Failed to load sound. Please ensure file exists relative to CustomMindfulBreath.js at ${audioPath}. ${error.message}`);
                    return;
                }
                console.log("Sound loaded successfully. Duration:", sound.getDuration());
                sound.setNumberOfLoops(-1); // Loop indefinitely
                soundRef.current = sound; // Assign only after successful load
            });
        } catch (error) {
             console.error('Error requiring audio file:', error);
             Alert.alert('Sound Error', `Could not require the audio file at ${audioPath}. Check the path and ensure the file is bundled.`);
        }

        // Cleanup function
        return () => {
            clearAllTimers(); // Clear timers on unmount
            if (soundRef.current) {
                console.log("Releasing sound resource on unmount...");
                soundRef.current.stop(() => {
                    soundRef.current.release();
                    soundRef.current = null;
                });
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount - clearAllTimers dependency removed as it's stable

    // --- Timer Clearing Function ---
    const clearAllTimers = useCallback(() => {
        // console.log("Clearing timers..."); // Optional: uncomment for debugging
        if (phaseTimeoutRef.current) {
            clearTimeout(phaseTimeoutRef.current);
            phaseTimeoutRef.current = null;
        }
        if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
            countdownIntervalRef.current = null;
        }
    }, []); // No dependencies needed, safe to memoize

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
                easing: Easing.bezier(0.4, 0, 0.2, 1), // Smoother bezier curve
                useNativeDriver: true,
            }),
            Animated.timing(opacityValue, {
                toValue: targetScale > 1 ? 0.9 : 0.5, // Adjusted opacity targets
                duration: durationMs * 0.8, // Slightly faster opacity change
                useNativeDriver: true,
            }),
        ]).start();
    }, [scaleValue, opacityValue]); // Dependencies for useCallback

    // --- Breathing Cycle Logic ---
    const startBreathingCycle = useCallback(() => {
        clearAllTimers(); // Ensure no old timers are running
        let phaseIndex = 0;

        const runPhase = () => {
            if (!isPlayingRef.current) { return; } // Stop if paused

            const phaseKey = DEFAULT_PHASE_ORDER[phaseIndex];
            if (!phaseKey) return; // Safety check
            const phaseConfig = BREATH_PHASES[phaseKey];
            const phaseDurationSec = phaseSettings[phaseKey.toLowerCase()];

            if (typeof phaseDurationSec !== 'number' || phaseDurationSec <= 0) {
                console.error(`Invalid duration for phase ${phaseKey}: ${phaseDurationSec}s`);
                setIsPlaying(false); isPlayingRef.current = false; clearAllTimers();
                Alert.alert("Error", "Invalid breathing phase duration set.");
                return;
            }

            const phaseDurationMs = phaseDurationSec * 1000;
            console.log(`Starting Phase: ${phaseConfig?.label || phaseKey}, Duration: ${phaseDurationSec}s`);

            // Update UI State
            setCurrentPhaseKey(phaseKey);
            setTimeLeft(phaseDurationSec);

            // Start visual animation
            if (phaseKey === 'INHALE') startVisualAnimation(1.15, phaseDurationMs); // Slightly larger inhale
            if (phaseKey === 'EXHALE') startVisualAnimation(0.8, phaseDurationMs);

            // --- Start Countdown Timer ---
            countdownIntervalRef.current = setInterval(() => {
                if (!isPlayingRef.current) {
                    clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; return;
                }
                // Decrement state, ensuring it doesn't go below 0
                setTimeLeft(prev => Math.max(0, prev - 1));

                // Check if the interval should stop itself (timeLeft reached 0 after update)
                 if (timeLeft <= 1) { // Check original timeLeft before decrementing state
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                 }

            }, 1000);

            // --- Schedule Next Phase Transition ---
            phaseTimeoutRef.current = setTimeout(() => {
                if (countdownIntervalRef.current) { // Clear interval if timeout fires first
                     clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null;
                }
                if (!isPlayingRef.current) { return; } // Check again if still playing

                phaseIndex = (phaseIndex + 1) % DEFAULT_PHASE_ORDER.length;
                runPhase(); // Start next phase

            }, phaseDurationMs);
        };

        runPhase(); // Start the first phase

    }, [phaseSettings, clearAllTimers, startVisualAnimation]); // Dependencies for useCallback

    // --- Play/Pause Handler ---
    const handlePlayPause = useCallback(() => {
        const nextIsPlaying = !isPlaying;
        setIsPlaying(nextIsPlaying); // Update React state first

        if (nextIsPlaying) {
            console.log("Starting session...");
            if (isSoundOn && soundRef.current) {
                console.log("Playing sound on start.");
                soundRef.current.setCurrentTime(0);
                soundRef.current.play(success => !success && console.error('Sound playback failed.'));
            }
            // Reset visuals to idle state before starting animation
            scaleValue.setValue(IDLE_SCALE);
            opacityValue.setValue(IDLE_OPACITY);
            // Start the cycle logic (isPlayingRef will be updated by useEffect)
            // Need to ensure startBreathingCycle runs *after* isPlayingRef is true
            requestAnimationFrame(() => { // Ensure state update is processed
                 if (isPlayingRef.current) { // Double check ref state
                     startBreathingCycle();
                 }
            });

        } else {
            console.log("Pausing session...");
            if (soundRef.current) {
                console.log("Pausing sound on stop.");
                soundRef.current.pause();
            }
            clearAllTimers(); // Clear interval and timeout
            // Reset visuals smoothly to idle state
            Animated.parallel([
                Animated.timing(scaleValue, { toValue: IDLE_SCALE, duration: 300, useNativeDriver: true, easing: Easing.ease }),
                Animated.timing(opacityValue, { toValue: IDLE_OPACITY, duration: 300, useNativeDriver: true, easing: Easing.ease })
            ]).start();
            // Reset displayed text/timer to initial state (based on inhale setting)
            setCurrentPhaseKey(BREATH_PHASES.INHALE.key);
            setTimeLeft(phaseSettings.inhale);
        }
        // Note: isPlayingRef is updated by the useEffect watching isPlaying
    }, [isPlaying, isSoundOn, phaseSettings, clearAllTimers, startBreathingCycle, scaleValue, opacityValue]);

    // --- Render ---
    const currentPhaseLabel = BREATH_PHASES[currentPhaseKey]?.label || 'Ready';
    const currentPhaseColor = BREATH_PHASES[currentPhaseKey]?.color || '#CCCCCC';

    return (
        <SafeAreaView style={styles.container}>
            {/* Use StatusBar component */}
            <StatusBar barStyle="light-content" backgroundColor={styles.container.backgroundColor} />
            {/* Background Gradient */}
            <LinearGradient colors={['#1D4D4F', '#1E3A8A']} style={StyleSheet.absoluteFill} />

            {/* Header */}
                        <View style={styles.header}>
                             <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                                <Icon name="chevron-left" size={28} color="#FFF" />
                            </TouchableOpacity>
                            <View style={{width: 28}}/>{/* Spacer */}
            </View>

            {/* Breathing Visual */}
            <View style={styles.circleContainer}>
                <Animated.View
                    style={[ styles.circle, { transform: [{ scale: scaleValue }], opacity: opacityValue, backgroundColor: currentPhaseColor } ]}
                >
                    <Text style={styles.timerText}>{Math.max(0, timeLeft)}</Text>
                    <Text style={styles.phaseText}>{currentPhaseLabel}</Text>
                </Animated.View>
                <View style={styles.progressRing} />
            </View>

            {/* Controls Container */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity onPress={handleSoundToggle} style={[styles.iconButton, styles.shadow]}>
                    <Icon name={isSoundOn ? 'volume-high' : 'volume-off'} size={28} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity onPress={handlePlayPause} style={[styles.mainButton, styles.shadow]}>
                    <LinearGradient colors={isPlaying ? ['#FF6B6B', '#FF8E8E'] : ['#4ADE80', '#6EE7B7']} style={styles.gradient} >
                        <Icon name={isPlaying ? 'pause' : 'play'} size={40} color="#FFF" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={[styles.iconButton, styles.shadow]}>
                    <Icon name={showSettings ? 'close' : 'cog'} size={28} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* Settings Panel */}
            {showSettings && (
                <>
                    <TouchableWithoutFeedback onPress={() => setShowSettings(false)}>
                        <View style={styles.backdrop} />
                    </TouchableWithoutFeedback>
                    <Animated.View style={[styles.settingsPanel, styles.shadow]}>
                        <Text style={styles.settingsTitle}>Breathing Settings</Text>
                        {Object.entries(phaseSettings).map(([phase, value]) => (
                            <View key={phase} style={styles.settingItem}>
                                <View style={styles.settingHeader}>
                                   <Icon name={ phase === 'inhale' ? 'arrow-up-bold-circle-outline' : phase === 'hold' ? 'pause-circle-outline' : 'arrow-down-bold-circle-outline' } size={24} color="#94A3B8"/>
                                   <Text style={styles.settingLabel}>{phase.charAt(0).toUpperCase() + phase.slice(1)}</Text>
                                </View>
                                <View style={styles.sliderContainer}>
                                    <Slider
                                        minimumValue={1} maximumValue={12} step={1} value={value}
                                        onValueChange={(val) => setPhaseSettings((prev) => ({ ...prev, [phase]: val }))}
                                        onSlidingComplete={() => { if (!isPlaying && phase === 'inhale') { setTimeLeft(phaseSettings.inhale); } }}
                                        style={styles.slider} minimumTrackTintColor="#4ADE80" maximumTrackTintColor="#475569" thumbTintColor="#6EE7B7"
                                    />
                                    <Text style={styles.settingValue}>{value}s</Text>
                                </View>
                            </View>
                        ))}
                    </Animated.View>
                </>
            )}
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
    safeArea: { flex: 1, backgroundColor: '#0F172A' },
    header: { position: 'absolute', top: Platform.OS === 'android' ? (StatusBar.currentHeight || 10) + 10 : 60, left: 0, right: 0, paddingHorizontal: 15, flexDirection: 'row', justifyContent: 'space-between', zIndex: 10 },
    backButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 },
    circleContainer: { position: 'relative', marginBottom: 60, justifyContent: 'center', alignItems: 'center', width: 280, height: 280 },
    circle: { width: 280, height: 280, borderRadius: 140, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
    progressRing: { ...StyleSheet.absoluteFillObject, borderWidth: 10, borderRadius: 140, borderColor: 'rgba(255,255,255,0.08)' },
    phaseText: { fontSize: 28, color: 'rgba(255,255,255,0.9)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
    timerText: { fontSize: 72, color: 'rgba(255,255,255,0.95)', fontWeight: '200', fontVariant: ['tabular-nums'], textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 1 },
    controlsContainer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 60 : 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '85%' },
    mainButton: { borderRadius: 40, width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
    iconButton: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 16, borderRadius: 30 },
    gradient: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    settingsPanel: { position: 'absolute', bottom: Platform.OS === 'ios' ? 170 : 160, backgroundColor: 'rgba(30, 41, 59, 0.97)', padding: 24, borderRadius: 24, width: '90%', zIndex: 20 },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 19 },
    settingItem: { marginBottom: 18 },
    settingsTitle: { fontSize: 20, color: '#E2E8F0', fontWeight: '600', marginBottom: 20, textAlign: 'center' },
    settingHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    settingLabel: { fontSize: 16, color: '#CBD5E1', fontWeight: '500' },
    sliderContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    settingValue: { fontSize: 14, color: '#94A3B8', minWidth: 25, textAlign: 'right' },
    slider: { flex: 1, height: 40 },
    shadow: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 },
});

export default MindfulBreath;
