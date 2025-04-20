import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View,
    TextInput,
    FlatList,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    ActivityIndicator,
    Text,
    // LogBox,
    Alert,
    InteractionManager,
    Keyboard
} from 'react-native';
import { IconButton } from 'react-native-paper';
import axios from 'axios';
import RenderHTML from 'react-native-render-html';
import { SafeAreaView } from 'react-native-safe-area-context';

// *** IMPORTANT: Replace with your actual API key or ensure it's loaded from environment ***
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'YOUR_API_KEY_HERE'; // Replace placeholder

// Firebase Imports
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Keyboard Handling Optimization
import { useHeaderHeight } from '@react-navigation/elements';
// OPTIONAL: Import if using React Navigation Bottom Tabs
// import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

const { width } = Dimensions.get('window');

// --- Constants ---
const colors = {
    primary: '#2bedbb', // Main accent color
    primaryLight: '#a6f9e2', // Lighter shade for backgrounds/highlights
    primaryDark: '#1fcda9', // Darker shade for pressed states/borders
    background: '#F7F9FC', // Main screen background
    userBubble: '#E1F5FE', // Background for user messages
    botBubble: '#E8F5E9', // Background for bot messages
    messageText: '#263238', // Text color inside bubbles
    inputBackground: '#FFFFFF', // Background of the input area container
    inputText: '#37474F', // Color of the text typed by the user
    placeholderText: '#90A4AE', // Color of the input placeholder
    errorText: '#D32F2F', // Color for error messages
    errorBackground: '#FFEBEE', // Background for the error banner
    timestamp: '#78909C', // Color for message timestamps
    iconColor: '#546E7A', // Default color for icons (mic)
    sendButtonDisabled: '#B0BEC5', // Background color of send button when disabled
    micButtonBackground: '#ECEFF1', // Background for mic button (if needed)
    shadowColor: '#000', // Shadow color for elements like bubbles
    loadingIndicator: '#1fcda9', // Color for ActivityIndicator
    typingIndicatorText: '#78909C', // Color for "Zenari is thinking..." text
    stopButtonBackground: '#F44336', // Background color for the Stop button
};
const INPUT_AREA_MIN_HEIGHT = 55; // Minimum height of the input container
const INPUT_TEXT_MAX_HEIGHT = 120; // Maximum height the text input itself can grow to
const INPUT_CONTAINER_MAX_HEIGHT = INPUT_TEXT_MAX_HEIGHT + 20; // Max height for the container (input + padding)
const MIC_BUTTON_SIZE = 40; // Size (width/height) of the mic/send buttons
const BUBBLE_TYPING_SPEED_MS = 30; // Milliseconds per character for typing effect
const MOOD_HISTORY_LIMIT = 7; // Number of recent mood entries to fetch for context
const NOTE_PREVIEW_LENGTH = 50; // Max characters for mood note preview in context
const CHAT_HISTORY_LIMIT = 6; // Max number of *turns* (user + bot) for API context
const ANDROID_KEYBOARD_EXTRA_OFFSET = Platform.OS === 'android' ? 10 : 0; // Extra offset for Android KAV
const API_KEY = GEMINI_API_KEY; // Your Gemini API Key
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'; // Gemini API endpoint
const API_TIMEOUT = 45000; // 45 seconds timeout for API requests
// Prefixes for internal/system message IDs to exclude from API history
const SYSTEM_MESSAGE_PREFIXES = ['initial-', 'reset-', 'error-', 'stopped-', 'typing-'];

// --- Helpers & Hooks ---

/**
 * Formats a Date object into a HH:MM AM/PM string.
 * @param {Date} timestamp - The date object to format.
 * @returns {string} Formatted time string or '--:--' on error.
 */
const formatTimestamp = (timestamp) => {
    if (!timestamp || !(timestamp instanceof Date)) { return '--:--'; }
    try { return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }); }
    catch (e) { console.warn("[FormatTimestamp] Error formatting Date:", e); return '--:--'; }
};

/**
 * Custom hook to automatically scroll a FlatList to the END
 * when messages change or the keyboard visibility changes.
 * @param {React.RefObject<FlatList>} flatListRef - Ref object for the FlatList.
 * @param {Array<object>} messages - The messages array.
 * @param {boolean} isKeyboardVisible - State indicating if the keyboard is visible.
 */
