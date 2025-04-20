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
    Linking, // Import Linking to open app settings
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Import useFocusEffect
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
const TEMP_TTS_AUDIO_FILENAME = 'tts_audio.mp3'; // TTS output format
const SILENCE_TIMEOUT_MS = 1800; // Auto-stop after 1.8 seconds of silence (Adjust as needed)
const GEMINI_MODEL = 'gemini-2.0-flash'; // Or 'gemini-1.5-flash', etc. Ensure your key has access.
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;
const TTS_API_ENDPOINT = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;
const STT_API_ENDPOINT = `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`;
// -----------------

// --- Recorder Configuration ---
// *** CRITICAL: These MUST match the capabilities of the API and your desired quality ***
const RECORDING_FORMAT = Platform.select({ // Choose format
    ios: AVEncodingOption.pcmFormatInt16, // LINEAR16 for iOS
    android: OutputFormatAndroidType.DEFAULT, // Use default for simplicity, may output AAC/AMR. Needs testing.
});
const RECORDER_AUDIO_ENCODING_CONFIG = Platform.select({
    // Config for Google STT API based on RECORDING_FORMAT
    // See: https://cloud.google.com/speech-to-text/docs/encoding
    ios: 'LINEAR16',
    android: 'AMR_WB', // Common default on Android. *ADJUST IF NEEDED* based on actual output
});
const RECORDER_SAMPLE_RATE = 16000; // Common rate, ensure device supports it. MUST match API config.

const audioSet = Platform.select({
    ios: {
        AVSampleRateKeyIOS: RECORDER_SAMPLE_RATE,
        AVFormatIDKeyIOS: AVEncodingOption.pcmFormatInt16, // LINEAR16
        AVNumberOfChannelsKeyIOS: 1, // Mono
        AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high,
        AVModeIOS: AVModeIOSOption.measurement, // For raw audio if possible
    },
    android: {
        AudioSourceAndroid: AudioSourceAndroidType.MIC,
        OutputFormatAndroid: OutputFormatAndroidType.AMR_WB, // *MATCH RECORDER_AUDIO_ENCODING_CONFIG*
        AudioEncoderAndroid: AudioEncoderAndroidType.AMR_WB, // *MATCH RECORDER_AUDIO_ENCODING_CONFIG*
        AudioSampleRateAndroid: RECORDER_SAMPLE_RATE,
        AudioChannelsAndroid: 1, // Mono
    },
});
// --- End Recorder Configuration ---


// --- Colors ---
const colors = {
    backgroundOverlay: 'rgba(25, 50, 100, 0.2)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E0E0E0',
    micButtonBackground: '#FFFFFF',
    micButtonIconActive: '#FF0000', // Listening/Recording
    micButtonIconIdle: '#3B82F6',
    micButtonIconProcessing: '#FFA500', // Waiting for Google API / Playing TTS
    micButtonRipple: 'rgba(59, 130, 246, 0.2)',
    iconColor: '#FFFFFF',
    errorText: '#FF6347', // Tomato color for errors
};
// --- End Colors ---

// Create the instance *outside* the component to avoid re-creation on re-renders
const audioRecorderPlayer = new AudioRecorderPlayer();
audioRecorderPlayer.setSubscriptionDuration(0.1); // Update interval for recording time

