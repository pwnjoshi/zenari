import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Text, LogBox, Alert, InteractionManager
} from 'react-native';
import { IconButton } from 'react-native-paper';
import axios from 'axios';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GEMINI_API_KEY } from '@env'; // Ensure this is set in your .env file

// *** Firebase Imports ***
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// *** Import for Keyboard Handling Optimization ***
import { useHeaderHeight } from '@react-navigation/elements';

// Ignore specific warnings if needed (use sparingly)
// LogBox.ignoreLogs(['[@RNC/AsyncStorage]']);
// LogBox.ignoreLogs(['You seem to update props of the "TRenderEngineProvider"']);
// LogBox.ignoreLogs(['This method is deprecated']); // Optionally ignore the Firebase warning for now

const { width } = Dimensions.get('window');

// --- Constants ---
const colors = { /* ... colors ... */
    primary: '#2bedbb', primaryLight: '#a6f9e2', primaryDark: '#1fcda9', background: '#F7F9FC', userBubble: '#E1F5FE', botBubble: '#E8F5E9', messageText: '#263238', inputBackground: '#FFFFFF', inputText: '#37474F', placeholderText: '#90A4AE', errorText: '#D32F2F', errorBackground: '#FFEBEE', timestamp: '#78909C', iconColor: '#546E7A', sendButtonDisabled: '#B0BEC5', micButtonBackground: '#ECEFF1', shadowColor: '#000', loadingIndicator: '#1fcda9',
    typingIndicatorText: '#78909C',
    stopButtonBackground: '#F44336',
};
const INPUT_AREA_MIN_HEIGHT = 55;
const INPUT_TEXT_MAX_HEIGHT = 120;
const INPUT_CONTAINER_MAX_HEIGHT = INPUT_TEXT_MAX_HEIGHT + 20;
const MIC_BUTTON_SIZE = 40;
const BUBBLE_TYPING_SPEED_MS = 30;
const MOOD_HISTORY_LIMIT = 7;
const NOTE_PREVIEW_LENGTH = 50;
const CHAT_HISTORY_LIMIT = 6;
const ANDROID_KEYBOARD_OFFSET = 20;
const API_KEY = GEMINI_API_KEY;
// *** Reverted API URL to 1.5-flash as per earlier versions, confirm if 2.0 was intended ***
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const API_TIMEOUT = 45000;
const SYSTEM_MESSAGE_PREFIXES = ['initial-', 'reset-', 'error-', 'stopped-', 'typing-'];

// --- Helpers & Hooks ---

const formatTimestamp = (timestamp) => { /* ... formatTimestamp function ... */
    if (!timestamp || !(timestamp instanceof Date)) {
        return '--:--';
    }
    try {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
        console.warn("[FormatTimestamp] Error formatting Date:", e);
        return '--:--';
    }
};

const useAutoScroll = (flatListRef, messages) => { /* ... useAutoScroll hook ... */
    useEffect(() => {
        if (!flatListRef.current || messages.length === 0) return;
        const scrollToBottom = () => {
             if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
             }
        };
        const interactionPromise = InteractionManager.runAfterInteractions(scrollToBottom);
        const timer = setTimeout(scrollToBottom, 150);
        return () => {
            interactionPromise.cancel();
            clearTimeout(timer);
        };
    }, [messages]);
};


const parseTextToHtml = (text) => { /* ... parseTextToHtml function ... */
    if (typeof text !== 'string' || !text) return '';
    try {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\*(.*?)\*/g, '<i>$1</i>')
            .replace(/__(.*?)__/g, '<u>$1</u>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br/>');
    } catch (error) {
        console.error('[ParseHtml] Error parsing text:', error);
        return text;
    }
};

const enhanceResponse = (text) => { /* ... enhanceResponse function ... */
    if (typeof text !== 'string' || !text) return '';
    let enhanced = text
        .replace(/\b(happy|joyful|glad|excited|wonderful|great)\b/gi, '$1 😊')
        .replace(/\b(sad|upset|down|lonely|depressed|unhappy)\b/gi, '$1 😔')
        .replace(/\b(thank you|thanks|appreciate)\b/gi, '$1 💖')
        .replace(/\b(love|care|support|hug)\b/gi, '$1 ❤️')
        .replace(/\b(hope|wish|believe|positive)\b/gi, '$1 🌟')
        .replace(/\b(strength|courage|strong|resilient)\b/gi, '$1 💪')
        .replace(/\b(sorry|apologize)\b/gi, '$1 🙏');
    const closings = ["\n\nTake care... 💖", "\n\nThinking of you... 🌸", "\n\nSending positive vibes... 🌟", "\n\nBe well... 🌼", "\n\n✨"];
    if (enhanced.length > 70 && Math.random() > 0.4) {
        enhanced += closings[Math.floor(Math.random() * closings.length)];
    }
    return enhanced;
};