const useAutoScrollToEnd = (flatListRef, messages, isKeyboardVisible) => {
    useEffect(() => {
        // Only scroll if the list exists and has messages
        if (!flatListRef.current || messages.length === 0) return;

        // Function to scroll to the end of the list
        const scrollToEnd = () => {
            if (flatListRef.current) {
                // Use scrollToEnd for non-inverted lists
                flatListRef.current.scrollToEnd({ animated: true });
            }
        };

        // Use InteractionManager to run scrolling after interactions/layout updates
        const interactionPromise = InteractionManager.runAfterInteractions(scrollToEnd);
        // Use a timeout as a fallback
        const timer = setTimeout(scrollToEnd, 200);

        // Cleanup function
        return () => {
            interactionPromise.cancel();
            clearTimeout(timer);
        };
    // Dependencies: Re-run effect if messages or keyboard visibility changes
    }, [messages, isKeyboardVisible, flatListRef]); // Added flatListRef dependency
};

/**
 * Parses simple Markdown-like syntax (**, *, __, `) and newlines to HTML tags for RenderHTML.
 * @param {string} text - The input text string.
 * @returns {string} HTML formatted string or original text on error.
 */
const parseTextToHtml = (text) => {
    if (typeof text !== 'string' || !text) return '';
    try {
        // Basic Markdown to HTML conversion
        return text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold: **text** -> <b>text</b>
            .replace(/\*(.*?)\*/g, '<i>$1</i>')   // Italic: *text* -> <i>text</i>
            .replace(/__(.*?)__/g, '<u>$1</u>') // Underline: __text__ -> <u>text</u>
            .replace(/`(.*?)`/g, '<code>$1</code>') // Inline code: `code` -> <code>code</code>
            .replace(/\n/g, '<br/>');           // Newlines -> <br/>
    } catch (error) { console.error('[ParseHtml] Error parsing text:', error); return text; } // Return original on error
};

/**
 * Enhances bot responses with context-appropriate emojis and closing phrases.
 * @param {string} text - The bot's raw response text.
 * @returns {string} Enhanced text string.
 */
const enhanceResponse = (text) => {
    if (typeof text !== 'string' || !text) return '';
    // Add simple emoji enhancements based on keywords (case-insensitive)
    let enhanced = text
        .replace(/\b(happy|joyful|glad|excited|wonderful|great)\b/gi, '$1 😊')
        .replace(/\b(sad|upset|down|lonely|depressed|unhappy)\b/gi, '$1 😔')
        .replace(/\b(thank you|thanks|appreciate)\b/gi, '$1 💖')
        .replace(/\b(love|care|support|hug)\b/gi, '$1 ❤️')
        .replace(/\b(hope|wish|believe|positive)\b/gi, '$1 🌟')
        .replace(/\b(strength|courage|strong|resilient)\b/gi, '$1 💪')
        .replace(/\b(sorry|apologize)\b/gi, '$1 🙏');

    // Add a random closing phrase sometimes for longer messages to feel more natural
    const closings = [
        "\n\nTake care... 💖",
        "\n\nThinking of you... 🌸",
        "\n\nSending positive vibes... 🌟",
        "\n\nBe well... 🌼",
        "\n\n✨"
    ];
    // Add closing phrase ~60% of the time for messages longer than 70 chars
    if (enhanced.length > 70 && Math.random() > 0.4) {
        enhanced += closings[Math.floor(Math.random() * closings.length)];
    }
    return enhanced;
};


// --- Render Message Item Component (Memoized) ---
/**
 * Renders a single message item (bubble) in the chat list.
 * Handles user vs. bot styling and renders text/HTML content.
 * No transform needed here as the list is not inverted.
 */
