import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Platform,
    Keyboard,
    FlatList,
    ActivityIndicator,
    Dimensions,
    Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather'; // Using Feather Icons
import Voice from '@react-native-voice/voice';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
// Consider adding LinearGradient if you want background gradients
// import LinearGradient from 'react-native-linear-gradient';
import { GEMINI_API_KEY } from '@env'; // Ensure this is correctly set up

// --- New Color Palette (Zenari Theme) ---
const COLORS = {
    background: '#F7F9FC',      // Very Light Blue/Off-white for clean background
    primary: '#A3A8F0',         // Mid Blue/Purple (Main Accent)
    primaryLight: '#D0D3FA',    // Lighter shade of primary
    secondary: '#C2F0F0',       // Cyan/Teal Blue (Secondary Accent)
    secondaryLight: '#E0F7FA',  // Lighter Teal
    accent: '#F0E4F8',          // Light Pink/Lavender (Accent)
    accentLight: '#F8F0FC',     // Lighter Pink/Lavender
    text: '#34495E',            // Dark Slate Blue/Gray (Primary Text)
    textSecondary: '#8A95B5',   // Mid Blue-Gray (Secondary Text)
    lightText: '#AEB8D5',       // Light Blue-Gray (Muted Text/Icons)
    white: '#FFFFFF',
    cardBackground: '#FFFFFF',  // White for cards
    border: '#E0E5F1',          // Subtle light blue-gray border
    error: '#E74C3C',           // Soft Red
    disabled: '#B0BEC5',        // Neutral Grey for disabled states

    // Mood Colors (Mapped to new palette)
    happy: '#FFDA63',           // Yellow
    sad: '#87CEEB',             // Sky Blue
    calm: '#A3A8F0',             // Primary Blue/Purple
    neutral: '#D0D3FA',         // Primary Light
    anxious: '#FFAC81',         // Coral
    stressed: '#C3A9F4',         // Lavender
    grateful: '#FFD700',         // Gold

    // Tag/Suggestion Backgrounds (derived)
    tagBackground: '#E0F7FA',     // secondaryLight (Light Teal)
    suggestionBackground: '#F8F0FC', // accentLight (Light Lavender)
};

const { width } = Dimensions.get('window');

// --- API Config ---
// --- 🚨 CRITICAL: Ensure GEMINI_API_KEY is correctly set in your .env file and valid! ---
const API_KEY = GEMINI_API_KEY;
if (!API_KEY || API_KEY === 'YOUR_REAL_GEMINI_API_KEY_HERE' || API_KEY.length < 10) {
    console.error("❌ CRITICAL: GEMINI_API_KEY is not configured, is a placeholder, or is too short. Please check your .env file and Google Cloud setup.");
    // Optionally throw an error or show a persistent warning in the UI
    // Alert.alert("Configuration Error", "Gemini API Key is missing or invalid. Please check app setup.");
}
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
const API_URL = `${API_BASE_URL}?key=${API_KEY}`; // Key is in the URL query parameter


// --- Helper Functions ---
const getMockReflectivePrompt = () => {
    const prompts = [
        'What small moment brought you joy today?',
        'Describe a challenge you faced and how you navigated it.',
        'What are you grateful for right now?',
        'Is there something weighing on your mind you need to release?',
        'What act of kindness (given or received) stood out today?',
        'How did you prioritize your well-being today?',
        'Reflect on a recent interaction. How did it make you feel?',
        'What is one thing you learned about yourself recently?',
    ];
    return prompts[Math.floor(Math.random() * prompts.length)];
};

const getMoodIcon = (mood) => {
    const lowerMood = mood?.toLowerCase() || 'neutral';
    switch (lowerMood) {
        case 'happy': return { name: 'smile', color: COLORS.happy };
        case 'sad': return { name: 'frown', color: COLORS.sad };
        case 'calm': return { name: 'wind', color: COLORS.calm };
        case 'neutral': return { name: 'meh', color: COLORS.neutral };
        case 'anxious': return { name: 'alert-triangle', color: COLORS.anxious };
        case 'stressed': return { name: 'cloud-lightning', color: COLORS.stressed };
        case 'grateful': return { name: 'gift', color: COLORS.grateful };
        default: return { name: 'circle', color: COLORS.lightText }; // Default icon
    }
};

const getSuggestionIcon = (type) => {
    const lowerType = type?.toLowerCase() || 'tip';
    switch (lowerType) {
        case 'tip': return 'info';
        case 'affirmation': return 'heart';
        case 'breathing': return 'wind';
        case 'expert': return 'award';
        case 'song': return 'music';
        case 'reflection_prompt': return 'help-circle';
        default: return 'message-circle';
    }
};

