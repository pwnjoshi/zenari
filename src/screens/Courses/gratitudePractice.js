import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Platform,
    Image, // Added for visual element
    SafeAreaView // Ensures content is within safe boundaries
} from 'react-native';
import Sound from 'react-native-sound';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation, useIsFocused } from '@react-navigation/native'; // Added useIsFocused

// Enable playback in silence mode (iOS only)
Sound.setCategory('Playback');

// --- Define Colors (use colors from your theme if available) ---
const colors = {
    primary: '#2bedbb',
    primaryDark: '#1AA897',
    backgroundTop: '#E6F7FF', // Light blue gradient top
    backgroundBottom: '#D1EFFF', // Light blue gradient bottom
    cardBackground: '#FFFFFF',
    textDark: '#2D5D5E',
    textSecondary: '#7A8D8E',
    white: '#FFFFFF',
    iconGrey: '#607D8B',
    lightBorder: '#E0E0E0',
    playButtonBg: '#FFFFFF', // White background for the button
    playIconActive: '#1AA897', // Darker primary for active icon
    playIconInactive: '#607D8B', // Grey for inactive/loading
    playButtonBorder: '#B2DFDB', // A light teal border
};

// --- Relative path to the audio file from this component ---
// *** DOUBLE-CHECK THIS PATH IS CORRECT RELATIVE TO THIS JS FILE ***
const AUDIO_PATH = require('../../assets/audio/courses_audio/gratitude.mp3');

// --- Relative path to the image file ---
// *** DOUBLE-CHECK THIS PATH IS CORRECT RELATIVE TO THIS JS FILE ***
const IMAGE_PATH = require('../../assets/gratitude.jpeg');