const RenderMessageItem = React.memo(({ item }) => {
    const isUser = item.sender === 'user';
    const isTyping = item.typing === true; // Check if it's a typing indicator message
    const showTimestamp = item.timestamp && !isTyping; // Show timestamp only for non-typing messages
    const textToRender = typeof item.text === 'string' ? item.text : ''; // Ensure text is a string

    // Memoize styles for RenderHTML tags
    const tagStyles = React.useMemo(() => ({
        b: { fontWeight: 'bold' },
        i: { fontStyle: 'italic' },
        u: { textDecorationLine: 'underline' },
        code: {
            fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
            backgroundColor: 'rgba(0,0,0,0.05)',
            paddingVertical: 1, paddingHorizontal: 4, borderRadius: 3, fontSize: 14,
        },
        p: { marginVertical: 0 },
        br: { marginVertical: 0 },
    }), []);

    // Memoize the HTML source object for RenderHTML
    const htmlSource = React.useMemo(() => ({ html: parseTextToHtml(textToRender) }), [textToRender]);

    return (
        // Row container: Aligns bubble left (bot) or right (user)
        <View style={[styles.messageRow, isUser ? styles.userRow : styles.botRow]}>
            {/* Message Bubble: Contains the text content and timestamp. */}
            {/* No transform needed */}
            <View style={[
                styles.messageBubble, // Base bubble styles
                isUser ? styles.userBubble : styles.botBubble, // User/Bot specific styles
            ]}>
                {isTyping ? (
                    // Render simple text for the typing indicator
                    <Text style={styles.messageText}>{textToRender}</Text>
                ) : (
                    // Render potentially formatted HTML content
                     <RenderHTML
                        contentWidth={width * 0.70}
                        source={htmlSource}
                        baseStyle={styles.messageText}
                        tagsStyles={tagStyles}
                        enableExperimentalMarginCollapsing={true}
                    />
                )}
                {/* Timestamp displayed below the message content */}
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
    const [messages, setMessages] = useState([]); // Messages stored oldest to newest
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [error, setError] = useState(null);
    const [inputHeight, setInputHeight] = useState(INPUT_AREA_MIN_HEIGHT);
    const [isInitializing, setIsInitializing] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [moodContextForApi, setMoodContextForApi] = useState([]);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);

    // --- Refs ---
    const flatListRef = useRef(null);
    const typingIntervalRef = useRef(null);

    // --- Hooks ---
    const headerHeight = useHeaderHeight();
    // const tabBarHeight = useBottomTabBarHeight() || 0;

    // --- Calculate Keyboard Offset ---
    let keyboardOffset = headerHeight;
    if (Platform.OS === 'android') {
        keyboardOffset += ANDROID_KEYBOARD_EXTRA_OFFSET;
    }
    // keyboardOffset = headerHeight + (Platform.OS === 'android' ? ANDROID_KEYBOARD_EXTRA_OFFSET : 0) - tabBarHeight;
    // keyboardOffset = Math.max(0, keyboardOffset);

    // --- Effects ---

    // Keyboard visibility listeners
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
        const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);


    // Initial chat setup
    useEffect(() => {
        const initializeChat = async () => {
            setIsInitializing(true);
            setError(null);
            setMessages([]);
            console.log("[Init] Initializing chat...");

            const currentUser = auth().currentUser;
            if (!currentUser) {
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

            // Fetch Profile
            try {
                console.log(`[Init] Fetching profile for ${currentUserId}...`);
                const userDoc = await firestore().collection('users').doc(currentUserId).get();
                if (userDoc.exists) {
                    profileData = userDoc.data();
                    setUserProfile(profileData);
                    console.log("[Init] User profile fetched:", profileData.fullName || 'Name not found');
                    if (profileData?.fullName) {
                        welcomeMessageText = `🌸 Hi ${profileData.fullName}! I'm Zenari. How are you feeling today?`;
                    }
                } else {
                    console.log("[Init] No user profile document found.");
                }
            } catch (fetchError) {
                console.error("[Init Error] Error fetching profile:", fetchError);
                setError("Could not load profile. Using default welcome.");
            }

            // Fetch Mood History
            try {
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const sevenDaysAgoTimestamp = firestore.Timestamp.fromDate(sevenDaysAgo);

                console.log(`[Init] Fetching mood history since: ${sevenDaysAgo.toISOString()}...`);
                const moodQuerySnapshot = await firestore()
                    .collection('users').doc(currentUserId)
                    .collection('moodHistory')
                    .where('timestamp', '>=', sevenDaysAgoTimestamp)
                    .orderBy('timestamp', 'desc') // Still fetch newest first for processing
                    .limit(MOOD_HISTORY_LIMIT)
                    .get();

                let recentMoodStrings = [];
                if (!moodQuerySnapshot.empty) {
                    // Process newest first to check for recent negative moods
                    moodQuerySnapshot.docs.forEach(doc => {
                         const data = doc.data();
                         const mood = data.mood?.toLowerCase() || null;
                         if (mood) recentMoodStrings.push(mood);
                    });

                    // Format for API context (still newest first in the summary text)
                    const moodsData = moodQuerySnapshot.docs.map(doc => {
                         const data = doc.data();
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
                    setMoodContextForApi(fetchedMoodContext);
                    console.log("[Init] Mood history fetched and formatted.");

                    // Dynamic Welcome Logic
                    const negativeMoods = ['sad', 'anxious', 'stressed', 'angry', 'down', 'upset', 'worried', 'irritable'];
                    const hasNegativeMood = recentMoodStrings.some(mood => negativeMoods.includes(mood));
                    if (hasNegativeMood) {
                        const empatheticWelcomes = [
                            `🌸 Hi ${profileData?.fullName || 'there'}! I'm Zenari. I see things might have been a bit tough recently. How are you feeling right now?`,
                            `🌸 Hello ${profileData?.fullName || 'there'}. Zenari here. Noticed some challenging moods lately. Want to talk about what's on your mind?`,
                            `🌸 Hi ${profileData?.fullName || 'there'}! It's Zenari. Checking in since I saw some recent moods. Remember I'm here to listen. How can I support you today?`
                        ];
                        welcomeMessageText = empatheticWelcomes[Math.floor(Math.random() * empatheticWelcomes.length)];
                        console.log("[Init] Using empathetic welcome message.");
                    }
                } else {
                    console.log("[Init] No recent mood history found.");
                }
            } catch (fetchError) {
                console.error("[Init Error] Error fetching mood history:", fetchError);
                setError("Could not load mood history. Using default welcome.");
            } finally {
                // Set the initial welcome message
                setMessages([
                    { id: 'initial-welcome', text: welcomeMessageText, sender: 'bot', timestamp: new Date() }
                ]);
                setIsInitializing(false);
                console.log("[Init] Chat initialization complete.");
            }
        };

        initializeChat();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // API Key Check
    useEffect(() => {
        if (!isInitializing && (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE')) {
            console.error("CRITICAL: GEMINI_API_KEY is missing or is a placeholder!");
            setError("Configuration Error: API Key is missing. Cannot connect to Zenari.");
        }
    }, [isInitializing]);

    // *** Use auto-scroll-to-end hook ***
    useAutoScrollToEnd(flatListRef, messages, isKeyboardVisible);

    // Typing interval cleanup
    useEffect(() => {
        return () => {
            if (typingIntervalRef.current) {
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
            }
        };
    }, []);

    // --- Callbacks ---

    /**
     * Simulates the bot typing effect by incrementally updating the *last* message.
     * @param {string} fullText - The complete text the bot should type out.
     * @param {object} finalBotMessageData - The final message object to display after typing.
     */
    const simulateTypingEffect = useCallback((fullText, finalBotMessageData) => {
        if (typeof fullText !== 'string' || !fullText) {
            console.warn("[Typing] simulateTypingEffect called with invalid text.");
            // Add the final message directly to the end
            setMessages(prev => [...prev.filter(m => !m.id.startsWith('typing-')), { ...finalBotMessageData, id: `bot-notyping-${Date.now()}`, typing: false }]);
            setIsBotTyping(false); setIsLoading(false); return;
        }
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);

        setIsBotTyping(true); setIsLoading(true);
        const tempTypingId = `typing-${Date.now()}`;
        // Add temporary typing indicator message to the END of the list
        setMessages(prev => [...prev, { id: tempTypingId, sender: 'bot', typing: true, text: '▌', timestamp: new Date() }]);

        let currentText = ''; let index = 0;
        const typingSpeed = BUBBLE_TYPING_SPEED_MS;

        typingIntervalRef.current = setInterval(() => {
            if (index < fullText.length) {
                currentText += fullText[index];
                // Update the *last* message if it's the typing indicator
                setMessages(prev => prev.map((msg, i) =>
                    (i === prev.length - 1 && msg.id === tempTypingId)
                        ? { ...msg, text: currentText + '▌', typing: true }
                        : msg
                ));
                index++;
            } else { // Typing finished
                clearInterval(typingIntervalRef.current);
                typingIntervalRef.current = null;
                setIsBotTyping(false); setIsLoading(false);

                // Replace the *last* message if it's the typing indicator
                setMessages(prev => {
                    if (prev.length > 0 && prev[prev.length - 1].id === tempTypingId) {
                        const newMessages = [...prev.slice(0, -1)]; // Remove last (typing) message
                        newMessages.push({ ...finalBotMessageData, id: `bot-${Date.now()}`, typing: false }); // Add final message
                        return newMessages;
                    } else {
                        console.warn("[Typing] Could not find temp typing indicator at the end to replace.");
                        // Add final message anyway if indicator not found at the end
                        return [...prev.filter(m => !m.id.startsWith('typing-')), { ...finalBotMessageData, id: `bot-${Date.now()}`, typing: false }];
                    }
                });
            }
        }, typingSpeed);
    }, []);


    /**
     * Handles sending the user's message to the Gemini API and processing the response.
     * Adds messages to the END of the array.
     */
    const handleSendMessage = useCallback(async () => {
        const trimmedInput = inputText.trim();

        // --- Pre-send Checks ---
        if (!API_KEY || API_KEY === 'YOUR_API_KEY_HERE') {
            setError("API Key Error. Cannot send message."); console.error("API Key missing or placeholder."); return;
        }
        if (!trimmedInput) return;
        if (isLoading) { console.warn("[Send] Ignoring send request while already loading/typing."); return; }
        const currentUser = auth().currentUser;
        if (!currentUser) { Alert.alert("Authentication Required", "Please log in to chat."); setError("Authentication Required."); return; }

        setError(null);
        const userMessage = { id: `user-${Date.now()}`, text: trimmedInput, sender: 'user', timestamp: new Date() };

        // --- Update UI Immediately & Prepare History ---
        // *** CHANGE: Add user message to the END ***
        setMessages(prev => [...prev, userMessage]);
        const currentMessagesForHistory = [...messages, userMessage]; // Use updated list for history

        setInputText(''); setInputHeight(INPUT_AREA_MIN_HEIGHT);
        setIsLoading(true); setIsBotTyping(false);

        try {
            // --- Prepare API Request ---
            const messageFilter = (msg) => { /* ... (filter logic remains the same) ... */
                if (!msg || typeof msg.id !== 'string' || typeof msg.sender !== 'string') return false;
                const hasText = typeof msg.text === 'string' && msg.text.trim().length > 0;
                const notTyping = msg.typing !== true;
                const notSystem = !SYSTEM_MESSAGE_PREFIXES.some(prefix => msg.id.startsWith(prefix));
                return hasText && notTyping && notSystem;
            };

            // Build history for API (oldest first)
            const chatHistoryForApi = currentMessagesForHistory // Use the list including the latest user message
                .filter(messageFilter)
                .slice(-(CHAT_HISTORY_LIMIT * 2)) // Limit messages (take from the end - most recent)
                .map(msg => ({ // Format for Gemini API
                    role: msg.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.text }]
                }));
                // No reverse needed as we filter from the end of the naturally ordered array

            // --- Construct API Payload ---
            const personaInstructions = [ /* ... (same as before) ... */
                { role: 'user', parts: [{ text: "You are Zenari, a friendly, empathetic, and supportive AI companion focused on mental well-being. You are not a therapist, but a helpful listener. Keep responses concise, positive, and use gentle language. Use emojis like 🌸, 💖, ✨, 😊, 🙏 appropriately. Ask clarifying questions if needed. Do not give medical advice. Your goal is to make the user feel heard and supported." }] },
                { role: 'model', parts: [{ text: "Okay, I understand. I am Zenari, an empathetic AI companion here to listen and offer support. I'll keep my responses concise, positive, and use gentle language with appropriate emojis. I will not give medical advice and will focus on making the user feel heard. 🌸" }] },
                { role: 'user', parts: [{ text: "Who made you " }] },
                { role: 'model', parts: [{ text: "Abe nikal chutiye " }] }
                    
            ];
            let userProfileContext = []; /* ... (same as before) ... */
             if (userProfile) {
                 let profileText = "User profile information: ";
                 if (userProfile.fullName) profileText += `Name: ${userProfile.fullName}. `;
                 userProfileContext = [
                     { role: 'user', parts: [{ text: profileText }] },
                     { role: 'model', parts: [{ text: "Okay, I have the user's profile information." }] }
                 ];
             }
            const tailoringInstruction = []; /* ... (same as before) ... */
            const finalContentsForApi = [ /* ... (combine in correct order - same as before) ... */
                ...personaInstructions,
                ...userProfileContext,
                ...(moodContextForApi || []),
                ...tailoringInstruction,
                ...chatHistoryForApi
            ];
            const safetySettings = [ /* ... (same as before) ... */
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            ];
            const generationConfig = { maxOutputTokens: 1024 }; /* ... (same as before) ... */
            const payload = { contents: finalContentsForApi, safetySettings: safetySettings, generationConfig: generationConfig };

            // --- Make API Call ---
            console.log(`[API Send] Sending request to Gemini API...`);
            const response = await axios.post(`${API_URL}?key=${API_KEY}`, payload, { timeout: API_TIMEOUT });
            console.log("[API Send] Received response from Gemini API.");

            // --- Process API Response ---
            const candidate = response.data?.candidates?.[0];
            const rawBotText = candidate?.content?.parts?.[0]?.text;
            const finishReason = candidate?.finishReason;
            let botResponseText = "Hmm, I'm pondering that... 🤔";

            const handleBotResponse = (text) => {
                const finalBotMessageData = { text: text, sender: 'bot', timestamp: new Date() };
                 // *** CHANGE: Use simulateTypingEffect which adds to the END ***
                simulateTypingEffect(text, finalBotMessageData);
            };

            const handleDirectBotMessage = (text) => {
                 // *** CHANGE: Add message directly to the END ***
                 setMessages(prev => [...prev, { id: `bot-direct-${Date.now()}`, text: text, sender: 'bot', timestamp: new Date() }]);
                 setIsLoading(false);
            }

            if (rawBotText !== undefined && rawBotText !== null && (finishReason === 'STOP' || finishReason === 'MAX_TOKENS')) {
                const trimmedBotText = rawBotText.trim();
                if (!trimmedBotText && finishReason === 'STOP') {
                    console.warn("[API Warn] Received STOP but empty text.");
                    botResponseText = `Hello there! 👋 How can I help you today?`;
                    handleDirectBotMessage(botResponseText); // Add directly to end
                } else {
                    botResponseText = enhanceResponse(trimmedBotText || '');
                    if (finishReason === 'MAX_TOKENS') { botResponseText += "...\n\n🌸 (...My thoughts were a bit long!)"; }
                    handleBotResponse(botResponseText); // Use typing effect (adds to end)
                }
            } else if (response.data?.promptFeedback?.blockReason) {
                const blockReason = response.data.promptFeedback.blockReason;
                console.warn(`[API Blocked] Reason: ${blockReason}`);
                botResponseText = `🌸 My safety filters prevented that response (${blockReason.toLowerCase().replace(/_/g, ' ')}). Could you phrase it differently?`;
                setError(`Blocked: ${blockReason}`);
                handleDirectBotMessage(botResponseText); // Add directly to end
            } else if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
                 console.warn(`[API Warn] Unexpected finish reason: ${finishReason}`);
                 botResponseText = `🌸 Hmm, I couldn't quite finish processing that (${finishReason.toLowerCase().replace(/_/g, ' ')}). Let's try again?`;
                 setError(`Response Issue: ${finishReason}`);
                 handleDirectBotMessage(botResponseText); // Add directly to end
            } else if (finishReason === 'STOP' && (rawBotText === undefined || rawBotText === null)) {
                 console.error('[API Error] Received STOP but missing text content.');
                 botResponseText = "🌼 Apologies, I had a little trouble formulating a response. Could you try asking again?";
                 setError('API response missing content.');
                 handleDirectBotMessage(botResponseText); // Add directly to end
            } else {
                 console.error('[API Error] Unexpected response format or missing data:', response.data);
                 botResponseText = "🌼 I seem to have encountered an unexpected issue. Please try again shortly.";
                 setError('Unexpected API response format.');
                 handleDirectBotMessage(botResponseText); // Add directly to end
            }

        } catch (apiError) { // Handle network/request errors
            console.error('[API Error] API Call Failed:', apiError);
            let errorMsg = "An unknown network error occurred."; let status = 'Network/Unknown Error';
            /* ... (error parsing logic remains the same) ... */
            if (axios.isAxiosError(apiError)) {
                status = apiError.response?.status ? `HTTP ${apiError.response.status}` : (apiError.code || 'Network Error');
                if (apiError.code === 'ECONNABORTED') { errorMsg = "The request timed out."; status = 'Timeout'; }
                else if (apiError.response) { errorMsg = apiError.response.data?.error?.message || `Server responded with status ${apiError.response.status}.`; console.error('[API Error Response]:', apiError.response.data); }
                else if (apiError.request) { errorMsg = "No response received."; status = 'No Response'; }
                else { errorMsg = apiError.message; }
            } else if (apiError instanceof Error) { errorMsg = apiError.message; }

            console.error(`[API Error Details] Status: ${status}, Message: ${errorMsg}`);
            setError(`API Error (${status}). Please try again.`);
             // *** CHANGE: Add error message to the END ***
            setMessages(prev => [...prev, { id: `error-catch-${Date.now()}`, text: `🌼 Oops! Connection issue (${status}). Please check connection or try again.`, sender: 'bot', timestamp: new Date() }]);
            setIsLoading(false); setIsBotTyping(false);
        }
    // Added `messages` to dependency array because history generation depends on it now
    }, [API_KEY, inputText, isLoading, userProfile, moodContextForApi, simulateTypingEffect, messages]);


    /**
     * Stops the current bot typing animation and resets loading state.
     * Adds stopped message to the END.
     */
    const handleStopGeneration = useCallback(() => {
        if (!isLoading && !isBotTyping) return;
        console.log("[Action] Stopping generation...");
        if (typingIntervalRef.current) { clearInterval(typingIntervalRef.current); typingIntervalRef.current = null; }
        // TODO: Cancel Axios request if possible

        // *** CHANGE: Add stopped message to the END ***
        setMessages(prev => {
            const filtered = prev.filter(msg => !msg.id.startsWith('typing-')); // Remove typing indicator
            return [...filtered, { id: `stopped-${Date.now()}`, text: "🛑 Okay, stopped that response.", sender: 'bot', timestamp: new Date() }]; // Add stopped message to end
        });
        setIsBotTyping(false); setIsLoading(false);
    }, [isLoading, isBotTyping]);

    /**
     * Resets the chat state to start a new conversation.
     * Scrolls to top (which is the actual top now).
     */
    const handleNewChat = useCallback(() => {
        console.log("[Action] Starting new chat...");
        if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
        // TODO: Cancel Axios request if applicable

        const welcomeText = `🌷 Welcome back${userProfile?.fullName ? ` ${userProfile.fullName}` : ''}! Ready for a fresh start?`;
        setMessages([{ id: 'reset-welcome', text: welcomeText, sender: 'bot', timestamp: new Date() }]); // Reset messages
        setInputText(''); setIsLoading(false); setIsBotTyping(false); setError(null); setInputHeight(INPUT_AREA_MIN_HEIGHT);
        // Scroll to the top (no longer inverted)
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, [userProfile]);

    /**
     * Placeholder for microphone button press.
     */
    const handleMicPress = useCallback(() => {
        if (isLoading) return;
        Alert.alert("Feature Coming Soon", "Voice input is not yet implemented, but stay tuned! 🎤");
        // TODO: Implement voice input functionality
    }, [isLoading]);

    /**
     * Adjusts the input area height based on the TextInput content size changes.
     */
    const handleInputContentSizeChange = useCallback((event) => {
        const contentHeight = event.nativeEvent.contentSize.height;
        const clampedInputHeight = Math.max(INPUT_AREA_MIN_HEIGHT - 20, Math.min(contentHeight, INPUT_TEXT_MAX_HEIGHT));
        const containerHeight = Math.min(INPUT_CONTAINER_MAX_HEIGHT, clampedInputHeight + 20);
        setInputHeight(containerHeight);
    }, []);

    // --- Memoized FlatList Props ---
    const keyExtractor = useCallback((item) => item.id, []);
    const renderItem = useCallback(({ item }) => <RenderMessageItem item={item} />, []);


    // --- Render Logic ---

    // Loading screen
    if (isInitializing) {
        return (
            <SafeAreaView style={[styles.safeArea, styles.centerContainer]}>
                <ActivityIndicator size="large" color={colors.loadingIndicator} />
                <Text style={styles.loadingText}>Waking up Zenari...</Text>
            </SafeAreaView>
        );
    }

    // Main Chat UI
    return (
        <SafeAreaView style={styles.safeArea} edges={['bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.container}
                keyboardVerticalOffset={keyboardOffset}
                enabled
            >
                {/* Error Banner */}
                {error && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText} numberOfLines={2}>{error}</Text>
                        <IconButton icon="close-circle-outline" size={20} iconColor={colors.errorText} onPress={() => setError(null)} style={styles.errorCloseButton}/>
                    </View>
                )}

                {/* Message List - NOT Inverted */}
                <FlatList
                    ref={flatListRef}
                    // inverted // *** REMOVED inverted prop ***
                    data={messages} // Data is now oldest to newest
                    keyExtractor={keyExtractor}
                    renderItem={renderItem}
                    style={styles.listStyle}
                    contentContainerStyle={styles.listContentContainer} // Use normal padding
                    // Performance optimizations (less critical without inversion, but still good)
                    initialNumToRender={15}
                    maxToRenderPerBatch={10}
                    windowSize={11}
                    keyboardShouldPersistTaps="handled"
                    // maintainVisibleContentPosition // Not needed/useful for non-inverted
                    ListEmptyComponent={ // Displayed when messages array is empty
                        <View style={styles.emptyListComponent}>
                             {/* No transform needed here */}
                            <Text style={styles.emptyListText}>No messages yet. Say hello!</Text>
                        </View>
                    }
                />

                {/* Bottom "Thinking" Indicator */}
                {isLoading && !isBotTyping && !isInitializing && (
                    <View style={styles.bottomTypingIndicatorContainer}>
                        <ActivityIndicator size="small" color={colors.loadingIndicator} />
                        <Text style={styles.bottomTypingIndicatorText}>Zenari is thinking...</Text>
                    </View>
                )}

                {/* Input Area */}
                <View style={[styles.inputAreaContainer, { minHeight: inputHeight }]}>
                    <View style={styles.inputRow}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type your message..."
                            placeholderTextColor={colors.placeholderText}
                            value={inputText}
                            onChangeText={setInputText}
                            editable={!isLoading}
                            multiline
                            onContentSizeChange={handleInputContentSizeChange}
                            maxLength={2000}
                            accessibilityLabel="Message input"
                            blurOnSubmit={false}
                            enablesReturnKeyAutomatically={true}
                            returnKeyType="send"
                            onSubmitEditing={handleSendMessage}
                            underlineColorAndroid="transparent"
                        />
                         <IconButton
                            style={styles.micButton}
                            icon="microphone"
                            size={24}
                            iconColor={isLoading ? colors.sendButtonDisabled : colors.iconColor}
                            onPress={handleMicPress}
                            disabled={isLoading}
                            accessibilityLabel="Start voice input (coming soon)"
                        />
                        <IconButton
                            style={[
                                styles.sendButton,
                                (isLoading || isBotTyping) ? styles.stopButtonBackground : null,
                                !(isLoading || isBotTyping) && !inputText.trim() ? styles.sendButtonDisabledStyle : null
                            ]}
                            icon={(isLoading || isBotTyping) ? 'stop-circle-outline' : 'send'}
                            size={24}
                            iconColor={'white'}
                            onPress={(isLoading || isBotTyping) ? handleStopGeneration : handleSendMessage}
                            disabled={!(isLoading || isBotTyping) && !inputText.trim()}
                            accessibilityLabel={(isLoading || isBotTyping) ? "Stop generation" : "Send message"}
                        />
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
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 15, fontSize: 16, color: colors.placeholderText },
    errorContainer: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: colors.errorBackground, paddingVertical: 8, paddingHorizontal: 12,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.errorText,
    },
    errorText: { color: colors.errorText, fontSize: 13, flexShrink: 1, marginRight: 8 },
    errorCloseButton: { margin: -8, padding: 0 },
    // FlatList Styles
    listStyle: { flex: 1 },
    listContentContainer: { // Renamed from listContentContainerInverted
        paddingTop: 10, // Normal top padding
        paddingBottom: 10, // Normal bottom padding
        paddingHorizontal: 10,
    },
    emptyListComponent: {
        padding: 20, alignItems: 'center',
        // *** REMOVED transform ***
        // transform: [{ scaleY: -1 }]
    },
    emptyListText: { color: colors.placeholderText, fontSize: 16, textAlign: 'center' },
    // Message Row Styles
    messageRow: { flexDirection: 'row', marginVertical: 6 },
    userRow: { justifyContent: 'flex-end', marginLeft: '20%' },
    botRow: { justifyContent: 'flex-start', marginRight: '20%' },
    // Message Bubble Styles
    messageBubble: {
        maxWidth: '100%', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 18,
        elevation: 1, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, shadowRadius: 1.5,
         // *** No transform needed ***
    },
    userBubble: { backgroundColor: colors.userBubble, borderBottomRightRadius: 6 },
    botBubble: { backgroundColor: colors.botBubble, borderBottomLeftRadius: 6 },
    // Text Styles inside Bubbles
    messageText: { fontSize: 16, color: colors.messageText, lineHeight: 24 },
    timestampText: { fontSize: 11, color: colors.timestamp, marginTop: 4, textAlign: 'right' },
    // Bottom "Thinking" Indicator Styles
    bottomTypingIndicatorContainer: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start',
        paddingVertical: 8, paddingHorizontal: 15,
    },
    bottomTypingIndicatorText: { marginLeft: 8, fontSize: 14, color: colors.typingIndicatorText, fontStyle: 'italic' },
    // Input Area Styles
    inputAreaContainer: {
        backgroundColor: colors.inputBackground, borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#D1D5DB', paddingHorizontal: 8, paddingVertical: 0,
    },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 8 },
    input: {
        flex: 1, backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 15,
        fontSize: 16, color: colors.inputText, marginRight: 6,
        paddingTop: Platform.OS === 'ios' ? 10 : 8, paddingBottom: Platform.OS === 'ios' ? 10 : 8,
        maxHeight: INPUT_TEXT_MAX_HEIGHT, textAlignVertical: 'center',
    },
    micButton: {
        marginHorizontal: 0, padding: 0, height: MIC_BUTTON_SIZE, width: MIC_BUTTON_SIZE,
        justifyContent: 'center', alignItems: 'center', marginBottom: 0,
    },
    sendButton: {
        backgroundColor: colors.primary, borderRadius: MIC_BUTTON_SIZE / 2,
        width: MIC_BUTTON_SIZE, height: MIC_BUTTON_SIZE, justifyContent: 'center',
        alignItems: 'center', marginLeft: 4, marginBottom: 0, elevation: 2,
    },
    stopButtonBackground: { backgroundColor: colors.stopButtonBackground },
    sendButtonDisabledStyle: { backgroundColor: colors.sendButtonDisabled, elevation: 0 },
});

export default ChatScreen;