// --- Real AI Analysis (with JSON cleanup and enhanced logging) ---
const fetchAIAnalysis = async (text) => {
    console.log("Attempting AI Analysis..."); // Log start

    // Check for missing or placeholder API key again (belt and braces)
    if (!API_KEY || API_KEY === 'YOUR_REAL_GEMINI_API_KEY_HERE' || API_KEY.length < 10) {
        console.error("❌ fetchAIAnalysis: API Key is missing or invalid.");
        throw new Error("API Key not configured. Please check app setup.");
    }

    const aiPrompt = `Analyze the following journal entry. STRICTLY respond ONLY with a valid JSON object matching this structure: {"mood": "detected_mood", "tags": ["tag1", "tag2"], "suggestions": [{"type": "suggestion_type", "text": "suggestion_text"}]}.
    - "mood" MUST be one of: happy, sad, calm, neutral, anxious, stressed, grateful. Default to "neutral" if unsure.
    - "tags" MUST be an array of 1-3 relevant keyword strings.
    - "suggestions" MUST be an array of 1-2 objects.
    - "type" for suggestions MUST be one of: tip, affirmation, breathing, expert, reflection_prompt.
    - "text" for suggestions MUST be concise and helpful.
    Journal entry: "${text}"`;

    const requestBody = {
        contents: [{ parts: [{ text: aiPrompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 300 },
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_LOW_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_LOW_AND_ABOVE" },
        ]
    };

    console.log("🤖 Sending to Gemini API:", API_URL); // Log URL (key is visible here, be careful in public logs)
    // console.log("🤖 Request Body:", JSON.stringify(requestBody, null, 2)); // Uncomment carefully for debugging, logs the prompt text

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });

        console.log(`📄 AI Response Status: ${response.status}`); // Log status code

        // --- Improved Error Handling & Logging ---
        if (!response.ok) {
            let errorBodyText = "Could not read error body";
            let errorBodyJson = null;
            try {
                errorBodyText = await response.text(); // Try getting text first
                errorBodyJson = JSON.parse(errorBodyText); // Then try parsing
            } catch (e) {
                console.warn("Could not parse error body as JSON:", e);
            }

            console.error("❌ AI Fetch Error Details:", {
                status: response.status,
                statusText: response.statusText,
                responseBodyText: errorBodyText, // Log raw text body
                responseBodyJson: errorBodyJson  // Log parsed JSON if available
            });

            let errorMessage = errorBodyJson?.error?.message || `HTTP Error ${response.status}`;
             // Use the base URL (without key) in error messages for clarity
            if (response.status === 404) errorMessage = `Model not found or API endpoint incorrect (${API_BASE_URL}). Check API_URL and model name. (${response.status})`;
            else if (response.status === 403 ) errorMessage = `Authentication/Permission Error (403). Check API Key validity, API enabled status, restrictions (IP, bundle ID), Billing, and Model access (${API_BASE_URL}).`;
            else if (response.status === 401 ) errorMessage = `Authentication/Permission Error (401). Check API Key validity.`; // Less common with API keys in URL
            else if (response.status === 400) errorMessage = `Bad Request. Check prompt structure, API URL, or safety settings. (${response.status}) - ${errorBodyJson?.error?.details || errorMessage}`;
            else if (response.status === 429) errorMessage = `Quota exceeded. Please check your API usage limits in Google Cloud. (${response.status})`;
            else errorMessage = `AI API request failed: ${errorMessage} (${response.status})`;

            throw new Error(errorMessage);
        }

        const data = await response.json();
        // console.log("📄 Raw AI Response Data:", JSON.stringify(data, null, 2)); // Uncomment for deep debugging

        // --- Robust Response Handling ---
        const candidate = data?.candidates?.[0];
        if (!candidate) {
            const blockReason = data?.promptFeedback?.blockReason;
            if (blockReason) {
                console.error("🚫 AI Prompt Blocked:", blockReason, data.promptFeedback?.safetyRatings);
                throw new Error(`Content blocked by safety settings (${blockReason}). Review prompt and safety configuration.`);
            }
            console.error("❌ Invalid AI Response: No candidates found.", data);
            throw new Error("AI response format is invalid or empty (no candidates).");
        }

        const finishReason = candidate.finishReason;
        if (finishReason && finishReason !== "STOP") {
            console.warn("⚠️ AI Finish Reason:", finishReason, candidate.safetyRatings);
            if (finishReason === "SAFETY") {
                 console.error("🚫 AI Content Generation Stopped: SAFETY", candidate.safetyRatings);
                 throw new Error("Content generation stopped due to safety concerns. Check response/prompt content.");
            }
            if (finishReason === "MAX_TOKENS") console.log("ℹ️ AI response may be truncated due to max tokens limit.");
            if (finishReason === "RECITATION") console.warn("⚠️ AI response potentially blocked due to recitation.");
            // Allow other reasons but might lack text
        }

        let generatedText = candidate?.content?.parts?.[0]?.text;
        if (!generatedText) {
             if (finishReason === "SAFETY" || finishReason === "RECITATION" || finishReason === "OTHER") {
                 console.warn("⚠️ AI Response has no text, likely due to finishReason:", finishReason, candidate.safetyRatings);
                 // Return a structured error/info object instead of throwing
                  return { mood: 'neutral', tags: ['analysis_stopped'], suggestions: [{ type: 'tip', text: `Analysis stopped: ${finishReason}. No content generated.` }] };
            } else {
                 console.error("❌ Invalid AI Response: No text found in candidate, finishReason was", finishReason, data);
                 throw new Error("AI response format is invalid or empty (no text).");
            }
        }
        // --- End Robust Handling ---

        // --- JSON Cleanup ---
        console.log("🧼 Raw AI generated text:", generatedText);
        generatedText = generatedText.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim(); // More robust regex for fences
        generatedText = generatedText.replace(/,\s*([}\]])/g, '$1'); // Fix simple trailing commas

        console.log("🧼 Cleaned AI text (before parsing):", generatedText); // Log the text *before* parsing

        // --- Aggressive JSON Extraction (Optional - Use with caution) ---
        // Uncomment this block if simple cleanup is insufficient AND you've examined the failing text
        /*
        const firstBrace = generatedText.indexOf('{');
        const lastBrace = generatedText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace > firstBrace) {
            generatedText = generatedText.substring(firstBrace, lastBrace + 1);
            console.log("🧼 Attempted aggressive JSON extraction:", generatedText);
        } else {
            console.warn("⚠️ Could not find valid JSON braces {} for extraction in AI response.");
            return { mood: 'neutral', tags: ['parsing_failed', 'no_json_found'], suggestions: [{ type: 'tip', text: `Could not find JSON object in AI response.` }] };
        }
        */
        // --- End Aggressive Extraction ---


        try {
            const parsedAnalysis = JSON.parse(generatedText);
            // Basic validation
            if (!parsedAnalysis.mood || !Array.isArray(parsedAnalysis.tags) || !Array.isArray(parsedAnalysis.suggestions)) {
                console.warn("⚠️ Cleaned AI response JSON structure missing expected fields:", parsedAnalysis);
                 // Return structured error
                return { mood: 'neutral', tags: ['analysis_incomplete', 'parsing_issue'], suggestions: [{ type: 'tip', text: "AI analysis structure was unexpected after cleaning." }] };
            }
            // Further validation
            const validMoods = ['happy', 'sad', 'calm', 'neutral', 'anxious', 'stressed', 'grateful'];
            if (!validMoods.includes(parsedAnalysis.mood)) {
                console.warn("⚠️ Invalid mood received:", parsedAnalysis.mood, "- defaulting to neutral.");
                parsedAnalysis.mood = 'neutral';
            }
             if (!parsedAnalysis.suggestions.every(s => s && typeof s === 'object' && s.type && s.text)) { // More robust suggestion check
                console.warn("⚠️ Invalid suggestion structure received:", parsedAnalysis.suggestions);
                 parsedAnalysis.suggestions = parsedAnalysis.suggestions.filter(s => s && typeof s === 'object' && s.type && s.text);
                if (parsedAnalysis.suggestions.length === 0) {
                    console.warn("⚠️ No valid suggestions found after filtering.");
                    parsedAnalysis.suggestions.push({ type: 'tip', text: "Received invalid or incomplete suggestions." });
                }
            }
            console.log("✅ Successfully parsed AI analysis:", parsedAnalysis);
            return parsedAnalysis;
        } catch (parseError) {
            console.error("❌ Failed to parse potentially cleaned AI response JSON:", parseError);
            // CRITICAL LOG: Check this output in your console when you get parsing errors!
            console.error("❌ Text that failed parsing:", generatedText);
            // Return structured error
             return { mood: 'neutral', tags: ['parsing_failed'], suggestions: [{ type: 'tip', text: `Could not process the AI analysis format. Check logs for details.` }] };
        }

    } catch (error) {
        // Log the error caught from fetch errors or explicit throws
        console.error('❌ Error in fetchAIAnalysis catch block:', error);
        // Re-throw the specific error caught/created so handleSaveEntry can catch it
        // Ensure it's an Error object
        if (error instanceof Error) {
            throw error;
        } else {
            throw new Error(String(error) || "Unknown error during AI analysis");
        }
    }
};


