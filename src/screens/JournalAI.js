import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView,
    Platform, Keyboard, FlatList, ActivityIndicator, Dimensions, Alert, InteractionManager
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather'; // Using Feather Icons
import { IconButton } from 'react-native-paper'; // Import IconButton for Play button
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { GEMINI_API_KEY } from '@env'; // Ensure this is configured correctly

// --- Toast Notifications ---
import Toast from 'react-native-toast-message'; // Import Toast

// --- Voice Note Imports ---
import AudioRecorderPlayer, {
    AVEncoderAudioQualityIOSType, AVEncodingOption, AudioEncoderAndroidType, AudioSourceAndroidType, RecordBackType, PlayBackType
} from 'react-native-audio-recorder-player';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import RNFS from 'react-native-fs'; // For defining save path

// --- Constants ---
const COLORS = { /* ... Colors ... */
    background: '#F7F9FC', primary: '#A3A8F0', primaryLight: '#D0D3FA', secondary: '#C2F0F0', secondaryLight: '#E0F7FA', accent: '#F0E4F8', accentLight: '#F8F0FC', text: '#34495E', textSecondary: '#8A95B5', lightText: '#AEB8D5', white: '#FFFFFF', cardBackground: '#FFFFFF', border: '#E0E5F1', error: '#E74C3C', disabled: '#B0BEC5', happy: '#FFDA63', sad: '#87CEEB', calm: '#A3A8F0', neutral: '#D0D3FA', anxious: '#FFAC81', stressed: '#C3A9F4', grateful: '#FFD700', tagBackground: '#E0F7FA', suggestionBackground: '#F8F0FC', recording: '#E74C3C', playButton: '#4CAF50', deleteButton: '#E57373',
};
const { width } = Dimensions.get('window');
const INPUT_TEXT_MAX_HEIGHT = 120;

// --- API Config ---
// IMPORTANT: Ensure GEMINI_API_KEY is correctly set up in Google Cloud
const API_KEY = GEMINI_API_KEY;
if (!API_KEY || API_KEY === 'YOUR_REAL_GEMINI_API_KEY_HERE' || API_KEY.length < 10) {
    console.error("❌ CRITICAL: GEMINI_API_KEY is not configured correctly in .env or is invalid.");
}
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const API_URL = `${API_BASE_URL}?key=${API_KEY}`;

// --- VOICE NOTE ADDITION: Audio Recorder Instance & Config ---
const audioRecorderPlayer = new AudioRecorderPlayer();
// We rely on the manual timer now, so library subscription duration is less critical
// audioRecorderPlayer.setSubscriptionDuration(0.1);
const audioSet = { /* ... audio settings ... */
    AudioEncoderAndroid: AudioEncoderAndroidType.AAC, AudioSourceAndroid: AudioSourceAndroidType.MIC, AVEncoderAudioQualityKeyIOS: AVEncoderAudioQualityIOSType.high, AVNumberOfChannelsKeyIOS: 2, AVFormatIDKeyIOS: AVEncodingOption.aac,
};
const RECORDING_DIR = Platform.OS === 'ios'
    ? `${RNFS.DocumentDirectoryPath}/JournalAudio` // App's private documents (iOS)
    : `${RNFS.DocumentDirectoryPath}/JournalAudio`; // App's private documents (Android)

// --- Helper Functions ---

// ** Custom Timer Formatting Function **
const formatMillisToMMSS = (millis) => {
    if (typeof millis !== 'number' || millis < 0) return '00:00'; // Handle invalid input
    const totalSeconds = Math.floor(millis / 1000);
    const seconds = totalSeconds % 60;
    const minutes = Math.floor(totalSeconds / 60);
    // Pad with leading zeros
    const paddedSeconds = String(seconds).padStart(2, '0');
    const paddedMinutes = String(minutes).padStart(2, '0');
    return `${paddedMinutes}:${paddedSeconds}`;
};

const getMockReflectivePrompt = () => { /* ... */ const prompts = [ 'What small moment brought you joy today?', 'Describe a challenge you faced and how you navigated it.', 'What are you grateful for right now?', 'Is there something weighing on your mind you need to release?', 'What act of kindness (given or received) stood out today?', 'How did you prioritize your well-being today?', 'Reflect on a recent interaction. How did it make you feel?', 'What is one thing you learned about yourself recently?', ]; return prompts[Math.floor(Math.random() * prompts.length)]; };
const getMoodIcon = (mood) => { /* ... */ const lowerMood = mood?.toLowerCase() || 'neutral'; switch (lowerMood) { case 'happy': return { name: 'smile', color: COLORS.happy }; case 'sad': return { name: 'frown', color: COLORS.sad }; case 'calm': return { name: 'wind', color: COLORS.calm }; case 'neutral': return { name: 'meh', color: COLORS.neutral }; case 'anxious': return { name: 'alert-triangle', color: COLORS.anxious }; case 'stressed': return { name: 'cloud-lightning', color: COLORS.stressed }; case 'grateful': return { name: 'gift', color: COLORS.grateful }; default: return { name: 'circle', color: COLORS.lightText }; } };
const getSuggestionIcon = (type) => { /* ... */ const lowerType = type?.toLowerCase() || 'tip'; switch (lowerType) { case 'tip': return 'info'; case 'affirmation': return 'heart'; case 'breathing': return 'wind'; case 'expert': return 'award'; case 'song': return 'music'; case 'reflection_prompt': return 'help-circle'; default: return 'message-circle'; } };