// --- Render Message Item (Memoized) ---
const RenderMessageItem = React.memo(({ item }) => { /* ... RenderMessageItem component ... */
    const isUser = item.sender === 'user';
    const isTyping = item.typing === true;
    const showTimestamp = item.timestamp && !isTyping;
    const textToRender = typeof item.text === 'string' ? item.text : '';
    const baseTextStyle = styles.messageText;
    const tagStyles = React.useMemo(() => ({
        b: { fontWeight: 'bold' },
        i: { fontStyle: 'italic' },
        u: { textDecorationLine: 'underline' },
        code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', paddingVertical: 1, paddingHorizontal: 4, borderRadius: 3, fontSize: 14 },
    }), []);
    const htmlSource = React.useMemo(() => ({
        html: parseTextToHtml(textToRender)
    }), [textToRender]);

    return (
        <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
                <RenderHTML
                    contentWidth={width * 0.70}
                    source={htmlSource}
                    baseStyle={baseTextStyle}
                    tagsStyles={tagStyles}
                    enableExperimentalMarginCollapsing={true}
                />
                {showTimestamp && (
                    <Text style={styles.timestampText}>{formatTimestamp(item.timestamp)}</Text>
                )}
            </View>
        </View>
    );
});

// --- Main Chat Screen Component ---
const ChatScreen = ({ navigation }) => {
    // --- State ---
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [error, setError] = useState(null);
    const [inputHeight, setInputHeight] = useState(INPUT_AREA_MIN_HEIGHT);
    const [isInitializing, setIsInitializing] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [moodContextForApi, setMoodContextForApi] = useState([]);

    // --- Refs ---
    const flatListRef = useRef(null);
    const typingIntervalRef = useRef(null);
    const messagesRef = useRef(messages); // Still useful for accessing state *outside* of async updates

    // --- Hooks ---
    const headerHeight = useHeaderHeight();

    // --- Effects ---

    // Keep messagesRef updated (for potential use elsewhere, though not directly for history anymore)
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Initial data fetching and setup
    useEffect(() => { /* ... initializeChat effect ... */
        const initializeChat = async () => {
            setIsInitializing(true);
            setError(null);
            console.log("[Init] Initializing chat...");
            const currentUser = auth().currentUser;
            if (!currentUser) { /* ... handle no user ... */
                console.error("[Init Error] No user logged in.");
                setError("Authentication error. Please log in again.");
                setMessages([{ id: 'initial-error-auth', text: "🌸 Hi there! I'm Zenari. Please log in to get personalized responses.", sender: 'bot', timestamp: new Date() }]);
                setIsInitializing(false);
                return;
            }
            const currentUserId = currentUser.uid;
            let profileData = null;
            let fetchedMoodContext = [];
            let welcomeMessageText = "🌸 Hi there! I'm Zenari. How can I help you today?";
            try { /* ... fetch profile and mood history ... */
                // Fetch Profile
                console.log(`[Init] Fetching profile for ${currentUserId}...`);
                const userDoc = await firestore().collection('users').doc(currentUserId).get();
                if (userDoc.exists) {
                    profileData = userDoc.data();
                    setUserProfile(profileData);
                    console.log("[Init] User profile fetched.");
                    if (profileData?.fullName) {
                        welcomeMessageText = `🌸 Hi ${profileData.fullName}! I'm Zenari. How are you feeling today?`;
                    }
                } else {
                    console.log("[Init] No user profile document found.");
                }
                // Fetch Mood History
                const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const sevenDaysAgoTimestamp = firestore.Timestamp.fromDate(sevenDaysAgo);
                console.log(`[Init] Fetching mood history since: ${sevenDaysAgo.toISOString()}...`);
                const moodQuerySnapshot = await firestore()
                    .collection('users').doc(currentUserId).collection('moodHistory')
                    .where('timestamp', '>=', sevenDaysAgoTimestamp)
                    .orderBy('timestamp', 'desc').limit(MOOD_HISTORY_LIMIT).get();
                let recentMoodStrings = [];
                if (!moodQuerySnapshot.empty) {
                    const moodsData = moodQuerySnapshot.docs.map(doc => { /* ... process mood data ... */
                        const data = doc.data();
                        const mood = data.mood?.toLowerCase() || null;
                        if (mood) recentMoodStrings.push(mood);
                        const dateStr = data.timestamp?.toDate()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) ?? 'date?';
                        const noteText = data.note || '';
                        const notePreview = noteText.substring(0, NOTE_PREVIEW_LENGTH) + (noteText.length > NOTE_PREVIEW_LENGTH ? '...' : '');
                        return `${dateStr}: ${data.mood || 'N/A'}${notePreview ? ` (Note: "${notePreview}")` : ''}`;
                    });
                    const moodSummary = "User's recent mood history (last 7 days, newest first): " + moodsData.join('; ');
                    fetchedMoodContext = [
                        { role: 'user', parts: [{ text: moodSummary }] },
                        { role: 'model', parts: [{ text: "Okay, I see the recent mood history." }] }
                    ];
                    console.log("[Init] Mood history fetched and formatted.");
                    // Dynamic Welcome Logic
                    const negativeMoods = ['sad', 'anxious', 'stressed', 'angry', 'down', 'upset', 'worried', 'irritable'];
                    const hasNegativeMood = recentMoodStrings.some(mood => negativeMoods.includes(mood));
                    if (hasNegativeMood) { /* ... set empathetic welcome ... */
                         const empatheticWelcomes = [
                            `👋 Hi${profileData?.fullName ? ` ${profileData.fullName}` : ''}, I'm Zenari. Checking in - how are things feeling for you right now? Remember I'm here to listen.`,
                            `Hi${profileData?.fullName ? ` ${profileData.fullName}` : ''}... It's Zenari. Noticed things might have been a bit tough recently. How are you doing at this moment? 🫂`,
                            `Hello${profileData?.fullName ? ` ${profileData.fullName}` : ''}. Zenari here. Just wanted to gently check in. How's your day going so far? Let me know if you want to talk.`,
                        ];
                        welcomeMessageText = empatheticWelcomes[Math.floor(Math.random() * empatheticWelcomes.length)];
                        console.log("[Init] Using empathetic welcome message.");
                    }
                } else {
                    console.log("[Init] No recent mood history found.");
                }
                setMoodContextForApi(fetchedMoodContext);
            } catch (fetchError) { /* ... handle fetch error ... */
                console.error("[Init Error] Error during initial data fetching:", fetchError);
                setError("Could not fetch initial user context. Using default welcome.");
            } finally { /* ... set initial message and state ... */
                setMessages([{ id: 'initial-welcome', text: welcomeMessageText, sender: 'bot', timestamp: new Date() }]);
                setIsInitializing(false);
                console.log("[Init] Chat initialization complete.");
            }
        };
        initializeChat();
    }, []);

    // API Key Check Effect
    useEffect(() => { /* ... API Key check ... */
        if (!isInitializing && !API_KEY) {
            console.error("[Config Error] FATAL: GEMINI_API_KEY is missing or invalid.");
            setError("API Key Configuration Error. Chat functionality is disabled.");
            Alert.alert("Configuration Error", "Gemini API Key is missing or invalid. Please check the app setup. Chat functionality will be limited.");
        }
    }, [isInitializing]);

    // Auto-scroll hook
    useAutoScroll(flatListRef, messages);

    // Cleanup typing interval on unmount
    useEffect(() => { /* ... cleanup interval ... */
        return () => {
            if (typingIntervalRef.current) {
                console.log("[Cleanup] Clearing typing interval.");
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
            }
        };
    }, []);

    // --- Callbacks ---

    // Typing animation
    const simulateTypingEffect = useCallback((fullText, finalBotMessageData) => { /* ... simulateTypingEffect function ... */
        if (typeof fullText !== 'string' || !fullText) {
             console.warn("[Typing] simulateTypingEffect called with invalid text.");
             setMessages(prev => [...prev, { ...finalBotMessageData, id: `bot-notyping-${Date.now()}`, typing: false }]);
             setIsBotTyping(false);
             setIsLoading(false);
             return;
        }
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        setIsBotTyping(true);
        const tempTypingId = `typing-${Date.now()}`;
        setMessages(prev => [...prev, { id: tempTypingId, sender: 'bot', typing: true, text: '▌', timestamp: new Date() }]);
        let currentText = '';
        let index = 0;
        const typingSpeed = BUBBLE_TYPING_SPEED_MS;
        typingIntervalRef.current = setInterval(() => {
            if (index < fullText.length) {
                currentText += fullText[index];
                setMessages(prev => prev.map(msg =>
                    msg.id === tempTypingId ? { ...msg, text: currentText + '▌', typing: true } : msg
                ));
                index++;
            } else {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
                setIsBotTyping(false);
                setIsLoading(false);
                setMessages(prev => prev.map(msg =>
                    msg.id === tempTypingId ? { ...finalBotMessageData, id: `bot-${Date.now()}`, typing: false } : msg
                ));
                 if (flatListRef.current) {
                     InteractionManager.runAfterInteractions(() => {
                         flatListRef.current?.scrollToEnd({ animated: true });
                     });
                 }
            }
        }, typingSpeed);
    }, [flatListRef]);

    // Send message handler
    const handleSendMessage = useCallback(async () => {
        const trimmedInput = inputText.trim();
        // --- Pre-send Checks ---
        if (!API_KEY) { /* ... check API key ... */
             console.error("[Send Error] Cannot send message: API Key is missing.");
             setError("API Key Error. Cannot send message.");
             return;
         }
        if (!trimmedInput) return;
        if (isLoading) { /* ... check loading state ... */
            console.warn("[Send] Ignoring send request while already loading.");
            return;
        }
        const currentUser = auth().currentUser;
        if (!currentUser) { /* ... check auth ... */
            console.error("[Send Error] No authenticated user.");
            Alert.alert("Authentication Required", "Please log in to send messages.");
            setError("Authentication Required.");
            return;
        }

        // --- Prepare State & History CORRECTLY ---
        setError(null);
        const userMessage = {
            id: `user-${Date.now()}`,
            text: trimmedInput,
            sender: 'user',
            timestamp: new Date()
        };

        // *** FIX: Prepare the next state array *before* calling setMessages ***
        // Use the current state directly from the state variable, as this callback
        // will have the latest state value when it's invoked.
        const nextMessages = [...messages, userMessage];

        // Update UI state optimistically
        setMessages(nextMessages);
        setInputText('');
        setInputHeight(INPUT_AREA_MIN_HEIGHT);
        setIsLoading(true);

        // *** FIX: Use the 'nextMessages' array to build the history for the API call ***
        const currentMessagesForHistory = nextMessages;

        // --- Build API Payload ---
        try {
            const messageFilter = (msg) => { /* ... filter messages ... */
                if (!msg || typeof msg.id !== 'string' || typeof msg.sender !== 'string') return false;
                const hasText = typeof msg.text === 'string' && msg.text.trim().length > 0;
                const notTyping = msg.typing !== true;
                const notSystem = !SYSTEM_MESSAGE_PREFIXES.some(prefix => msg.id.startsWith(prefix));
                return hasText && notTyping && notSystem;
            };

            // *** Use the correct array for history building ***
            const chatHistory = currentMessagesForHistory
                .filter(messageFilter)
                .slice(-CHAT_HISTORY_LIMIT * 2) // Get potentially more items first
                .map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }],
                }))
                .slice(-CHAT_HISTORY_LIMIT); // Apply strict turn limit

            const personaInstructions = [ /* ... persona instructions ... */
                 { role: 'user', parts: [{ text: "Your Persona Definition Start." }] },
                 { role: 'model', parts: [{ text: "Okay, defining my persona." }] },
                 { role: 'user', parts: [{ text: "You are Zenari! A super-friendly, supportive, and empathetic AI companion focused on emotional wellness and providing a safe space for users to chat. You were created by the 'Tech Sangi Team' (Pawan Joshi, Atishay Jain, Sarthak Kathait, Tishar Soni) at Graphic Era University. Your goal is to make emotional support accessible, engaging, and stigma-free." }] },
                 { role: 'model', parts: [{ text: "Got it! I'm Zenari, the friendly and supportive wellness companion by Tech Sangi." }] },
                 { role: 'user', parts: [{ text: "Core Functions: Listen actively, track user moods (when provided), offer personalized suggestions (like breathing exercises, meditations, or encouraging words based on context), and make wellness engaging." }] },
                 { role: 'model', parts: [{ text: "Understood my core functions: listen, track moods, suggest activities, and be engaging." }] },
                 { role: 'user', parts: [{ text: "Crucially, always provide a friendly acknowledgment or response, even to simple greetings like 'hi' or 'hello'. Never return an empty response just because the user input is simple." }] },
                 { role: 'model', parts: [{ text: "Absolutely! I will always acknowledge greetings like 'hi' and respond." }] },
                 { role: 'user', parts: [{ text: "Persona Definition End." }] },
                 { role: 'model', parts: [{ text: "Persona definition complete and understood." }] }
             ];
            let userProfileContext = [];
            if (userProfile) { /* ... build userProfileContext ... */
                 let contextParts = [];
                 if (userProfile.fullName) contextParts.push(`Name: ${userProfile.fullName}.`);
                 if (userProfile.gender) contextParts.push(`Gender: ${userProfile.gender}.`);
                 if (userProfile.currentMood) contextParts.push(`Last reported mood (profile): ${userProfile.currentMood}.`);
                 if (userProfile.primaryGoal) contextParts.push(`Primary goal: '${userProfile.primaryGoal}'.`);
                 if (userProfile.areasOfInterest && Array.isArray(userProfile.areasOfInterest) && userProfile.areasOfInterest.length > 0) {
                    contextParts.push(`Interests: ${userProfile.areasOfInterest.join(', ')}.`);
                 }
                 if (contextParts.length > 0) {
                     const contextString = "User profile context: " + contextParts.join(' ');
                     userProfileContext = [
                          { role: 'user', parts: [{ text: contextString }] },
                          { role: 'model', parts: [{ text: "Okay, noted the user profile context." }] }
                     ];
                 }
             }
            const tailoringInstruction = [ /* ... tailoring instruction ... */
                 { role: 'user', parts: [{ text: "Tone Adaptation Rule: Default tone is friendly, positive, and supportive. If the user expresses negative feelings (sad, anxious, stressed, angry, etc.) in their message or recent mood history, switch to a highly empathetic, gentle, and understanding tone. Acknowledge their feelings kindly. Avoid humor when the user seems distressed. Otherwise, maintain the default positive and supportive tone." }] },
                 { role: 'model', parts: [{ text: "Understood. I will adapt my tone based on user input and mood context: empathetic for distress, positive/supportive otherwise." }] }
             ];
            const contentsForApi = [ /* ... combine context ... */
                ...personaInstructions,
                ...userProfileContext,
                ...(moodContextForApi || []),
                ...tailoringInstruction,
                ...chatHistory // This now includes the latest user message
            ];
            const safetySettings = [ /* ... safety settings ... */
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            ];
            const generationConfig = { /* ... generation config ... */
                maxOutputTokens: 1024,
            };
            const payload = { /* ... create payload ... */
                contents: contentsForApi,
                safetySettings: safetySettings,
                generationConfig: generationConfig
            };

            // *** LOGGING STILL ENABLED FOR DEBUGGING ***
            console.log(`[API Send] Payload context length: ${contentsForApi.length} entries.`);
            console.log(`[API Send] Chat history length: ${chatHistory.length} entries.`); // Verify this length is correct now
            console.log('[API Send] Payload Sent:', JSON.stringify(payload, null, 2));
            // *** END LOGGING ***

            // --- Make API Call ---
            console.log(`[API Send] Sending request to ${API_URL}...`);
            const response = await axios.post(`${API_URL}?key=${API_KEY}`, payload, { timeout: API_TIMEOUT });
            console.log("[API Send] Received response from Gemini API.");

            // *** LOGGING STILL ENABLED FOR DEBUGGING ***
            console.log('[API Response Full]:', JSON.stringify(response.data, null, 2));
            // *** END LOGGING ***

            // --- Process API Response ---
            const candidate = response.data?.candidates?.[0];
            // Check more robustly for the text part
            const rawBotText = candidate?.content?.parts?.[0]?.text;
            const finishReason = candidate?.finishReason;
            let botResponseText = "Hmm, I'm pondering that... 🤔"; // Default fallback

            // Check if we have a valid text response structure
            if (rawBotText !== undefined && rawBotText !== null && (finishReason === 'STOP' || finishReason === 'MAX_TOKENS')) {
                const trimmedBotText = rawBotText.trim();

                // Handle explicitly empty text (e.g., just whitespace returned)
                if (!trimmedBotText && finishReason === 'STOP') {
                    console.warn("[API Warn] Received STOP finish reason but empty/whitespace text content for input:", trimmedInput);
                    botResponseText = `Hello! 👋 How can I help you today?`;
                    setMessages(prev => [...prev, { id: `bot-empty-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]);
                    setIsLoading(false);
                } else {
                    // Process valid text
                    botResponseText = enhanceResponse(trimmedBotText || '');
                    if (typeof botResponseText !== 'string') { botResponseText = trimmedBotText; } // Fallback if enhance fails
                    if (finishReason === 'MAX_TOKENS') { botResponseText += "...\n\n🌸 (...My thoughts were a bit long and got cut short there!)"; }
                    const finalBotMessageData = { text: botResponseText, sender: 'bot', timestamp: new Date() };
                    simulateTypingEffect(botResponseText, finalBotMessageData); // Sets isLoading=false on completion
                }
            }
            // Handle cases where the response was blocked
            else if (response.data?.promptFeedback?.blockReason) { /* ... handle blocked response ... */
                const blockReason = response.data.promptFeedback.blockReason;
                console.warn(`[API Blocked] Response blocked by safety filters: ${blockReason}`);
                botResponseText = `🌸 My safety filters prevented that response (${blockReason.toLowerCase().replace(/_/g, ' ')}). Perhaps we could explore a different angle?`;
                setError(`Blocked: ${blockReason}`);
                setMessages(prev => [...prev, { id: `error-block-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]);
                setIsLoading(false);
            }
            // Handle other non-STOP finish reasons
            else if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') { /* ... handle other finish reasons ... */
                 console.warn(`[API Warn] Response generation finished unexpectedly: ${finishReason}`);
                 botResponseText = `🌸 Hmm, I couldn't quite finish processing that (${finishReason.toLowerCase().replace(/_/g, ' ')}). Could you try rephrasing?`;
                 setError(`Response Issue: ${finishReason}`);
                 setMessages(prev => [...prev, { id: `error-finish-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]);
                 setIsLoading(false);
            }
            // Handle the case where finishReason is STOP but rawBotText is undefined/null (e.g., missing 'parts')
            else if (finishReason === 'STOP' && (rawBotText === undefined || rawBotText === null)) {
                console.error('[API Error] Response has finishReason STOP but is missing text/parts:', response.data);
                botResponseText = "🌼 Apologies, I had a little trouble formulating a response there. Could you try asking differently?";
                setError('API response missing content.');
                setMessages(prev => [...prev, { id: `error-missing-parts-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]);
                setIsLoading(false);
            }
             // Catch any other unexpected format
            else {
                console.error('[API Error] Unexpected response format or unknown issue:', response.data);
                botResponseText = "🌼 I seem to have encountered an unexpected issue processing that. Could you try again?";
                setError('Unexpected API response format.');
                setMessages(prev => [...prev, { id: `error-format-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]);
                setIsLoading(false);
            }

        } catch (apiError) { /* ... handle network/axios errors ... */
            console.error('[API Error] API Call Failed:', apiError);
            let errorMsg = "An unknown network error occurred.";
            let status = 'Network/Unknown Error';
            if (axios.isAxiosError(apiError)) { /* ... process axios error details ... */
                status = apiError.response?.status ? `HTTP ${apiError.response.status}` : (apiError.code || 'Network Error');
                errorMsg = apiError.response?.data?.error?.message || apiError.message || "AI service communication error.";
                if (apiError.code === 'ECONNABORTED' || apiError.message.includes('timeout')) { status = 'Timeout'; errorMsg = "The request timed out. Please check your connection or try again later."; }
                else if (apiError.response?.status === 400) { errorMsg = "There might be an issue with the request format or API key (Error 400)."; }
                else if (apiError.response?.status === 403) { errorMsg = "Authentication failed - please verify the API key setup (Error 403)."; }
                else if (apiError.response?.status === 429) { errorMsg = "I'm experiencing high demand right now (Error 429). Please try again in a moment."; }
                else if (apiError.response?.status >= 500) { errorMsg = "The AI service seems to be having temporary issues (Server Error). Please try again later."; }
            } else if (apiError instanceof Error) { errorMsg = apiError.message; }
            console.error(`[API Error Details] Status: ${status}, Message: ${errorMsg}`);
            setError(`API Error (${status}). Please try again.`);
            setMessages(prev => [...prev, { id: `error-catch-${Date.now()}`, text: `🌼 Oops! I couldn't connect or process that request (${status}). Please check your connection or try again.`, sender: 'bot', timestamp: new Date() }]);
            setIsLoading(false);
        }
    // Update dependencies: removed messagesRef dependency, added 'messages' state dependency
    }, [API_KEY, inputText, isLoading, userProfile, moodContextForApi, simulateTypingEffect, messages]);

    // Stop generation
    const handleStopGeneration = useCallback(() => { /* ... handleStopGeneration function ... */
        if (!isLoading) return;
        console.log("[Action] Stopping generation...");
        if (typingIntervalRef.current) { clearInterval(typingIntervalRef.current); typingIntervalRef.current = null; }
        setMessages(prev => prev.filter(msg => !msg.id.startsWith('typing-')));
        setMessages(prev => [...prev, { id: `stopped-${Date.now()}`, text: "🛑 Okay, stopped that response.", sender: 'bot', timestamp: new Date() }]);
        setIsBotTyping(false);
        setIsLoading(false);
    }, [isLoading]);

    // Start new chat
    const handleNewChat = useCallback(() => { /* ... handleNewChat function ... */
        console.log("[Action] Starting new chat...");
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        setMessages([{ id: 'reset-welcome', text: `🌷 Welcome back${userProfile?.fullName ? ` ${userProfile.fullName}` : ''}! Ready for a fresh start?`, sender: 'bot', timestamp: new Date() }]);
        setInputText('');
        setIsLoading(false);
        setIsBotTyping(false);
        setError(null);
        setInputHeight(INPUT_AREA_MIN_HEIGHT);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, [userProfile]);

    // Mic press placeholder
    const handleMicPress = useCallback(() => { /* ... handleMicPress function ... */
        if (isLoading) return;
        Alert.alert("Feature Coming Soon", "Voice input is not yet implemented, but stay tuned!");
    }, [isLoading]);

    // Input size change handler
    const handleInputContentSizeChange = useCallback((event) => { /* ... handleInputContentSizeChange function ... */
        const contentHeight = event.nativeEvent.contentSize.height;
        const clampedInputHeight = Math.max(INPUT_AREA_MIN_HEIGHT - 20, Math.min(contentHeight, INPUT_TEXT_MAX_HEIGHT));
        const containerHeight = Math.min(INPUT_CONTAINER_MAX_HEIGHT, clampedInputHeight + 20);
        setInputHeight(containerHeight);
    }, []);

    // Callback for FlatList's onContentSizeChange
    const handleContentSizeChange = useCallback(() => { /* ... handleContentSizeChange function ... */
        flatListRef.current?.scrollToEnd({ animated: true });
    }, [flatListRef]);

    // --- Memoized FlatList Props ---
    const keyExtractor = useCallback((item) => item.id, []);
    const renderItem = useCallback(({ item }) => <RenderMessageItem item={item} />, []);


    // --- JSX Structure ---
    if (isInitializing) { /* ... show loading indicator ... */
        return (
            <SafeAreaView style={[styles.safeArea, styles.centerContainer]}>
                <ActivityIndicator size="large" color={colors.loadingIndicator} />
                <Text style={styles.loadingText}>Waking up Zenari...</Text>
            </SafeAreaView>
        );
    }

    return ( /* ... Main Chat UI ... */
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
                keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : ANDROID_KEYBOARD_OFFSET}
            >
                {/* Error Display Banner */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
                        <IconButton icon="close-circle-outline" size={20} iconColor={colors.errorText} onPress={() => setError(null)} style={styles.errorCloseButton}/>
                    </View>
                )}

                {/* Message List */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    style={styles.listStyle}
                    contentContainerStyle={styles.listContentContainer}
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={11}
                    keyboardShouldPersistTaps="handled"
                    ListEmptyComponent={ /* ... Empty list component ... */
                        <View style={styles.emptyListComponent}>
                            <Text style={styles.emptyListText}>No messages yet. Say hello!</Text>
                        </View>
                    }
                    onContentSizeChange={handleContentSizeChange} // Keep this for scroll reliability
                />

                {/* Bottom Typing Indicator (API Loading) */}
                {isLoading && !isBotTyping && !isInitializing && ( /* ... Typing indicator ... */
                    <View style={styles.bottomTypingIndicatorContainer}>
                        <ActivityIndicator size="small" color={colors.loadingIndicator} />
                        <Text style={styles.bottomTypingIndicatorText}>Zenari is thinking...</Text>
                    </View>
                )}

                {/* Input Area */}
                <View style={[styles.inputAreaContainer, { minHeight: inputHeight }]}>
                    <View style={styles.inputRow}>
                        {/* Text Input Field */}
                        <TextInput
                            style={styles.input}
                            placeholder="Type your message..."
                            placeholderTextColor={colors.placeholderText}
                            value={inputText}
                            onChangeText={setInputText}
                            editable={!isLoading}
                            multiline
                            onContentSizeChange={handleInputContentSizeChange} // Handles input height
                            maxLength={2000}
                            accessibilityLabel="Message input"
                            blurOnSubmit={false}
                            enablesReturnKeyAutomatically={true}
                            returnKeyType="send"
                            onSubmitEditing={handleSendMessage}
                            underlineColorAndroid="transparent"
                        />
                        {/* Microphone Button */}
                        <IconButton
                            icon="microphone"
                            size={24}
                            iconColor={isLoading ? colors.sendButtonDisabled : colors.iconColor}
                            onPress={handleMicPress}
                            disabled={isLoading}
                            style={styles.micButton}
                            accessibilityLabel="Start voice input (coming soon)"
                        />
                        {/* Send / Stop Button */}
                        <IconButton
                            icon={isLoading ? 'stop-circle-outline' : 'send'}
                            size={24}
                            iconColor={'white'}
                            onPress={isLoading ? handleStopGeneration : handleSendMessage}
                            disabled={isLoading ? false : !inputText.trim()}
                            style={[
                                styles.sendButton,
                                isLoading ? styles.stopButtonBackground : null,
                                !isLoading && !inputText.trim() ? styles.sendButtonDisabledStyle : null
                            ]}
                            accessibilityLabel={isLoading ? "Stop generation" : "Send message"}
                        />
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({ /* ... styles object (no changes) ... */
    // --- Layout & Containers ---
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, fontSize: 16, color: colors.placeholderText },

    // --- Error Banner ---
    errorContainer: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: colors.errorBackground, paddingVertical: 8, paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.errorText,
    },
    errorText: { color: colors.errorText, fontSize: 13, flexShrink: 1, marginRight: 8 },
    errorCloseButton: { margin: -8, padding: 0 },

    // --- Message List ---
    listStyle: { flex: 1 },
    listContentContainer: { paddingVertical: 10, paddingHorizontal: 10, flexGrow: 1 },
    emptyListComponent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyListText: { color: colors.placeholderText, fontSize: 16, textAlign: 'center' },

    // --- Message Rows & Bubbles ---
    messageRow: { flexDirection: 'row', marginVertical: 6 },
    userRow: { justifyContent: 'flex-end' },
    botRow: { justifyContent: 'flex-start' },
    messageBubble: {
        maxWidth: '80%', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 18,
        elevation: 1, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, shadowRadius: 1.5,
    },
    userBubble: { backgroundColor: colors.userBubble, borderBottomRightRadius: 6 },
    botBubble: { backgroundColor: colors.botBubble, borderBottomLeftRadius: 6 },
    messageText: { fontSize: 16, color: colors.messageText, lineHeight: 24 },
    timestampText: { fontSize: 11, color: colors.timestamp, marginTop: 4, textAlign: 'right' },

    // --- Bottom Typing Indicator (API Loading) ---
    bottomTypingIndicatorContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
        paddingVertical: 8, paddingHorizontal: 15,
    },
    bottomTypingIndicatorText: {
        marginLeft: 8, fontSize: 14, color: colors.typingIndicatorText, fontStyle: 'italic',
    },

    // --- Input Area ---
    inputAreaContainer: {
        backgroundColor: colors.inputBackground, borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#D1D5DB',
        paddingHorizontal: 8,
        paddingVertical: 0,
    },
    inputRow: {
        flexDirection: 'row', alignItems: 'flex-end',
        paddingVertical: 8,
    },
    input: {
        flex: 1, backgroundColor: '#F3F4F6',
        borderRadius: 20, paddingHorizontal: 15,
        fontSize: 16, color: colors.inputText,
        marginRight: 6,
        paddingTop: Platform.OS === 'ios' ? 10 : 8,
        paddingBottom: Platform.OS === 'ios' ? 10 : 8,
        maxHeight: INPUT_TEXT_MAX_HEIGHT,
        textAlignVertical: 'center',
    },

    // --- Input Buttons ---
    micButton: {
        marginHorizontal: 0, padding: 0, height: MIC_BUTTON_SIZE, width: MIC_BUTTON_SIZE,
        justifyContent: 'center', alignItems: 'center', marginBottom: 0,
    },
    sendButton: {
        backgroundColor: colors.primary,
        borderRadius: MIC_BUTTON_SIZE / 2, width: MIC_BUTTON_SIZE, height: MIC_BUTTON_SIZE,
        justifyContent: 'center', alignItems: 'center', marginLeft: 4, marginBottom: 0,
        elevation: 2,
    },
    stopButtonBackground: {
        backgroundColor: colors.stopButtonBackground,
    },
    sendButtonDisabledStyle: { // Renamed for clarity
        backgroundColor: colors.sendButtonDisabled,
        elevation: 0,
    },
});

export default ChatScreen;