const VoiceModeAIScreen = () => {
    const navigation = useNavigation();
    // State Variables
    const [statusText, setStatusText] = useState('Checking permissions...'); // User-facing status
    const [userTranscript, setUserTranscript] = useState(''); // Result from STT
    const [aiResponseText, setAiResponseText] = useState(''); // Gemini's response text
    const [detectedEmotion, setDetectedEmotion] = useState('Neutral'); // State for detected emotion
    const [isListening, setIsListening] = useState(false);   // Is mic actively recording?
    const [isProcessing, setIsProcessing] = useState(false); // Covers STT, Gemini, and TTS API calls
    const [isPlayingTTS, setIsPlayingTTS] = useState(false); // Is TTS audio playing?
    const [error, setError] = useState('');                   // Any error message to display?
    const [permissionsGranted, setPermissionsGranted] = useState(false); // Are required permissions granted?

    // Refs for persistent values that don't cause re-renders
    const appState = useRef(AppState.currentState); // Track app's background/foreground state
    const ttsAudioPath = useRef('');                 // Path to the temporary TTS audio file
    const recordingPath = useRef('');                // Path to the current temporary recording file
    const isMountedRef = useRef(true);              // Track if the component is currently mounted
    const silenceTimerRef = useRef(null);           // Ref to hold the silence detection timer ID

    // --- Permission Check Function (Memoized) ---
    const checkAndRequestPermissions = useCallback(async () => {
        // Avoid checks if component isn't mounted
        if (!isMountedRef.current) return false;
        console.log('Checking permissions...');

        if (Platform.OS === 'android') {
            try {
                // Check current status first (more efficient than requesting every time)
                const recordAudioStatus = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);

                if (recordAudioStatus) {
                    console.log('Permissions already granted.');
                    if (isMountedRef.current) {
                        setPermissionsGranted(true);
                        setStatusText('Tap the mic to start');
                        setError(''); // Clear previous errors
                    }
                    return true;
                }

                // If not granted, request
                console.log('Requesting RECORD_AUDIO permission...');
                setStatusText('Requesting permissions...');
                const grants = await PermissionsAndroid.requestMultiple([
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    // Add storage permissions back here if you find they are needed
                    // PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
                    // PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
                ]);

                // Check specifically for RECORD_AUDIO result
                if (grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED) {
                    console.log('RECORD_AUDIO permission granted.');
                    if (isMountedRef.current) {
                        setPermissionsGranted(true);
                        setStatusText('Tap the mic to start');
                        setError('');
                    }
                    return true;
                } else {
                    console.warn('RECORD_AUDIO permission denied.');
                    if (isMountedRef.current) {
                        setError('Microphone permission is required.');
                        setStatusText('Permission denied. Enable in settings.');
                        setPermissionsGranted(false);
                        // Guide user to settings
                        Alert.alert(
                            "Permission Required",
                            "Microphone permission needed.",
                            [
                                { text: "Cancel", style: "cancel" },
                                { text: "Open Settings", onPress: () => Linking.openSettings() } // Requires Linking import
                            ]
                        );
                    }
                    return false;
                }
            } catch (err) {
                console.warn("Permission request error:", err);
                if (isMountedRef.current) {
                    setError('Error checking permissions.');
                    setStatusText('Permission check failed.');
                    setPermissionsGranted(false);
                }
                return false;
            }
        } else { // iOS
            // On iOS, permissions are usually handled via Info.plist
            // Assume granted for this example, add specific checks if needed
            if (isMountedRef.current) {
                setPermissionsGranted(true);
                setStatusText('Tap the mic to start');
                setError('');
            }
            return true;
        }
    }, []); // Empty dependency array means this function is created once
    // --- End Permission Check ---

    // --- Request Permissions on Screen Focus ---
    useFocusEffect(
        useCallback(() => {
            // This effect runs when the screen comes into focus
            isMountedRef.current = true; // Ensure mount status is true on focus
            console.log("Screen focused, checking permissions.");
            checkAndRequestPermissions();

            return () => {
                // This runs when the screen loses focus or unmounts
                 isMountedRef.current = false;
                 console.log("Screen lost focus/unmounted - FocusEffect cleanup");
                 // Optionally stop processes when screen loses focus
                 // if (isListening) stopListening(true);
                 // if (isPlayingTTS) stopPlayingTTS();
            };
        }, [checkAndRequestPermissions]) // Re-run if the memoized function changes (it won't here)
    );
    // --- End Permission Focus Effect ---


    // --- App State Handling & General Cleanup ---
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
             if (!isMountedRef.current) return;
             if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
                 // Re-check permissions when app comes to foreground
                 console.log("App resumed, re-checking permissions.");
                 checkAndRequestPermissions(); // Check again in case user changed them while backgrounded
             }
             else if (nextAppState.match(/inactive|background/)) {
                 console.log('App backgrounded, stopping activities.');
                 // Stop recording/playback if app goes to background
                 if (isListening) stopListening(true); // Cancel recording
                 if (isPlayingTTS) stopPlayingTTS();
             }
            appState.current = nextAppState;
        };
        // Subscribe to AppState changes
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        // General cleanup function for this effect (runs on unmount)
        return () => {
            console.log('Cleaning up VoiceModeAIScreen (general useEffect)...');
            appStateSubscription.remove();
            // Remove listeners and stop player/recorder on final unmount
            audioRecorderPlayer.removeRecordBackListener();
            audioRecorderPlayer.removePlayBackListener();
            try { audioRecorderPlayer.stopPlayer(); } catch (e) { /* ignore */ }
            try { audioRecorderPlayer.stopRecorder(); } catch (e) { /* ignore */ }
            // Clear silence timer on unmount
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;

            // Clean up temp files robustly
            const cleanupFile = (pathRef) => {
                if (pathRef.current) {
                    const path = pathRef.current; // Copy path before clearing ref
                    pathRef.current = ''; // Clear ref immediately
                    RNFS.exists(path).then(exists => {
                        if (exists) {
                            RNFS.unlink(path)
                                .then(() => console.log(`Cleanup: Deleted temp file ${path}`))
                                .catch(err => console.error(`Cleanup: Error deleting temp file ${path}:`, err));
                        }
                    });
                }
            };
            cleanupFile(ttsAudioPath);
            cleanupFile(recordingPath);
        };
        // Rerun this effect if listening/playing state changes OR permission function changes
    }, [isListening, isPlayingTTS, checkAndRequestPermissions]);
    // --- End App State Handling & General Cleanup ---


    // --- Silence Detection Timer ---
    const resetSilenceTimer = useCallback(() => {
        // Clear existing timer
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        // Start a new timer
        silenceTimerRef.current = setTimeout(() => {
            console.log(`Silence detected (${SILENCE_TIMEOUT_MS}ms), stopping listening automatically.`);
            if (isListening && isMountedRef.current) { // Check if still listening and mounted
                stopListening(); // Call the stop function
            }
        }, SILENCE_TIMEOUT_MS);
    }, [isListening]); // Depend on isListening state

    const clearSilenceTimer = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }, []);
    // --- End Silence Detection Timer ---


    // --- Audio Recording/Listening Logic ---
    const startListening = async () => {
        if (!isMountedRef.current) return;

        // 1. Check Permissions State
        if (!permissionsGranted) {
            setError('Microphone permission is required.');
            setStatusText('Permission needed. Check settings.');
            checkAndRequestPermissions(); // Attempt request again
            return;
        }

        // 2. Check API Key
        if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'YOUR_RESTRICTED_GOOGLE_API_KEY_HERE') {
             Alert.alert("Setup Error", "API Key missing or invalid in the code.");
             setError("API Key not configured.");
             return;
         }

        // 3. Check if already active
        if (isListening || isProcessing || isPlayingTTS) {
            console.warn("Attempted to start listening while already active.");
            return;
        }

        // 4. Reset state for new recording
        resetState(true); // Clear previous data and errors
        setError('');     // Explicitly clear error for new attempt
        setIsListening(true); // Set listening flag
        setStatusText('Listening...'); // Update UI

        // 5. Define recording path
        const fileExtension = Platform.select({ios: 'caf', android: 'amr'}); // Match audioSet
        const path = Platform.select({
            ios: `rec-${Date.now()}.${fileExtension}`,
            android: `${RNFS.CachesDirectoryPath}/rec-${Date.now()}.${fileExtension}`,
        });
        if (!path) {
             setError("Could not determine recording path.");
             setIsListening(false);
             return;
        }
        recordingPath.current = path; // Store path

        console.log(`Attempting to start recorder at: ${path}`);
        console.log(`Using AudioSet:`, audioSet);
        console.log(`Expecting format: ${RECORDER_AUDIO_ENCODING_CONFIG} @ ${RECORDER_SAMPLE_RATE}Hz`);

        try {
             // 6. Safety stop previous recorder instance (belt-and-suspenders)
             try { await audioRecorderPlayer.stopRecorder(); } catch(e) { /* ignore if already stopped */ }

             // 7. Start recording
             const uri = await audioRecorderPlayer.startRecorder(path, audioSet);

             // 8. Start silence timer and add listener for recording progress
             resetSilenceTimer(); // Start the timer now
             audioRecorderPlayer.addRecordBackListener((e) => {
                 if (!isMountedRef.current || !isListening) return; // Check state within listener
                 // Reset silence timer on *any* incoming audio data packet
                 resetSilenceTimer();
                 // Update recording time (optional, currently commented out)
                 // const currentSecs = e.currentPosition / 1000;
                 // setRecordSecs(currentSecs);
                 // setRecordTime(audioRecorderPlayer.mmssss(Math.floor(currentSecs)));
                 return;
             });
             console.log(`Recorder started successfully: ${uri}`);
             // Status already set to Listening...

        } catch (err) {
             // 10. Handle recording start errors
             console.error('Failed to start recorder:', err);
             clearSilenceTimer(); // Clear timer on error
             if (isMountedRef.current) {
                 setError(`Recorder Error: ${err.message}`);
                 setStatusText('Error starting mic. Tap again.');
                 setIsListening(false); // Reset listening flag
                 resetState();          // Reset other states
             }
             // Clean up potentially created file on error
             if (recordingPath.current) {
                 RNFS.unlink(recordingPath.current).catch(e => console.error("Error deleting failed recording file:", e));
                 recordingPath.current = '';
             }
        }
    };

    const stopListening = async (cancelled = false) => {
        // 1. Check state
        if (!isListening) { console.log("Stop listening called but not in listening state."); return; }

        // 2. Clear silence timer immediately
        clearSilenceTimer();

        // 3. Update state
        setIsListening(false);
        audioRecorderPlayer.removeRecordBackListener(); // Remove listener

        try {
            // 4. Stop the recorder
            const resultUri = await audioRecorderPlayer.stopRecorder();
            console.log('stopRecorder() returned:', resultUri);

            // 5. Validate the result (should be a file path)
            const isValidUri = typeof resultUri === 'string' && (resultUri.startsWith('file://') || resultUri.startsWith('/'));

            if (!isValidUri) {
                // Handle cases where stopRecorder returns an error message string
                console.warn(`Stop recorder returned an invalid URI or message: ${resultUri}.`);
                if (!cancelled && isMountedRef.current) { setError(`Recorder stop issue: ${resultUri}`); setStatusText('Error stopping mic.'); }
                resetState();
                // Attempt cleanup of original path ref just in case
                if (recordingPath.current) {
                    RNFS.unlink(recordingPath.current).catch(e => console.error("Error deleting recording file after invalid stop:", e));
                    recordingPath.current = '';
                }
                return; // Stop execution
            }

            // 6. If URI is valid, update the ref
            console.log('Recorder stopped successfully, file:', resultUri);
            recordingPath.current = resultUri; // Use the confirmed path

            // 7. Handle cancellation
            if (cancelled) {
                console.log("Listening cancelled.");
                resetState();
                // Clean up the cancelled file
                if (recordingPath.current) {
                    RNFS.unlink(recordingPath.current).catch(e=>console.error("Error deleting cancelled recording", e));
                    recordingPath.current = '';
                }
                return;
            }

            // 8. Proceed to process audio if not cancelled and component mounted
            if (isMountedRef.current) {
                setStatusText('Processing...'); // Indicate processing start
                setIsProcessing(true);
                callGoogleSTTAPI(resultUri); // Pass the validated URI
            }

        } catch (err) {
            // 9. Handle errors during stopRecorder call
            console.error('Failed to stop recorder:', err);
            if (isMountedRef.current) { setError(`Stop Error: ${err.message}`); setStatusText('Error stopping mic.'); resetState(); }
            // Attempt cleanup even on error
            if (recordingPath.current) {
                RNFS.unlink(recordingPath.current).catch(e => console.error("Error deleting recording file after stop error:", e));
                recordingPath.current = '';
            }
        }
    };
    // --- End Audio Recording/Listening Logic ---


    // --- Google Cloud API Calls (Frontend - INSECURE) ---

    // Function to call Google Gemini API - MODIFIED FOR STRUCTURED OUTPUT
    const callGoogleGeminiAPI = async (promptText) => {
        if (!isMountedRef.current) return null;
        console.log(`Calling Gemini API with prompt: "${promptText}"`);
        setStatusText('AI Thinking...');

        if (!promptText || promptText.trim() === '[No speech detected]' || promptText.trim() === '') {
            console.log("Skipping Gemini call for empty/no-speech prompt.");
            // Return default structure for empty prompt
            return { detected_emotion: 'Neutral', response_text: "Could you please say that again?" };
        }

        // --- >>> MODIFIED PROMPT FOR STRUCTURED JSON OUTPUT <<< ---
        const fullPrompt = `You are a voice assistant. Analyze the predominant emotion of the user's statement (options: Joy, Sadness, Anger, Surprise, Fear, Neutral).
        Then, generate a friendly, empathetic, and concise response acknowledging the detected emotion if appropriate, while addressing their request/statement.
        Return ONLY a valid JSON object containing exactly two keys: "detected_emotion" (string, one of the options above) and "response_text" (string).

        User statement: "${promptText}"

        JSON response:`;
        // --- >>> END OF MODIFIED PROMPT <<< ---

        try {
            const requestBody = {
                contents: [{ parts: [{ text: fullPrompt }] }],
                // generationConfig: { responseMimeType: "application/json" } // Might help, but not always respected perfectly
            };

            const response = await fetch(GEMINI_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            const responseData = await response.json();

            if (!response.ok) {
                console.error('Google Gemini API Error Response:', responseData);
                throw new Error(responseData.error?.message || `Gemini API error ${response.status}`);
            }

            console.log('Google Gemini API Success Response received.');
            const generatedText = responseData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!generatedText) {
                console.error('Could not extract text from Gemini response:', responseData);
                throw new Error("Received no text content from AI.");
            }

            console.log("Raw Gemini Text:", generatedText);

            // --- >>> PARSE JSON RESPONSE FROM GEMINI <<< ---
            try {
                // Attempt to parse the potentially JSON-formatted string
                // Handle potential markdown code block fences ```json ... ```
                let jsonString = generatedText.trim();
                if (jsonString.startsWith('```json')) {
                    jsonString = jsonString.substring(7); // Remove ```json
                    if (jsonString.endsWith('```')) {
                        jsonString = jsonString.substring(0, jsonString.length - 3); // Remove ```
                    }
                }
                 jsonString = jsonString.trim(); // Trim again

                const parsedJson = JSON.parse(jsonString);
                // Validate the structure
                if (typeof parsedJson === 'object' && parsedJson !== null &&
                    typeof parsedJson.detected_emotion === 'string' &&
                    typeof parsedJson.response_text === 'string')
                {
                    console.log("Parsed Gemini Response:", parsedJson);
                    return {
                        detected_emotion: parsedJson.detected_emotion || 'Neutral', // Default to Neutral if empty
                        response_text: parsedJson.response_text.trim()
                    };
                } else {
                    console.warn("Gemini response was not valid JSON or lacked expected keys. Falling back.", parsedJson);
                    // Fallback: Use the whole text as response, assume Neutral emotion
                    return { detected_emotion: 'Neutral', response_text: generatedText.trim() };
                }
            } catch (parseError) {
                console.warn("Failed to parse Gemini response as JSON. Using raw text.", parseError);
                // Fallback: If parsing fails, use the whole text as response, assume Neutral emotion
                return { detected_emotion: 'Neutral', response_text: generatedText.trim() };
            }
            // --- >>> END PARSE JSON RESPONSE <<< ---

        } catch (err) {
            console.error('Error calling Google Gemini API:', err);
            if (isMountedRef.current) {
                setError(`AI Error: ${err.message}`);
                setStatusText('Error getting AI response.');
            }
            return null; // Indicate failure
        }
    };

    // Modified STT function to handle structured Gemini response
    const callGoogleSTTAPI = async (fileUri) => {
        // 1. Validate input URI & File Path
        if (!fileUri || typeof fileUri !== 'string' || !(fileUri.startsWith('file://') || fileUri.startsWith('/'))) {
             if(isMountedRef.current){ setError('Internal error: Invalid recording path.'); resetState(); setIsProcessing(false); } return;
        }
        const filePath = fileUri.startsWith('file://') ? fileUri.substring(7) : fileUri;
        const fileExists = await RNFS.exists(filePath);
        if (!fileExists) {
             if(isMountedRef.current){ setError('Internal error: Recording file not found.'); resetState(); setIsProcessing(false); } recordingPath.current = ''; return;
        }

        let transcript = '[No speech detected]';
        let geminiResult = null; // To store the object {detected_emotion, response_text}

        try {
            // 2. Read audio file & call STT API
            const audioBytesBase64 = await RNFS.readFile(filePath, 'base64');
            if (isMountedRef.current) setStatusText('Transcribing...');

            const sttRequestBody = { config: { encoding: RECORDER_AUDIO_ENCODING_CONFIG, sampleRateHertz: RECORDER_SAMPLE_RATE, languageCode: 'en-US', enableAutomaticPunctuation: true, }, audio: { content: audioBytesBase64, }, };
            const sttResponse = await fetch(STT_API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sttRequestBody), });
            const sttResponseData = await sttResponse.json();
            if (!sttResponse.ok) { throw new Error(sttResponseData.error?.message || `STT API error ${sttResponse.status}`); }

            // 3. Process Transcript
            if (sttResponseData.results && sttResponseData.results.length > 0) { transcript = sttResponseData.results.map(result => result.alternatives[0].transcript).join('\n'); }
            console.log(`Transcript: ${transcript}`);
            if (isMountedRef.current) { setUserTranscript(transcript); }

            // --- >>> 4. Call Gemini API (expecting structured response) <<< ---
            if (isMountedRef.current) {
                 geminiResult = await callGoogleGeminiAPI(transcript);
            }

            // 5. Handle Gemini Response & Determine TTS Params
            if (isMountedRef.current) {
                if (geminiResult && geminiResult.response_text) {
                    setAiResponseText(geminiResult.response_text);
                    setDetectedEmotion(geminiResult.detected_emotion); // Store detected emotion

                    // --- >>> Determine TTS Params based on Emotion <<< ---
                    let pitch = 0;
                    let speakingRate = 1.0;
                    console.log("Detected Emotion for TTS:", geminiResult.detected_emotion);

                    switch (geminiResult.detected_emotion?.toLowerCase()) {
                        case 'joy':
                        case 'surprise':
                            pitch = 2.0;
                            speakingRate = 1.1;
                            break;
                        case 'sadness':
                        case 'fear':
                            pitch = -2.0;
                            speakingRate = 0.9;
                            break;
                        case 'anger':
                            pitch = -1.0;
                            speakingRate = 1.05;
                            break;
                        case 'neutral':
                        default:
                            pitch = 0;
                            speakingRate = 1.0;
                            break;
                    }
                    // --- >>> End Determine TTS Params <<< ---

                    // 6. Call TTS with dynamic parameters
                    await callGoogleTTSAPI(geminiResult.response_text, pitch, speakingRate);

                } else {
                    // Gemini call failed or returned invalid structure
                    await callGoogleTTSAPI("Sorry, I had trouble processing that request.", 0, 1.0); // Use default voice
                    setIsProcessing(false);
                    resetState(false);
                }
            }

        } catch (err) {
            // 6. Handle Errors during STT or Gemini call chain
            console.error('Error in STT/Gemini processing chain:', err);
            if (isMountedRef.current) {
                setError(`Processing Error: ${err.message}`);
                setStatusText('Error processing request. Tap mic.');
                resetState();
                setIsProcessing(false);
            }
        } finally {
            // 7. Clean up the recording file
            if (filePath) {
                 RNFS.exists(filePath).then(exists => {
                    if (exists) {
                        RNFS.unlink(filePath)
                        .then(() => console.log(`Deleted recording file: ${filePath}`))
                        .catch(e => console.error("Error deleting recording file after STT:", e));
                    }
                 });
                 if (recordingPath.current === fileUri) { recordingPath.current = ''; }
             }
        }
    };

    // Modified TTS function to accept pitch and rate
    const callGoogleTTSAPI = async (textToSpeak, pitch = 0, speakingRate = 1.0) => {
        if (!isMountedRef.current || !textToSpeak) return;
        console.log(`Requesting TTS for: "${textToSpeak}" with pitch: ${pitch}, rate: ${speakingRate}`);
        setStatusText('Generating speech...');
        setIsProcessing(true); // Still processing until TTS audio is ready

        try {
            // --- >>> MODIFIED TTS Request Body <<< ---
            const requestBody = {
                input: { text: textToSpeak },
                // Using standard en-US voice, adjust if needed
                voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: speakingRate, // Use dynamic rate
                    pitch: pitch,               // Use dynamic pitch
                    // effectsProfileId: [] // Add effects if desired, e.g., ["small-bluetooth-speaker-class-device"]
                },
            };
            // --- >>> END MODIFIED TTS Request Body <<< ---

            const response = await fetch( TTS_API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody), } );
            const responseData = await response.json();
            if (!response.ok) { throw new Error(responseData.error?.message || `TTS API error ${response.status}`); }
            if (!responseData.audioContent) { throw new Error('No audio content received from TTS API.'); }

            await playTtsAudio(responseData.audioContent);

        } catch (err) {
            console.error('Error calling Google TTS API:', err);
             if (isMountedRef.current) {
                 setError(`TTS Error: ${err.message}`);
                 setStatusText('Error generating speech. Tap mic.');
                 resetState();
                 setIsProcessing(false); // Reset processing on TTS API error
             }
        }
        // isProcessing will be set to false by playTtsAudio when playback starts
    };
    // --- End Google Cloud API Calls ---


    // --- TTS Audio Playback Logic ---
     const playTtsAudio = async (base64Audio) => {
         if (!isMountedRef.current) return;
         console.log('Received base64 audio data for playback.');
         setStatusText('Speaking...');
         setIsPlayingTTS(true);
         setIsProcessing(false); // Now playing, no longer processing APIs

         try {
             const audioFilePath = `${RNFS.CachesDirectoryPath}/${TEMP_TTS_AUDIO_FILENAME}`;
             const dir = audioFilePath.substring(0, audioFilePath.lastIndexOf('/'));
             await RNFS.mkdir(dir);
             await RNFS.writeFile(audioFilePath, base64Audio, 'base64');
             ttsAudioPath.current = audioFilePath;
             console.log(`TTS audio saved to: ${audioFilePath}`);

             try { await audioRecorderPlayer.stopPlayer(); } catch(e) { /* ignore */ } // Safety stop

             await audioRecorderPlayer.startPlayer(audioFilePath);
             audioRecorderPlayer.addPlayBackListener((e) => {
                 if (!isMountedRef.current || !isPlayingTTS) return;
                 // Use a threshold slightly before the end
                 if (e.currentPosition > 0 && e.duration > 0 && e.currentPosition >= e.duration - 150) { // Check near end, ensure duration > 0
                     console.log('TTS playback finished');
                     // Use setTimeout to prevent potential race condition
                     setTimeout(() => {
                         if (isMountedRef.current) {
                             stopPlayingTTS(); // Clean up listener and state
                             setStatusText('Tap the mic to start'); // Ready for next turn
                             resetState(false); // Keep text, reset flags
                         }
                     }, 50); // Small delay
                 }
             });
         } catch (err) {
             console.error('Failed to save or play TTS audio:', err);
             if (isMountedRef.current) {
                 setError(`Playback Error: ${err.message}`);
                 setStatusText('Error playing response. Tap mic.');
                 resetState();
                 setIsPlayingTTS(false); // Ensure state reset
                 setIsProcessing(false); // Ensure processing is false on error
             }
         }
     };

     const stopPlayingTTS = async () => {
         console.log('Stopping TTS playback.');
         audioRecorderPlayer.removePlayBackListener(); // Remove listener first
         try {
             await audioRecorderPlayer.stopPlayer();
         } catch (err) { console.log('Stop player error ignored:', err); }
         finally {
             if (isMountedRef.current) { setIsPlayingTTS(false); } // Update state only if mounted
             // Clean up file robustly
             if (ttsAudioPath.current) {
                 const path = ttsAudioPath.current;
                 ttsAudioPath.current = '';
                  RNFS.exists(path).then(exists => {
                     if (exists) RNFS.unlink(path).catch(e => console.error("Error deleting temp file on stop:", e));
                 });
             }
         }
     };
    // --- End TTS Audio Playback Logic ---


    // --- State Reset Helper ---
    const resetState = (clearText = true) => {
        if (!isMountedRef.current) return;
        setIsListening(false);
        setIsProcessing(false);
        setIsPlayingTTS(false);
        setDetectedEmotion('Neutral'); // Reset detected emotion

        if (clearText) {
            setUserTranscript('');
            setAiResponseText('');
        }
        // Update status text only if not currently in an active state
        setTimeout(() => {
            if (isMountedRef.current && !isListening && !isProcessing && !isPlayingTTS) {
               setStatusText(error ? 'Error occurred. Tap mic.' : 'Tap the mic to start');
            }
        }, 50); // Increased delay slightly
    };
    // --- End State Reset Helper ---


    // --- Mic Button Handler ---
    const handleMicPress = () => {
        if (!isMountedRef.current) return;
        console.log(`Mic pressed. State: isListening=${isListening}, isProcessing=${isProcessing}, isPlayingTTS=${isPlayingTTS}, permissionsGranted=${permissionsGranted}`);
        if (error) setError(''); // Clear error on new user action

        if (isListening) {
            stopListening(); // Stop ongoing listening manually
        } else if (isProcessing) {
            console.log("Processing... please wait."); // Inform user, button should be disabled anyway
        } else if (isPlayingTTS) {
            stopPlayingTTS(); // Stop ongoing playback
            resetState();     // Reset to idle state
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


    // --- Mic Style Logic ---
     const getMicStyle = () => {
        if (isListening) return { icon: "stop-circle-outline", color: colors.micButtonIconActive };
        if (isProcessing) return { icon: "hourglass-outline", color: colors.micButtonIconProcessing };
        if (isPlayingTTS) return { icon: "volume-high-outline", color: colors.micButtonIconProcessing };
        return { icon: "mic-outline", color: colors.micButtonIconIdle };
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
                                 speed={(isListening || isPlayingTTS || isProcessing) ? 1.5 : 1} // Animate faster when active
                             />
                             <View style={styles.statusDisplay}>
                                 {/* Removed recording timer */}
                                 <Text style={error ? styles.errorText : styles.statusText}>
                                     {error || statusText}
                                 </Text>
                                 {/* Optional: Display detected emotion for debugging */}
                                 {/* <Text style={{color: 'grey', marginTop: 5}}>Emotion: {detectedEmotion}</Text> */}
                                 {/* Show button to retry permissions if denied */}
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
                                            isListening && styles.micButtonRecording, // Style for listening state
                                            !permissionsGranted && styles.micButtonDisabled // Style for disabled state
                                        ]}
                                        onPress={handleMicPress}
                                        activeOpacity={0.7}
                                        // Disable button if processing OR if permissions not granted
                                        // Allow tapping to stop if listening or playing TTS
                                        disabled={isProcessing || !permissionsGranted}
                                    >
                                        {/* Use optional chaining and defaults for safety */}
                                        <Icon
                                            name={micStyle?.icon || "mic-outline"}
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
     header: {
         paddingHorizontal: 15,
         paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 15 : 15,
         width: '100%',
         position: 'absolute',
         top: 0,
         left: 0,
         zIndex: 1,
     },
     backButton: { padding: 10, alignSelf: 'flex-start', },
     contentArea: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20, paddingTop: 80, paddingBottom: 150, },
     lottieVisualizer: { width: 200, height: 200, marginBottom: 10, },
     statusDisplay: { minHeight: 80, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, },
     recordTimeText: { fontSize: 16, color: colors.textSecondary, marginBottom: 5, }, // Style kept but element removed
     statusText: { fontSize: 18, fontWeight: '500', color: colors.textPrimary, textAlign: 'center', },
     errorText: { fontSize: 17, fontWeight: 'bold', color: colors.errorText, textAlign: 'center', marginBottom: 5, },
     retryButton: { marginTop: 10, paddingVertical: 5, paddingHorizontal: 10, },
     retryPermissionText: { color: colors.micButtonIconIdle, fontWeight: 'bold', textDecorationLine: 'underline', },
     footer: { width: '100%', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 40 : 30, position: 'absolute', bottom: 0, left: 0, },
     micButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.micButtonBackground, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 8, borderWidth: 2, borderColor: 'rgba(0,0,0,0.1)', },
     micButtonRecording: { borderColor: colors.micButtonIconActive, borderWidth: 3, }, // Style for listening state
     micButtonDisabled: { backgroundColor: '#CCCCCC', opacity: 0.7, elevation: 0, shadowOpacity: 0, },
});
// --- End Styles ---

export default VoiceModeAIScreen;