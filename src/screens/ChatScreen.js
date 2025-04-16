import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, Platform, Dimensions, ActivityIndicator, Text, LogBox, Alert, InteractionManager // <-- Added InteractionManager
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
import { useHeaderHeight } from '@react-navigation/elements'; // Import hook to get header height

// Ignore specific warnings if needed (use sparingly)
// LogBox.ignoreLogs(['[@RNC/AsyncStorage]']); // Example
// LogBox.ignoreLogs(['You seem to update props of the "TRenderEngineProvider"']); // Example if the performance warning is too noisy during dev

const { width } = Dimensions.get('window');

// --- Constants ---
const colors = {
    primary: '#2bedbb', primaryLight: '#a6f9e2', primaryDark: '#1fcda9', background: '#F7F9FC', userBubble: '#E1F5FE', botBubble: '#E8F5E9', messageText: '#263238', inputBackground: '#FFFFFF', inputText: '#37474F', placeholderText: '#90A4AE', errorText: '#D32F2F', errorBackground: '#FFEBEE', timestamp: '#78909C', iconColor: '#546E7A', sendButtonDisabled: '#B0BEC5', micButtonBackground: '#ECEFF1', shadowColor: '#000', loadingIndicator: '#1fcda9',
    typingIndicatorText: '#78909C',
    stopButtonBackground: '#F44336', // Red color for Stop button background
};
// Input area sizing
const INPUT_AREA_MIN_HEIGHT = 55;
const INPUT_TEXT_MAX_HEIGHT = 120; // Max height for the text input itself before scrolling
const INPUT_CONTAINER_MAX_HEIGHT = INPUT_TEXT_MAX_HEIGHT + 20; // Max container height approx.
const MIC_BUTTON_SIZE = 40;
// Animation speed
const BUBBLE_TYPING_SPEED_MS = 25; // Slightly slower typing speed (might help performance warning slightly)
// Context limits
const MOOD_HISTORY_LIMIT = 7; // Max mood entries to fetch for context
const NOTE_PREVIEW_LENGTH = 50; // Max chars for mood note preview in context
const CHAT_HISTORY_LIMIT = 6; // Max messages (user+bot turns) to include in API history (adjust based on token limits)
// Keyboard offset for Android
const ANDROID_KEYBOARD_OFFSET = 20; // Small offset for Android with behavior='height'

// --- API Config ---
const API_KEY = GEMINI_API_KEY; // Ensure this is set in your .env file and loaded correctly
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'; // Using Flash model

// --- Helpers & Hooks ---

/**
 * Formats a JavaScript Date object into a locale time string (e.g., "11:30 AM").
 * @param {Date | null | undefined} timestamp - The Date object to format.
 * @returns {string} - Formatted time string or placeholder '--:--'.
 */