// --- MORE DEFENSIVE RENDER ITEM ---
const renderJournalHistoryItem = ({ item }) => {
    // Default values for item and its properties if they are missing/nullish
    const validItem = item || {};
    const mood = validItem.mood || 'neutral';
    const text = validItem.text || 'No content available'; // Provide default text
    // Ensure timestamp is a valid Date object before formatting
    // Firebase Timestamps need .toDate()
    let timestamp = null;
    if (validItem.timestamp && typeof validItem.timestamp.toDate === 'function') {
        timestamp = validItem.timestamp.toDate();
    } else if (validItem.timestamp instanceof Date) {
        timestamp = validItem.timestamp;
    }

    const prompt = validItem.prompt || null;
    const modeText = validItem.mode || 'text';

    const moodInfo = getMoodIcon(mood);

    // Safely format Date and Time, providing fallbacks
    let dateString = 'No Date';
    let timeString = '';
    if (timestamp instanceof Date && !isNaN(timestamp)) { // Check if it's a valid Date
        try {
            dateString = timestamp.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric'});
        } catch (e) {
            console.error("Error formatting date:", e, timestamp);
        }
        try {
            timeString = timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); // Added hour12
        } catch (e) {
            console.error("Error formatting time:", e, timestamp);
        }
    } else if (validItem.timestamp) {
        console.warn("Invalid timestamp received for history item:", validItem.timestamp);
    }


    return (
        <TouchableOpacity style={styles.historyItem} activeOpacity={0.7}>
            <View style={styles.historyHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 10 }}>
                    <Icon name={moodInfo.name} size={20} color={moodInfo.color || COLORS.lightText} style={styles.historyMoodIcon}/>
                    {/* Explicitly cast to string */}
                    <Text style={styles.historyDate} numberOfLines={1}>
                        {String(dateString)}
                    </Text>
                </View>
                {/* Explicitly cast to string */}
                <Text style={styles.historyTime} numberOfLines={1}>
                    {String(timeString)}
                </Text>
            </View>
            {/* Render prompt only if it's a non-empty string */}
            {prompt && typeof prompt === 'string' && prompt.trim() !== '' && (
                <Text style={styles.historyPrompt} numberOfLines={1}>
                    Prompt: {prompt}
                </Text>
            )}
            {/* Explicitly cast to string */}
            <Text style={styles.historyText} numberOfLines={2}>
                {String(text)}
            </Text>
             <View style={styles.historyFooter}>
                <Icon name={modeText === 'voice' ? 'mic' : modeText === 'reflective' ? 'help-circle' : 'edit-3'} size={14} color={COLORS.lightText} />
                {/* Explicitly cast to string */}
                <Text style={styles.historyModeText}>{String(modeText)}</Text>
             </View>
        </TouchableOpacity>
    );
 };


