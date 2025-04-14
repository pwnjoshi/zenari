import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  Dimensions
} from 'react-native';
import { Button } from 'react-native-paper';
import axios from 'axios';
import RenderHTML from 'react-native-render-html';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const colors = {
  primary: '#2bedbb',         // main accent color
  primaryLight: '#a6f9e2',      // lighter variant for subtle accents
  primaryDark: '#1fcda9',       // darker variant for contrast
  background: '#F0F8FF',        // calm background color
  userBubble: '#a6f9e2',        // using primaryLight for user messages
  botBubble: '#d0fce9',         // a custom light tint for bot messages
  messageText: '#2C3E50',       // dark text for readability
  inputBackground: '#F4F6F7',   // input field background
};

const useAutoScroll = (flatListRef, messages) => {
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages, flatListRef]);
};

const ChatScreen = () => {
  const [messages, setMessages] = useState([
    {
      text: "🌸 Hi there, dear friend! I'm here to listen and support you. How are you feeling today?",
      sender: 'bot'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBotTyping, setIsBotTyping] = useState(false);

  const flatListRef = useRef(null);
  const typingIntervalRef = useRef(null);
  const axiosCancelSourceRef = useRef(null);

  // Replace with your valid API key.
  const API_KEY = 'AIzaSyAGS0CEUsEKw8WS0mPqj90ebPZcu4QUk3U';
  const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

  const emotionalSupportPrompt = {
    role: 'assistant',
    parts: [{
      text: `Act as an emotional support companion. Be compassionate, validate feelings, 
      offer gentle encouragement. Use empathetic responses, ask open-ended questions,
      and suggest coping strategies when appropriate. Maintain a hopeful tone with 
      occasional uplifting emojis.`
    }]
  };

  useEffect(() => {
    const loadMoodHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem('@moodHistory');
        // You can integrate the mood history if needed.
      } catch (error) {
        console.error('Error loading mood history:', error);
      }
    };
    loadMoodHistory();
  }, []);

  useAutoScroll(flatListRef, messages);

  const handleSendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    // Add new user message.
    const userMessage = { text: inputText, sender: 'user' };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    // Create a cancel token for this request.
    axiosCancelSourceRef.current = axios.CancelToken.source();

    try {
      // Build conversation history.
      const conversationHistory = newMessages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        parts: [{ text: msg.text }],
      }));

      const payload = {
        contents: [emotionalSupportPrompt, ...conversationHistory],
        safetySettings: [{
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_ONLY_HIGH'
        }],
        generationConfig: {
          temperature: 0.85,
          topP: 0.75,
          maxOutputTokens: 1024
        }
      };

      console.log("Payload:", JSON.stringify(payload, null, 2));

      const response = await axios.post(`${API_URL}?key=${API_KEY}`, payload, {
        headers: { "Content-Type": "application/json" },
        cancelToken: axiosCancelSourceRef.current.token
      });

      const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ||
        "I'm here to listen. Please share more about how you're feeling. 💞";
      const enhanced = enhanceResponse(rawText);
      setMessages(prev => [...prev, { text: enhanced, sender: 'bot' }]);
      simulateTypingEffect(enhanced);
    } catch (error) {
      if (axios.isCancel(error)) {
        console.log('Request cancelled:', error.message);
      } else {
        console.error('API Error:', error.response?.data || error);
        setMessages(prev => [...prev, {
          text: "🌼 Let's try that again. Please share what's on your mind.",
          sender: 'bot'
        }]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const enhanceResponse = (text) => {
    let enhanced = text
      .replace(/\b(happy|joyful)\b/gi, '$1 😊')
      .replace(/\b(sad|upset)\b/gi, '$1 😔')
      .replace(/\b(thank you|thanks)\b/gi, '$1 💖')
      .replace(/\b(love|care)\b/gi, '$1 ❤️')
      .replace(/\b(hope|wish)\b/gi, '$1 🌟')
      .replace(/\b(strength|courage)\b/gi, '$1 💪');

    const closings = [
      "\n\n💖 Remember: You're stronger than you know!",
      "\n\n🌸 Growth comes one step at a time",
      "\n\n🌟 Your feelings are valid and important",
      "\n🌼 Be gentle with yourself today"
    ];
    
    if (enhanced.split(' ').length > 15) {
      enhanced += closings[Math.floor(Math.random() * closings.length)];
    }
    return enhanced;
  };

  const simulateTypingEffect = (text) => {
    setIsBotTyping(true);
    let index = 0;
    // Clear any existing interval if present.
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
    }
    typingIntervalRef.current = setInterval(() => {
      setMessages(prev => {
        const newMsgs = [...prev];
        const lastMsg = newMsgs[newMsgs.length - 1];
        if (lastMsg?.sender === 'bot') {
          lastMsg.text = text.slice(0, index + 1);
        }
        return newMsgs;
      });
      if (++index === text.length) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
        setIsBotTyping(false);
      }
    }, 20);
  };

  const parseText = (text) => {
    try {
      return text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\*(.*?)\*/g, '<i>$1</i>')
        .replace(/__(.*?)__/g, '<u>$1</u>')
        .replace(/\[!(.*?)\]/g, '<span style="color:#2A5298;">$1</span>')
        .replace(/\n/g, '<br/>');
    } catch (error) {
      console.error('Error parsing text:', error);
      return text;
    }
  };

  const handleNewChat = () => {
    // Cancel any ongoing axios request.
    if (axiosCancelSourceRef.current) {
      axiosCancelSourceRef.current.cancel('New chat started, cancelling previous request');
      axiosCancelSourceRef.current = null;
    }
    // Clear any ongoing typing interval.
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }
    // Reset states.
    setMessages([{
      text: "🌷 Welcome back! I'm here whenever you need to talk. How can I support you today?",
      sender: 'bot'
    }]);
    setInputText('');
    setIsLoading(false);
    setIsBotTyping(false);
  };

  const renderItem = ({ item }) => (
    <View style={[
      styles.messageBubble,
      item.sender === 'user' ? styles.userBubble : styles.botBubble
    ]}>
      <RenderHTML
        contentWidth={width * 0.7}
        source={{ html: parseText(item.text) }}
        baseStyle={styles.messageText}
      />
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Message here..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSendMessage}
          editable={!isLoading && !isBotTyping}
          multiline
          placeholderTextColor="#888"
        />
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleSendMessage}
            loading={isLoading}
            disabled={isLoading || isBotTyping}
            style={styles.sendButton}
            labelStyle={{ color: 'white' }}
          >
            Send
          </Button>
          <Button
            mode="outlined"
            onPress={handleNewChat}
            style={styles.clearButton}
            labelStyle={{ color: colors.primary }}
          >
            Clear
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 14,
    borderRadius: 20,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.userBubble,
  },
  botBubble: {
    marginTop: 15,
    alignSelf: 'flex-start',
    backgroundColor: colors.botBubble,
    marginBottom: 0,
  },
  messageText: {
    fontSize: 16,
    color: colors.messageText,
    lineHeight: 22,
    padding: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#FFFFFF',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
    marginBottom: 0,
  },
  input: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.inputBackground,
    borderRadius: 20,
    marginRight: 12,
    minHeight: 45,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sendButton: {
    borderRadius: 24,
    backgroundColor: colors.primary,
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  clearButton: {
    borderRadius: 24,
    borderColor: colors.primary,
    paddingVertical: 0,
    paddingHorizontal: 0,
    marginLeft: 8,
  },
});

export default ChatScreen;
