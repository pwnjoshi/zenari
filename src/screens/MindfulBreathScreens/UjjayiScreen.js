// screens/UjjayiScreen.js
// Ujjayi Pranayama (Ocean Breath) Screen

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
// Note: Original code used MaterialCommunityIcons, ensure it's installed and linked
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

// --- Constants ---

// Breathing Phases Configuration
const BREATH_PHASES = {
    INHALE: { key: 'INHALE', label: 'Inhale', color: '#66BB6A' }, // Calming Green
    EXHALE: { key: 'EXHALE', label: 'Exhale', color: '#42A5F5' }, // Calming Blue
};

// Simple Inhale/Exhale cycle for Ujjayi
const DEFAULT_PHASE_ORDER = [
    BREATH_PHASES.INHALE.key,
    BREATH_PHASES.EXHALE.key,
];

// Animation Values
const IDLE_SCALE = 0.8;
const IDLE_OPACITY = 0.3;
const ACTIVE_SCALE = 1.15; // Scale up during Inhale

// Default Durations (Seconds) - Often equal for Ujjayi
const DEFAULT_DURATIONS = {
    inhale: 5,
    exhale: 5,
};

// Path to the background audio file (relative to this screen file)
// Make sure this path is correct and the file exists in your project structure.
const AUDIO_FILE_PATH = '../../assets/audio/calm_music.mp3';

// --- Component ---

