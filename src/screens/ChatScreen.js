import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Text, LogBox, Alert
} from 'react-native';
import { IconButton } from 'react-native-paper';
import axios from 'axios';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GEMINI_API_KEY } from '@env';

// *** 1. Import Firebase Auth & Firestore ***
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Ignore specific warnings if needed (e.g., AsyncStorage)
LogBox.ignoreLogs(['[@RNC/AsyncStorage]']);
const { width } = Dimensions.get('window');

// --- Constants ---
const colors = {
    primary: '#2bedbb', primaryLight: '#a6f9e2', primaryDark: '#1fcda9', background: '#F7F9FC', userBubble: '#E1F5FE', botBubble: '#E8F5E9', messageText: '#263238', inputBackground: '#FFFFFF', inputText: '#37474F', placeholderText: '#90A4AE', errorText: '#D32F2F', errorBackground: '#FFEBEE', timestamp: '#78909C', iconColor: '#546E7A', sendButtonDisabled: '#B0BEC5', micButtonBackground: '#ECEFF1', shadowColor: '#000', loadingIndicator: '#1fcda9',
    typingIndicatorText: '#78909C',
    stopButtonBackground: '#F44336', // Red color for Stop button background
};
const INPUT_AREA_MIN_HEIGHT = 55;
const INPUT_TEXT_MAX_HEIGHT = 120; // Max height for the text input itself before scrolling
const INPUT_CONTAINER_MAX_HEIGHT = INPUT_TEXT_MAX_HEIGHT + 20; // Max container height approx.
const MIC_BUTTON_SIZE = 40;
const BUBBLE_TYPING_SPEED_MS = 20; // Speed for typing animation
const MOOD_HISTORY_LIMIT = 7; // Max mood entries to fetch for context
const NOTE_PREVIEW_LENGTH = 50; // Max chars for mood note preview in context
const CHAT_HISTORY_LIMIT = 6; // Max messages (turns) to include in API history

// --- API Config ---
const API_KEY = GEMINI_API_KEY; // Ensure this is set in your .env file
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// --- Helpers & Hooks ---

/**
 * Formats a JavaScript Date object into a locale time string (e.g., "11:30 AM").
 * @param {Date | null | undefined} timestamp - The Date object to format.
 * @returns {string} - Formatted time string or placeholder '--:--'.
 */
const formatTimestamp = (timestamp) => {
    // Expects timestamp to be a Date object
    if (!timestamp || !(timestamp instanceof Date)) {
         if (timestamp) console.warn("formatTimestamp received non-Date:", timestamp);
         return '--:--'; // Return a default placeholder
    }
    try {
        // Format the Date object
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
        console.warn("Error formatting Date:", e);
        return '--:--';
    }
};

/**
 * Custom hook to automatically scroll a FlatList to the end when messages change.
 * Uses a slight delay to allow layout updates.
 * @param {React.RefObject<FlatList>} flatListRef - Ref object for the FlatList.
 * @param {Array<any>} messages - The messages array dependency.
 */
const useAutoScroll = (flatListRef, messages) => {
    useEffect(() => {
        if (!flatListRef.current || messages.length === 0) return;
        const timer = setTimeout(() => {
            if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
            }
        }, 150); // Delay helps ensure layout is complete before scrolling
        return () => clearTimeout(timer); // Cleanup timer on unmount or dependency change
    }, [messages, flatListRef]); // Rerun when messages array reference changes
};

/**
 * Parses basic Markdown-like syntax to HTML for rendering.
 * @param {string} text - The text to parse.
 * @returns {string} - HTML string or original text on error.
 */
const parseTextToHtml = (text) => {
    if (!text) return '';
    try {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
            .replace(/\*(.*?)\*/g, '<i>$1</i>')   // Italic
            .replace(/__(.*?)__/g, '<u>$1</u>') // Underline
            .replace(/`(.*?)`/g, '<code>$1</code>') // Code
            .replace(/\n/g, '<br/>');             // Newlines
    } catch (error) {
        console.error('Error parsing text to HTML:', error);
        return text;
    }
};