const formatTimestamp = (timestamp) => {
    if (!timestamp || !(timestamp instanceof Date)) {
        if (timestamp) console.warn("formatTimestamp received non-Date:", timestamp);
        return '--:--';
    }
    try {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch (e) {
        console.warn("Error formatting Date:", e);
        return '--:--';
    }
};

/**
 * Custom hook to automatically scroll a FlatList to the end when messages change.
 * Uses InteractionManager for smoother scrolling after potential animations/interactions.
 * @param {React.RefObject<FlatList>} flatListRef - Ref object for the FlatList.
 * @param {Array<any>} messages - The messages array dependency.
 */
const useAutoScroll = (flatListRef, messages) => {
    useEffect(() => {
        if (!flatListRef.current || messages.length === 0) return;
        // Use InteractionManager to delay scrolling until after animations/interactions are complete
        const interactionPromise = InteractionManager.runAfterInteractions(() => {
             if (flatListRef.current) {
                 flatListRef.current.scrollToEnd({ animated: true });
             }
        });
        // Fallback timer in case InteractionManager takes too long or doesn't fire
        const timer = setTimeout(() => {
            if (flatListRef.current) {
                // Check if still needed - InteractionManager might have already run
                // This check is basic; more complex logic could track if scrolling already happened.
                flatListRef.current.scrollToEnd({ animated: true });
            }
        }, 250); // Adjust delay if needed

        return () => {
            interactionPromise.cancel(); // Cancel InteractionManager task if component unmounts
            clearTimeout(timer); // Cleanup timer
        };
    }, [messages, flatListRef]); // Rerun when messages array reference changes
};

/**
 * Parses basic Markdown-like syntax to HTML for rendering.
 * Consider using a more robust library like 'react-native-markdown-display' for complex markdown.
 * @param {string} text - The text to parse.
 * @returns {string} - HTML string or original text on error.
 */
const parseTextToHtml = (text) => {
    if (!text) return '';
    try {
        // Basic replacements - order matters (e.g., bold before italic if nested)
        return text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')       // Bold
            .replace(/\*(.*?)\*/g, '<i>$1</i>')         // Italic
            .replace(/__(.*?)__/g, '<u>$1</u>')       // Underline
            .replace(/`(.*?)`/g, '<code>$1</code>')     // Code
            .replace(/\n/g, '<br/>');                   // Newlines
    } catch (error) {
        console.error('Error parsing text to HTML:', error);
        return text; // Return original text on error
    }
};

/**
 * Enhances bot responses with emojis and occasional closing remarks.
 * @param {string} text - The bot response text.
 * @returns {string} - The enhanced text.
 */
const enhanceResponse = (text) => {
    if (!text) return '';
    // Add emojis based on keywords (case-insensitive)
    let enhanced = text
        .replace(/\b(happy|joyful|glad|excited|wonderful|great)\b/gi, '$1 😊')
        .replace(/\b(sad|upset|down|lonely|depressed|unhappy)\b/gi, '$1 😔')
        .replace(/\b(thank you|thanks|appreciate)\b/gi, '$1 💖')
        .replace(/\b(love|care|support|hug)\b/gi, '$1 ❤️')
        .replace(/\b(hope|wish|believe|positive)\b/gi, '$1 🌟')
        .replace(/\b(strength|courage|strong|resilient)\b/gi, '$1 💪')
        .replace(/\b(sorry|apologize)\b/gi, '$1 🙏'); // Added sorry

    // Add random closing flourish to longer messages
    const closings = ["\n\nTake care... 💖", "\n\nThinking of you... 🌸", "\n\nSending positive vibes... 🌟", "\n\nBe well... 🌼", "\n\n✨"];
    if (enhanced.length > 60 && Math.random() > 0.5) { // Slightly higher threshold and probability
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
    const isTyping = item.typing === true;
    const showTimestamp = item.timestamp && !isTyping;
    const textToRender = item.text || '';
    const baseTextStyle = styles.messageText;
    // Memoize tagStyles to prevent recreation on every render
    const tagStyles = React.useMemo(() => ({
        b: { fontWeight: 'bold' },
        i: { fontStyle: 'italic' },
        u: { textDecorationLine: 'underline' },
        code: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: 'rgba(0,0,0,0.05)', paddingVertical: 1, paddingHorizontal: 4, borderRadius: 3, fontSize: 14 },
        // Add more tags here if needed (e.g., lists, links)
    }), []);

    // Memoize source prop for RenderHTML if textToRender doesn't change
    const htmlSource = React.useMemo(() => ({
        html: parseTextToHtml(textToRender)
    }), [textToRender]);

    return (
        <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
            <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.botBubble]}>
                {/* Render HTML content */}
                {/* Note: The frequent updates during typing *will* cause warnings from this component.
                    Accepting the warning or implementing a different typing indicator are options. */}
                <RenderHTML
                    contentWidth={width * 0.70} // Base calculation, adjust if needed
                    source={htmlSource} // Use memoized source
                    baseStyle={baseTextStyle}
                    tagsStyles={tagStyles} // Use memoized styles
                    enableExperimentalMarginCollapsing={true} // Optional: improve list rendering consistency
                />
                {/* Display timestamp */}
                {showTimestamp && (
                    <Text style={styles.timestampText}>{formatTimestamp(item.timestamp)}</Text>
                )}
            </View>
        </View>
    );
});


