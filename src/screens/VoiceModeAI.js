/**
 * VoiceModeAIScreen.js
 * REBUILT - June 8, 2025
 * - Implemented a true conversational flow with chat history context for Gemini.
 * - Redesigned UI to display a scrollable chat history.
 * - Replaced multiple boolean flags with a robust state machine for managing the conversation state.
 * - Added automatic re-listening after the AI speaks for a seamless experience.
 * - AI now provides an initial greeting to start the conversation.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ImageBackground, Platform, StatusBar,
    PermissionsAndroid, AppState, Alert, Linking, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';

// --- Configuration ---
// IMPORTANT: Use environment variables for API keys in a real app.
const GOOGLE_API_KEY = 'AIzaSyCFn0v-9w8a-FTNyudXcPRJDLhSh9LVdWI'; // Replace with your actual key
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_API_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GOOGLE_API_KEY}`;
const TTS_API_ENDPOINT = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;
const STT_API_ENDPOINT = `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_API_KEY}`;

const RECORDER_SAMPLE_RATE = 16000;
const audioSet = Platform.select({
    ios: { AVSampleRateKeyIOS: RECORDER_SAMPLE_RATE, AVFormatIDKeyIOS: 'lpcm', AVNumberOfChannelsKeyIOS: 1 },
    android: { AudioSourceAndroid: 6, OutputFormatAndroid: 3, AudioEncoderAndroid: 1, AudioSampleRateAndroid: RECORDER_SAMPLE_RATE, AudioChannelsAndroid: 1 },
});

// --- UI Colors & Styles ---
const colors = {
    backgroundOverlay: 'rgba(10, 20, 40, 0.4)',
    textPrimary: '#FFFFFF',
    textSecondary: '#E0E0E0',
    micButtonBackground: '#FFFFFF',
    micButtonIconActive: '#FF4136', // Listening color
    micButtonIconIdle: '#007AFF', // Idle color
    micButtonIconProcessing: '#AAAAAA',
    iconColor: '#FFFFFF',
    errorText: '#FF6B6B',
    userBubble: '#007AFF',
    aiBubble: 'rgba(255, 255, 255, 0.15)',
};

const audioRecorderPlayer = new AudioRecorderPlayer();
audioRecorderPlayer.setSubscriptionDuration(0.1);

// --- Main Component ---
const VoiceModeAIScreen = () => {
    const navigation = useNavigation();

    // --- State Management ---
    const [conversationState, setConversationState] = useState('IDLE'); // IDLE, LISTENING, THINKING, SPEAKING
    const [chatHistory, setChatHistory] = useState([]);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [error, setError] = useState('');

    // --- Refs ---
    const isMountedRef = useRef(true);
    const scrollViewRef = useRef(null);
    const audioFilePath = useRef('');

    // --- Core Functions ---

    const checkAndRequestPermissions = useCallback(async () => {
        // ... (permission logic remains the same, but simplified for clarity)
        if (Platform.OS !== 'android') { setPermissionsGranted(true); return true; }
        try {
            const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
                setPermissionsGranted(true);
                return true;
            }
            setError('Microphone permission is required to use voice mode.');
            Alert.alert("Permission Required", "Microphone permission is needed.", [{ text: "Cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }]);
            return false;
        } catch (err) {
            console.warn(err);
            setError('An error occurred while requesting permissions.');
            return false;
        }
    }, []);

    const processAudio = useCallback(async (path) => {
        if (!isMountedRef.current) return;
        setConversationState('THINKING');
        try {
            const audioBase64 = await RNFS.readFile(path, 'base64');
            const sttResponse = await fetch(STT_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ config: { encoding: 'AMR_WB', sampleRateHertz: RECORDER_SAMPLE_RATE, languageCode: 'en-US' }, audio: { content: audioBase64 } }),
            });
            const sttData = await sttResponse.json();
            const transcript = sttData.results?.[0]?.alternatives?.[0]?.transcript;

            if (!transcript) throw new Error('Could not understand audio.');

            const userMessage = { role: 'user', parts: [{ text: transcript }] };
            const updatedHistory = [...chatHistory, userMessage];
            setChatHistory(updatedHistory);

            const geminiResponse = await fetch(GEMINI_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: updatedHistory, generationConfig: { temperature: 0.7 } }),
            });
            const geminiData = await geminiResponse.json();
            const aiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!aiText) throw new Error('AI did not provide a response.');
            
            setChatHistory(prev => [...prev, { role: 'model', parts: [{ text: aiText }] }]);
            speak(aiText);

        } catch (e) {
            console.error("Processing Error:", e);
            setError(e.message || "An error occurred.");
            setConversationState('IDLE');
        } finally {
            if (audioFilePath.current) RNFS.unlink(audioFilePath.current).catch(() => {});
        }
    }, [chatHistory]);

    const speak = useCallback(async (text) => {
        if (!isMountedRef.current) return;
        setConversationState('SPEAKING');
        try {
            const ttsResponse = await fetch(TTS_API_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: { text }, voice: { languageCode: 'en-US', ssmlGender: 'FEMALE' }, audioConfig: { audioEncoding: 'MP3' } }),
            });
            const ttsData = await ttsResponse.json();
            const audioContent = ttsData.audioContent;
            if (!audioContent) throw new Error('TTS failed to generate audio.');

            const path = `${RNFS.CachesDirectoryPath}/tts_audio.mp3`;
            await RNFS.writeFile(path, audioContent, 'base64');
            
            audioRecorderPlayer.addPlayBackListener(async (e) => {
                if (e.currentPosition === e.duration) {
                    await audioRecorderPlayer.stopPlayer();
                    audioRecorderPlayer.removePlayBackListener();
                    if (isMountedRef.current) {
                        // Automatically start listening again for a conversational flow
                        setConversationState('IDLE'); // Go to idle first, then start listening
                        handleMicPress(); // Re-trigger the listening state
                    }
                }
            });
            await audioRecorderPlayer.startPlayer(path);

        } catch (e) {
            console.error("TTS/Speak Error:", e);
            setError("I couldn't speak my response.");
            setConversationState('IDLE');
        }
    }, []);

    const startListening = useCallback(async () => {
        if (!permissionsGranted) { await checkAndRequestPermissions(); return; }
        setConversationState('LISTENING');
        setError('');
        const path = Platform.select({ ios: 'rec.wav', android: `${RNFS.CachesDirectoryPath}/rec.amr` });
        audioFilePath.current = path;
        try {
            await audioRecorderPlayer.startRecorder(path, audioSet);
        } catch (e) {
            console.error("Start Recorder Error:", e);
            setError("Could not start microphone.");
            setConversationState('IDLE');
        }
    }, [permissionsGranted, checkAndRequestPermissions]);

    const stopListening = useCallback(async () => {
        try {
            const resultPath = await audioRecorderPlayer.stopRecorder();
            if (resultPath) {
                processAudio(resultPath);
            } else {
                throw new Error("Failed to get recording path.");
            }
        } catch (e) {
            console.error("Stop Recorder Error:", e);
            setError("Could not stop recording.");
            setConversationState('IDLE');
        }
    }, [processAudio]);

    const handleMicPress = () => {
        if (!isMountedRef.current) return;
        
        switch (conversationState) {
            case 'IDLE':
                startListening();
                break;
            case 'LISTENING':
                stopListening();
                break;

            case 'SPEAKING':
                audioRecorderPlayer.stopPlayer();
                setConversationState('IDLE');
                break;
            case 'THINKING':
                // Do nothing while processing
                break;
        }
    };
    
    // --- Effects ---
    useFocusEffect(useCallback(() => {
        isMountedRef.current = true;
        checkAndRequestPermissions();
        // Initial greeting
        if (chatHistory.length === 0) {
            const initialGreeting = "Hello! How can I help you on your wellness journey today?";
             setChatHistory([{ role: 'model', parts: [{ text: initialGreeting }] }]);
             speak(initialGreeting);
        }
        return () => { isMountedRef.current = false; audioRecorderPlayer.stopPlayer(); audioRecorderPlayer.stopRecorder(); };
    }, [checkAndRequestPermissions]));

    useEffect(() => {
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollToEnd({ animated: true });
        }
    }, [chatHistory]);

    // --- Render ---
    const getMicIcon = () => {
        switch(conversationState) {
            case 'LISTENING': return { name: 'mic', color: colors.micButtonIconActive };
            case 'THINKING': return { name: 'hourglass-outline', color: colors.micButtonIconProcessing };
            case 'SPEAKING': return { name: 'volume-high', color: colors.primary };
            case 'IDLE': default: return { name: 'mic-off', color: colors.micButtonIconIdle };
        }
    };

    return (
        <View style={styles.container}>
            <ImageBackground source={require('../assets/new.gif')} resizeMode="cover" style={styles.backgroundImage}>
                <View style={styles.overlay} />
                <SafeAreaView style={styles.safeArea}>
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}><Icon name="arrow-back-outline" size={30} color={colors.iconColor} /></TouchableOpacity>
                    </View>

                    <ScrollView ref={scrollViewRef} contentContainerStyle={styles.chatContainer}>
                        {chatHistory.map((message, index) => (
                            <View key={index} style={[ styles.bubbleContainer, message.role === 'user' ? styles.userBubbleContainer : styles.aiBubbleContainer ]}>
                                <View style={[ styles.bubble, message.role === 'user' ? styles.userBubble : styles.aiBubble ]}>
                                    <Text style={styles.chatText}>{message.parts[0].text}</Text>
                                </View>
                            </View>
                        ))}
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.micButton, conversationState === 'LISTENING' && styles.micButtonActive]}
                            onPress={handleMicPress}
                            disabled={conversationState === 'THINKING'}
                        >
                            {conversationState === 'THINKING' ? (
                                <ActivityIndicator color={colors.micButtonIconProcessing} />
                            ) : (
                                <Icon name={getMicIcon().name} size={38} color={getMicIcon().color} />
                            )}
                        </TouchableOpacity>
                        <Text style={styles.statusText}>
                            {conversationState === 'LISTENING' && 'Listening... Tap to stop.'}
                            {conversationState === 'THINKING' && 'Thinking...'}
                            {conversationState === 'SPEAKING' && 'Speaking...'}
                            {conversationState === 'IDLE' && 'Tap to speak'}
                        </Text>
                    </View>
                </SafeAreaView>
            </ImageBackground>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    backgroundImage: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.backgroundOverlay },
    safeArea: { flex: 1, justifyContent: 'space-between' },
    header: { flexDirection: 'row', paddingHorizontal: 15, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
    backButton: { padding: 10 },
    chatContainer: { flexGrow: 1, paddingHorizontal: 10, justifyContent: 'flex-end', paddingBottom: 20 },
    bubbleContainer: { flexDirection: 'row', marginVertical: 5 },
    userBubbleContainer: { justifyContent: 'flex-end' },
    aiBubbleContainer: { justifyContent: 'flex-start' },
    bubble: { padding: 15, borderRadius: 20, maxWidth: '80%' },
    userBubble: { backgroundColor: colors.userBubble, borderBottomRightRadius: 5 },
    aiBubble: { backgroundColor: colors.aiBubble, borderBottomLeftRadius: 5 },
    chatText: { color: colors.textPrimary, fontSize: 16, lineHeight: 22 },
    errorText: { color: colors.errorText, textAlign: 'center', marginTop: 10, padding: 10, backgroundColor: 'rgba(255,0,0,0.2)', borderRadius: 10 },
    footer: { width: '100%', alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 40 : 30 },
    micButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.micButtonBackground, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 8 },
    micButtonActive: { transform: [{ scale: 1.1 }], shadowColor: colors.micButtonIconActive, shadowOpacity: 0.5, shadowRadius: 15 },
    statusText: { color: colors.textSecondary, marginTop: 15, fontSize: 16 },
});

export default VoiceModeAIScreen;