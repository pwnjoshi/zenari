
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    Platform,
    StatusBar,
    PermissionsAndroid,
    AppState,
    Alert,
    Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AudioRecorderPlayer, {
    AVEncoderAudioQualityIOSType,
    AVEncodingOption,
    AudioEncoderAndroidType,
    AudioSourceAndroidType,
    OutputFormatAndroidType,
    AVModeIOSOption,
} from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';

// --- !!! INSECURE CONFIGURATION - MAJOR RISK !!! ---
// !!! DO NOT USE IN PRODUCTION - API KEY WILL BE EXPOSED FOR STT, TTS, AND GEMINI !!!
const GOOGLE_API_KEY = 'AIzaSyBUJEKTTcSC9ASAjgYxl9pxmQyLPH0hVKA'; // <-- PASTE YOUR API KEY HERE
// --- IMPORTANT: Replace with your actual key and ensure it's restricted in Google Cloud Console ---
// -----------------------------------------

// --- Constants ---
const TEMP_TTS_AUDIO_FILENAME = 'tts_audio.mp3';
// const SILENCE_TIMEOUT_MS = 1800; // REMOVED - Using manual stop now
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;
const TTS_API_ENDPOINT = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;
const STT_API_ENDPOINT = `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`;
const PRIMARY_LANGUAGE = 'en-US';
const SECONDARY_LANGUAGE = 'hi-IN';
// -----------------

// --- Recorder Configuration ---
const RECORDING_FORMAT = Platform.select({ ios: AVEncodingOption.pcmFormatInt16, android: OutputFormatAndroidType.DEFAULT });
const RECORDER_AUDIO_ENCODING_CONFIG = Platform.select({ ios: 'LINEAR16', android: 'AMR_WB' });
const RECORDER_SAMPLE_RATE = 16000;
const audioSet = Platform.select({
    ios: { AVSampleRateKeyIOS: RECORDER_SAMPLE_RATE, AVFormatIDKeyIOS: AVEncodingOption.pcmFormatInt16, AVNumberOfChannelsKeyIOS: 1, AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high, AVModeIOS: AVModeIOSOption.measurement, },
    android: { AudioSourceAndroid: AudioSourceAndroidType.MIC, OutputFormatAndroid: OutputFormatAndroidType.AMR_WB, AudioEncoderAndroid: AudioEncoderAndroidType.AMR_WB, AudioSampleRateAndroid: RECORDER_SAMPLE_RATE, AudioChannelsAndroid: 1, },
});
// --- End Recorder Configuration ---

// --- Colors ---
const colors = {
    backgroundOverlay: 'rgba(25, 50, 100, 0.2)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E0E0E0',
    micButtonBackground: '#FFFFFF',
    micButtonIconActive: '#FF0000', // Listening color
    micButtonIconIdle: '#AAAAAA', // Muted/Idle color
    micButtonIconProcessing: '#AAAAAA', // Muted/Processing color (same as idle)
    iconColor: '#FFFFFF',
    errorText: '#FF6347',
};
// --- End Colors ---

const audioRecorderPlayer = new AudioRecorderPlayer();
// Keep subscription duration low for potential future features if needed
audioRecorderPlayer.setSubscriptionDuration(0.1);