const IntroToMeditationScreen = () => {
    const navigation = useNavigation();
    const isFocused = useIsFocused();

    // --- State Variables ---
    const [sound, setSound] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Start as true
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // --- Refs ---
    const intervalRef = useRef(null);
    const soundInstanceRef = useRef(null); // Use ref to manage the instance during load/cleanup

    // --- Function to safely release sound ---
    const releaseSound = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            console.log('[Audio Cleanup] Cleared progress interval.');
        }
        if (soundInstanceRef.current) {
            console.log('[Audio Cleanup] Releasing sound instance from ref.');
            soundInstanceRef.current.release();
            soundInstanceRef.current = null;
        }
        setSound(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        // Don't set isLoading here, let the load effect handle it based on focus
    }, []); // Dependency array is empty


    // --- Load Audio Effect ---
    useEffect(() => {
        if (isFocused) {
            console.log(`[Audio Load Effect] Screen focused. Attempting to load audio.`);
            setIsLoading(true);
            setCurrentTime(0);
            setDuration(0);
            setSound(null);

            try {
                soundInstanceRef.current = new Sound(AUDIO_PATH, (error) => {
                    if (error) {
                        console.error('[Audio Load Effect] Failed to load sound:', error);
                        Alert.alert('Audio Error', `Could not load audio file. Check path, file existence, and library linking.\n\nError: ${error.message}`);
                        setIsLoading(false);
                        soundInstanceRef.current = null;
                        setDuration(0);
                        setSound(null);
                        return;
                    }

                    if (soundInstanceRef.current) {
                        const loadedDuration = soundInstanceRef.current.getDuration();
                        console.log(`[Audio Load Effect] Sound constructor success. Duration: ${loadedDuration}s`);

                        if (loadedDuration > 0 && !isNaN(loadedDuration)) {
                            setDuration(loadedDuration);
                            setSound(soundInstanceRef.current);
                            console.log('[Audio Load Effect] Duration valid, sound state set.');
                        } else {
                            console.warn(`[Audio Load Effect] Sound loaded but duration is invalid (${loadedDuration}). Releasing sound.`);
                            Alert.alert('Audio Warning', 'Audio file loaded, but duration is invalid. Playback disabled.');
                            soundInstanceRef.current.release();
                            soundInstanceRef.current = null;
                            setDuration(0);
                            setSound(null);
                        }
                    } else {
                        console.error('[Audio Load Effect] Sound instance ref is null after load callback without error?');
                        Alert.alert('Audio Error', 'Unexpected issue loading audio.');
                        setDuration(0);
                        setSound(null);
                    }
                    setIsLoading(false);
                });
            } catch (catchError) {
                 console.error('[Audio Load Effect] Synchronous error during Sound creation:', catchError);
                 Alert.alert('Audio Error', `Failed to initialize audio player. ${catchError.message}`);
                 setIsLoading(false);
                 setDuration(0);
                 setSound(null);
                 soundInstanceRef.current = null;
            }
        } else {
            console.log("[Audio Load Effect] Screen blurred. Releasing sound.");
            releaseSound();
            setIsLoading(true);
        }

        return () => {
            console.log('[Audio Load Effect] Cleanup triggered.');
            releaseSound();
        };
    }, [isFocused, releaseSound]);

    // --- Progress Update Effect ---
    useEffect(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (isPlaying && sound && duration > 0) {
            console.log('[Audio Progress Effect] Starting progress interval.');
            intervalRef.current = setInterval(() => {
                if (sound && typeof sound.getCurrentTime === 'function' && soundInstanceRef.current) { // Check ref too
                    sound.getCurrentTime((seconds, isPlayingStatus) => {
                        if (!soundInstanceRef.current) { // Double check ref inside async callback
                             console.warn('[Audio Progress] Sound instance released during interval callback. Clearing.');
                             if (intervalRef.current) clearInterval(intervalRef.current);
                             intervalRef.current = null;
                             setIsPlaying(false);
                             return;
                        }
                        if (isPlayingStatus) {
                            // console.log('[Audio Progress] Current time:', seconds); // Keep commented unless debugging
                            setCurrentTime(Math.min(seconds, duration));
                        } else {
                            console.log('[Audio Progress] Library reported not playing. Clearing interval.');
                            if (intervalRef.current) clearInterval(intervalRef.current);
                            intervalRef.current = null;
                            if (isPlaying) {
                                setIsPlaying(false);
                                setCurrentTime(duration);
                            }
                        }
                    });
                } else {
                     console.warn('[Audio Progress Effect] Sound object invalid during interval check. Clearing.');
                     if (intervalRef.current) clearInterval(intervalRef.current);
                     intervalRef.current = null;
                     setIsPlaying(false);
                }
            }, 500);
        }

        return () => {
            if (intervalRef.current) {
                // console.log('[Audio Progress Effect] Cleanup: Clearing interval.'); // Can be noisy
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isPlaying, sound, duration]);

    // --- Play/Pause Handler ---
    const handlePlayPause = useCallback(() => {
        if (isLoading || !sound || duration <= 0) {
            console.log(`[Audio Control] Play/Pause prevented: isLoading=${isLoading}, sound=${!!sound}, duration=${duration}`);
            return;
        }

        if (isPlaying) {
            console.log('[Audio Control] Pausing...');
            sound.pause(() => {
                console.log('[Audio Control] Paused successfully.');
                setIsPlaying(false);
            });
        } else {
            console.log('[Audio Control] Playing...');
            if (currentTime >= duration) {
                console.log('[Audio Control] Resetting time to 0 before replay.');
                sound.setCurrentTime(0);
                setCurrentTime(0);
            }
            sound.play((success) => {
                if (success) {
                    console.log('[Audio Control] Playback finished successfully.');
                    if (isPlaying) {
                       setIsPlaying(false);
                       setCurrentTime(duration);
                    }
                } else {
                    console.error('[Audio Control] Playback failed.');
                    Alert.alert('Playback Error', 'Could not play audio file.');
                    setIsPlaying(false);
                    setCurrentTime(0);
                }
                 if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                    intervalRef.current = null;
                 }
            });
            setIsPlaying(true);
        }
    }, [sound, isPlaying, isLoading, currentTime, duration]);

    // --- Helper to format time (MM:SS) ---
    const formatTime = (seconds, targetDuration = duration) => {
        if (targetDuration <= 0 || isNaN(targetDuration) || isNaN(seconds) || seconds < 0) {
            return '00:00';
        }
        const timeToShow = Math.min(seconds, targetDuration);
        const minutes = Math.floor(timeToShow / 60);
        const remainingSeconds = Math.floor(timeToShow % 60);
        return `${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    };

    // --- Render ---
    return (
        <LinearGradient colors={[colors.backgroundTop, colors.backgroundBottom]} style={styles.gradient}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={28} color={colors.textDark} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Intro to Meditation</Text>
                    <View style={styles.headerSpacer} />{/* Use spacer style */}
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <Image source={IMAGE_PATH} style={styles.image} resizeMode="contain" />
                    <Text style={styles.description}>
                        Take a few moments to settle in. Find a comfortable position and gently close your eyes or soften your gaze.
                    </Text>

                    {/* Controls */}
                    <View style={styles.controlsContainer}>
                        <Text style={styles.timeText}>
                            {formatTime(currentTime, duration)} / {formatTime(duration, duration)}
                        </Text>
                        <TouchableOpacity
                            style={styles.playButton} // Use updated style
                            onPress={handlePlayPause}
                            disabled={isLoading || duration <= 0}
                            activeOpacity={0.7} // Add feedback on press
                        >
                            {isLoading ? (
                                <ActivityIndicator size="large" color={colors.playIconInactive} />
                            ) : (
                                <Ionicons
                                    name={isPlaying ? "pause-circle" : "play-circle"}
                                    size={80}
                                    color={duration > 0 ? colors.playIconActive : colors.playIconInactive}
                                />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </LinearGradient>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    gradient: { flex: 1 },
    safeArea: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Keep space-between
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'ios' ? 10 : 20,
        paddingBottom: 10,
    },
    backButton: {
        padding: 5,
        // Ensure the button itself doesn't push the title too much
        minWidth: 40, // Give it a minimum width
        alignItems: 'flex-start', // Align icon to the start
     },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textDark,
        textAlign: 'center', // Center the title text
        flex: 1, // Allow title to take available space
     },
    headerSpacer: {
        minWidth: 40, // Match the back button's minimum width
    },
    contentContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    image: {
        width: 200,
        height: 200,
        borderRadius: 100,
        marginBottom: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 1,
        borderColor: colors.lightBorder,
    },
    description: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 40,
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    controlsContainer: {
        alignItems: 'center',
        width: '100%'
    },
    timeText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 20,
        minWidth: 100,
        textAlign: 'center',
    },
    // Updated Play Button Style
    playButton: {
        width: 90, // Keep size
        height: 90,
        borderRadius: 45, // Perfectly circular
        backgroundColor: colors.playButtonBg, // Use defined white background
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2, // Add a border
        borderColor: colors.playButtonBorder, // Use the light teal border color
        // Removed all shadow and elevation properties
    },
});

export default IntroToMeditationScreen;