const UjjayiScreen = ({ navigation }) => {
    // --- State ---
    const [isPlaying, setIsPlaying] = useState(false);
    const [isSoundOn, setIsSoundOn] = useState(true);
    const [currentPhaseKey, setCurrentPhaseKey] = useState(DEFAULT_PHASE_ORDER[0]);
    const [phaseDurations] = useState(DEFAULT_DURATIONS); // Can be made dynamic later if needed
    const [timeLeft, setTimeLeft] = useState(phaseDurations.inhale);

    // --- Refs ---
    const scaleValue = useRef(new Animated.Value(IDLE_SCALE)).current;
    const opacityValue = useRef(new Animated.Value(IDLE_OPACITY)).current;
    const phaseTimeoutRef = useRef(null);
    const countdownIntervalRef = useRef(null);
    const soundRef = useRef(null); // For react-native-sound instance
    const isPlayingRef = useRef(isPlaying); // Ref to track play state in callbacks

    // Keep isPlayingRef in sync with state for reliable checks in timeouts/intervals
    useEffect(() => {
        isPlayingRef.current = isPlaying;
    }, [isPlaying]);

    // --- Sound Management ---
    useEffect(() => {
        Sound.setCategory('Playback'); // Important for iOS playback behavior
        let soundInstance = null;

        console.log(`Attempting to load background music from: ${AUDIO_FILE_PATH}`);
        try {
            // *** FIX: Use require with a static string literal ***
            soundInstance = new Sound(require('../../assets/audio/ocean-waves.mp3'), (error) => {
                if (error) {
                    console.error('Failed to load background music', error);
                    Alert.alert('Sound Error', `Failed to load background music. ${error.message}. Ensure file exists at '${AUDIO_FILE_PATH}' and is bundled.`);
                    setIsSoundOn(false); // Disable sound if loading fails
                    return;
                }
                console.log('Background music loaded successfully.');
                soundInstance.setNumberOfLoops(-1); // Loop indefinitely
                soundRef.current = soundInstance; // Store instance in ref

                // Auto-play if session starts playing while sound is loading/enabled
                if (isPlayingRef.current && isSoundOn) {
                    soundRef.current.play(success => !success && console.error('Initial background music playback failed.'));
                }
            });
        } catch (error) {
             console.error('Error requiring audio file:', error);
             Alert.alert('Sound Error', `Could not require the audio file at ${AUDIO_FILE_PATH}. Check the path relative to UjjayiScreen.js and ensure the file is bundled correctly.`);
             setIsSoundOn(false); // Disable sound if require fails
        }

        // Cleanup function on component unmount
        return () => {
            clearAllTimers(); // Clear any running timers
            if (soundRef.current) {
                console.log('Releasing background music resource on unmount...');
                soundRef.current.stop(() => {
                    soundRef.current.release();
                    soundRef.current = null; // Clear the ref
                });
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty dependency array ensures this runs only once on mount

    // --- Utilities ---
    const clearAllTimers = useCallback(() => {
        if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        phaseTimeoutRef.current = null;
        countdownIntervalRef.current = null;
    }, []);

    // --- Animations ---
    const startVisualAnimation = useCallback((targetScale, durationMs) => {
        const targetOpacity = targetScale === ACTIVE_SCALE ? 0.95 : IDLE_OPACITY; // Slightly higher opacity when active
        const opacityDuration = durationMs * 0.7; // Faster opacity change

        Animated.parallel([
            Animated.timing(scaleValue, {
                toValue: targetScale,
                duration: durationMs,
                easing: Easing.bezier(0.42, 0, 0.58, 1), // Smooth sinusoidal ease
                useNativeDriver: true,
            }),
            Animated.timing(opacityValue, {
                toValue: targetOpacity,
                duration: opacityDuration,
                easing: Easing.linear, // Linear opacity fade
                useNativeDriver: true,
            }),
        ]).start();
    }, [scaleValue, opacityValue]); // Dependencies for the animation function

    // --- Core Breathing Cycle Logic ---
    const startBreathingCycle = useCallback(() => {
        clearAllTimers();
        let phaseIndex = 0; // Start from the beginning of the order

        const runPhase = () => {
            // Check if still playing before proceeding
            if (!isPlayingRef.current) {
                 console.log("Breathing cycle stopped because isPlayingRef is false.");
                 return;
            }

            const phaseKey = DEFAULT_PHASE_ORDER[phaseIndex];
            const phaseConfig = BREATH_PHASES[phaseKey];

            if (!phaseConfig) {
                console.error(`Invalid phase configuration for key: ${phaseKey}`);
                setIsPlaying(false); // Stop playback on error
                Alert.alert("Error", "Invalid breathing phase encountered.");
                return;
            }

            // Get duration for the current phase
            const phaseDurationSec = phaseDurations[phaseKey.toLowerCase()]; // Assumes keys match duration keys (e.g., INHALE -> inhale)

             if (typeof phaseDurationSec !== 'number' || phaseDurationSec <= 0) {
                console.error(`Invalid duration for phase ${phaseKey}: ${phaseDurationSec}s`);
                setIsPlaying(false);
                Alert.alert("Error", "Invalid breathing phase duration configured.");
                return;
            }

            const phaseDurationMs = phaseDurationSec * 1000;
            console.log(`Starting Phase: ${phaseConfig.label}, Duration: ${phaseDurationSec}s`);

            // Update UI State
            setCurrentPhaseKey(phaseKey);
            setTimeLeft(phaseDurationSec);

            // Trigger Animation
            const targetScale = (phaseKey === BREATH_PHASES.INHALE.key) ? ACTIVE_SCALE : IDLE_SCALE;
            startVisualAnimation(targetScale, phaseDurationMs);

            // Clear previous interval just in case
            if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

            // Start Countdown Timer
            countdownIntervalRef.current = setInterval(() => {
                if (!isPlayingRef.current) { // Stop interval if paused
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                    return;
                }
                setTimeLeft(prev => {
                    const newTime = prev - 1;
                    if (newTime < 0) { // Should technically clear on timeout, but safety check
                        clearInterval(countdownIntervalRef.current);
                        countdownIntervalRef.current = null;
                        return 0;
                    }
                    return newTime;
                });
            }, 1000);

            // Clear previous timeout just in case
            if (phaseTimeoutRef.current) clearTimeout(phaseTimeoutRef.current);

            // Schedule the next phase
            phaseTimeoutRef.current = setTimeout(() => {
                if (countdownIntervalRef.current) { // Ensure interval is cleared before next phase
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                }
                 if (!isPlayingRef.current) { // Check again before starting next phase
                     console.log("Next phase not started because isPlayingRef is false.");
                     return;
                 }

                phaseIndex = (phaseIndex + 1) % DEFAULT_PHASE_ORDER.length; // Move to next phase in order
                runPhase(); // Recursively call for the next phase
            }, phaseDurationMs);
        };

        // Initial call to start the cycle
        runPhase();

    }, [phaseDurations, clearAllTimers, startVisualAnimation]); // Dependencies for the cycle logic

    // --- Event Handlers ---
    const handlePlayPause = useCallback(() => {
        const nextIsPlaying = !isPlaying;
        setIsPlaying(nextIsPlaying); // Update state

        if (nextIsPlaying) {
            console.log("Starting Ujjayi session...");
             // Play background sound if enabled and loaded
            if (isSoundOn && soundRef.current) {
                console.log("Playing background music on start.");
                soundRef.current.play(success => !success && console.error('Background music playback failed.'));
            }
            // Reset animation values and start cycle
            scaleValue.setValue(IDLE_SCALE);
            opacityValue.setValue(IDLE_OPACITY);
            // Ensure UI resets to the first phase immediately on play
            setCurrentPhaseKey(DEFAULT_PHASE_ORDER[0]);
            setTimeLeft(phaseDurations.inhale);
            // Use requestAnimationFrame to ensure state update is processed before starting cycle
            requestAnimationFrame(startBreathingCycle);
        } else {
            console.log("Pausing Ujjayi session...");
             // Pause background sound
            if (soundRef.current) {
                console.log("Pausing background music on stop.");
                soundRef.current.pause();
            }
            // Clear timers and reset animation
            clearAllTimers();
            Animated.parallel([
                Animated.timing(scaleValue, { toValue: IDLE_SCALE, duration: 300, useNativeDriver: true, easing: Easing.ease }),
                Animated.timing(opacityValue, { toValue: IDLE_OPACITY, duration: 300, useNativeDriver: true, easing: Easing.ease })
            ]).start(() => {
                // Reset phase display *after* animation finishes for smoother pause
                 setCurrentPhaseKey(DEFAULT_PHASE_ORDER[0]);
                 setTimeLeft(phaseDurations.inhale);
            });
        }
    }, [isPlaying, isSoundOn, phaseDurations, clearAllTimers, startBreathingCycle, scaleValue, opacityValue]);

    const handleSoundToggle = () => {
        if (!soundRef.current) {
            console.warn("Background music not loaded yet, cannot toggle.");
            // Optionally show an alert or disable the button until sound is loaded
             Alert.alert("Sound Not Ready", "Background music is still loading.");
            return;
        }
        const newSoundOn = !isSoundOn;
        setIsSoundOn(newSoundOn);

        if (newSoundOn && isPlaying) {
            console.log("Resuming background music.");
            soundRef.current.play(success => !success && console.error('Background music playback failed on resume.'));
        } else if (!newSoundOn && soundRef.current) { // Check ref exists before pausing
            console.log("Pausing background music via toggle.");
            soundRef.current.pause();
        }
    };

    // --- Render Logic ---
    const currentPhase = BREATH_PHASES[currentPhaseKey] || {}; // Default to empty object if key invalid
    const currentPhaseLabel = isPlaying ? (currentPhase.label || '...') : 'Ready';
    const currentPhaseColor = isPlaying ? (currentPhase.color || '#CCCCCC') : '#AAAAAA'; // Grey when paused

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={styles.container.backgroundColor} />
            {/* Background Gradient */}
            <LinearGradient colors={['#004D40', '#00796B']} style={StyleSheet.absoluteFill} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <Icon name="arrow-left" size={28} color="#E0F2F7" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Ujjayi Pranayama</Text>
                <TouchableOpacity onPress={handleSoundToggle} style={styles.headerButton} disabled={!soundRef.current} >
                    <Icon name={isSoundOn ? 'volume-high' : 'volume-off'} size={28} color={soundRef.current ? "#E0F2F7" : "#777"} />
                </TouchableOpacity>
            </View>

            {/* Breathing Visualizer */}
            <View style={styles.circleContainer}>
                 {/* Outer subtle ring */}
                 <View style={styles.progressRing} />
                 {/* Animated colored circle */}
                <Animated.View
                    style={[
                        styles.circle,
                        {
                            backgroundColor: currentPhaseColor, // Dynamic color
                            opacity: opacityValue,          // Animated opacity
                            transform: [{ scale: scaleValue }], // Animated scale
                        }
                    ]}
                >
                    <Text style={styles.timerText}>{timeLeft}</Text>
                    <Text style={styles.phaseText}>{currentPhaseLabel}</Text>
                </Animated.View>
            </View>

            {/* Controls */}
            <View style={styles.controlsContainer}>
                <TouchableOpacity onPress={handlePlayPause} style={[styles.mainButton, styles.shadow]}>
                    <LinearGradient
                        colors={isPlaying ? ['#EF9A9A', '#FFCDD2'] : ['#81C784', '#A5D6A7']}
                        style={styles.gradient}
                    >
                         {/* Icon is the only child of LinearGradient */}
                        <Icon name={isPlaying ? 'pause' : 'play'} size={40} color="#FFF" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                    </LinearGradient>
                </TouchableOpacity>
            </View>

        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center', // Center content vertically
        alignItems: 'center',     // Center content horizontally
        backgroundColor: '#004D40', // Fallback background
    },
    header: {
        position: 'absolute',
        top: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 10 : 60, // Adjust for status bar
        left: 0,
        right: 0,
        paddingHorizontal: 15, // Slightly less padding
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10, // Ensure header is above gradient
    },
    headerButton: {
        padding: 10, // Make touch area slightly larger
        // Removed background color for cleaner look, rely on icon contrast
        borderRadius: 25,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#B2DFDB', // Light Teal for contrast
        textAlign: 'center',
        flex: 1, // Allow title to take space
        marginHorizontal: 8, // Space around title
    },
    circleContainer: {
        width: 280, // Keep size consistent
        height: 280,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 80, // Increase space between visualizer and button
    },
    circle: {
        width: '100%', // Use percentage of container
        height: '100%',
        borderRadius: 140, // Half of width/height
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5, // Slightly thinner border
        borderColor: 'rgba(178, 223, 219, 0.5)', // Semi-transparent teal border
    },
    progressRing: { // Subtle background ring
        ...StyleSheet.absoluteFillObject, // Position behind main circle
        borderWidth: 8, // Thinner ring
        borderRadius: 140,
        borderColor: 'rgba(178, 223, 219, 0.1)', // Very subtle border color
    },
    phaseText: {
        fontSize: 26, // Slightly smaller phase text
        color: 'rgba(255, 255, 255, 0.9)', // Brighter white text
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: 8,
        textAlign: 'center',
         textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    timerText: {
        fontSize: 70, // Slightly smaller timer text
        color: 'rgba(255, 255, 255, 1)', // Full white timer text
        fontWeight: '200', // Thin font weight
        fontVariant: ['tabular-nums'], // Keep numbers aligned
         textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    controlsContainer: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 50 : 40, // Adjust bottom spacing
        width: '100%',
        alignItems: 'center', // Center the button horizontally
    },
    mainButton: {
        width: 80,
        height: 80,
        borderRadius: 40, // Perfect circle
        // Shadow applied directly via style prop
    },
    gradient: { // Gradient fills the button
        width: '100%',
        height: '100%',
        borderRadius: 40, // Match button's border radius
        justifyContent: 'center',
        alignItems: 'center',
    },
    shadow: { // Consistent shadow style
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, // Slightly more opacity
        shadowRadius: 4,
        elevation: 8, // Standard elevation for Android
    },
});

export default UjjayiScreen;