const VoiceModeAIScreen = () => {
    const navigation = useNavigation();
    // State Variables
    const [statusText, setStatusText] = useState('Checking permissions...');
    const [userTranscript, setUserTranscript] = useState('');
    const [aiResponseText, setAiResponseText] = useState('');
    const [detectedEmotion, setDetectedEmotion] = useState('Neutral');
    const [isListening, setIsListening] = useState(false); // Mic is actively recording/listening
    const [isProcessing, setIsProcessing] = useState(false); // Waiting for APIs (STT, Gemini, TTS)
    const [isPlayingTTS, setIsPlayingTTS] = useState(false); // AI is speaking
    const [error, setError] = useState('');
    const [permissionsGranted, setPermissionsGranted] = useState(false);

    // Refs
    const appState = useRef(AppState.currentState);
    const ttsAudioPath = useRef('');
    const recordingPath = useRef('');
    const isMountedRef = useRef(true);
    // const silenceTimerRef = useRef(null); // REMOVED - No longer needed for auto-stop

    // --- Permission Check Function (Memoized) ---
    const checkAndRequestPermissions = useCallback(async () => {
        if (!isMountedRef.current) return false; console.log('Checking permissions...');
        if (Platform.OS === 'android') { try { const recordAudioStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO); if (recordAudioStatus) { if (isMountedRef.current) { setPermissionsGranted(true); setStatusText('Tap the mic to start'); setError(''); } return true; } console.log('Requesting RECORD_AUDIO permission...'); setStatusText('Requesting permissions...'); const grants = await PermissionsAndroid.requestMultiple([ PermissionsAndroid.PERMISSIONS.RECORD_AUDIO ]); if (grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED) { if (isMountedRef.current) { setPermissionsGranted(true); setStatusText('Tap the mic to start'); setError(''); } return true; } else { if (isMountedRef.current) { setError('Microphone permission is required.'); setStatusText('Permission denied. Enable in settings.'); setPermissionsGranted(false); Alert.alert( "Permission Required", "Microphone permission needed.", [ { text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() } ] ); } return false; } } catch (err) { console.warn("Permission request error:", err); if (isMountedRef.current) { setError('Error checking permissions.'); setStatusText('Permission check failed.'); setPermissionsGranted(false); } return false; } } else { if (isMountedRef.current) { setPermissionsGranted(true); setStatusText('Tap the mic to start'); setError(''); } return true; }
    }, []);
    // --- End Permission Check ---

    // --- Request Permissions on Screen Focus ---
    useFocusEffect( useCallback(() => { isMountedRef.current = true; console.log("Screen focused, checking permissions."); checkAndRequestPermissions(); return () => { isMountedRef.current = false; console.log("Screen lost focus/unmounted - FocusEffect cleanup"); }; }, [checkAndRequestPermissions]) );
    // --- End Permission Focus Effect ---

    // --- App State Handling & General Cleanup ---
    useEffect(() => {
         const handleAppStateChange = (nextAppState) => {
             if (!isMountedRef.current) return;
             if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                 console.log("App resumed, re-checking permissions.");
                 checkAndRequestPermissions();
             } else if (nextAppState.match(/inactive|background/)) {
                 console.log('App backgrounded, stopping activities.');
                 if (isListening) stopListening(true); // Cancel ongoing listening
                 if (isPlayingTTS) stopPlayingTTS(); // Stop playback
             }
            appState.current = nextAppState;
        };
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            console.log('Cleaning up VoiceModeAIScreen (general useEffect)...');
            appStateSubscription.remove();
            audioRecorderPlayer.removeRecordBackListener();
            audioRecorderPlayer.removePlayBackListener();
            try { audioRecorderPlayer.stopPlayer(); } catch (e) { /* ignore */ }
            try { audioRecorderPlayer.stopRecorder(); } catch (e) { /* ignore */ }
            // clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; // REMOVED Timer
            const cleanupFile = (pathRef) => { if (pathRef.current) { const path = pathRef.current; pathRef.current = ''; RNFS.exists(path).then(exists => { if (exists) { RNFS.unlink(path).catch(err => console.error(`Cleanup: Error deleting temp file ${path}:`, err)); } }); } };
            cleanupFile(ttsAudioPath); cleanupFile(recordingPath);
        };
    }, [isListening, isPlayingTTS, checkAndRequestPermissions]); // Dependencies remain
    // --- End App State Handling ---

    // --- Silence Detection Timer REMOVED ---
    // const resetSilenceTimer = useCallback(() => { ... }, [isListening]);
    // const clearSilenceTimer = useCallback(() => { ... }, []);
    // --- End Silence Detection Timer ---

    // --- Audio Recording/Listening Logic ---
    const startListening = async () => {
        if (!isMountedRef.current) return;
        if (!permissionsGranted) { setError('Microphone permission is required.'); setStatusText('Permission needed.'); checkAndRequestPermissions(); return; }
        if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'YOUR_RESTRICTED_GOOGLE_API_KEY_HERE') { Alert.alert("Setup Error", "API Key missing."); setError("API Key not configured."); return; }
        if (isListening || isProcessing || isPlayingTTS) { console.warn("Attempted to start listening while already active."); return; }

        resetState(true); setError(''); setIsListening(true); setStatusText('Listening... (Tap mic to stop)'); // Update status text

        const fileExtension = Platform.select({ios: 'caf', android: 'amr'});
        const path = Platform.select({ ios: `rec-${Date.now()}.${fileExtension}`, android: `${RNFS.CachesDirectoryPath}/rec-${Date.now()}.${fileExtension}`, });
        if (!path) { setError("Could not determine recording path."); setIsListening(false); return; }
        recordingPath.current = path;
        console.log(`Attempting to start recorder at: ${path}`);

        try {
             try { await audioRecorderPlayer.stopRecorder(); } catch(e) { /* ignore */ }
             const uri = await audioRecorderPlayer.startRecorder(path, audioSet);

             // REMOVED: Silence timer logic
             // resetSilenceTimer();

             // Listener is now optional, only needed if you want real-time feedback (e.g., level meter)
             // audioRecorderPlayer.addRecordBackListener((e) => {
             //     if (!isMountedRef.current || !isListening) return;
             //     // resetSilenceTimer(); // REMOVED
             // });

             console.log(`Recorder started successfully: ${uri}`);
        } catch (err) {
             console.error('Failed to start recorder:', err);
             // clearSilenceTimer(); // REMOVED
             if (isMountedRef.current) { setError(`Recorder Error: ${err.message}`); setStatusText('Error starting mic.'); setIsListening(false); resetState(); }
             if (recordingPath.current) { RNFS.unlink(recordingPath.current).catch(e => {}); recordingPath.current = ''; }
        }
    };

    const stopListening = async (cancelled = false) => {
        // Check if actually listening (important to prevent double stops)
        if (!isListening) { console.log("Stop listening called but not listening."); return; }

        // clearSilenceTimer(); // REMOVED
        setIsListening(false); // Update state immediately
        audioRecorderPlayer.removeRecordBackListener(); // Remove listener if it was added

        console.log(cancelled ? "Cancelling listening..." : "Stopping listening manually/normally...");

        try {
            const resultUri = await audioRecorderPlayer.stopRecorder();
            console.log('stopRecorder() returned:', resultUri);
            const isValidUri = typeof resultUri === 'string' && (resultUri.startsWith('file://') || resultUri.startsWith('/'));

            if (!isValidUri) {
                console.warn(`Stop recorder invalid URI: ${resultUri}.`);
                // Don't trigger processing if stop failed or was cancelled implicitly by error
                if (!cancelled && isMountedRef.current) { setError(`Recorder stop issue: ${resultUri}`); setStatusText('Error stopping mic.'); }
                resetState();
                if (recordingPath.current) { RNFS.unlink(recordingPath.current).catch(e => {}); recordingPath.current = ''; }
                return;
            }

            console.log('Recorder stopped successfully, file:', resultUri);
            recordingPath.current = resultUri; // Store the valid path

            // If cancelled (e.g., by app backgrounding), just clean up and reset
            if (cancelled) {
                console.log("Listening cancelled.");
                resetState();
                if (recordingPath.current) { RNFS.unlink(recordingPath.current).catch(e=>{}); recordingPath.current = ''; }
                return;
            }

            // If stopped normally (manually by user), proceed to process
            if (isMountedRef.current) {
                setStatusText('Processing...');
                setIsProcessing(true);
                callGoogleSTTAPI(resultUri); // Process the recorded audio
            }

        } catch (err) {
            console.error('Failed to stop recorder:', err);
            if (isMountedRef.current) { setError(`Stop Error: ${err.message}`); setStatusText('Error stopping mic.'); resetState(); }
            // Attempt cleanup even on error
            if (recordingPath.current) { RNFS.unlink(recordingPath.current).catch(e => {}); recordingPath.current = ''; }
        }
    };
    // --- End Audio Recording/Listening Logic ---


    // --- Google Cloud API Calls ---
    const callGoogleGeminiAPI = async (promptText) => { /* ... (Gemini API call logic remains the same) ... */ };
    const callGoogleSTTAPI = async (fileUri) => { /* ... (STT API call logic remains the same, calls Gemini) ... */ };
    const callGoogleTTSAPI = async (textToSpeak, pitch = 0, speakingRate = 1.0, languageCode = PRIMARY_LANGUAGE) => { /* ... (TTS API call logic remains the same) ... */ };
    // --- End Google Cloud API Calls ---


    // --- TTS Audio Playback Logic ---
     const playTtsAudio = async (base64Audio) => { /* ... (playTtsAudio logic remains the same) ... */ };
     const stopPlayingTTS = async () => { /* ... (stopPlayingTTS logic remains the same) ... */ };
    // --- End TTS Audio Playback Logic ---


    // --- State Reset Helper ---
    const resetState = (clearText = true) => { /* ... (resetState logic remains the same) ... */ };
    // --- End State Reset Helper ---


    // --- Mic Button Handler (MODIFIED FOR MANUAL STOP) ---
    const handleMicPress = () => {
        if (!isMountedRef.current) return;
        console.log(`Mic pressed. State: isListening=${isListening}, isProcessing=${isProcessing}, isPlayingTTS=${isPlayingTTS}, permissionsGranted=${permissionsGranted}`);
        if (error) setError(''); // Clear error on new user action

        if (isListening) {
            // *** If listening, tapping the button now STOPS listening ***
            stopListening();
        } else if (isProcessing) {
            console.log("Processing... please wait."); // Button should be disabled
        } else if (isPlayingTTS) {
            stopPlayingTTS(); // Stop playback
            resetState();     // Reset to idle
        } else {
            // If idle, check permissions and start listening
            if (!permissionsGranted) {
                checkAndRequestPermissions(); // Prompt for permissions if needed
                return;
            }
            // Start only if truly idle and permissions granted
            if (!isListening && !isProcessing && !isPlayingTTS) {
                startListening();
            } else {
                console.warn("Mic pressed but component is in an unexpected active state, ignoring.");
            }
        }
    };
    // --- End Mic Button Handler ---


    // --- Mic Style Logic (MODIFIED FOR MANUAL STOP) ---
     const getMicStyle = () => {
        // Active (listening) state shows the regular mic icon (ready to be tapped to stop)
        if (isListening) return { icon: "mic-outline", color: colors.micButtonIconActive };
        // Processing state shows hourglass (or could be mic-off)
        if (isProcessing) return { icon: "hourglass-outline", color: colors.micButtonIconProcessing };
        // Speaking state shows volume (or could be mic-off)
        if (isPlayingTTS) return { icon: "volume-high-outline", color: colors.micButtonIconProcessing };
        // Idle state shows mic-off
        return { icon: "mic-off-outline", color: colors.micButtonIconIdle };
    };
    // --- End Mic Style Logic ---


    // --- Render Component ---
    return (
        <View style={styles.container}>
             <StatusBar barStyle="light-content" />
            <ImageBackground
                // source={require('../assets/new.gif')} // *** Use your actual background asset ***
                source={{ uri: 'https://placehold.co/400x800/000022/FFFFFF?text=Background' }} // Placeholder
                resizeMode="cover"
                style={styles.backgroundImage}
            >
                <View style={styles.overlay}>
                    <SafeAreaView style={styles.safeArea}>
                        {/* Header */}
                        <View style={styles.header}>
                            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                                <Icon name="arrow-back-outline" size={30} color={colors.iconColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Content Area: Visualizer and Status */}
                        <View style={styles.contentArea}>
                             <LottieView
                                 source={{ uri: 'https://assets3.lottiefiles.com/packages/lf20_1vbfj9zz.json' }} // Example sound wave
                                 style={styles.lottieVisualizer}
                                 autoPlay
                                 loop={!isListening && !isPlayingTTS && !isProcessing} // Loop only when idle
                                 speed={(isListening || isPlayingTTS || isProcessing) ? 1.5 : 0.8}
                             />
                             <View style={styles.statusDisplay}>
                                 <Text style={error ? styles.errorText : styles.statusText}>
                                     {error || statusText}
                                 </Text>
                                 {/* Optional: Display detected emotion for debugging */}
                                 {/* <Text style={{color: 'grey', marginTop: 5}}>Emotion: {detectedEmotion}</Text> */}
                                 {!permissionsGranted && Platform.OS === 'android' && error && (
                                     <TouchableOpacity onPress={checkAndRequestPermissions} style={styles.retryButton}>
                                         <Text style={styles.retryPermissionText}>Retry Permissions</Text>
                                     </TouchableOpacity>
                                 )}
                             </View>
                        </View>

                        {/* Footer: Microphone Button */}
                        <View style={styles.footer}>
                             {(() => {
                                const micStyle = getMicStyle(); // Get current style object
                                return (
                                    <TouchableOpacity
                                        style={[
                                            styles.micButton,
                                            isListening && styles.micButtonActive, // Style for listening state
                                            !permissionsGranted && styles.micButtonDisabled // Style for disabled state
                                        ]}
                                        onPress={handleMicPress}
                                        activeOpacity={0.7}
                                        // Disable only when processing OR if permissions not granted
                                        // ** Allow tapping to stop listening **
                                        disabled={isProcessing || !permissionsGranted}
                                    >
                                        <Icon
                                            name={micStyle?.icon || "mic-off-outline"} // Default to mic-off
                                            size={38}
                                            color={micStyle?.color || colors.micButtonIconIdle}
                                        />
                                    </TouchableOpacity>
                                );
                             })()}
                        </View>
                    </SafeAreaView>
                </View>
            </ImageBackground>
        </View>
    );
};
// --- End Render Component ---