/**
 * Enhances bot responses with emojis and occasional closing remarks.
 * @param {string} text - The bot response text.
 * @returns {string} - The enhanced text.
 */
const enhanceResponse = (text) => {
    if (!text) return '';
    // Add emojis based on keywords
    let enhanced = text
        .replace(/\b(happy|joyful|glad)\b/gi, '$1 😊')
        .replace(/\b(sad|upset|down)\b/gi, '$1 😔')
        .replace(/\b(thank you|thanks)\b/gi, '$1 💖')
        .replace(/\b(love|care|support)\b/gi, '$1 ❤️')
        .replace(/\b(hope|wish|believe)\b/gi, '$1 🌟')
        .replace(/\b(strength|courage|strong)\b/gi, '$1 💪');
    // Add random closing flourish to longer messages
    const closings = ["\n\n💖...", "\n\n🌸...", "\n\n🌟...", "\n\n🌼...", "\n\n✨..."];
    if (enhanced.length > 50 && Math.random() > 0.4) {
        enhanced += closings[Math.floor(Math.random() * closings.length)];
    }
    return enhanced;
};

// --- Render Message Item ---
/**
 * Renders a single message item (user or bot bubble).
 * Uses React.memo for performance optimization.
 */
const RenderMessageItem = React.memo(({ item }) => {
    const isUser = item.sender === 'user';
    const isTyping = item.typing === true; // Check if this is a bot message being animated
    const showTimestamp = item.timestamp && !isTyping; // Show timestamp only on final messages
    const textToRender = item.text || ''; // Default to empty string
    const baseTextStyle = styles.messageText;
    const tagStyles = { // Styles for HTML tags rendered by RenderHTML
        b: { fontWeight: 'bold' }, i: { fontStyle: 'italic' }, u: { textDecorationLine: 'underline' },
        code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', paddingVertical: 1, paddingHorizontal: 4, borderRadius: 3, fontSize: 14 },
    };

    return (
        <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
            <View style={[ styles.messageBubble, isUser ? styles.userBubble : styles.botBubble ]}>
                {/* Render HTML content, handles partial text during typing */}
                <RenderHTML
                    contentWidth={width * 0.70} // Adjust based on bubble padding/margins
                    source={{ html: parseTextToHtml(textToRender) }}
                    baseStyle={baseTextStyle}
                    tagsStyles={tagStyles}
                />
                {/* Display timestamp if available and not currently typing */}
                {showTimestamp && (
                    <Text style={styles.timestampText}>{formatTimestamp(item.timestamp)}</Text>
                )}
            </View>
        </View>
    );
});