// --- Component ---
const ZenariJournalScreen = () => {
    const [journalEntry, setJournalEntry] = useState('');
    const [mode, setMode] = useState('text'); // 'text', 'voice', 'reflective'
    const [isRecording, setIsRecording] = useState(false);
    const [recognizedText, setRecognizedText] = useState(''); // Live transcription
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [aiAnalysis, setAiAnalysis] = useState(null); // Stores result {mood, tags, suggestions} or error info
    const [reflectivePrompt, setReflectivePrompt] = useState('');
    const [journalHistory, setJournalHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);
    const [error, setError] = useState(''); // General UI errors
    const [currentUserId, setCurrentUserId] = useState(null);

    const textInputRef = useRef(null);
    const scrollViewRef = useRef(null);
    const firestoreListenerUnsubscribe = useRef(null); // To store the unsubscribe function


    // --- Effects ---

    // Get User ID on Mount & Handle Auth Changes
    useEffect(() => {
        console.log("Setting up auth listener...");
        const subscriber = auth().onAuthStateChanged((user) => {
            const newUserId = user ? user.uid : null;
            console.log(newUserId ? `Auth state changed: User logged in: ${newUserId}` : "Auth state changed: User logged out or not logged in.");

            // Only update state and clear things if the user ID *actually* changed
            if (newUserId !== currentUserId) {
                setCurrentUserId(newUserId);
                setJournalHistory([]); // Clear history on user change/logout
                setJournalEntry(''); // Clear current entry
                setRecognizedText('');
                setAiAnalysis(null); // Clear previous analysis
                setError(''); // Clear errors

                if (newUserId) {
                    console.log("User changed to logged in state. Setting loading history true.");
                    setIsLoadingHistory(true); // Start loading history for the new user
                } else {
                    console.log("User changed to logged out state. Setting loading history false.");
                    setIsLoadingHistory(false); // No history to load if logged out
                    if (isRecording) { // Stop recording if user logs out
                        stopRecording().catch(e => console.error("Failed to stop recording on logout:", e));
                    }
                    // If there was an active listener, unsubscribe it
                    if (firestoreListenerUnsubscribe.current) {
                         console.log("User logged out, unsubscribing previous Firestore listener.");
                         firestoreListenerUnsubscribe.current();
                         firestoreListenerUnsubscribe.current = null;
                     }
                }
            } else if (!newUserId && currentUserId === null) {
                 // This handles the initial load where the user is null and remains null
                 console.log("Initial auth state: No user logged in. Setting loading history false.");
                 setIsLoadingHistory(false);
            }
        });

        return () => {
            console.log("Cleaning up auth listener.");
            subscriber(); // Unsubscribe on component unmount
        };
    }, [currentUserId, isRecording]); // Rerun if currentUserId changes, or if isRecording changes (for the logout check)

    // Initialize Voice Recognition & Cleanup
    useEffect(() => {
        // Define handlers using useCallback to prevent recreation on every render
        const onSpeechStartHandler = () => { console.log('onSpeechStart'); setIsRecording(true); setError(''); setRecognizedText('Listening...'); };
        const onSpeechEndHandler = () => { console.log('onSpeechEnd'); setIsRecording(false); /* Don't clear recognized text here, keep final result */ };
        const onSpeechErrorHandler = (e) => {
            console.error("STT Error:", e.error);
            let voiceError = `Voice Error: ${e.error?.message || 'Unknown recognition error'}`;
            if (Platform.OS === 'ios') {
                if (e.error?.code === 1 || e.error?.domain === 'kAFAssistantErrorDomain') voiceError = "Voice Error: Recognition unavailable or network issue.";
                if (e.error?.code === 2) voiceError = "Voice Error: Microphone permission denied."; // Example iOS code
            } else { // Android codes (approximate)
                if (e.error?.code === 7) voiceError = "Voice Error: Network timeout. Check connection.";
                if (e.error?.code === 6 || e.error?.code === 2) voiceError = "Voice Error: No speech detected.";
                if (e.error?.code === 5 || e.error?.code === 8) voiceError = "Voice Error: Recognition service error.";
                if (e.error?.code === 9) voiceError = "Voice Error: Microphone permission denied.";
            }
            setError(voiceError);
            setIsRecording(false);
            setRecognizedText(''); // Clear on error
        };
        const onSpeechResultsHandler = (e) => {
             console.log('onSpeechResults (final):', e.value);
             if (e.value && e.value.length > 0) {
                 const finalTranscription = e.value[0];
                 if (finalTranscription && finalTranscription.trim()) {
                     const trimmedText = finalTranscription.trim();
                     setRecognizedText(trimmedText); // Update preview
                     setJournalEntry(trimmedText); // Update main entry state
                     console.log("Final transcription set:", trimmedText);
                 } else {
                     setRecognizedText(''); // Clear if result is empty/whitespace
                     console.log("Final transcription was empty.");
                 }
             } else {
                 setRecognizedText(''); // Clear if no results array
                 console.log("No final transcription results array.");
             }
        };
         const onSpeechPartialResultsHandler = (e) => {
            // console.log('onSpeechPartialResults:', e.value); // Can be very noisy
            if (e.value && e.value.length > 0 && e.value[0]) {
                setRecognizedText(e.value[0]); // Update preview with partial
                 // Maybe don't update journalEntry constantly with partials, only on final? Depends on UX choice.
                 // setJournalEntry(e.value[0]);
            }
        };

        // Add listeners
        Voice.onSpeechStart = onSpeechStartHandler;
        Voice.onSpeechEnd = onSpeechEndHandler;
        Voice.onSpeechError = onSpeechErrorHandler;
        Voice.onSpeechResults = onSpeechResultsHandler;
        Voice.onSpeechPartialResults = onSpeechPartialResultsHandler;

        // Cleanup function
        return () => {
            console.log("Destroying voice listeners and instance...");
            // Voice.destroy() can sometimes throw errors if called unnecessarily
            Voice.stop().catch(e => console.log("Ignoring error on voice stop during cleanup:", e)); // Try stopping first
            Voice.removeAllListeners(); // Remove listeners explicitly
            // Voice.destroy().catch(e => console.error("Error destroying voice instance during cleanup:", e)); // Destroy might be problematic sometimes
        };
    }, []); // Empty dependency array ensures this runs only once on mount/unmount


    // Fetch Reflective Prompt
    useEffect(() => {
        setReflectivePrompt(getMockReflectivePrompt());
    }, []);

    // Fetch Journal History from Firestore
    useEffect(() => {
        // Ensure any existing listener is cleaned up before starting a new one
        if (firestoreListenerUnsubscribe.current) {
            console.log("Unsubscribing existing Firestore listener before setting up new one.");
            firestoreListenerUnsubscribe.current();
            firestoreListenerUnsubscribe.current = null;
        }

        if (!currentUserId) {
            console.log("No user ID, skipping Firestore history fetch.");
            setJournalHistory([]); // Ensure history is clear if user logs out
            setIsLoadingHistory(false); // Not loading if no user
            return; // Exit if no user
        }

        // Start loading only if we have a user ID
        setIsLoadingHistory(true);
        setError(''); // Clear previous errors
        console.log(`Setting up Firestore listener for user: ${currentUserId} in 'journals' collection`);

        const query = firestore()
            .collection('journals') // Targeting the top-level collection
            .where('userId', '==', currentUserId) // Filter by the current user's ID (requires index)
            .orderBy('timestamp', 'desc') // Order by timestamp
            .limit(25); // Limit the number of entries

        const subscriber = query.onSnapshot(querySnapshot => {
            if (querySnapshot === null) {
                 console.warn("Firestore listener received null snapshot.");
                 setIsLoadingHistory(false);
                 return;
             }
            console.log(`Firestore snapshot received: ${querySnapshot.size} documents.`);
            const history = [];
            querySnapshot.forEach(documentSnapshot => {
                 const data = documentSnapshot.data();
                 // --- More robust data validation ---
                 if (data && data.text !== undefined && data.text !== null && data.timestamp) {
                     // Check if timestamp is a Firestore Timestamp object
                     const timestampDate = data.timestamp?.toDate ? data.timestamp.toDate() : null;
                     if (timestampDate instanceof Date && !isNaN(timestampDate)) {
                         history.push({
                             ...data,
                             id: documentSnapshot.id,
                             timestamp: data.timestamp, // Keep original Firestore Timestamp for potential re-use
                             // timestamp: timestampDate, // Or use the converted Date object directly
                             mood: data.mood || 'neutral',
                             tags: Array.isArray(data.tags) ? data.tags : [],
                             suggestionsGiven: Array.isArray(data.suggestionsGiven) ? data.suggestionsGiven : [],
                             mode: data.mode || 'text',
                             text: String(data.text) // Ensure text is a string
                         });
                     } else {
                         console.warn(`Skipping entry ${documentSnapshot.id}: Invalid or missing Firestore timestamp.`, data.timestamp);
                     }
                 } else {
                    console.warn(`Skipping invalid entry ${documentSnapshot.id}: Missing text or timestamp.`, data);
                 }
            });
            setJournalHistory(history);
            setIsLoadingHistory(false);
            console.log(`Loaded ${history.length} entries for user: ${currentUserId}`);
        }, firestoreError => {
            console.error("❌ Firestore Error fetching history: ", firestoreError);
            let historyError = "Could not load journal history. Check connection or Firestore setup.";
            if (firestoreError.code === 'permission-denied') {
                historyError = "Permission denied fetching history. Check Firestore rules and ensure the user is logged in.";
                 // This is a likely error if the rules are wrong or user isn't authenticated
                 console.error("❗ Permission Denied - Check Firestore Rules for 'journals' collection and index on 'userId' field.");
            } else if (firestoreError.code === 'unauthenticated') {
                historyError = "Authentication error fetching history. Please log in again.";
            } else if (firestoreError.message && firestoreError.message.includes("index")) {
                 historyError = "Database setup needed. Please check Firestore index configuration for the 'journals' collection.";
                 console.error("❗ Firestore Index Required: Create a composite index on 'journals' collection for 'userId' (ascending) and 'timestamp' (descending).");
                 Alert.alert("Database Setup Required", "An index is needed in Firestore. Please check the console logs for details.");
             }
            setError(historyError); // Set specific history error
            setIsLoadingHistory(false);
            setJournalHistory([]);
        });

        // Store the unsubscribe function
        firestoreListenerUnsubscribe.current = subscriber;

        // Return the stored unsubscribe function for cleanup
        return () => {
             if (firestoreListenerUnsubscribe.current) {
                 console.log(`Unsubscribing Firestore listener for user: ${currentUserId}`);
                 firestoreListenerUnsubscribe.current();
                 firestoreListenerUnsubscribe.current = null; // Clear the ref
             }
        };
    }, [currentUserId]); // Re-run only when currentUserId changes


    // --- Handlers ---
    // Wrap handlers potentially causing state updates triggering other effects in useCallback
    const stopRecording = useCallback(async () => {
        if (!isRecording) return;
        console.log("Attempting to stop voice recognition...");
        try {
            await Voice.stop();
            console.log("Voice recognition stopped by user or effect.");
            // setIsRecording(false); // Let onSpeechEnd handle this ideally, but set defensively if needed
        } catch (e) {
            console.error('STT Stop Error:', e);
            setError(`Error stopping recording: ${e.message || 'Unknown error'}`);
            setIsRecording(false); // Ensure state is false on error
        }
    }, [isRecording]); // isRecording is the dependency

    const handleModeChange = useCallback((newMode) => {
        if (mode === newMode) return;
        console.log(`Changing mode from ${mode} to ${newMode}`);
        if (isRecording) {
            console.log("Stopping recording due to mode change...");
            stopRecording().catch(e => console.error("Failed to stop recording on mode change:", e));
        }
        setMode(newMode);
        setAiAnalysis(null); // Clear AI analysis when mode changes
        setJournalEntry(''); // Clear input field
        setRecognizedText(''); // Clear voice preview
        setError(''); // Clear errors
        if (newMode === 'text' || newMode === 'reflective') {
            // Delay focus slightly to allow keyboard dismissal etc.
            setTimeout(() => textInputRef.current?.focus(), 150);
        } else {
            Keyboard.dismiss();
        }
    }, [mode, isRecording, stopRecording]); // Dependencies

    const startRecording = useCallback(async () => {
        if (isRecording) return;
        setJournalEntry(''); // Clear previous text entry
        setRecognizedText('Initializing...'); // Give feedback
        setAiAnalysis(null); // Clear previous analysis
        setError(''); // Clear errors
        // setIsRecording(true); // Let onSpeechStart handle this ideally

        console.log("Attempting to start voice recognition...");
        try {
            // Check if Voice module is available (it should be if import worked)
            if (!Voice || typeof Voice.start !== 'function') {
                 throw new Error("Voice module not initialized correctly.");
            }
            await Voice.start('en-US'); // Or detect locale if needed
            console.log("Voice.start() called successfully.");
             // Don't setRecognizedText('Listening...') here, let onSpeechStart handle it
             // setIsRecording(true); // Set by onSpeechStart
        } catch (e) {
            console.error('❌ STT Start Error:', e);
            setError(`Could not start voice recognition: ${e.message || 'Unknown error'}. Check permissions?`);
            setRecognizedText('');
            setIsRecording(false); // Ensure recording is false if start fails
        }
    }, [isRecording]); // isRecording dependency

    const handleSaveEntry = useCallback(async () => {
        const entryToSave = journalEntry.trim();
        console.log(`handleSaveEntry called. Entry length: ${entryToSave.length}, Processing: ${isProcessingAI}, Recording: ${isRecording}, User: ${currentUserId}`);

        if (!entryToSave || isProcessingAI || isRecording) {
            console.log("Save aborted: No text, already processing, or currently recording.");
            return;
        }
        if (!currentUserId) {
            Alert.alert("Login Required", "Please log in to save your journal entry.");
            return;
        }

        Keyboard.dismiss();
        setIsProcessingAI(true);
        setAiAnalysis(null); // Clear previous results
        setError(''); // Clear previous errors

        let analysisResult = null;
        try {
            console.log("🧠 Requesting AI analysis for entry...");
            analysisResult = await fetchAIAnalysis(entryToSave);
            console.log("✅ AI analysis received:", analysisResult);
            setAiAnalysis(analysisResult); // Show analysis result (even if it's an error/incomplete state)

            // Check if the analysis itself indicated a failure (e.g., parsing failed)
            // We might still want to save the entry, but maybe flag it?
            const isAnalysisError = analysisResult?.tags?.some(tag => tag.includes('error') || tag.includes('fail') || tag.includes('incomplete') || tag.includes('stopped') || tag.includes('parsing_failed')); // Added parsing_failed
             if (isAnalysisError) {
                 console.warn("⚠️ Saving entry, but AI analysis had issues:", analysisResult.tags);
                 // Optionally show a less enthusiastic alert or modify saved data
             }

            const entryData = {
                userId: currentUserId,
                text: entryToSave,
                mode: mode,
                prompt: mode === 'reflective' ? reflectivePrompt : null,
                timestamp: firestore.FieldValue.serverTimestamp(), // Use server timestamp
                // Use analysis results, falling back to defaults
                mood: analysisResult?.mood || 'neutral',
                 // Ensure tags is always an array, even if analysis failed partially
                 tags: Array.isArray(analysisResult?.tags) ? analysisResult.tags : [],
                 // Ensure suggestions is always an array
                suggestionsGiven: Array.isArray(analysisResult?.suggestions) ? analysisResult.suggestions : [],
            };

            console.log("💾 Attempting to save to Firestore 'journals' collection:", entryData);
            const docRef = await firestore().collection('journals').add(entryData);
            console.log("✅ Entry saved successfully with ID:", docRef.id);

            // Clear input fields after successful save
            setJournalEntry('');
            setRecognizedText('');

            // Alert based on success or partial success
             if (!isAnalysisError) {
                 Alert.alert(
                     "Entry Saved",
                     `Mood detected as ${analysisResult?.mood || 'neutral'}. ${analysisResult?.suggestions?.length || 0} suggestions provided.`
                 );
             } else {
                  Alert.alert(
                      "Entry Saved (with issues)",
                      `Entry saved, but there was an issue during AI analysis: ${analysisResult?.suggestions?.[0]?.text || 'Check analysis details.'}`
                  );
             }

            // Clear analysis *after* saving and alerting, so user sees it briefly
            // setAiAnalysis(null); // Or keep it displayed? User choice.

        } catch (e) {
            console.error("❌ Error during save/analysis process: ", e);
            let userErrorMessage = `Failed to process entry: ${e.message || 'Unknown error'}`;
            let alertTitle = "Error";

            // --- More Specific Error Handling ---
            if (e.code === 'permission-denied' || String(e.message).includes('permission-denied')) {
                userErrorMessage = "Permission denied saving entry. Check Firestore rules and login status.";
                alertTitle = "Save Error";
                console.error("❗ Firestore Permission Denied - Check rules for 'journals' collection allow create/write for authenticated user matching userId.");
            } else if (String(e.message).includes("API Key")) {
                userErrorMessage = `Configuration Error: ${e.message}`;
                alertTitle = "Configuration Error";
            } else if (String(e.message).includes("AI API") || String(e.message).includes("AI analysis") || String(e.message).includes("safety settings") || String(e.message).includes("Quota") || String(e.message).includes("Authentication/Permission") || String(e.message).includes("AI Error:")) {
                // Use the specific error message thrown by fetchAIAnalysis
                userErrorMessage = e.message;
                alertTitle = "AI Analysis Error";
                // Display the error within the AI analysis section instead of a separate error text/alert
                setAiAnalysis({ mood: 'error', tags: ['ai_error'], suggestions: [{ type: 'tip', text: userErrorMessage }] });
            } else if (String(e.message).includes("Firestore") || e.code) { // Catch other potential Firestore errors
                userErrorMessage = `Database Error: ${e.message}. Please check connection and try again.`
                alertTitle = "Save Error";
            } else {
                // Generic fallback
                userErrorMessage = `An unexpected error occurred: ${e.message}`;
            }

            setError(userErrorMessage); // Set error state for display

            // Show alert for critical save/config errors, but not for AI errors shown inline
             if (!alertTitle.startsWith("AI Analysis")) {
                Alert.alert(alertTitle, userErrorMessage);
            }

        } finally {
            setIsProcessingAI(false); // Ensure loading stops
        }
    }, [journalEntry, isProcessingAI, isRecording, currentUserId, mode, reflectivePrompt, fetchAIAnalysis]); // Added fetchAIAnalysis to dependencies


    // --- Render Logic ---

    // Memoized render functions to potentially optimize re-renders if props don't change
    const renderModeSpecificInput = useCallback(() => {
       const isInputDisabled = !currentUserId || isProcessingAI || isRecording; // Combined disabled logic
       const placeholderText = !currentUserId ? "Log in to start journaling..." : "Your reflection...";
       const textInputStyle = [styles.textInput, isInputDisabled && styles.textInputDisabled];

       switch (mode) {
           case 'voice':
               return (
                   <View style={styles.voiceInputWrapper}>
                       <TouchableOpacity
                           style={[styles.micButton, isRecording && styles.micButtonRecording, (!currentUserId || isProcessingAI) && styles.micButtonDisabled]}
                           onPress={isRecording ? stopRecording : startRecording}
                           disabled={isProcessingAI || !currentUserId} // Disable if processing or logged out
                       >
                           <Icon name={isRecording ? "stop-circle" : "mic"} size={30} color={!currentUserId || isProcessingAI ? COLORS.disabled : COLORS.white} />
                       </TouchableOpacity>
                       <Text style={styles.voiceStatusText}>
                           {!currentUserId ? "Log in to enable voice input" :
                            isProcessingAI ? "Processing previous entry..." :
                            isRecording ? 'Listening... Tap mic to stop' :
                            (journalEntry ? 'Tap mic to record again or Save below' : 'Tap mic to start speaking')}
                       </Text>
                       <View style={styles.recognizedTextBox}>
                           {/* Show spinner only when recording and *not* showing placeholder messages */}
                           {isRecording && !recognizedText.startsWith('Listening') && !recognizedText.startsWith('Initializing') && (
                               <ActivityIndicator size="small" color={COLORS.primary} style={styles.voiceActivityIndicator}/>
                           )}
                           <Text style={[styles.recognizedTextPreview, (!journalEntry && !recognizedText && !isRecording) && styles.recognizedTextPlaceholder]} numberOfLines={4}>
                                {/* Show recognized text primarily, fallback to journal entry if recognized is cleared */}
                                {recognizedText || journalEntry || (isRecording ? "..." : "Your transcription will appear here...")}
                           </Text>
                       </View>
                       {/* Display Voice-specific errors */}
                       {error && error.startsWith("Voice Error:") ? <Text style={styles.errorText}>{error}</Text> : null}
                   </View>
               );
           case 'reflective':
               return (
                   <View>
                       <View style={styles.promptContainer}>
                           <Icon name="help-circle" size={22} color={COLORS.primary} style={styles.promptIcon} />
                           <Text style={styles.promptText}>{reflectivePrompt || "Loading reflection prompt..."}</Text>
                       </View>
                       <TextInput
                           ref={textInputRef}
                           style={textInputStyle}
                           value={journalEntry}
                           onChangeText={setJournalEntry}
                           placeholder={placeholderText}
                           placeholderTextColor={COLORS.lightText}
                           multiline
                           editable={!isInputDisabled} // Use combined logic
                           blurOnSubmit={false} // Keep keyboard open on submit if multiline
                           scrollEnabled={true}
                           textAlignVertical="top" // Good practice for multiline
                       />
                   </View>
               );
           default: // 'text' mode
               return (
                   <TextInput
                       ref={textInputRef}
                       style={textInputStyle}
                       value={journalEntry}
                       onChangeText={setJournalEntry}
                       placeholder={!currentUserId ? "Log in to start journaling..." : "How are you feeling today?"}
                       placeholderTextColor={COLORS.lightText}
                       multiline
                       editable={!isInputDisabled} // Use combined logic
                       blurOnSubmit={false}
                       scrollEnabled={true}
                       textAlignVertical="top"
                   />
               );
       }
    }, [currentUserId, isProcessingAI, isRecording, mode, journalEntry, recognizedText, error, reflectivePrompt, startRecording, stopRecording]); // Dependencies

    const renderAIAnalysis = useCallback(() => {
        // Show loader *only* when actively processing AND no result/error is available yet
        if (isProcessingAI && !aiAnalysis) {
            return (
                <View style={[styles.aiContainer, styles.aiLoadingContainer]}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.aiStatusText}>Analyzing your thoughts...</Text>
                </View>
            );
        }
        // Don't render if not processing and no analysis object exists
        if (!aiAnalysis) return null;

        // Handle specific error/incomplete states returned *within* the aiAnalysis object
        const isErrorState = aiAnalysis.tags?.includes('ai_error') || aiAnalysis.tags?.includes('parsing_failed');
        const isWarningState = aiAnalysis.tags?.includes('analysis_incomplete') || aiAnalysis.tags?.includes('analysis_stopped') || aiAnalysis.tags?.includes('parsing_issue') || aiAnalysis.tags?.includes('no_json_found'); // Added no_json_found check

        if (isErrorState || isWarningState) {
             const iconName = isErrorState ? "alert-octagon" : "alert-circle"; // Different icons for error/warning
             const color = isErrorState ? COLORS.error : COLORS.anxious; // Use error/anxious color
             const title = isErrorState ? "Analysis Error" : "Analysis Issue";
             return (
                 <View style={[styles.aiContainer, { borderColor: color }]}>
                     <View style={styles.aiHeader}>
                         <Icon name={iconName} size={28} color={color} />
                         <Text style={[styles.aiTitle, { color: color }]}>
                             {title}
                         </Text>
                     </View>
                     <View style={styles.aiSection}>
                         <Text style={styles.suggestionText}>
                             {aiAnalysis.suggestions?.[0]?.text || "Could not fully analyze the entry. Please check logs or try again."}
                         </Text>
                          {/* Optionally show the problematic tags for debugging */}
                          {/* <Text style={{fontSize: 10, color: COLORS.lightText, marginTop: 5}}>Tags: {aiAnalysis.tags?.join(', ')}</Text> */}
                     </View>
                 </View>
             );
         }

        // Render successful analysis
        const { mood, tags, suggestions } = aiAnalysis;
        const moodInfo = getMoodIcon(mood);
        return (
            <View style={styles.aiContainer}>
                <View style={styles.aiHeader}>
                    <Icon name={moodInfo.name} size={28} color={moodInfo.color || COLORS.primary} />
                    <Text style={[styles.aiTitle, { color: moodInfo.color || COLORS.primary }]}>
                        {mood ? mood.charAt(0).toUpperCase() + mood.slice(1) : 'Analysis'} Mood
                    </Text>
                </View>
                 {tags && tags.length > 0 && (
                     <View style={styles.aiSection}>
                         <Text style={styles.subtleHeading}>Key Themes</Text>
                         <View style={styles.tagContainer}>
                             {tags.map((tag, index) => <Text key={`${tag}-${index}`} style={styles.tag}>#{tag}</Text>)}
                         </View>
                     </View>
                 )}
                 {suggestions && suggestions.length > 0 && (
                     <View style={styles.aiSection}>
                         <Text style={styles.subtleHeading}>Suggestions</Text>
                         <View style={styles.suggestionsContainer}>
                             {suggestions.map((suggestion, index) => (
                                 <View key={index} style={styles.suggestionItem}>
                                     <Icon name={getSuggestionIcon(suggestion.type)} size={20} color={COLORS.primary} style={styles.suggestionIcon} />
                                     <Text style={styles.suggestionText}>{suggestion.text}</Text>
                                 </View>
                             ))}
                         </View>
                     </View>
                 )}
                 {/* Ensure last section has no bottom margin if needed */}
                 {(!suggestions || suggestions.length === 0) && tags && tags.length > 0 && (
                     <View style={{ marginBottom: -15 }} /> // Adjust spacing if only tags are present
                 )}
            </View>
        );
    }, [aiAnalysis, isProcessingAI]); // Dependencies


    // --- Main Render ---
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={styles.scrollViewContent}
                keyboardShouldPersistTaps="handled" // Good for inputs inside scrollview
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Zenari Journal</Text>

                {/* Mode Selection */}
                <View style={styles.modeSelector}>
                    {['text', 'voice', 'reflective'].map((m) => {
                        const isActive = mode === m;
                        let iconName = 'edit-3';
                        if (m === 'voice') iconName = 'mic';
                        if (m === 'reflective') iconName = 'help-circle';
                        // Disable mode buttons if logged out (and not loading auth) OR if processing AI
                        const isDisabled = (!currentUserId && !isLoadingHistory) || isProcessingAI;
                        return (
                            <TouchableOpacity
                                key={m}
                                style={[styles.modeButton, isActive && styles.modeButtonActive, isDisabled && styles.modeButtonDisabled]}
                                onPress={() => handleModeChange(m)}
                                disabled={isDisabled}
                            >
                                <Icon name={iconName} size={18} color={isDisabled ? COLORS.disabled : (isActive ? COLORS.white : COLORS.primary)} />
                                <Text style={[styles.modeButtonText, isActive && styles.modeButtonTextActive, isDisabled && styles.modeButtonTextDisabled]}>
                                    {m.charAt(0).toUpperCase() + m.slice(1)}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                 {/* Loading Auth State Indicator - Show only during initial auth check */}
                 {isLoadingHistory && currentUserId === null && ( // More specific condition
                     <View style={styles.loadingContainer}>
                         <ActivityIndicator size="small" color={COLORS.primary} />
                         <Text style={styles.loadingText}>Checking login status...</Text>
                     </View>
                 )}


                 {/* Login Prompt or Input Area */}
                  {/* Show login prompt only if auth check is complete and user is null */}
                  {!currentUserId && !isLoadingHistory && (
                      <View style={styles.loginPrompt}>
                          <Icon name="lock" size={20} color={COLORS.error} style={{marginRight: 10}}/>
                          <Text style={styles.loginPromptText}>Please log in to use the journal.</Text>
                      </View>
                  )}
                  {/* Show input area only if user is logged in */}
                  {currentUserId && renderModeSpecificInput()}


                {/* Save Button Logic */}
                {currentUserId && ( // Only show save button if logged in
                    <>
                        {/* Common Save button logic, text changes based on state */}
                        {!isRecording && ( // Don't show save button while recording
                             <TouchableOpacity
                                // Disable if no entry OR currently processing AI
                                style={[styles.saveButton, (!journalEntry.trim() || isProcessingAI) && styles.saveButtonDisabled]}
                                onPress={handleSaveEntry}
                                disabled={!journalEntry.trim() || isProcessingAI}
                             >
                                {isProcessingAI && <ActivityIndicator color={COLORS.white} style={{ marginRight: 10 }}/> }
                                <Text style={styles.saveButtonText}>
                                     {isProcessingAI ? 'Analyzing...' :
                                     (mode === 'voice' ? 'Save & Analyze Transcription' : 'Save & Analyze Entry')}
                                </Text>
                             </TouchableOpacity>
                         )}
                    </>
                )}


                 {/* General Error Display (Show non-history, non-voice errors that aren't handled by AI section) */}
                 {error && !error.startsWith("Voice Error:") && !error.includes("history") && !(aiAnalysis && aiAnalysis?.tags?.some(tag => tag.includes('error') || tag.includes('fail') )) ? ( // Check if AI analysis already shows an error
                     <Text style={[styles.errorText, {textAlign: 'center', marginBottom: 15}]}>{error}</Text>
                 ) : null}

                 {/* AI Analysis Display (Handles its own loading/error states internally) */}
                 {currentUserId && renderAIAnalysis()}


                 {/* Wellness Insight Section - Show only if logged in */}
                 {currentUserId && (
                     <View style={styles.insightCard}>
                         <Icon name="activity" size={24} color={COLORS.secondary} style={styles.insightIcon}/>
                          <View style={styles.insightContent}>
                              <Text style={styles.insightTitle}>Daily Reflection</Text>
                              <Text style={styles.insightText}>
                                   Taking a moment to journal helps understand your thoughts and feelings.
                              </Text>
                          </View>
                     </View>
                 )}


                 {/* --- Journal History Section --- */}
                 {/* Show history container only if logged in */}
                 {currentUserId && (
                     <View style={styles.historyContainer}>
                         <Text style={styles.historyTitle}>Recent Entries</Text>

                         {/* History Loading Indicator - Show only when loading history specifically */}
                         {isLoadingHistory && currentUserId ? ( // Condition ensures it shows only when loading for the *current* user
                             <View style={styles.loadingContainer}>
                                 <ActivityIndicator size="large" color={COLORS.primary} style={{marginTop: 30}}/>
                                 <Text style={styles.loadingText}>Loading history...</Text>
                             </View>
                          // Show specific history loading errors here
                         ) : error && error.includes("history") ? ( // Check if the error message relates to history
                             <Text style={[styles.errorText, styles.historyPlaceholder]}>{error}</Text>
                         ) : journalHistory.length > 0 ? (
                             <FlatList
                                 data={journalHistory}
                                 renderItem={renderJournalHistoryItem} // Uses the defensive renderItem
                                 // Use Firestore document ID as key if available, fallback to index
                                 keyExtractor={(item) => item.id || String(item.timestamp?.seconds || Math.random())} // Ensure key is unique string
                                 scrollEnabled={false} // Important inside ScrollView
                                 ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                              />
                         ) : ( // No error, not loading, but history is empty
                             <Text style={styles.historyPlaceholder}>Your journal thoughts will appear here.</Text>
                         )}
                     </View>
                 )}
                 {/* Show history placeholder only if logged out AND auth check is complete */}
                 {!currentUserId && !isLoadingHistory && (
                     <View style={styles.historyContainer}>
                          <Text style={styles.historyTitle}>Recent Entries</Text>
                          <Text style={styles.historyPlaceholder}>Log in to see your journal history.</Text>
                     </View>
                 )}
                 {/* --- End Journal History Section --- */}

            </ScrollView>
        </SafeAreaView>
    );
};

// --- Styles --- (Copied from previous version, assuming they are correct)
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    scrollView: {
        flex: 1,
    },
    scrollViewContent: {
        padding: 20,
        paddingBottom: 60, // Ensure space at the bottom
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.primary,
        textAlign: 'center',
        marginBottom: 25,
    },
    modeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 25,
        backgroundColor: COLORS.white,
        borderRadius: 30,
        paddingVertical: 6,
        paddingHorizontal: 6,
        elevation: 2,
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
        paddingHorizontal: 15,
        borderRadius: 25,
        flex: 1,
        marginHorizontal: 4,
        justifyContent: 'center',
        minHeight: 40,
    },
    modeButtonActive: {
        backgroundColor: COLORS.primary,
        elevation: 3,
        shadowOpacity: 0.15,
        shadowRadius: 3,
    },
    modeButtonText: {
        fontSize: 14,
        marginLeft: 8,
        color: COLORS.primary,
        fontWeight: '600',
        textAlign: 'center',
    },
    modeButtonTextActive: {
        color: COLORS.white,
    },
    modeButtonDisabled: {
        backgroundColor: COLORS.white, // Keep background white but reduce opacity
        opacity: 0.5,
    },
    modeButtonTextDisabled: {
        color: COLORS.disabled,
    },
    textInput: {
        backgroundColor: COLORS.cardBackground,
        minHeight: 150,
        borderRadius: 15,
        paddingTop: 15, // Ensure padding respects textAlignVertical="top"
        padding: 15,
        fontSize: 16,
        color: COLORS.text,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        lineHeight: 24, // Improve readability
    },
    textInputDisabled: {
        backgroundColor: COLORS.background, // Use a slightly different background for disabled
        color: COLORS.lightText,
        borderColor: COLORS.disabled + '60', // Use disabled color for border
        opacity: 0.7,
    },
    voiceInputWrapper: {
        alignItems: 'center',
        marginBottom: 20,
        padding: 15,
        backgroundColor: COLORS.white,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    micButton: {
        backgroundColor: COLORS.primary,
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        elevation: 4,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    micButtonRecording: {
        backgroundColor: COLORS.error, // Use error color when recording
        shadowColor: COLORS.error,
    },
    micButtonDisabled: {
        backgroundColor: COLORS.disabled,
        opacity: 0.6,
        elevation: 1, // Less elevation when disabled
    },
    voiceStatusText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 15,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    recognizedTextBox: {
        minHeight: 80,
        width: '100%',
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: COLORS.background, // Slightly different background
        borderRadius: 10,
        marginBottom: 15,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        position: 'relative', // Needed for absolute positioning of indicator
    },
    recognizedTextPreview: {
        fontSize: 15,
        color: COLORS.text,
        lineHeight: 21,
        textAlign: 'center',
    },
    recognizedTextPlaceholder: {
        color: COLORS.lightText,
        fontStyle: 'italic',
    },
    voiceActivityIndicator: {
        position: 'absolute',
        top: 10,
        right: 10,
    },
    promptContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Align items to the top for potentially long text
        backgroundColor: COLORS.accentLight,
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.accent,
    },
    promptIcon: {
        marginRight: 10,
        marginTop: 2, // Adjust alignment with text
        color: COLORS.primary, // Use primary color for icon maybe?
    },
    promptText: {
        fontSize: 15,
        color: COLORS.text, // Use primary text color
        // fontStyle: 'italic', // Maybe not italic? Personal choice
        flex: 1, // Allow text to wrap
        lineHeight: 22,
    },
    saveButton: {
        backgroundColor: COLORS.secondary, // Use secondary color for save
        paddingVertical: 15,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 25,
        elevation: 3,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        borderWidth: 1,
        borderColor: COLORS.secondary + '50', // Use slightly transparent border of same color
        minHeight: 50, // Ensure consistent height
    },
    saveButtonDisabled: {
        backgroundColor: COLORS.disabled, // Use grey for disabled
        opacity: 0.7,
        elevation: 1,
        shadowOpacity: 0.1,
        borderColor: COLORS.disabled + '50',
    },
    saveButtonText: {
        color: COLORS.text, // Dark text on light button
        fontSize: 16,
        fontWeight: '600',
    },
    aiContainer: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 15,
        padding: 20,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    aiLoadingContainer: {
        alignItems: 'center',
        paddingVertical: 30, // More padding for loader
    },
    aiStatusText: {
        marginTop: 15,
        fontSize: 15,
        color: COLORS.primary,
        textAlign: 'center',
        fontWeight: '500',
    },
    aiHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    aiTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 12,
    },
    aiSection: {
        marginBottom: 15,
         // Remove last margin if it's the last section - Note: '&:last-child' is CSS syntax, doesn't work directly in RN StyleSheet
         // We handle this manually in renderAIAnalysis if needed
    },
    subtleHeading: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 10,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap', // Allow tags to wrap
    },
    tag: {
        backgroundColor: COLORS.tagBackground, // Use specific tag background
        color: COLORS.text, // Use primary text color
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15, // Fully rounded
        marginRight: 8, // Space between tags
        marginBottom: 8, // Space for wrapping
        fontSize: 13,
        fontWeight: '500',
    },
    suggestionsContainer:{
        // No specific style needed, items have their own
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Align icon with start of text
        marginBottom: 10,
        padding: 12,
        backgroundColor: COLORS.suggestionBackground, // Use specific suggestion background
        borderRadius: 10,
         // Remove last margin - Note: '&:last-child' is CSS syntax, doesn't work directly in RN StyleSheet
         // We handle this manually in renderAIAnalysis if needed
    },
    suggestionIcon: {
        marginRight: 12,
        marginTop: 3, // Fine-tune vertical alignment
        color: COLORS.primary, // Match AI header color
    },
    suggestionText: {
        fontSize: 15,
        color: COLORS.text,
        flex: 1, // Allow text to take remaining space and wrap
        lineHeight: 22,
    },
    insightCard: {
        backgroundColor: COLORS.white,
        borderRadius: 15,
        padding: 20,
        marginBottom: 25,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000", // Subtle shadow
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    insightIcon:{
        marginRight: 15,
        color: COLORS.secondary, // Use secondary accent color
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 5,
    },
    insightText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
    historyContainer: {
        marginTop: 20, // Add space above history
    },
    historyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 15,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    historyItem: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    historyMoodIcon: {
        marginRight: 10,
    },
    historyDate: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '600',
        flexShrink: 1, // Prevent date from pushing time off screen
    },
     historyTime: {
         fontSize: 13,
         color: COLORS.textSecondary,
         fontWeight: '500',
         marginLeft: 5, // Add space between date and time if they are close
     },
    historyPrompt: {
        fontSize: 13,
        color: COLORS.primary, // Use primary color for prompt maybe?
        fontStyle: 'italic',
        marginBottom: 8,
        opacity: 0.9,
    },
    historyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
        marginBottom: 10, // Space before footer
    },
     historyFooter: {
         flexDirection: 'row',
         alignItems: 'center',
         marginTop: 8, // Space above footer
         paddingTop: 8, // Space inside footer top
         borderTopWidth: 1, // Separator line
         borderTopColor: COLORS.border,
     },
     historyModeText: {
         fontSize: 12,
         color: COLORS.lightText, // Use very light text for mode
         marginLeft: 6,
         textTransform: 'capitalize', // Capitalize 'text', 'voice', etc.
     },
    historyPlaceholder: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginTop: 40, // Space above placeholder
        paddingBottom: 20, // Space below placeholder
        fontStyle: 'italic',
    },
    loadingContainer: {
        flex: 1, // Ensure it can take space if needed
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        minHeight: 100, // Give it some minimum height
    },
    loadingText: {
        marginTop: 10,
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    errorText: { // General error text style
        color: COLORS.error,
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        marginVertical: 10, // Space around error message
        paddingHorizontal: 10, // Prevent sticking to edges
    },
    loginPrompt: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 15,
        backgroundColor: COLORS.accentLight, // Use a distinct background
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.accent, // Match background accent
    },
    loginPromptText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
});

export default ZenariJournalScreen;