// --- Styles ---
const styles = StyleSheet.create({
     container: { flex: 1 },
     backgroundImage: { flex: 1, width: '100%', height: '100%' },
     overlay: { flex: 1, backgroundColor: colors.backgroundOverlay },
     safeArea: { flex: 1, justifyContent: 'space-between' },
     header: { paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 15 : 15, width: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1, },
     backButton: { padding: 10, alignSelf: 'flex-start', },
     contentArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingTop: 80, paddingBottom: 150, },
     lottieVisualizer: { width: 200, height: 200, marginBottom: 10, },
     statusDisplay: { minHeight: 80, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, },
     recordTimeText: { fontSize: 16, color: colors.textSecondary, marginBottom: 5, },
     statusText: { fontSize: 18, fontWeight: '500', color: colors.textPrimary, textAlign: 'center', },
     errorText: { fontSize: 17, fontWeight: 'bold', color: colors.errorText, textAlign: 'center', marginBottom: 5, },
     retryButton: { marginTop: 10, paddingVertical: 5, paddingHorizontal: 10, },
     retryPermissionText: { color: colors.micButtonIconIdle, fontWeight: 'bold', textDecorationLine: 'underline', },
     footer: { width: '100%', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 40 : 30, position: 'absolute', bottom: 0, left: 0, },
     micButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.micButtonBackground, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 8, borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)', },
     micButtonActive: { // Style for listening state
        borderColor: colors.micButtonIconActive, // Use active color for border when listening
        borderWidth: 3,
     },
     micButtonDisabled: { backgroundColor: '#CCCCCC', opacity: 0.7, elevation: 0, shadowOpacity: 0, },
});
// --- End Styles ---

export default VoiceModeAIScreen;
