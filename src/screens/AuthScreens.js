import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator, // Import ActivityIndicator
  SafeAreaView, // Use SafeAreaView
  ScrollView // Use ScrollView for smaller screens
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Using MaterialIcons as originally imported
import auth from '@react-native-firebase/auth';
// If you use useNavigation hook, ensure it's imported correctly if needed elsewhere
// import { useNavigation } from '@react-navigation/native';

// Updated color palette inspired by HomeScreen
const colors = {
  primary: '#2bedbb', // Teal primary from HomeScreen
  primaryLight: '#a6f9e2',
  backgroundTop: '#E6F7FF', // Light blue top
  backgroundBottom: '#D1EFFF', // Slightly darker light blue bottom
  cardBackground: '#FFFFFF',
  textDark: '#2D5D5E', // Dark teal text
  textSecondary: '#7A8D8E', // Greyish text
  iconGrey: '#607D8B',
  lightBorder: '#CFD8DC', // Lighter border color
  errorRed: '#D32F2F', // Error color
  white: '#FFFFFF',
};

// Main Authentication Screen Component
const AuthScreens = ({ navigation }) => { // Receive navigation as prop
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Start with Login view
  const [isProcessing, setIsProcessing] = useState(false); // State for loading indicator

  // Authentication Handler
  const handleAuth = async () => {
    setError(''); // Clear previous errors
    // Basic validation
    if (!email || !password) {
        return setError('Please fill in both email and password.');
    }
    if (!isLogin && password.length < 6) { // Check password length only on sign up
        return setError('Password must be at least 6 characters long.');
    }

    setIsProcessing(true); // Show loading indicator
    try {
      if (isLogin) {
        // Sign in existing user
        await auth().signInWithEmailAndPassword(email, password);
        console.log('User signed in!');
      } else {
        // Create new user
        await auth().createUserWithEmailAndPassword(email, password);
        console.log('User account created & signed in!');
        // Optionally add user profile creation logic here (e.g., save to Firestore)
      }
      // Navigate to the main part of the app upon successful authentication
      // Ensure 'MainAppStack' or equivalent navigator exists and handles the logged-in state
      // This navigation might be handled by a top-level navigator listening to auth state changes instead.
      // navigation.navigate('MainAppStack'); // Example navigation target
    } catch (e) {
        // Handle Firebase errors
        if (e.code === 'auth/email-already-in-use') {
            setError('That email address is already in use!');
        } else if (e.code === 'auth/invalid-email') {
            setError('That email address is invalid!');
        } else if (e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
            setError('Incorrect email or password.');
        } else {
            setError('Authentication failed. Please try again.'); // Generic error
        }
        console.error(e);
    } finally {
      setIsProcessing(false); // Hide loading indicator
    }
  };

  return (
    // Use SafeAreaView for top padding on iOS
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[colors.backgroundTop, colors.backgroundBottom]}
        style={styles.gradient}
      >
        {/* Use KeyboardAvoidingView to prevent keyboard overlap */}
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // Adjust behavior as needed
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Use ScrollView to ensure content fits on smaller screens */}
          <ScrollView contentContainerStyle={styles.scrollContentContainer}>
            <View style={styles.contentContainer}>
              {/* App Title/Logo Placeholder */}
              <Text style={styles.appTitle}>Zenari</Text>
              <Text style={styles.header}>{isLogin ? 'Welcome Back!' : 'Create Account'}</Text>

              {/* Error Message Display */}
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Icon name="email" size={20} color={colors.iconGrey} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isProcessing} // Disable input while processing
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Icon name="lock" size={20} color={colors.iconGrey} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry // Hide password characters
                  editable={!isProcessing} // Disable input while processing
                />
              </View>

              {/* Auth Button */}
              <TouchableOpacity
                style={[styles.button, isProcessing && styles.buttonDisabled]} // Style differently when disabled
                onPress={handleAuth}
                disabled={isProcessing} // Disable button while processing
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color={colors.white} /> // Show loader
                ) : (
                  <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text> // Show text
                )}
              </TouchableOpacity>

              {/* Switch between Login/Sign Up */}
              <TouchableOpacity
                style={styles.switchButton}
                onPress={() => {
                    if (!isProcessing) { // Prevent switching while processing
                        setIsLogin((prev) => !prev);
                        setError(''); // Clear errors on switch
                    }
                }}
                disabled={isProcessing}
              >
                <Text style={styles.switchText}>
                  {isLogin ? 'Don’t have an account? ' : 'Already have an account? '}
                  <Text style={styles.switchLinkText}>
                    {isLogin ? 'Sign Up' : 'Login'}
                  </Text>
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
};

// Enhanced Stylesheet
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundTop, // Match top gradient color
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1, // Ensure ScrollView content can grow
    justifyContent: 'center', // Center content vertically
  },
  contentContainer: {
    paddingHorizontal: 30, // More horizontal padding
    paddingVertical: 40, // More vertical padding
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.primary, // Use primary color
    textAlign: 'center',
    marginBottom: 15, // Space below title
    // Consider adding a custom font here
  },
  header: {
    fontSize: 24, // Slightly smaller header
    fontWeight: '600', // Semi-bold
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 30, // Increased space below header
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white, // White background for input
    borderRadius: 12, // More rounded corners
    marginBottom: 18, // Increased space between inputs
    borderWidth: 1,
    borderColor: colors.lightBorder, // Subtle border
    paddingHorizontal: 15, // Padding inside container
  },
  inputIcon: {
    marginRight: 10, // Space between icon and text input
  },
  input: {
    flex: 1, // Input takes remaining space
    height: 55, // Increased height
    fontSize: 16,
    color: colors.textDark,
  },
  button: {
    backgroundColor: colors.primary, // Use primary color
    paddingVertical: 16, // Increased padding
    borderRadius: 12, // Match input rounding
    alignItems: 'center',
    marginTop: 10, // Space above button
  },
  buttonDisabled: {
      backgroundColor: colors.primaryLight, // Lighter color when disabled
  },
  buttonText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '600', // Semi-bold
  },
  switchButton: {
    marginTop: 25, // Increased space above switch text
    alignItems: 'center',
  },
  switchText: {
    color: colors.textSecondary, // Use secondary text color
    fontSize: 14,
  },
  switchLinkText: {
      color: colors.primary, // Use primary color for the link part
      fontWeight: '600', // Make link slightly bolder
  },
  errorText: {
    color: colors.errorRed,
    marginBottom: 15, // Space below error
    textAlign: 'center',
    fontSize: 14,
  },
});

export default AuthScreens;