// --- Real AI Analysis ---
const fetchAIAnalysis = async (text) => { /* ... (keep robust implementation) ... */
    console.log("Attempting AI Analysis...");
    if (!API_KEY || API_KEY === 'YOUR_REAL_GEMINI_API_KEY_HERE' || API_KEY.length < 10) { throw new Error("API Key not configured."); }
    const aiPrompt = `Analyze the following journal entry. STRICTLY respond ONLY with a valid JSON object matching this structure: {"mood": "detected_mood", "tags": ["tag1", "tag2"], "suggestions": [{"type": "suggestion_type", "text": "suggestion_text"}]}. - "mood" MUST be one of: happy, sad, calm, neutral, anxious, stressed, grateful. Default to "neutral" if unsure. - "tags" MUST be an array of 1-3 relevant keyword strings. - "suggestions" MUST be an array of 1-2 objects. - "type" for suggestions MUST be one of: tip, affirmation, breathing, expert, reflection_prompt. - "text" for suggestions MUST be concise and helpful. Journal entry: "${text}"`;
    const requestBody = { contents: [{ parts: [{ text: aiPrompt }] }], generationConfig: { temperature: 0.6, maxOutputTokens: 512, }, safetySettings: [ { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE", }, { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE", }, { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE", }, { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE", }, ], };
    console.log("🤖 Sending to Gemini API:", API_URL);
    try {
        const response = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', }, body: JSON.stringify(requestBody), });
        console.log(`📄 AI Response Status: ${response.status}`);
        if (!response.ok) { /* ... error handling ... */ throw new Error(`AI API request failed: ${response.status}`); }
        const data = await response.json();
        const promptBlockReason = data?.promptFeedback?.blockReason; if (promptBlockReason) { return { mood: 'neutral', tags: ['analysis_blocked', 'prompt_filter'], suggestions: [{ type: 'tip', text: `Analysis stopped due to prompt content (${promptBlockReason}).` }] }; }
        const candidate = data?.candidates?.[0]; if (!candidate) { return { mood: 'neutral', tags: ['analysis_error', 'no_candidates'], suggestions: [{ type: 'tip', text: `AI response format invalid (no candidates).` }] }; }
        const finishReason = candidate.finishReason; let generatedText = candidate?.content?.parts?.[0]?.text;
        if (!generatedText || (finishReason && finishReason !== "STOP" && finishReason !== "MAX_TOKENS")) { const reasonTag = finishReason?.toLowerCase() || 'no_text'; let reasonText = finishReason || 'No Text'; if (finishReason === 'SAFETY') reasonText = 'Response content safety'; return { mood: 'neutral', tags: ['analysis_stopped', reasonTag], suggestions: [{ type: 'tip', text: `AI analysis incomplete (${reasonText}).` }] }; }
        console.log("🧼 Raw AI generated text:", generatedText);
        let jsonString = generatedText.trim();
        if (jsonString.startsWith("```json")) { jsonString = jsonString.substring(7).trim(); } else if (jsonString.startsWith("```")) { jsonString = jsonString.substring(3).trim(); } if (jsonString.endsWith("```")) { jsonString = jsonString.substring(0, jsonString.length - 3).trim(); }
        jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
        console.log("🧼 Cleaned text for JSON check:", jsonString);
        if (jsonString.startsWith('{') && jsonString.endsWith('}')) {
            console.log("🧼 Attempting to parse potential JSON:", jsonString);
            try { const parsedAnalysis = JSON.parse(jsonString); /* ... validation ... */ if (!parsedAnalysis.mood || !Array.isArray(parsedAnalysis.tags) || !Array.isArray(parsedAnalysis.suggestions)) { return { mood: 'neutral', tags: ['analysis_incomplete', 'parsing_issue'], suggestions: [{ type: 'tip', text: "AI analysis structure unexpected." }] }; } const validMoods = ['happy', 'sad', 'calm', 'neutral', 'anxious', 'stressed', 'grateful']; if (!validMoods.includes(parsedAnalysis.mood)) { parsedAnalysis.mood = 'neutral'; } if (!parsedAnalysis.suggestions.every(s => s && typeof s === 'object' && typeof s.type === 'string' && typeof s.text === 'string')) { parsedAnalysis.suggestions = parsedAnalysis.suggestions.filter(s => s && typeof s === 'object' && typeof s.type === 'string' && typeof s.text === 'string'); if (parsedAnalysis.suggestions.length === 0) parsedAnalysis.suggestions.push({ type: 'tip', text: "Invalid suggestions received." }); } console.log("✅ Successfully parsed AI analysis:", parsedAnalysis); if (finishReason === 'MAX_TOKENS') console.log("ℹ️ AI response truncated."); return parsedAnalysis; }
            catch (parseError) { console.error("❌ Failed to parse JSON:", parseError); console.error("❌ String failed:", jsonString); return { mood: 'neutral', tags: ['parsing_failed'], suggestions: [{ type: 'tip', text: `Could not process AI format (JSON parse error).` }] }; }
        } else { console.error("❌ Cleaned text not JSON object:", jsonString); return { mood: 'neutral', tags: ['parsing_failed', 'no_json_found'], suggestions: [{ type: 'tip', text: `AI response not expected JSON format.` }] }; }
    } catch (error) { console.error('❌ Error in fetchAIAnalysis catch block:', error); if (error instanceof Error) { throw error; } else { throw new Error(String(error) || "Unknown error during AI analysis"); } }
};


// --- Render Journal History Item (Memoized) ---
const MemoizedJournalHistoryItem = React.memo(({
    item,
    onPlayPause, // Callback function to handle play/pause
    currentlyPlayingId, // ID of the item currently playing (or null)
    onDelete // Callback function to handle delete
}) => {
    // ... (Keep implementation from previous version) ...
    const validItem = item || {};
    const text = validItem.text || '';
    const audioFilePath = validItem.audioFilePath || null;
    const mood = validItem.mood || 'neutral';
    let timestamp = null;
    if (validItem.timestamp?.toDate) { timestamp = validItem.timestamp.toDate(); }
    else if (validItem.timestamp instanceof Date) { timestamp = validItem.timestamp; }
    const prompt = validItem.prompt || null;
    const modeText = validItem.mode || (audioFilePath ? 'voice' : 'text');
    const moodInfo = getMoodIcon(mood);
    const isPlaying = item.id === currentlyPlayingId;

    let dateString = 'No Date'; let timeString = '';
    if (timestamp instanceof Date && !isNaN(timestamp)) {
        try { dateString = timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { console.warn("Date format error", e); }
        try { timeString = timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); } catch (e) { console.warn("Time format error", e); }
    } else if (validItem.timestamp) { console.warn("Invalid timestamp object received for history item:", validItem.timestamp); }

    const displayText = audioFilePath ? (text || "[Voice Note]") : text || 'No content available';
    const displayIcon = modeText === 'voice' ? 'mic' : modeText === 'reflective' ? 'help-circle' : 'edit-3';

    const handlePlayPausePress = () => {
        if (audioFilePath && item.id) {
            onPlayPause(audioFilePath, item.id);
        }
    };

    // Delete handler for this specific item
    const handleDeletePress = () => {
        if (item.id) {
            onDelete(item.id, audioFilePath); // Pass ID and path to parent
        }
    };

    return (
        <View style={styles.historyItem}>
            <View style={styles.historyHeader}>
                {/* Left side: Mood icon, Date, Time */}
                <View style={styles.historyHeaderLeft}>
                    <Icon name={moodInfo.name} size={20} color={moodInfo.color || COLORS.lightText} style={styles.historyMoodIcon} />
                    <Text style={styles.historyDate} numberOfLines={1}>{String(dateString)}</Text>
                    <Text style={styles.historyTime} numberOfLines={1}>{String(timeString)}</Text>
                </View>
                {/* Right side: Delete Button */}
                <IconButton
                    icon="trash-can-outline"
                    size={18}
                    color={COLORS.deleteButton}
                    onPress={handleDeletePress}
                    // Removed style={styles.deleteButton} to avoid negative margin issues
                    rippleColor={COLORS.deleteButton + '30'} // Optional: visual feedback
                />
            </View>
            {prompt && <Text style={styles.historyPrompt} numberOfLines={1}>Prompt: {prompt}</Text>}
            <Text style={styles.historyText} numberOfLines={audioFilePath ? 1 : 2}>{String(displayText)}</Text>

            <View style={styles.historyFooter}>
                <View style={styles.footerLeft}>
                    <Icon name={displayIcon} size={14} color={COLORS.lightText} />
                    <Text style={styles.historyModeText}>{String(modeText)}</Text>
                </View>
                {/* Audio Controls */}
                {audioFilePath && (
                    <View style={styles.audioControls}>
                         {/* FIX: Structure for Text Warning */}
                         <View style={styles.audioAttachedContainer}>
                            <Icon name="paperclip" size={11} color={COLORS.lightText} style={styles.audioAttachedIcon} />
                            <Text style={styles.audioAttachedText}>Audio</Text>
                         </View>
                        <IconButton
                            icon={isPlaying ? "pause-circle" : "play-circle"}
                            size={28}
                            color={COLORS.primary}
                            onPress={handlePlayPausePress}
                            style={styles.playPauseButton}
                        />
                    </View>
                )}
            </View>
        </View>
    );
});