// --- Main Chat Screen Component ---
const ChatScreen = ({ navigation }) => {
    // --- State Variables ---
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false); // API loading state
    const [isBotTyping, setIsBotTyping] = useState(false); // Controls typing animation logic
    const [error, setError] = useState(null);
    const [inputHeight, setInputHeight] = useState(INPUT_AREA_MIN_HEIGHT);
    const [isInitializing, setIsInitializing] = useState(true); // Initial data load state
    const [userProfile, setUserProfile] = useState(null);
    const [moodContextForApi, setMoodContextForApi] = useState([]);

    // --- Refs ---
    const flatListRef = useRef(null);
    const typingIntervalRef = useRef(null);
    // Ref to hold the latest messages state, avoiding stale closures in callbacks
    const messagesRef = useRef(messages);

    // --- Hooks ---
    const headerHeight = useHeaderHeight(); // Get header height from navigation

    // --- Effects ---

    // Update messagesRef whenever messages state changes
    useEffect(() => {
        messagesRef.current = messages;
    }, [messages]);

    // Effect to fetch initial data (profile, mood history) and set welcome message
    useEffect(() => {
        const initializeChat = async () => {
            setIsInitializing(true);
            setError(null);
            console.log("Initializing chat...");

            const currentUser = auth().currentUser;
            if (!currentUser) {
                console.error("Initialization failed: No user logged in.");
                setError("Authentication error. Please log in.");
                setIsInitializing(false);
                setMessages([{ id: 'initial-welcome', text: "🌸 Hi there! I'm Zenari. Please log in to get personalized responses.", sender: 'bot', timestamp: new Date() }]);
                return;
            }
            const currentUserId = currentUser.uid;
            let profileData = null;
            let welcomeMessage = "🌸 Hi there! I'm Zenari. How can I help you today?";

            try {
                // Fetch Profile
                console.log(`Fetching profile for ${currentUserId}`);
                const userDoc = await firestore().collection('users').doc(currentUserId).get();
                if (userDoc.exists) {
                    profileData = userDoc.data();
                    setUserProfile(profileData);
                    console.log("User profile fetched for init.");
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

                let recentMoods = [];
                if (!moodQuerySnapshot.empty) {
                    const moodsData = moodQuerySnapshot.docs.map(doc => {
                        const data = doc.data();
                        recentMoods.push(data.mood?.toLowerCase());
                        const dateStr = data.timestamp?.toDate()?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) ?? 'date?';
                        const noteText = data.note || '';
                        const notePreview = noteText.substring(0, NOTE_PREVIEW_LENGTH) + (noteText.length > NOTE_PREVIEW_LENGTH ? '...' : '');
                        return `${dateStr}: ${data.mood || 'N/A'}${notePreview ? ` (Note: "${notePreview}")` : ''}`;
                    });
                    const moodSummary = "User's recent mood history (last 7 days, newest first): " + moodsData.join('; ');
                    setMoodContextForApi([
                        { role: 'user', parts: [{ text: moodSummary }] },
                        { role: 'model', parts: [{ text: "Okay, I see the recent mood history." }] }
                    ]);
                    console.log("Initial mood history fetched and formatted.");

                    // Dynamic Welcome Logic
                    const negativeMoods = ['sad', 'anxious', 'stressed', 'angry', 'down', 'upset', 'worried', 'irritable'];
                    const hasNegativeMood = recentMoods.some(mood => negativeMoods.includes(mood));
                    if (hasNegativeMood) {
                        const empatheticWelcomes = [
                            `👋 Hi${profileData?.fullName ? ` ${profileData.fullName}` : ''}, I'm Zenari. Checking in - how are things feeling for you right now? Remember I'm here to listen.`,
                            `Hi${profileData?.fullName ? ` ${profileData.fullName}` : ''}... It's Zenari. Noticed things might have been a bit tough recently. How are you doing at this moment? 🫂`,
                            `Hello${profileData?.fullName ? ` ${profileData.fullName}` : ''}. Zenari here. Just wanted to gently check in. How's your day going so far? Let me know if you want to talk.`,
                        ];
                        welcomeMessage = empatheticWelcomes[Math.floor(Math.random() * empatheticWelcomes.length)];
                    }
                } else {
                    console.log("No recent mood history found during init.");
                    setMoodContextForApi([]);
                }
            } catch (fetchError) {
                console.error("Error during initial data fetching:", fetchError);
                setError("Could not fetch initial user context.");
            } finally {
                setMessages([{ id: 'initial-welcome', text: welcomeMessage, sender: 'bot', timestamp: new Date() }]);
                setIsInitializing(false);
                console.log("Chat initialized.");
            }
        };
        initializeChat();
    }, []); // Run only once on mount

    // Check for API Key validity after initialization
    useEffect(() => {
        if (!isInitializing && !API_KEY) {
            console.error("FATAL ERROR: GEMINI_API_KEY is missing or empty.");
            setError("API Key Configuration Error. Please check setup.");
            Alert.alert("Configuration Error", "API Key is missing. Please check the app setup.");
        }
    }, [isInitializing]);

    // Hook for auto-scrolling the list
    useAutoScroll(flatListRef, messages);

    // Cleanup typing interval on component unmount
    useEffect(() => {
        return () => { if (typingIntervalRef.current) clearInterval(typingIntervalRef.current); };
    }, []);

    // --- Callbacks ---

    /**
     * Simulates the bot typing effect by gradually updating the message text.
     */
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
                // Replace typing indicator with the final message
                setMessages(prev => prev.map(msg => msg.id === tempTypingId ? { ...finalBotMessageData, id: `bot-${Date.now()}`, typing: false } : msg));
            }
        }, typingSpeed);
    }, [flatListRef]); // Dependencies optimized

    /**
     * Handles sending the user's message to the Gemini API and processing the response.
     */
    const handleSendMessage = useCallback(async () => {
        const trimmedInput = inputText.trim();
        // Prevent sending if input is empty, already loading, or API key is missing
        if (!trimmedInput || isLoading || !API_KEY) {
             if(!API_KEY) console.error("handleSendMessage aborted: API_KEY is missing.");
             return;
        }

        const currentUser = auth().currentUser;
        if (!currentUser) {
             Alert.alert("Auth Required", "Please log in to send messages.");
             return;
        }

        setError(null); // Clear previous errors
        const userMessage = { id: `user-${Date.now()}`, text: trimmedInput, sender: 'user', timestamp: new Date() };

        // Add user message optimistically and clear input
        setMessages(prevMessages => [...prevMessages, userMessage]);
        setInputText('');
        setInputHeight(INPUT_AREA_MIN_HEIGHT); // Reset input height
        setIsLoading(true); // Set loading state for API call

        // Use the messagesRef to get the most current message list *after* adding the user message
        const currentMessages = messagesRef.current;

        try {
            // Filter messages for API history (exclude system/typing messages)
            const messageFilter = (msg) => {
                if (!msg || typeof msg.id !== 'string' || typeof msg.sender !== 'string') return false;
                const hasText = !!msg.text;
                const notTyping = msg.typing !== true;
                // Exclude specific system message prefixes
                const notSystem = !['initial-', 'reset-', 'error-', 'stopped-'].some(prefix => msg.id.startsWith(prefix));
                return hasText && notTyping && notSystem;
            };

            const chatHistory = currentMessages
                .filter(messageFilter)
                .slice(-CHAT_HISTORY_LIMIT * 2) // Get potentially more items to ensure enough turns
                .map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }],
                }))
                .slice(-CHAT_HISTORY_LIMIT); // Strict limit on the number of turns

            // --- Prepare Context & Instructions ---
            const personaInstructions = [/* ... Full persona instructions ... */
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
            let userProfileContext = [];
            if (userProfile) { /* ... build userProfileContext ... */
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
            const tailoringInstruction = [ /* ... tailoring instruction ... */
                 { role: 'user', parts: [{ text: "IMPORTANT INSTRUCTION: Adapt your TONE based on the user's context (profile, mood history) and their current message. Your default tone is friendly, positive, and occasionally lightly humorous/playful. HOWEVER: If the user's message or recent mood history (e.g., sad, anxious, stressed, down, angry, upset, worried, irritable) indicates distress or negativity, immediately switch to a highly empathetic, supportive, understanding, and gentle tone. Acknowledge their feelings without being dismissive. Offer comfort, a listening ear, or suggest appropriate gentle exercises (like breathing). Do NOT use humor when the user seems distressed. If the user's mood seems positive or neutral, maintain your default friendly and helpful tone, and you can use light humor where appropriate and relevant to the conversation." }] },
                 { role: 'model', parts: [{ text: "Understood. I will adapt my tone: empathetic and supportive for negative moods/distress, and friendly/positive (with optional light humor for appropriate situations) for neutral or positive states, always based on the user's context and message." }] }
            ];

            const contentsForApi = [
                ...personaInstructions,
                ...userProfileContext,
                ...(moodContextForApi || []),
                ...tailoringInstruction,
                ...chatHistory
            ];

            // --- Gemini API Configuration ---
            const safetySettings = [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            ];
            const generationConfig = {
                // Adjust these for desired AI behavior:
                // temperature: 0.7, // Lower for more predictable, higher for more creative
                // topK: 40,
                // topP: 0.95,
                maxOutputTokens: 1024, // Max length of response
            };
            // --- End Gemini API Configuration ---

            const payload = {
                contents: contentsForApi,
                safetySettings: safetySettings,
                generationConfig: generationConfig
            };

            // Log payload before sending (uncomment for debugging)
            // console.log('Payload Sent:', JSON.stringify(payload, null, 2));
            console.log("🤖 Sending payload to Gemini API...");

            // Make API Call
            const response = await axios.post(`${API_URL}?key=${API_KEY}`, payload, { timeout: 45000 }); // 45s timeout
            console.log("✅ Received response from Gemini API.");

             // Log full response (uncomment for debugging)
             // console.log('Full API Response Data:', JSON.stringify(response.data, null, 2));

            // --- Process API Response ---
            const candidate = response.data?.candidates?.[0];
            const rawBotText = candidate?.content?.parts?.[0]?.text;
            const finishReason = candidate?.finishReason;
            let botResponseText = "I'm here... How can I help? 💞"; // Default fallback

            // *** MODIFIED BLOCK TO HANDLE EMPTY TEXT ***
            if (typeof rawBotText === 'string' && (finishReason === 'STOP' || finishReason === 'MAX_TOKENS')) {
                const trimmedBotText = rawBotText.trim(); // Trim upfront

                // Check if the response is empty despite STOP reason
                if (!trimmedBotText && finishReason === 'STOP') {
                    console.warn("⚠️ API returned STOP finish reason but with empty text content.");
                    botResponseText = "🤔 I didn't have anything specific to add to that. Is there something else I can help with?";
                    // Add this fallback message directly, bypassing typing effect
                    setMessages(prev => [...prev, { id: `error-empty-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]);
                    setIsLoading(false); // Stop loading indicator
                } else {
                    // Proceed with normal processing if text exists OR if truncated
                    botResponseText = enhanceResponse(trimmedBotText); // Use trimmed text
                    if (typeof botResponseText !== 'string') { botResponseText = trimmedBotText; } // Fallback

                    if (finishReason === 'MAX_TOKENS') {
                        botResponseText += "...\n\n🌸 (...My response was a bit long and got cut short)";
                    }

                    const finalBotMessageData = { text: botResponseText, sender: 'bot', timestamp: new Date() };
                    // Ensure text is valid before simulating
                    if (typeof botResponseText === 'string') {
                         simulateTypingEffect(botResponseText, finalBotMessageData); // Triggers setIsLoading(false) on completion
                    } else {
                         console.error("Error: botResponseText is not a string after enhancement/processing.");
                         setMessages(prev => [...prev, { id: `error-sim-${Date.now()}`, text: "Error displaying response (type issue).", sender: 'bot', timestamp: new Date() }]);
                         setIsLoading(false);
                    }
                }
            // *** END MODIFIED BLOCK ***

            } else if (response.data?.promptFeedback?.blockReason) {
                const blockReason = response.data.promptFeedback.blockReason;
                console.warn(`🚫 Response blocked by safety filters: ${blockReason}`);
                botResponseText = `🌸 My safety filters prevented displaying that response (${blockReason.toLowerCase().replace(/_/g, ' ')}). Could we try a different topic?`;
                setError(`Blocked (${blockReason})`);
                setMessages(prev => [...prev, { id: `error-block-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]);
                setIsLoading(false); // Stop loading indicator
            } else if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
                console.warn(`⚠️ Response generation finished unexpectedly: ${candidate.finishReason}`);
                botResponseText = `🌸 Hmm, I couldn't quite finish my thought there (${candidate.finishReason.toLowerCase().replace(/_/g, ' ')}). Let's try again?`;
                setError(`Response issue (${candidate.finishReason})`);
                setMessages(prev => [...prev, { id: `error-finish-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]);
                setIsLoading(false); // Stop loading indicator
            } else {
                // Handle cases where API call was successful but response format is unexpected
                console.error('❌ Unexpected API response format or missing text:', response.data);
                botResponseText = "🌼 I seem to have encountered an issue processing that. Could you rephrase or try again?";
                setError('Unexpected response/missing text.');
                setMessages(prev => [...prev, { id: `error-format-${Date.now()}`, text: botResponseText, sender: 'bot', timestamp: new Date() }]);
                setIsLoading(false); // Stop loading indicator
            }
        } catch (apiError) {
            // Handle Network/Axios errors
            console.error('API Call Failed:', apiError);
            let errorMsg = "Unknown network error.";
            let status = 'Network Error';
            if (axios.isAxiosError(apiError)) {
                status = apiError.response?.status ? `HTTP ${apiError.response.status}` : 'Network Error';
                errorMsg = apiError.response?.data?.error?.message || apiError.message || "AI service communication error.";
                if (apiError.code === 'ECONNABORTED') { errorMsg = "Request timed out. Please check your connection and try again."; status = 'Timeout'; }
                else if (apiError.response?.status === 400) { errorMsg = "There seems to be an issue with the request or API key (400)."; }
                else if (apiError.response?.status === 429) { errorMsg = "I'm experiencing high demand right now (429). Please try again shortly."; }
                else if (apiError.response?.status === 403) { errorMsg = "Authentication failed. Please check the API key setup (403)."; }
                else if (apiError.response?.status >= 500) { errorMsg = "The AI service seems to be having temporary issues. Please try again later."; }
            } else if (apiError instanceof Error) {
                errorMsg = apiError.message;
            }
            console.error(`API Error Details: Status ${status}, Message: ${errorMsg}`);
            setError(`API Error (${status}): ${errorMsg.substring(0, 150)}...`); // Show concise error
            setMessages(prev => [...prev, { id: `error-catch-${Date.now()}`, text: "🌼 Oops! I couldn't connect or process that request. Please check your connection or try again.", sender: 'bot', timestamp: new Date() }]);
            setIsLoading(false); // Ensure loading stops on API error
        }
    // Dependencies reviewed: inputText, isLoading, userProfile, moodContextForApi are read. simulateTypingEffect is called. API_KEY is used.
    }, [API_KEY, inputText, isLoading, userProfile, moodContextForApi, simulateTypingEffect]);


    /**
     * Stops the current bot typing animation and adds a 'stopped' message.
     */
    const handleStopGeneration = useCallback(() => {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
        setMessages(prev => prev.filter(msg => !(msg.typing === true && msg.id.startsWith('typing-')))); // Remove typing indicator
        setMessages(prev => [...prev, { id: `stopped-${Date.now()}`, text: "🛑 Generation stopped.", sender: 'bot', timestamp: new Date() }]);
        setIsBotTyping(false);
        setIsLoading(false);
    }, []); // No dependencies needed

    /**
     * Resets the chat to the initial state (or a standard welcome).
     */
    const handleNewChat = useCallback(() => {
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        // Consider re-fetching initial context if needed, or just reset messages
        setMessages([{ id: 'reset-welcome', text: "🌷 Welcome back! I'm Zenari, ready when you are.", sender: 'bot', timestamp: new Date() }]);
        setInputText('');
        setIsLoading(false);
        setIsBotTyping(false);
        setError(null);
        setInputHeight(INPUT_AREA_MIN_HEIGHT);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, []); // No dependencies needed

    /**
     * Placeholder for microphone button press.
     */
    const handleMicPress = useCallback(() => {
        if (isLoading) return;
        Alert.alert("Feature Not Available", "Voice input is not yet implemented in this chat.");
    }, [isLoading]);

    /**
     * Handles dynamic height adjustment of the text input area.
     */
    const handleInputContentSizeChange = useCallback((event) => {
        const contentHeight = event.nativeEvent.contentSize.height;
        const calculatedInputHeight = Math.max(INPUT_AREA_MIN_HEIGHT - 20, Math.min(contentHeight, INPUT_TEXT_MAX_HEIGHT));
        const calculatedContainerHeight = Math.min(INPUT_CONTAINER_MAX_HEIGHT, calculatedInputHeight + 20);
        setInputHeight(calculatedContainerHeight);
    }, []); // No dependencies needed

    // --- JSX Structure ---

    // Display loading indicator during initialization
    if (isInitializing) {
        return (
            <SafeAreaView style={[styles.safeArea, styles.centerContainer]}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading Chat...</Text>
            </SafeAreaView>
        );
    }

    // Main chat UI
    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
            {/* KeyboardAvoidingView pushes content up when keyboard appears */}
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
                // Use headerHeight for iOS 'padding' behavior.
                // Use a small fixed offset for Android 'height' behavior. Adjust if needed.
                keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : ANDROID_KEYBOARD_OFFSET}
            >
                {/* Error Display Area */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
                        <IconButton icon="close-circle-outline" size={20} onPress={() => setError(null)} style={styles.errorCloseButton}/>
                    </View>
                )}

                {/* Message List */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={(item) => item.id} // Use unique message ID
                    renderItem={({ item }) => <RenderMessageItem item={item} />} // Render each message
                    style={styles.listStyle} // Ensures FlatList takes available space
                    contentContainerStyle={styles.listContentContainer}
                    initialNumToRender={15} // FlatList optimization
                    maxToRenderPerBatch={10} // FlatList optimization
                    windowSize={11}          // FlatList optimization
                    keyboardShouldPersistTaps="handled" // Allows taps on list items while keyboard is up
                    ListEmptyComponent={ // Displayed when messages array is empty
                        <View style={styles.emptyListComponent}>
                            <Text style={styles.emptyListText}>Send a message to start chatting!</Text>
                        </View>
                    }
                />

                {/* Typing Indicator (shown below list while bot is generating) */}
                {/* NOTE: This indicator shows "Zenari is typing..." while the API call is loading.
                    The actual character-by-character typing happens within the message bubble itself
                    via simulateTypingEffect updating the message state. */}
                {isLoading && !isInitializing && (
                    <View style={styles.bottomTypingIndicatorContainer}>
                        <ActivityIndicator size="small" color={colors.loadingIndicator} />
                        <Text style={styles.bottomTypingIndicatorText}>Zenari is thinking...</Text> {/* Changed text slightly */}
                    </View>
                )}

                {/* Input Area */}
                <View style={[styles.inputAreaContainer, { minHeight: inputHeight }]}>
                    <View style={styles.inputRow}>
                        {/* Text Input Field */}
                        <TextInput
                            style={styles.input}
                            placeholder="Type your message..."
                            value={inputText}
                            onChangeText={setInputText}
                            editable={!isLoading} // Disable input while bot is processing
                            multiline
                            placeholderTextColor={colors.placeholderText}
                            onContentSizeChange={handleInputContentSizeChange} // Adjust height dynamically
                            maxLength={2000} // Limit input length (adjust as needed)
                            accessibilityLabel="Message input"
                            blurOnSubmit={false} // Keep keyboard open on submit for multiline
                            enablesReturnKeyAutomatically={true}
                            returnKeyType="send" // Show 'send' on keyboard
                            onSubmitEditing={handleSendMessage} // Allow sending via return key
                        />
                        {/* Microphone Button (Placeholder) */}
                        <IconButton
                            icon="microphone"
                            size={24}
                            iconColor={isLoading ? colors.sendButtonDisabled : colors.iconColor}
                            onPress={handleMicPress}
                            disabled={isLoading}
                            style={styles.micButton}
                            accessibilityLabel="Start voice input"
                        />
                        {/* Send / Stop Button */}
                        <IconButton
                            icon={isLoading ? 'stop-circle-outline' : 'send'} // Change icon based on loading state
                            size={24}
                            iconColor={'white'} // Icon color
                            onPress={isLoading ? handleStopGeneration : handleSendMessage} // Action changes based on state
                            disabled={isLoading ? false : !inputText.trim()} // Disable send if no text, always enable stop if loading
                            style={[
                                styles.sendButton,
                                isLoading ? styles.stopButtonBackground : null, // Red background for stop
                                !isLoading && !inputText.trim() ? styles.sendButtonDisabled : null // Grey background when send disabled
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
// Styles are kept separate for clarity - use the formatted version provided previously
const styles = StyleSheet.create({
    // --- General Layout & Containers ---
    safeArea: {
        flex: 1, // Take up all available screen space
        backgroundColor: colors.background // Background color for the whole screen area
    },
    container: {
        flex: 1 // Container for KeyboardAvoidingView, fills SafeAreaView
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center', // Center content vertically
        alignItems: 'center'      // Center content horizontally (used for initial loading)
    },
    loadingText: {
        marginTop: 10,             // Space above the text
        fontSize: 16,              // Font size
        color: colors.placeholderText // Text color for loading message
    },

    // --- Error Banner Styles ---
    errorContainer: {
        flexDirection: 'row',         // Arrange icon and text horizontally
        justifyContent: 'space-between',// Space out text and close button
        alignItems: 'center',         // Align items vertically
        backgroundColor: colors.errorBackground, // Reddish background for errors
        paddingVertical: 8,           // Vertical padding
        paddingHorizontal: 10,        // Horizontal padding
        borderBottomWidth: 1,         // Bottom border
        borderBottomColor: colors.errorText // Border color matching text
    },
    errorText: {
        color: colors.errorText,      // Error text color
        fontSize: 13,                 // Font size
        flex: 1,                      // Allow text to take available width
        marginRight: 5                // Space before the close button
    },
    errorCloseButton: {
        margin: -8,                   // Negative margin to slightly increase tappable area visually
        padding: 0                    // Remove default padding
    },

    // --- Message List (FlatList) Styles ---
    listStyle: {
        flex: 1                       // Make FlatList flexible to take available space
    },
    listContentContainer: {
        paddingVertical: 10,          // Padding at the top/bottom of the scrollable content
        paddingHorizontal: 10,        // Padding on the left/right of the scrollable content
        flexGrow: 1                   // Allow content to grow (important for empty list centering)
    },
    emptyListComponent: {
        flex: 1,                      // Take available space
        justifyContent: 'center',     // Center vertically
        alignItems: 'center',         // Center horizontally
        padding: 20                   // Padding around the text
    },
    emptyListText: {
        color: colors.placeholderText,// Text color for empty message
        fontSize: 16,                 // Font size
        textAlign: 'center'           // Center align text
    },

    // --- Message Row & Bubble Styles ---
    messageRow: {
        flexDirection: 'row',         // Arrange bubbles horizontally
        marginVertical: 6             // Vertical space between messages
    },
    userRow: {
        justifyContent: 'flex-end'    // Align user messages to the right
    },
    botRow: {
        justifyContent: 'flex-start'   // Align bot messages to the left
    },
    messageBubble: {
        maxWidth: '80%',              // Max width to prevent bubbles from filling the screen
        paddingVertical: 10,          // Vertical padding inside bubble
        paddingHorizontal: 15,        // Horizontal padding inside bubble
        borderRadius: 18,             // Rounded corners
        // Shadow/Elevation for depth
        elevation: 1,                 // Android shadow
        shadowColor: colors.shadowColor, // iOS shadow color
        shadowOffset: { width: 0, height: 1 }, // iOS shadow offset
        shadowOpacity: 0.1,           // iOS shadow opacity
        shadowRadius: 1.5,            // iOS shadow blur radius
    },
    userBubble: {
        backgroundColor: colors.userBubble, // Background color for user messages
        borderBottomRightRadius: 6      // Slightly flatten bottom-right corner
    },
    botBubble: {
        backgroundColor: colors.botBubble,  // Background color for bot messages
        borderBottomLeftRadius: 6       // Slightly flatten bottom-left corner
    },
    messageText: {
        fontSize: 16,                 // Font size for message content
        color: colors.messageText,    // Text color
        lineHeight: 24                // Line spacing for readability
    },
    timestampText: {
        fontSize: 11,                 // Smaller font size for timestamp
        color: colors.timestamp,      // Timestamp text color
        marginTop: 4,                 // Space above the timestamp
        textAlign: 'right'            // Align timestamp to the right within the bubble
    },

    // --- Typing Indicator Styles ---
    bottomTypingIndicatorContainer: {
        flexDirection: 'row',         // Align indicator and text horizontally
        alignItems: 'center',         // Align vertically
        justifyContent: 'flex-start', // Align to the left
        paddingVertical: 8,           // Vertical padding
        paddingHorizontal: 15,        // Horizontal padding (match bubble padding)
    },
    bottomTypingIndicatorText: {
        marginLeft: 8,                // Space next to the activity indicator
        fontSize: 14,                 // Font size
        color: colors.typingIndicatorText, // Text color
        fontStyle: 'italic'           // Italicize typing indicator text
    },

    // --- Input Area Styles ---
    inputAreaContainer: {
        backgroundColor: colors.inputBackground, // Background for the whole input bar
        borderTopWidth: 1,            // Top border line
        borderTopColor: '#E0E0E0',    // Color for the top border
        paddingHorizontal: 10,        // Horizontal padding for the container
        paddingVertical: 0,           // Vertical padding handled by inputRow
    },
    inputRow: {
        flexDirection: 'row',         // Arrange input and buttons horizontally
        alignItems: 'flex-end',       // Align items to the bottom (good for multiline input)
        paddingVertical: 8,           // Vertical padding inside the row (gives space around input/buttons)
        flex: 1                       // Allow row to take up container space (helps alignment)
    },
    input: {
        flex: 1,                      // Allow input field to grow and take available space
        backgroundColor: '#F4F6F7',  // Slightly off-white background for input
        borderRadius: 20,             // Rounded corners for input field
        paddingHorizontal: 15,        // Horizontal padding inside input
        fontSize: 16,                 // Font size for typed text
        color: colors.inputText,      // Color of typed text
        marginRight: 8,               // Space between input and mic button
        paddingTop: Platform.OS === 'ios' ? 10 : 8, // Platform-specific top padding for text alignment
        paddingBottom: Platform.OS === 'ios' ? 10 : 8, // Platform-specific bottom padding
        maxHeight: INPUT_TEXT_MAX_HEIGHT, // Max height before the input field starts scrolling internally
    },

    // --- Input Button Styles ---
    micButton: {
        marginHorizontal: 0,          // Remove horizontal margins
        padding: 0,                   // Remove padding
        height: MIC_BUTTON_SIZE,      // Fixed height
        width: MIC_BUTTON_SIZE,       // Fixed width
        justifyContent: 'center',     // Center icon vertically
        alignItems: 'center',         // Center icon horizontally
        marginBottom: 0,              // Align with bottom of input row
    },
    sendButton: {
        backgroundColor: colors.primary, // Default background color (send state)
        borderRadius: MIC_BUTTON_SIZE / 2, // Make it circular
        width: MIC_BUTTON_SIZE,       // Fixed width
        height: MIC_BUTTON_SIZE,      // Fixed height
        justifyContent: 'center',     // Center icon vertically
        alignItems: 'center',         // Center icon horizontally
        marginLeft: 4,                // Space between mic and send buttons
        marginBottom: 0,              // Align with bottom of input row
    },
    stopButtonBackground: {
        backgroundColor: colors.stopButtonBackground, // Red background when in 'stop' state
    },
    sendButtonDisabled: {
        backgroundColor: colors.sendButtonDisabled, // Greyed-out background when disabled
    },
});


export default ChatScreen;