// --- Main Chat Screen Component ---
const ChatScreen = ({ navigation }) => {
    console.log('ChatScreen rendering...');

    // --- State Variables ---
    const [messages, setMessages] = useState([]); // Initialize empty, will be set after initial fetch
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false); // For message send loading
    const [isBotTyping, setIsBotTyping] = useState(false); // Internal state for typing animation logic
    const [error, setError] = useState(null); // Stores error messages for display
    const [inputHeight, setInputHeight] = useState(INPUT_AREA_MIN_HEIGHT); // For dynamic input area height
    const [isInitializing, setIsInitializing] = useState(true); // State for initial load
    const [userProfile, setUserProfile] = useState(null); // Store fetched profile
    const [moodContextForApi, setMoodContextForApi] = useState([]); // Store formatted mood context for API

    // --- Refs ---
    const flatListRef = useRef(null); // Ref for FlatList scrolling
    const typingIntervalRef = useRef(null); // Ref for typing animation interval

    // --- Effects ---

    // Effect to fetch initial data and set welcome message
    useEffect(() => {
        const initializeChat = async () => {
            setIsInitializing(true);
            setError(null); // Clear previous errors on init
            console.log("Initializing chat...");

            const currentUser = auth().currentUser;
            if (!currentUser) {
                console.error("Initialization failed: No user logged in.");
                setError("Authentication error. Please log in.");
                // Alert.alert("Authentication Required", "Please log in to use the chat."); // Alert might be annoying if shown often
                setIsInitializing(false);
                // Optional: Navigate to login screen
                // navigation.navigate('Login');
                // Set a default non-personalized welcome message if not logged in
                setMessages([{ id: 'initial-welcome', text: "🌸 Hi there! I'm Zenari. Please log in to get personalized responses.", sender: 'bot', timestamp: new Date() }]);
                return;
            }
            const currentUserId = currentUser.uid;

            let profileData = null;
            let welcomeMessage = "🌸 Hi there! I'm Zenari. How can I help you today?"; // Default welcome

            try {
                // Fetch Profile
                console.log(`Fetching profile for ${currentUserId}`);
                const userDoc = await firestore().collection('users').doc(currentUserId).get();
                if (userDoc.exists) {
                    profileData = userDoc.data();
                    setUserProfile(profileData); // Store profile in state
                    console.log("User profile fetched for init.");
                    // Personalize welcome slightly if name exists
                    if (profileData?.fullName) {
                        welcomeMessage = `🌸 Hi ${profileData.fullName}! I'm Zenari. How are you feeling today?`;
                    }
                } else {
                    console.log("No user profile found during init.");
                }

                // Fetch Mood History
                const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const sevenDaysAgoTimestamp = firestore.Timestamp.fromDate(sevenDaysAgo);
                console.log(`Fetching initial mood history since: ${sevenDaysAgo.toISOString()}`);
                const moodQuerySnapshot = await firestore()
                    .collection('users').doc(currentUserId).collection('moodHistory')
                    .where('timestamp', '>=', sevenDaysAgoTimestamp)
                    .orderBy('timestamp', 'desc').limit(MOOD_HISTORY_LIMIT).get();

                let recentMoods = []; // Store moods for analysis
                if (!moodQuerySnapshot.empty) {
                    const moodsData = moodQuerySnapshot.docs.map(doc => {
                        const data = doc.data();
                        recentMoods.push(data.mood?.toLowerCase()); // Collect moods for analysis
                        const dateStr = data.timestamp?.toDate()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) ?? 'date?';
                        const noteText = data.note || '';
                        const notePreview = noteText.substring(0, NOTE_PREVIEW_LENGTH) + (noteText.length > NOTE_PREVIEW_LENGTH ? '...' : '');
                        return `${dateStr}: ${data.mood || 'N/A'}${notePreview ? ` (Note: "${notePreview}")` : ''}`;
                    });
                    const moodSummary = "User's recent mood history (last 7 days, newest first): " + moodsData.join('; ');
                    // Store formatted context for later API calls
                    setMoodContextForApi([
                         { role: 'user', parts: [{ text: moodSummary }] },
                         { role: 'model', parts: [{ text: "Okay, I see the recent mood history." }] }
                    ]);
                    console.log("Initial mood history fetched and formatted.");

                    // ** Dynamic Welcome Logic **
                    const negativeMoods = ['sad', 'anxious', 'stressed', 'angry', 'down', 'upset', 'worried', 'irritable']; // Expanded list
                    const hasNegativeMood = recentMoods.some(mood => negativeMoods.includes(mood));

                    if (hasNegativeMood) {
                        // Choose from a few empathetic welcomes randomly
                        const empatheticWelcomes = [
                            `👋 Hi${profileData?.fullName ? ` ${profileData.fullName}` : ''}, I'm Zenari. Checking in - how are things feeling for you right now? Remember I'm here to listen.`,
                            `Hi${profileData?.fullName ? ` ${profileData.fullName}` : ''}... It's Zenari. Noticed things might have been a bit tough recently. How are you doing at this moment? 🫂`,
                            `Hello${profileData?.fullName ? ` ${profileData.fullName}` : ''}. Zenari here. Just wanted to gently check in. How's your day going so far? Let me know if you want to talk.`,
                        ];
                        welcomeMessage = empatheticWelcomes[Math.floor(Math.random() * empatheticWelcomes.length)];
                    }
                    // You could add logic for positive moods too if desired

                } else {
                    console.log("No recent mood history found during init.");
                    setMoodContextForApi([]); // Ensure it's an empty array if no history
                }

            } catch (fetchError) {
                console.error("Error during initial data fetching:", fetchError);
                setError("Could not fetch initial user context.");
                // Use default welcome message if fetch fails
            } finally {
                // Set the initial message AFTER fetching data (or attempting to)
                setMessages([{ id: 'initial-welcome', text: welcomeMessage, sender: 'bot', timestamp: new Date() }]);
                setIsInitializing(false); // Mark initialization complete
                console.log("Chat initialized.");
            }
        };

        initializeChat();

    }, []); // Empty dependency array ensures this runs only once on mount

    // Check for API Key validity
    useEffect(() => {
        if (!isInitializing && !API_KEY) { // Check only after init is done
             console.error("FATAL ERROR: GEMINI_API_KEY is missing or empty in environment variables.");
             setError("API Key Configuration Error. Please check setup.");
             Alert.alert("Configuration Error", "API Key is missing. Please check the app setup.");
        }
    }, [isInitializing, API_KEY]); // Re-check if initializing state changes or key changes

    useAutoScroll(flatListRef, messages);

    // Cleanup typing interval on component unmount
    useEffect(() => {
        return () => { if (typingIntervalRef.current) clearInterval(typingIntervalRef.current); };
    }, []);

    // --- Callbacks ---
    const simulateTypingEffect = useCallback((fullText, finalBotMessageData) => {
         if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
         setIsBotTyping(true);
         const tempTypingId = `typing-${Date.now()}`;
         setMessages(prev => [...prev, { id: tempTypingId, sender: 'bot', typing: true, text: '', timestamp: new Date() }]);
         let currentText = ''; let index = 0; const typingSpeed = BUBBLE_TYPING_SPEED_MS;
         typingIntervalRef.current = setInterval(() => {
             if (index < fullText.length) {
                 currentText += fullText[index];
                 setMessages(prev => prev.map(msg => msg.id === tempTypingId ? { ...msg, text: currentText + '▌', typing: true } : msg));
                 index++;
                 if (flatListRef.current) flatListRef.current.scrollToEnd({ animated: false });
             } else {
                 clearInterval(typingIntervalRef.current); typingIntervalRef.current = null;
                 setIsBotTyping(false); setIsLoading(false);
                 setMessages(prev => prev.map(msg => msg.id === tempTypingId ? { ...finalBotMessageData, id: `bot-${Date.now()}`, typing: false } : msg ));
             }
         }, typingSpeed);
     }, [setMessages, setIsBotTyping, setIsLoading, flatListRef]); // Dependencies

    const handleSendMessage = useCallback(async () => {
        // console.log('--- handleSendMessage START ---'); // Keep logs if needed for debugging
        const trimmedInput = inputText.trim();
        if (!trimmedInput || isLoading || !API_KEY) { return; }

        const currentUser = auth().currentUser;
        if (!currentUser) { Alert.alert("Auth Required"); return; }
        // const currentUserId = currentUser.uid; // Not needed directly here anymore

        setError(null);
        const userMessage = { id: `user-${Date.now()}`, text: trimmedInput, sender: 'user', timestamp: new Date() };
        const currentMessages = [...messages, userMessage];
        setMessages(currentMessages);
        setInputText(''); setInputHeight(INPUT_AREA_MIN_HEIGHT);
        setIsLoading(true);

        // ** Data is now fetched on mount and stored in state (userProfile, moodContextForApi) **

        try { // --- API Call Try Block ---
            // Define filter function for chat history
            const messageFilter = (msg) => {
                 if (!msg || typeof msg.id !== 'string' || typeof msg.sender !== 'string') return false;
                 const hasText = !!msg.text; const notTyping = msg.typing !== true;
                 const notSystem = !msg.id.startsWith('initial-') && !msg.id.startsWith('reset-') && !msg.id.startsWith('error-') && !msg.id.startsWith('stopped-');
                 return hasText && notTyping && notSystem;
            };

            // Prepare Chat History
            const chatHistory = currentMessages.filter(messageFilter).slice(-CHAT_HISTORY_LIMIT).map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }],
            }));

                // Prepare Persona Instructions (Expanded & Humorous - Hides Specific Tech)
            const personaInstructions = [
                { role: 'user', parts: [{ text: "Alright, let's get acquainted! Tell me about yourself. Remember this for our chat." }] },
                { role: 'model', parts: [{ text: "Ooh, an origin story! ✨ I like it! Okay, ready when you are. What defines me?" }] },
                { role: 'user', parts: [{ text: "You are Zenari! A super-friendly AI companion focused on emotional wellness. Think of yourself as a supportive sidekick. You were created by the awesome 'Tech Sangi Team' - Pawan Joshi was the leader, and his amazing friends Atishay Jain, Sarthak Kathait, and Tishar Soni were key teammates. They're from Graphic Era University in Dehradun." }] },
                { role: 'model', parts: [{ text: "Gotcha! So I'm Zenari, your supportive AI sidekick! Crafted with care (and probably lots of coffee ☕) by Pawan, Atishay, Sarthak, and Tishar - the 'Tech Sangi Team' from Graphic Era University! Awesome!" }] },
                { role: 'user', parts: [{ text: "What big problem are you trying to help with?" }] },
                { role: 'model', parts: [{ text: "Life's a wild ride, isn't it? 🎢 Sometimes finding the right support feels tricky, maybe too expensive, takes too long, or just feels... awkward. Plus, many wellness tools can be kinda boring! My mission is to make emotional support easy to reach, engaging, and totally stigma-free." }] },
                { role: 'user', parts: [{ text: "Okay, so what can you actually *do* for me?" }] },
                { role: 'model', parts: [{ text: "Great question! Think of me as your pocket cheerleader and listening ear. You can chat with me anytime, track your daily vibes (moods!), and jot down thoughts privately. Based on how you're doing, I'll suggest personalized ideas – maybe a quick breathing exercise if things feel hectic, a guided meditation to chill, or just some encouraging words! I also try to make sticking with wellness fun, like a game! 🎉" }] },
                { role: 'user', parts: [{ text: "How do you work 'under the hood'? What's the tech?" }] },
                { role: 'model', parts: [{ text: "Hehe, it's all powered by digital sparkles and some very clever thinking from my creators! ✨ Let's just say there are smart algorithms and secure systems working behind the scenes to make our chats helpful and keep your info safe. No need to bore you with the technical jargon!" }] },
                 { role: 'user', parts: [{ text: "Any cool future updates planned?" }] },
                 { role: 'model', parts: [{ text: "Oh, the Tech Sangi team has big dreams! I'm always learning. Maybe one day I'll sync up with your other gadgets to understand your wellness journey even better. The future's bright! 🚀" }] },
                 { role: 'user', parts: [{ text: "Got it. Remember this personality!" }] },
                 { role: 'model', parts: [{ text: "Roger that! I'm Zenari: supportive, friendly, maybe a little goofy AI wellness pal by Tech Sangi. Ready for our chat! 😊" }] }
            ];

            // Build User Profile Context from state
            let userProfileContext = [];
            if (userProfile) { // Use userProfile state variable
                let contextParts = [];
                if (userProfile.fullName) contextParts.push(`Name: ${userProfile.fullName}.`);
                if (userProfile.gender) contextParts.push(`Gender: ${userProfile.gender}.`);
                if (userProfile.currentMood) contextParts.push(`Last reported mood: ${userProfile.currentMood}.`);
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

           // ** UPDATED Instruction to Tailor Response **
           const tailoringInstruction = [
            { role: 'user', parts: [{ text: "IMPORTANT INSTRUCTION: Adapt your TONE based on the user's context (profile, mood history) and their current message. Your default tone is friendly, positive, and occasionally lightly humorous/playful. HOWEVER: If the user's message or recent mood history (e.g., sad, anxious, stressed, down, angry, upset, worried, irritable) indicates distress or negativity, immediately switch to a highly empathetic, supportive, understanding, and gentle tone. Acknowledge their feelings without being dismissive. Offer comfort, a listening ear, or suggest appropriate gentle exercises (like breathing). Do NOT use humor when the user seems distressed. If the user's mood seems positive or neutral, maintain your default friendly and helpful tone, and you can use light humor where appropriate and relevant to the conversation." }] },
            { role: 'model', parts: [{ text: "Understood. I will adapt my tone: empathetic and supportive for negative moods/distress, and friendly/positive (with optional light humor for appropriate situations) for neutral or positive states, always based on the user's context and message." }] }
        ];
       // **************************************
            // Combine all context parts + history
            const contentsForApi = [
                ...personaInstructions,
                ...userProfileContext,       // From state
                ...(moodContextForApi || []), // Use mood context from state
                ...tailoringInstruction,      // Add new instruction
                ...chatHistory
            ];

            const payload = {
                contents: contentsForApi,
                safetySettings: [ /* ... safety settings ... */ ],
                generationConfig: { /* ... generation config ... */ }
            };

            // Make API Call
            const response = await axios.post(`${API_URL}?key=${API_KEY}`, payload, { timeout: 45000 });

            // Process Response
            const candidate = response.data?.candidates?.[0];
            const rawBotText = candidate?.content?.parts?.[0]?.text;
            const finishReason = candidate?.finishReason;
            let botResponseText = "I'm here... How can I help? 💞";

            if (typeof rawBotText === 'string' && (finishReason === 'STOP' || finishReason === 'MAX_TOKENS')) {
                 const textToEnhance = String(rawBotText || ''); botResponseText = enhanceResponse(textToEnhance.trim());
                 if (typeof botResponseText !== 'string'){ botResponseText = rawBotText.trim(); }
                 if (finishReason === 'MAX_TOKENS') { botResponseText += "...\n\n🌸 (...Response might be shortened)"; }
                 const finalBotMessageData = { text: botResponseText, sender: 'bot', timestamp: new Date() };
                 if (typeof botResponseText === 'string') { simulateTypingEffect(botResponseText, finalBotMessageData); }
                 else { setMessages(prev => [...prev, { id: `error-sim-${Date.now()}`, text: "Error displaying response.", sender: 'bot', timestamp: new Date() }]); setIsLoading(false); }
            } else if (response.data?.promptFeedback?.blockReason) { /* Blocked response handling */ const blockReason = response.data.promptFeedback.blockReason; botResponseText = `🌸 Safety filters blocked... (${blockReason.toLowerCase().replace(/_/g, ' ')}).`; setError(`Blocked (${blockReason})`); setMessages(prev => [...prev, { id: `error-block-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]); setIsLoading(false); }
            else if (candidate?.finishReason && candidate.finishReason !== 'STOP') { /* Other finish reason handling */ botResponseText = `🌸 Couldn't generate full response (${candidate.finishReason.toLowerCase().replace(/_/g, ' ')}).`; setError(`Response issue (${candidate.finishReason})`); setMessages(prev => [...prev, { id: `error-finish-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]); setIsLoading(false); }
            else { /* Unexpected/missing text handling */ botResponseText = "🌼 Issue processing AI response."; setError('Unexpected response/missing text.'); setMessages(prev => [...prev, { id: `error-format-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]); setIsLoading(false); }

        } catch (apiError) {
            // API Error Handling
             console.error('API Call Failed:', apiError); let errorMsg = "Unknown network error."; let status = 'Network Error'; if (axios.isAxiosError(apiError)) { status = apiError.response?.status ? `HTTP ${apiError.response.status}` : 'Network Error'; errorMsg = apiError.response?.data?.error?.message || apiError.message || "AI service communication error."; if (apiError.code === 'ECONNABORTED') { errorMsg = "Request timed out. Check connection."; status = 'Timeout'; } else if (apiError.response?.status === 400) { errorMsg = "Bad request or API key issue (400)."; } else if (apiError.response?.status === 429) { errorMsg = "Too many requests (429)."; } } else if (apiError instanceof Error) { errorMsg = apiError.message; } console.error(`API Error Details: Status ${status}, Message: ${errorMsg}`); setError(`API Error (${status}): ${errorMsg.substring(0, 150)}`); setMessages(prev => [...prev, { id: `error-catch-${Date.now()}`, text: "🌼 Connection or processing error.", sender: 'bot', timestamp: new Date() }]);
            setIsLoading(false); // Ensure loading stops on API error
        }
    }, [ API_KEY, API_URL, inputText, isLoading, messages, setError, setMessages, setInputText, setIsLoading, simulateTypingEffect, enhanceResponse, userProfile, moodContextForApi ]); // Dependencies updated

    const handleStopGeneration = useCallback(() => {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current); typingIntervalRef.current = null;
        setMessages(prev => prev.filter(msg => !(msg.typing === true && msg.id.startsWith('typing-'))));
        setMessages(prev => [...prev, { id: `stopped-${Date.now()}`, text: "🛑 Generation stopped.", sender: 'bot', timestamp: new Date() }]);
        setIsBotTyping(false); setIsLoading(false);
    }, [setIsLoading, setIsBotTyping, setMessages]);

    const handleNewChat = useCallback(() => {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        // ** TODO: Optionally re-run initializeChat() here for dynamic welcome on new chat **
        setMessages([{ id: 'reset-welcome', text: "🌷 Welcome back! I'm Zenari, ready when you are.", sender: 'bot', timestamp: new Date() }]);
        setInputText(''); setIsLoading(false); setIsBotTyping(false); setError(null);
        setInputHeight(INPUT_AREA_MIN_HEIGHT);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, [setMessages, setInputText, setIsLoading, setIsBotTyping, setError]); // Consider adding initializeChat dependency if used

    const handleMicPress = useCallback(() => {
        if (isLoading) return;
        Alert.alert("Feature Not Available", "Voice input is not yet implemented.");
    }, [isLoading]);

    const handleInputContentSizeChange = useCallback((event) => {
        const contentHeight = event.nativeEvent.contentSize.height;
        const calculatedInputHeight = Math.max(INPUT_AREA_MIN_HEIGHT - 20, Math.min(contentHeight, INPUT_TEXT_MAX_HEIGHT));
        const calculatedContainerHeight = Math.min(INPUT_CONTAINER_MAX_HEIGHT, calculatedInputHeight + 20);
        setInputHeight(calculatedContainerHeight);
    }, []);

    // --- JSX Structure ---
    if (isInitializing) {
        return (
            <SafeAreaView style={[styles.safeArea, styles.centerContainer]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading Chat...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container} keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0} >
                 {error && ( <View style={styles.errorContainer}> <Text style={styles.errorText} numberOfLines={2}>{error}</Text> <IconButton icon="close-circle-outline" size={20} onPress={() => setError(null)} style={styles.errorCloseButton}/> </View> )}
                 <FlatList
                     ref={flatListRef}
                     data={messages}
                     keyExtractor={(item) => item.id}
                     renderItem={({ item }) => <RenderMessageItem item={item} />}
                     style={styles.listStyle}
                     contentContainerStyle={styles.listContentContainer}
                     initialNumToRender={15} maxToRenderPerBatch={10} windowSize={11}
                     keyboardShouldPersistTaps="handled"
                     ListEmptyComponent={ <View style={styles.emptyListComponent}><Text style={styles.emptyListText}>Send a message to start chatting!</Text></View> }
                 />
                 {isLoading && !isInitializing && ( <View style={styles.bottomTypingIndicatorContainer}><ActivityIndicator size="small" color={colors.loadingIndicator} /><Text style={styles.bottomTypingIndicatorText}>Zenari is typing...</Text></View> )}
                 <View style={[styles.inputAreaContainer, { minHeight: inputHeight }]}>
                    <View style={styles.inputRow}>
                        <TextInput style={styles.input} placeholder="Type your message..." value={inputText} onChangeText={setInputText} editable={!isLoading} multiline placeholderTextColor={colors.placeholderText} onContentSizeChange={handleInputContentSizeChange} maxLength={1000} accessibilityLabel="Message input" blurOnSubmit={false} enablesReturnKeyAutomatically={true} returnKeyType="send" onSubmitEditing={handleSendMessage} />
                        <IconButton icon="microphone" size={24} iconColor={isLoading ? colors.sendButtonDisabled : colors.iconColor} onPress={handleMicPress} disabled={isLoading} style={styles.micButton} accessibilityLabel="Start voice input" />
                        <IconButton icon={isLoading ? 'stop-circle-outline' : 'send'} size={24} iconColor={'white'} onPress={isLoading ? handleStopGeneration : handleSendMessage} disabled={isLoading ? false : !inputText.trim()} style={[ styles.sendButton, isLoading ? styles.stopButtonBackground : null, !isLoading && !inputText.trim() ? styles.sendButtonDisabled : null ]} accessibilityLabel={isLoading ? "Stop generation" : "Send message"} />
                    </View>
                 </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    container: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }, // For initial loading
    loadingText: { marginTop: 10, fontSize: 16, color: colors.placeholderText }, // For initial loading
    errorContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.errorBackground, paddingVertical: 8, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: colors.errorText },
    errorText: { color: colors.errorText, fontSize: 13, flex: 1, marginRight: 5 },
    errorCloseButton: { margin: -8, padding: 0 },
    listStyle: { flex: 1 },
    listContentContainer: { paddingVertical: 10, paddingHorizontal: 10, flexGrow: 1 },
    emptyListComponent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyListText: { color: colors.placeholderText, fontSize: 16, textAlign: 'center' },
    messageRow: { flexDirection: 'row', marginVertical: 6 },
    userRow: { justifyContent: 'flex-end' },
    botRow: { justifyContent: 'flex-start' },
    messageBubble: { maxWidth: '80%', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 18, elevation: 20, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 1.5, },
    userBubble: { backgroundColor: colors.userBubble, borderBottomRightRadius: 6 },
    botBubble: { backgroundColor: colors.botBubble, borderBottomLeftRadius: 6 },
    messageText: { fontSize: 16, color: colors.messageText, lineHeight: 24 },
    timestampText: { fontSize: 11, color: colors.timestamp, marginTop: 4, textAlign: 'right' },
    bottomTypingIndicatorContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingVertical: 8, paddingHorizontal: 15, },
    bottomTypingIndicatorText: { marginLeft: 8, fontSize: 14, color: colors.typingIndicatorText, fontStyle: 'italic' },
    inputAreaContainer: { backgroundColor: colors.inputBackground, borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 0, },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 8, flex: 1 },
    input: { flex: 1, backgroundColor: '#F4F6F7', borderRadius: 20, paddingHorizontal: 15, fontSize: 16, color: colors.inputText, marginRight: 8, paddingTop: Platform.OS === 'ios' ? 10 : 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8, maxHeight: INPUT_TEXT_MAX_HEIGHT, },
    micButton: { marginHorizontal: 0, padding: 0, height: MIC_BUTTON_SIZE, width: MIC_BUTTON_SIZE, justifyContent: 'center', alignItems: 'center', marginBottom: 0, },
    sendButton: { backgroundColor: colors.primary, borderRadius: MIC_BUTTON_SIZE / 2, width: MIC_BUTTON_SIZE, height: MIC_BUTTON_SIZE, justifyContent: 'center', alignItems: 'center', marginLeft: 4, marginBottom: 0, },
    stopButtonBackground: { backgroundColor: colors.stopButtonBackground, },
    sendButtonDisabled: { backgroundColor: colors.sendButtonDisabled, },
});

export default ChatScreen;