// --- Main Journal Screen Component ---
const ZenariJournalScreen = () => {
    // --- State ---
    const [isAuthLoading, setIsAuthLoading] = useState(true);
    const [journalEntry, setJournalEntry] = useState('');
    const [mode, setMode] = useState('text');
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null);
    const [reflectivePrompt, setReflectivePrompt] = useState('');
    const [journalHistory, setJournalHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [error, setError] = useState('');
    const [currentUserId, setCurrentUserId] = useState(null);
    // Voice recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordTime, setRecordTime] = useState('00:00'); // Initial format MM:SS
    const [currentAudioPath, setCurrentAudioPath] = useState('');
    const [hasMicPermission, setHasMicPermission] = useState(false);
    // Voice playback state
    const [isPlayingId, setIsPlayingId] = useState(null);
    const [playBackTime, setPlayBackTime] = useState('00:00'); // Format MM:SS
    const [playBackDuration, setPlayBackDuration] = useState('00:00'); // Format MM:SS

    // --- Refs ---
    const textInputRef = useRef(null);
    const scrollViewRef = useRef(null);
    const firestoreListenerUnsubscribe = useRef(null);
    const playbackListener = useRef(null);
    const manualTimerIntervalRef = useRef(null);
    const recordingStartTimeRef = useRef(null);

    // --- Callbacks ---

    // Request Microphone Permission
    const requestAudioPermission = useCallback(async () => { /* ... (keep implementation) ... */
        setError(''); const permission = Platform.OS === 'ios' ? PERMISSIONS.IOS.MICROPHONE : PERMISSIONS.ANDROID.RECORD_AUDIO;
        try { const result = await request(permission); if (result === RESULTS.GRANTED) { setHasMicPermission(true); try { await RNFS.mkdir(RECORDING_DIR); } catch(e){console.warn("mkdir error",e);} return true; } else { setHasMicPermission(false); let msg = 'Mic permission required.'; if (result === RESULTS.BLOCKED) msg += ' Enable in settings.'; Alert.alert('Permission Required', msg); setError('Permission denied.'); return false; }} catch (err) { console.error('Mic perm error:', err); setError('Perm request failed.'); setHasMicPermission(false); Alert.alert('Error', 'Failed mic perm request.'); return false; }
    }, []);

    // Start Audio Recording (Now also starts accurate manual timer)
    const startRecording = useCallback(async () => { /* ... (keep implementation) ... */
        if (isRecording) return; setError(''); const granted = await requestAudioPermission(); if (!granted) return; if (!currentUserId) { console.error("Cannot start recording: No user ID"); Toast.show({ type: 'error', text1: 'Error', text2: 'User ID not found.' }); return; } if (isPlayingId) { await stopPlayback(); }
        try { await RNFS.mkdir(RECORDING_DIR); const timestamp = Date.now(); const path = `${RECORDING_DIR}/journal_${currentUserId}_${timestamp}.m4a`; console.log('Starting recording to:', path); const result = await audioRecorderPlayer.startRecorder(path, audioSet); console.log('Rec started:', result); recordingStartTimeRef.current = Date.now(); setCurrentAudioPath(path); setRecordTime('00:00'); setIsRecording(true); } catch (err) { console.error('❌ Failed to start recording:', err); setError(`Failed to start recording: ${err.message || 'Unknown error'}`); Toast.show({ type: 'error', text1: 'Recording Error', text2: `Could not start recording. ${err.message || ''}`, visibilityTime: 4000 }); setIsRecording(false); setCurrentAudioPath(''); recordingStartTimeRef.current = null; }
    }, [isRecording, requestAudioPermission, currentUserId, isPlayingId, stopPlayback]);

    // Stop Audio Recording (Now also stops manual timer via useEffect)
    const stopRecording = useCallback(async () => { /* ... (keep implementation using formatMillisToMMSS) ... */
        if (!isRecording) return; console.log('Stopping recording...'); try { const result = await audioRecorderPlayer.stopRecorder(); console.log('Rec stopped:', result); if (recordingStartTimeRef.current) { const finalDurationMs = Date.now() - recordingStartTimeRef.current; setRecordTime(formatMillisToMMSS(finalDurationMs)); } } catch (err) { console.error('Stop rec error:', err); setError('Stop rec failed.'); } finally { setIsRecording(false); recordingStartTimeRef.current = null; }
    }, [isRecording]);

    // Handle Mode Change
    const handleModeChange = useCallback(async (newMode) => { /* ... (keep implementation) ... */
        if (mode === newMode) return; if (isRecording && newMode !== 'voice') { await stopRecording(); setCurrentAudioPath(''); setRecordTime('00:00'); Toast.show({ type: 'info', text1: 'Recording Discarded', text2: 'Switched mode before saving.' }); }
        console.log(`Changing mode from ${mode} to ${newMode}`); setMode(newMode); setAiAnalysis(null); setJournalEntry(''); setError(''); if (newMode !== 'voice') { setCurrentAudioPath(''); setRecordTime('00:00'); } // Reset recordTime here too
        if (newMode === 'text' || newMode === 'reflective') { setTimeout(() => textInputRef.current?.focus(), 150); } else { Keyboard.dismiss(); if (newMode === 'voice' && !hasMicPermission) await requestAudioPermission(); }
    }, [mode, isRecording, stopRecording, hasMicPermission, requestAudioPermission]);

    // Handle Saving Journal Entry (Added Manual Update for Voice Notes)
    const handleSaveEntry = useCallback(async () => { /* ... (keep implementation with manual update) ... */
        const entryTextToSave = journalEntry.trim(); const entryAudioToSave = currentAudioPath;
        if (isRecording) { Alert.alert("Recording Active", "Stop recording before saving."); return; }
        const hasContentToSave = (mode === 'voice' && !!entryAudioToSave) || ((mode === 'text' || mode === 'reflective') && !!entryTextToSave);
        if (!hasContentToSave || isProcessingAI) { if (mode === 'voice' && !entryAudioToSave) Alert.alert("No Recording", "Record a voice note first."); return; }
        if (!currentUserId) { Alert.alert("Login Required", "Log in to save entries."); return; }
        Keyboard.dismiss(); setIsProcessingAI(true); setAiAnalysis(null); setError(''); let analysisResult = null; let newEntryId = null;
        try { if (mode === 'text' || mode === 'reflective') { analysisResult = await fetchAIAnalysis(entryTextToSave); setAiAnalysis(analysisResult); } else { analysisResult = { mood: 'neutral', tags: [], suggestions: [] }; }
            const entryData = { userId: currentUserId, text: (mode === 'text' || mode === 'reflective') ? entryTextToSave : '', audioFilePath: mode === 'voice' ? entryAudioToSave : null, mode: mode, prompt: mode === 'reflective' ? reflectivePrompt : null, timestamp: firestore.FieldValue.serverTimestamp(), mood: analysisResult?.mood || 'neutral', tags: (mode !== 'voice' && Array.isArray(analysisResult?.tags) && !analysisResult?.tags?.some(t => t.includes('error') || t.includes('stopped') || t.includes('failed'))) ? analysisResult.tags : [], suggestionsGiven: (mode !== 'voice' && Array.isArray(analysisResult?.suggestions) && !analysisResult?.tags?.some(t => t.includes('error') || t.includes('stopped') || t.includes('failed'))) ? analysisResult.suggestions : [], };
            console.log("💾 Saving to Firestore 'journals':", entryData); const docRef = await firestore().collection('journals').add(entryData); newEntryId = docRef.id; console.log(`✅ Entry saved successfully with ID: ${newEntryId}.`);
            const newItem = { id: newEntryId, ...entryData, timestamp: new Date(), }; setJournalHistory(prevHistory => [newItem, ...prevHistory]); console.log("Manually added new entry to history state.");
            setJournalEntry(''); setCurrentAudioPath(''); setRecordTime('00:00'); // Reset recordTime display
            const isAnalysisIssue = analysisResult?.tags?.some(tag => tag.includes('error') || tag.includes('fail') || tag.includes('incomplete') || tag.includes('stopped') || tag.includes('parsing_failed') || tag.includes('no_json_found') || tag.includes('blocked'));
            if (mode === 'voice') { Toast.show({ type: 'success', text1: 'Voice Note Saved', position: 'bottom' }); } else if (isAnalysisIssue) { const issueText = analysisResult?.suggestions?.[0]?.text || 'Check analysis card.'; Toast.show({ type: 'info', text1: 'Entry Saved (Analysis Issue)', text2: issueText, visibilityTime: 4000, position: 'bottom' }); } else { Toast.show({ type: 'success', text1: 'Entry Saved & Analyzed', text2: `Mood detected: ${analysisResult?.mood || 'N/A'}.`, position: 'bottom' }); }
        } catch (e) { console.error("❌ Error during save/analysis process: ", e); let userErrorMessage = `Failed to process entry: ${e.message || 'Unknown error'}`; let alertTitle = "Error"; if (e.code === 'permission-denied') { userErrorMessage = "Permission denied saving."; alertTitle = "Save Error"; } else if (String(e.message).includes("API Key")) { userErrorMessage = `Config Error: ${e.message}`; alertTitle = "Config Error"; } else if (String(e.message).includes("AI API") || String(e.message).includes("Content blocked") || String(e.message).includes("Authentication/Permission")) { userErrorMessage = e.message; alertTitle = "AI Analysis Error"; setAiAnalysis({ mood: 'error', tags: ['ai_error'], suggestions: [{ type: 'tip', text: userErrorMessage }] }); } else if (String(e.message).includes("Firestore") || e.code) { userErrorMessage = `Database Error: ${e.message}.`; alertTitle = "Save Error"; } else { userErrorMessage = `An unexpected error occurred: ${e.message}`; } setError(userErrorMessage); if (!alertTitle.startsWith("AI Analysis")) Alert.alert(alertTitle, userErrorMessage); }
        finally { setIsProcessingAI(false); }
    }, [journalEntry, currentAudioPath, isRecording, isProcessingAI, currentUserId, mode, reflectivePrompt]);

    // --- Playback Callbacks ---
    const stopPlayback = useCallback(async () => { /* ... (keep implementation using formatMillisToMMSS) ... */
        console.log('Stopping playback'); setIsPlayingId(null); try { await audioRecorderPlayer.stopPlayer(); if (playbackListener.current) { audioRecorderPlayer.removePlayBackListener(playbackListener.current); playbackListener.current = null; console.log('Playback listener removed.'); } } catch (err) { console.error('Failed to stop player:', err); } setPlayBackTime('00:00'); setPlayBackDuration('00:00');
    }, []);

    const startPlayback = useCallback(async (path, id) => { /* ... (keep implementation using formatMillisToMMSS) ... */
        if (isPlayingId && isPlayingId !== id) { await stopPlayback(); } console.log(`Starting playback for ID: ${id}, Path: ${path}`); try { const fileExists = await RNFS.exists(path); if (!fileExists) { throw new Error(`Audio file not found: ${path}`); } const result = await audioRecorderPlayer.startPlayer(path); console.log('Playback started:', result); setIsPlayingId(id); if (playbackListener.current) { audioRecorderPlayer.removePlayBackListener(playbackListener.current); playbackListener.current = null; } const listener = (e) => { if (e.currentPosition != null && e.duration != null) { setPlayBackTime(formatMillisToMMSS(e.currentPosition)); setPlayBackDuration(formatMillisToMMSS(e.duration)); if (e.currentPosition >= e.duration - 150) { console.log('Playback likely finished'); stopPlayback(); } } }; audioRecorderPlayer.addPlayBackListener(listener); playbackListener.current = listener; console.log('Playback listener added.'); } catch (err) { console.error('Failed to start player:', err); Toast.show({ type: 'error', text1: 'Playback Error', text2: err.message || 'Could not play audio.' }); setIsPlayingId(null); }
    }, [isPlayingId, stopPlayback]);

    // Combined Play/Pause Handler
    const handlePlayPause = useCallback((path, id) => { /* ... (keep implementation) ... */
        if (isPlayingId === id) { stopPlayback(); } else { startPlayback(path, id); }
    }, [isPlayingId, startPlayback, stopPlayback]);

    // ** Delete Entry Handler (with Manual State Update & Enhanced Logging) **
    const handleDeleteEntry = useCallback(async (entryId, entryAudioFilePath) => {
        if (!entryId) {
            console.error("Delete failed: No entry ID provided.");
            Toast.show({ type: 'error', text1: 'Delete Error', text2: 'Cannot delete entry without ID.' });
            return;
        }

        Alert.alert(
            "Delete Entry",
            "Are you sure you want to permanently delete this journal entry?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        console.log(`Attempting to delete entry: ${entryId}`);
                        try {
                            if (isPlayingId === entryId) {
                                await stopPlayback();
                            }

                            // Attempt Firestore deletion
                            await firestore().collection('journals').doc(entryId).delete();
                            console.log(`Firestore document delete command sent for: ${entryId}`);

                            // ** Manually update UI state immediately **
                            setJournalHistory(prevHistory => prevHistory.filter(item => item.id !== entryId));
                            console.log(`UI State manually filtered for deleted entry: ${entryId}`); // Log manual filter

                            // Delete local file (best effort)
                            if (entryAudioFilePath) {
                                try {
                                    const fileExists = await RNFS.exists(entryAudioFilePath);
                                    if (fileExists) {
                                        await RNFS.unlink(entryAudioFilePath);
                                        console.log(`Local audio file deleted: ${entryAudioFilePath}`);
                                    } else {
                                         console.log(`Local audio file not found, skipping delete: ${entryAudioFilePath}`);
                                    }
                                } catch (fileErr) {
                                    console.warn(`Could not delete local audio file ${entryAudioFilePath}:`, fileErr);
                                }
                            }

                            Toast.show({ type: 'success', text1: 'Entry Deleted' });

                        } catch (err) {
                            // ** Enhanced Error Logging **
                            console.error(`❌ Failed to delete entry ${entryId}: Code: ${err.code}, Message: ${err.message}`, err);
                            const errorMsg = err.code === 'permission-denied'
                                ? 'Permission denied by Firestore rules.'
                                : err.message || 'Could not delete entry.';
                            Toast.show({ type: 'error', text1: 'Delete Failed', text2: errorMsg });
                            setError(`Failed to delete entry: ${errorMsg}`);
                        }
                    }
                }
            ]
        );
    }, [isPlayingId, stopPlayback]); // Dependencies

    // --- Effects ---

    // Get User ID & Handle Auth Changes
    useEffect(() => { /* ... (keep implementation) ... */
        console.log("Setting up auth listener..."); let initialAuthCheckDone = false;
        const subscriber = auth().onAuthStateChanged(async (user) => { const newUserId = user ? user.uid : null; const userIdChanged = newUserId !== currentUserId; console.log(newUserId ? `Auth state: User logged in: ${newUserId}` : "Auth state: User logged out."); if (userIdChanged) { console.log("User ID changed..."); if (isRecording) await stopRecording(); if (isPlayingId) await stopPlayback(); setCurrentUserId(newUserId); setJournalHistory([]); setJournalEntry(''); setAiAnalysis(null); setError(''); setCurrentAudioPath(''); setRecordTime('00:00'); /* Reset to MM:SS */ setIsLoadingHistory(!!newUserId); setHasMicPermission(false); if(newUserId) requestAudioPermission(); if (!newUserId && firestoreListenerUnsubscribe.current) { firestoreListenerUnsubscribe.current(); firestoreListenerUnsubscribe.current = null; } } if (!initialAuthCheckDone) { console.log("Initial auth check complete."); setIsAuthLoading(false); initialAuthCheckDone = true; if (!newUserId) setIsLoadingHistory(false); } });
        return () => { console.log("Cleaning up auth listener."); subscriber(); if (isRecording) stopRecording(); if (isPlayingId) stopPlayback(); audioRecorderPlayer.removeRecordBackListener(); if (playbackListener.current) audioRecorderPlayer.removePlayBackListener(playbackListener.current); if (firestoreListenerUnsubscribe.current) firestoreListenerUnsubscribe.current(); };
    }, [currentUserId, isRecording, isPlayingId, stopRecording, requestAudioPermission, stopPlayback]);

    // Setup Audio Recording Listener (Now only for debugging)
    useEffect(() => {
        const recordBackListener = (e) => {
            // console.log('Record Listener Fired (Debug):', e); // Keep commented unless debugging library
        };
        audioRecorderPlayer.addRecordBackListener(recordBackListener);
        // console.log("Record back listener added (for debugging only).");
        if(currentUserId && !hasMicPermission) requestAudioPermission();
        return () => {
            // console.log("Removing record back listener.");
            audioRecorderPlayer.removeRecordBackListener();
        };
    }, [currentUserId, hasMicPermission, requestAudioPermission]);

    // ** EFFECT FOR MANUAL TIMER (ACCURATE & MM:SS) **
    useEffect(() => {
        if (isRecording) {
            // console.log("Starting manual timer interval..."); // Less verbose logging
            if (!recordingStartTimeRef.current) {
                 recordingStartTimeRef.current = Date.now();
            }
            setRecordTime('00:00'); // Reset display initially

            manualTimerIntervalRef.current = setInterval(() => {
                if (recordingStartTimeRef.current) {
                    const elapsed = Date.now() - recordingStartTimeRef.current;
                    // Use custom formatter with MILLISECONDS
                    const formattedTime = formatMillisToMMSS(elapsed);
                    // console.log(`Manual Timer Tick - Elapsed: ${elapsed}ms, Formatted: ${formattedTime}`); // Keep for debugging if needed
                    setRecordTime(formattedTime);
                } else {
                    // console.warn("Manual timer interval fired but recordingStartTimeRef is not set.");
                }
            }, 1000); // Update every second

        } else {
            // Clear interval if not recording or when recording stops
            if (manualTimerIntervalRef.current) {
                // console.log("Clearing manual timer interval."); // Less verbose logging
                clearInterval(manualTimerIntervalRef.current);
                manualTimerIntervalRef.current = null;
            }
             // Reset start time ref when recording stops
             recordingStartTimeRef.current = null;
        }

        // Cleanup function for the effect
        return () => {
            if (manualTimerIntervalRef.current) {
                // console.log("Cleaning up manual timer interval on unmount/dependency change."); // Less verbose logging
                clearInterval(manualTimerIntervalRef.current);
                manualTimerIntervalRef.current = null;
            }
             recordingStartTimeRef.current = null; // Also reset on cleanup
        };
    }, [isRecording]); // Dependency: Run whenever isRecording changes

    // Fetch Reflective Prompt Once
    useEffect(() => { setReflectivePrompt(getMockReflectivePrompt()); }, []);

    // Fetch Journal History (Triggered by currentUserId change)
    // ***** CRITICAL: Requires Firestore index on 'journals' collection: userId ASC, timestamp DESC *****
    // ***** If history doesn't update in real-time, THIS INDEX IS LIKELY MISSING OR INEFFICIENT! *****
    useEffect(() => { /* ... (keep implementation with debug logs) ... */
        if (firestoreListenerUnsubscribe.current) { console.log("Unsubscribing previous Firestore listener."); firestoreListenerUnsubscribe.current(); firestoreListenerUnsubscribe.current = null; }
        if (!currentUserId) { setJournalHistory([]); setIsLoadingHistory(false); console.log("No user ID, skipping history fetch."); return; }
        setIsLoadingHistory(true); setError(''); console.log(`Setting up Firestore listener for user: ${currentUserId}`);
        const query = firestore().collection('journals').where('userId', '==', currentUserId).orderBy('timestamp', 'desc').limit(25);
        const subscriber = query.onSnapshot( querySnapshot => { console.log("Firestore listener fired."); if (querySnapshot === null) { console.warn("Firestore listener received null snapshot."); setIsLoadingHistory(false); return; } console.log(` > Snapshot received: ${querySnapshot.size} docs. Has pending writes: ${querySnapshot.metadata.hasPendingWrites}`); const history = []; querySnapshot.forEach(doc => { const data = doc.data(); if (data && (data.text !== undefined || data.audioFilePath !== undefined) && data.timestamp) { const tsDate = data.timestamp?.toDate ? data.timestamp.toDate() : null; if (tsDate instanceof Date && !isNaN(tsDate)) { history.push({ id: doc.id, ...data, timestamp: data.timestamp }); } else { console.warn(`Skipping entry ${doc.id}: Invalid timestamp`, data.timestamp); } } else { console.warn(`Skipping invalid entry ${doc.id}`, data); } }); console.log(` > Processed ${history.length} history items from snapshot.`); setJournalHistory(history); console.log(` > setJournalHistory called.`); setIsLoadingHistory(false); }, firestoreError => { console.error("❌ Firestore Error fetching history: ", firestoreError); let historyError = "Could not load history."; if (firestoreError.code === 'permission-denied') historyError = "Permission denied."; else if (firestoreError.code === 'unauthenticated') historyError = "Auth error."; else if (firestoreError.message?.includes("index")) { historyError = "DB index needed."; console.error("❗ Firestore Index Required: Create composite index on 'journals' collection: userId ASC, timestamp DESC."); Alert.alert("DB Setup Recommended", "Index needed for faster history. See console."); } setError(historyError); setIsLoadingHistory(false); setJournalHistory([]); });
        firestoreListenerUnsubscribe.current = subscriber;
        return () => { if (firestoreListenerUnsubscribe.current) { console.log(`Unsubscribing Firestore listener on cleanup for user: ${currentUserId}`); firestoreListenerUnsubscribe.current(); firestoreListenerUnsubscribe.current = null; } };
    }, [currentUserId]);


    // --- Render Logic ---

    // Render Mode Specific Input UI
    const renderModeSpecificInput = useCallback(() => { /* ... (keep implementation, uses recordTime state) ... */
        const isInputDisabled = !currentUserId || isProcessingAI || (mode === 'voice' && !hasMicPermission && !isRecording); const isMicButtonDisabled = !currentUserId || isProcessingAI || (!hasMicPermission && !isRecording);
        const placeholderText = !currentUserId ? "Log in to use journal..." : (mode === 'reflective' ? "Your reflection on the prompt..." : "How are you feeling today?"); const textInputStyle = [styles.textInput, isInputDisabled && styles.textInputDisabled];
        switch (mode) { case 'voice': let voiceStatus = "Tap mic to record."; if (!currentUserId) voiceStatus = "Log in to record"; else if (!hasMicPermission && !isRecording) voiceStatus = "Mic permission needed."; else if (isRecording) voiceStatus = `Recording... (${recordTime})`; /* <-- Uses recordTime */ else if (currentAudioPath) voiceStatus = `Finished (${recordTime}). Ready to save.`; /* <-- Uses recordTime */ return (<View style={styles.voiceInputWrapper}>{!hasMicPermission && currentUserId && !isRecording && (<TouchableOpacity onPress={requestAudioPermission} style={styles.permissionButton}><Icon name="alert-triangle" size={16} color={COLORS.error} style={{ marginRight: 8 }}/><Text style={styles.permissionButtonText}>Grant Mic Permission</Text></TouchableOpacity>)}<TouchableOpacity style={[ styles.micButton, isRecording && styles.micButtonRecording, isMicButtonDisabled && styles.micButtonDisabled ]} onPress={isRecording ? stopRecording : startRecording} disabled={isMicButtonDisabled} ><Icon name={isRecording ? "square" : "mic"} size={30} color={COLORS.white} /></TouchableOpacity><Text style={styles.voiceStatusText}>{voiceStatus}</Text></View>); case 'reflective': return (<View><View style={styles.promptContainer}><Icon name="help-circle" size={22} color={COLORS.primary} style={styles.promptIcon} /><Text style={styles.promptText}>{reflectivePrompt || "Loading prompt..."}</Text></View><TextInput ref={textInputRef} style={textInputStyle} value={journalEntry} onChangeText={setJournalEntry} placeholder={placeholderText} placeholderTextColor={COLORS.lightText} multiline editable={!isInputDisabled} /></View>); default: return (<TextInput ref={textInputRef} style={textInputStyle} value={journalEntry} onChangeText={setJournalEntry} placeholder={placeholderText} placeholderTextColor={COLORS.lightText} multiline editable={!isInputDisabled} />); }
    }, [ currentUserId, isProcessingAI, mode, journalEntry, reflectivePrompt, isRecording, recordTime, currentAudioPath, hasMicPermission, startRecording, stopRecording, requestAudioPermission ]);

    // Render AI Analysis Card
    const renderAIAnalysis = useCallback(() => { /* ... (keep implementation) ... */
        if (mode === 'voice') return null; if (isProcessingAI && (mode === 'text' || mode === 'reflective') && !aiAnalysis) { return ( <View style={[styles.aiContainer, styles.aiLoadingContainer]}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.aiStatusText}>Analyzing...</Text></View> ); } if (!aiAnalysis) return null;
        const isErrorState = aiAnalysis.tags?.includes('ai_error') || aiAnalysis.tags?.includes('parsing_failed'); const isWarningState = aiAnalysis.tags?.includes('analysis_incomplete') || aiAnalysis.tags?.includes('analysis_stopped') || aiAnalysis.tags?.includes('parsing_issue') || aiAnalysis.tags?.includes('no_json_found') || aiAnalysis.tags?.includes('analysis_blocked');
        if (isErrorState || isWarningState) { const iconName = isErrorState ? "alert-octagon" : "alert-circle"; const color = isErrorState ? COLORS.error : COLORS.anxious; const title = isErrorState ? "Analysis Error" : "Analysis Info"; const detailText = aiAnalysis.suggestions?.[0]?.text || "Could not complete analysis."; return ( <View style={[styles.aiContainer, { borderColor: color }]}><View style={styles.aiHeader}><Icon name={iconName} size={28} color={color} /><Text style={[styles.aiTitle, { color: color }]}> {title} </Text></View><View style={styles.aiSection}><Text style={styles.suggestionText}> {detailText} </Text></View></View> ); }
        const { mood, tags, suggestions } = aiAnalysis; const moodInfo = getMoodIcon(mood);
        return ( <View style={styles.aiContainer}><View style={styles.aiHeader}><Icon name={moodInfo.name} size={28} color={moodInfo.color || COLORS.primary} /><Text style={[styles.aiTitle, { color: moodInfo.color || COLORS.primary }]}> {mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : 'Analysis'} Mood </Text></View>{tags?.length > 0 && ( <View style={styles.aiSection}><Text style={styles.subtleHeading}>Themes</Text><View style={styles.tagContainer}>{tags.map((tag, index) => <Text key={`${tag}-${index}`} style={styles.tag}>#{tag}</Text>)}</View></View> )}{suggestions?.length > 0 && ( <View style={styles.aiSection}><Text style={styles.subtleHeading}>Suggestions</Text><View style={styles.suggestionsContainer}>{suggestions.map((suggestion, index) => ( <View key={index} style={styles.suggestionItem}><Icon name={getSuggestionIcon(suggestion.type)} size={20} color={COLORS.primary} style={styles.suggestionIcon} /><Text style={styles.suggestionText}>{suggestion.text}</Text></View> ))} </View></View> )}{(!suggestions || suggestions.length === 0) && tags && tags.length > 0 && ( <View style={{ marginBottom: -15 }} /> )}</View> );
    }, [aiAnalysis, isProcessingAI, mode]);

    // --- Main JSX Render ---

    // Initial Auth Loading State
    if (isAuthLoading) {
        return ( <SafeAreaView style={[styles.safeArea, styles.loadingContainer]}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={styles.loadingText}>Initializing...</Text></SafeAreaView> );
    }

    // Main UI
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView ref={scrollViewRef} style={styles.scrollView} contentContainerStyle={styles.scrollViewContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} >
                <Text style={styles.title}>Zenari Journal</Text>
                {/* Mode Selector */}
                <View style={styles.modeSelector}>
                   {['text', 'voice', 'reflective'].map((m) => { /* ... mode buttons ... */
                       const isActive = mode === m; let iconName = 'edit-3'; if (m === 'reflective') iconName = 'help-circle'; if (m === 'voice') iconName = 'mic'; const isDisabled = !currentUserId || isProcessingAI;
                       return ( <TouchableOpacity key={m} style={[styles.modeButton, isActive && styles.modeButtonActive, isDisabled && styles.modeButtonDisabled]} onPress={() => handleModeChange(m)} disabled={isDisabled} > <Icon name={iconName} size={18} color={isDisabled ? COLORS.disabled : (isActive ? COLORS.white : COLORS.primary)} /> <Text style={[styles.modeButtonText, isActive && styles.modeButtonTextActive, isDisabled && styles.modeButtonTextDisabled]}>{m.charAt(0).toUpperCase() + m.slice(1)}</Text> </TouchableOpacity> );
                   })}
                </View>

                {/* Conditional Rendering: Login Prompt or Main Content */}
                {!currentUserId ? (
                    <View style={styles.loginPrompt}><Icon name="lock" size={20} color={COLORS.error} style={{marginRight: 10}}/><Text style={styles.loginPromptText}>Please log in to use the journal.</Text></View>
                ) : (
                    <>
                        {renderModeSpecificInput()}
                        {/* Save Button Logic */}
                        <>
                            {(((mode === 'text' || mode === 'reflective') && journalEntry.trim()) || (mode === 'voice' && currentAudioPath && !isRecording)) && !isProcessingAI ? ( <TouchableOpacity style={styles.saveButton} onPress={handleSaveEntry} > <Text style={styles.saveButtonText}>{mode === 'voice' ? 'Save Voice Note' : 'Save & Analyze Entry'}</Text> </TouchableOpacity> ) : null }
                            {isProcessingAI ? ( <TouchableOpacity style={[styles.saveButton, styles.saveButtonDisabled]} disabled={true} > <ActivityIndicator color={mode === 'voice' ? COLORS.text : COLORS.white} style={{ marginRight: 10 }}/> <Text style={styles.saveButtonText}>{mode === 'voice' ? 'Saving...' : 'Analyzing...'}</Text> </TouchableOpacity> ) : null}
                        </>
                        {/* General Error Display */}
                        {error && !error.includes("history") && !error.includes("Permission") && !(aiAnalysis?.tags?.includes('ai_error')) ? ( <Text style={[styles.errorText, {textAlign: 'center', marginBottom: 15}]}>{error}</Text> ) : null}
                        {/* AI Analysis Card */}
                        {renderAIAnalysis()}
                        {/* Insight Card */}
                        <View style={styles.insightCard}><Icon name="activity" size={24} color={COLORS.secondary} style={styles.insightIcon}/><View style={styles.insightContent}><Text style={styles.insightTitle}>Daily Reflection</Text><Text style={styles.insightText}>Taking a moment to journal helps understand thoughts & feelings.</Text></View></View>
                    </>
                )}

                {/* History Section */}
                {/* ***** IMPORTANT: Requires Firestore index: *****
                    Collection: 'journals', Fields: 'userId' ASC, 'timestamp' DESC */}
                <View style={styles.historyContainer}>
                     <Text style={styles.historyTitle}>Recent Entries</Text>
                     {!currentUserId ? (
                         <Text style={styles.historyPlaceholder}>Log in to see history.</Text>
                     ) : isLoadingHistory ? (
                         <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary}/><Text style={styles.loadingText}>Loading history...</Text></View>
                     ) : error && error.includes("history") ? (
                         <Text style={[styles.errorText, styles.historyPlaceholder]}>{error}</Text>
                     ) : journalHistory.length > 0 ? (
                         <FlatList
                             data={journalHistory}
                             renderItem={({ item }) => (
                                 <MemoizedJournalHistoryItem
                                     item={item}
                                     onPlayPause={handlePlayPause} // Pass the handler
                                     currentlyPlayingId={isPlayingId} // Pass the currently playing ID
                                     onDelete={handleDeleteEntry} // ** NEW: Pass delete handler **
                                 />
                             )}
                             keyExtractor={(item) => item.id} // Use Firestore document ID as key
                             scrollEnabled={false} // Essential inside ScrollView
                             ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                             // Add extraData prop to help FlatList update when non-data props change
                             extraData={isPlayingId}
                         />
                     ) : (
                         <Text style={styles.historyPlaceholder}>Your journal thoughts appear here.</Text>
                     )}
                 </View>
            </ScrollView>
             {/* Toast component needs to be rendered at top level (in App.js) */}
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background },
    scrollView: { flex: 1, },
    scrollViewContent: { padding: 20, paddingBottom: 60, },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, minHeight: 100, },
    loadingText: { marginTop: 10, fontSize: 14, color: COLORS.textSecondary, },
    title: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: 25, },
    modeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-around', // Keep space around
        flexWrap: 'wrap', // ** UI FIX: Allow wrapping **
        marginBottom: 25,
        backgroundColor: COLORS.white,
        borderRadius: 30,
        paddingVertical: 6,
        paddingHorizontal: 6,
        elevation: 20,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12, // Slightly reduced padding
        borderRadius: 25,
        // flex: 1, // ** UI FIX: Removed flex: 1 **
        marginHorizontal: 4, // Keep some margin
        marginVertical: 3, // Add vertical margin for wrapped items
        justifyContent: 'center',
        minHeight: 40,
    },
    modeButtonActive: { backgroundColor: COLORS.primary, elevation: 20, shadowOpacity: 0.15, shadowRadius: 3, },
    modeButtonText: { fontSize: 14, marginLeft: 8, color: COLORS.primary, fontWeight: '600', textAlign: 'center', },
    modeButtonTextActive: { color: COLORS.white, },
    modeButtonDisabled: { opacity: 0.5, },
    modeButtonTextDisabled: { color: COLORS.disabled, },
    textInput: { backgroundColor: COLORS.cardBackground, minHeight: 150, borderRadius: 15, paddingTop: 15, padding: 15, fontSize: 16, color: COLORS.text, marginBottom: 20, borderWidth: 1, borderColor: COLORS.border, lineHeight: 24, textAlignVertical: 'top', },
    textInputDisabled: { backgroundColor: COLORS.background, color: COLORS.lightText, borderColor: COLORS.disabled + '60', opacity: 0.7, },
    voiceInputWrapper: { alignItems: 'center', marginBottom: 20, padding: 15, backgroundColor: COLORS.white, borderRadius: 15, borderWidth: 1, borderColor: COLORS.border, minHeight: 180, justifyContent: 'center', },
    micButton: { backgroundColor: COLORS.primary, width: 75, height: 75, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 15, elevation: 20, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 5, borderWidth: 2, borderColor: COLORS.primaryLight + '99', },
    micButtonRecording: { backgroundColor: COLORS.recording, shadowColor: COLORS.recording, borderColor: COLORS.error + '99', },
    micButtonDisabled: { backgroundColor: COLORS.disabled, opacity: 0.6, elevation: 20, shadowColor: COLORS.disabled, borderColor: COLORS.disabled + '50', },
    voiceStatusText: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 10, textAlign: 'center', minHeight: 20, },
    permissionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.error + '20', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: COLORS.error + '50', },
    permissionButtonText: { color: COLORS.error, fontSize: 14, fontWeight: '600', },
    audioPathDebugText: { fontSize: 11, color: COLORS.lightText, marginTop: 5, fontStyle: 'italic', opacity: 0.8, }, // Kept for potential future use
    promptContainer: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: COLORS.accentLight, padding: 15, borderRadius: 12, marginBottom: 15, borderLeftWidth: 4, borderLeftColor: COLORS.accent, },
    promptIcon: { marginRight: 10, marginTop: 2, color: COLORS.primary, },
    promptText: { fontSize: 15, color: COLORS.text, flex: 1, lineHeight: 22, },
    saveButton: { backgroundColor: COLORS.secondary, paddingVertical: 15, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginBottom: 25, elevation: 20, shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, borderWidth: 1, borderColor: COLORS.secondary + '50', minHeight: 50, },
    saveButtonDisabled: { backgroundColor: COLORS.disabled, opacity: 0.7, elevation: 20, shadowOpacity: 0.1, borderColor: COLORS.disabled + '50', },
    saveButtonText: { color: COLORS.text, fontSize: 16, fontWeight: '600', },
    aiContainer: { backgroundColor: COLORS.cardBackground, borderRadius: 15, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: COLORS.border, },
    aiLoadingContainer: { alignItems: 'center', paddingVertical: 30, },
    aiStatusText: { marginTop: 15, fontSize: 15, color: COLORS.primary, textAlign: 'center', fontWeight: '500', },
    aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: COLORS.border, },
    aiTitle: { fontSize: 18, fontWeight: '600', marginLeft: 12, },
    aiSection: { marginBottom: 15, },
    subtleHeading: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8, },
    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', },
    tag: { backgroundColor: COLORS.tagBackground, color: COLORS.text, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, marginRight: 8, marginBottom: 8, fontSize: 13, fontWeight: '500', },
    suggestionsContainer:{ },
    suggestionItem: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, padding: 12, backgroundColor: COLORS.suggestionBackground, borderRadius: 10, },
    suggestionIcon: { marginRight: 12, marginTop: 3, color: COLORS.primary, },
    suggestionText: { fontSize: 15, color: COLORS.text, flex: 1, lineHeight: 22, },
    insightCard: { backgroundColor: COLORS.white, borderRadius: 15, padding: 20, marginBottom: 25, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 30, },
    insightIcon:{ marginRight: 15, color: COLORS.secondary, },
    insightContent: { flex: 1, },
    insightTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 5, },
    insightText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, },
    historyContainer: { marginTop: 20, },
    historyTitle: { fontSize: 20, fontWeight: '600', color: COLORS.text, marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, },
    historyItem: { backgroundColor: COLORS.cardBackground, borderRadius: 12, padding: 15, borderWidth: 1, borderColor: COLORS.border, },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Space between left group and delete button
        marginBottom: 8,
    },
    historyHeaderLeft: { // Group mood, date, time
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1, // Allow shrinking if needed
        marginRight: 8, // Space before delete button
    },
    historyMoodIcon: { marginRight: 10, },
    historyDate: { fontSize: 14, color: COLORS.text, fontWeight: '600', marginRight: 5, }, // Added margin
    historyTime: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', flexShrink: 1, }, // Allow time to shrink if needed
    deleteButton: { // Style for delete button positioning
         margin: -10, // Reduce touchable area padding
    },
    historyPrompt: { fontSize: 13, color: COLORS.primary, fontStyle: 'italic', marginBottom: 8, opacity: 0.9, },
    historyText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 5, },
    historyFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', // Space out mode text and controls
        marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border, },
    footerLeft: { flexDirection: 'row', alignItems: 'center', }, // Group mode icon and text
    historyModeText: { fontSize: 12, color: COLORS.lightText, marginLeft: 6, textTransform: 'capitalize', },
    audioControls: { flexDirection: 'row', alignItems: 'center', }, // Container for play button and time
    // Style for the container holding audio indicator icon + text
    audioAttachedContainer: { flexDirection: 'row', alignItems: 'center', marginRight: 8, // Add some space before play button
    },
    audioAttachedIcon: { // Style for the paperclip icon
         marginRight: 4,
    },
    audioAttachedText: { // Style for the "Audio" text
         fontSize: 11,
         color: COLORS.lightText,
         fontStyle: 'italic',
         opacity: 0.8,
    },
    playPauseButton: { margin: -8, // Reduce margin/padding to make it fit better visually
         padding: 0,
    },
    historyPlaceholder: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', marginTop: 40, paddingBottom: 20, fontStyle: 'italic', },
    errorText: { color: COLORS.error, fontSize: 14, fontWeight: '500', textAlign: 'center', marginVertical: 10, paddingHorizontal: 10, },
    loginPrompt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, backgroundColor: COLORS.accentLight, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: COLORS.accent, },
    loginPromptText: { fontSize: 16, color: COLORS.text, fontWeight: '500', },
});


export default ZenariJournalScreen;
