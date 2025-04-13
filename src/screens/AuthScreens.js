// AuthScreens.js
import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, KeyboardAvoidingView, Platform 
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';

const AuthScreens = ({ navigation }) => {  // Add navigation prop
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const colors = {
    primary: '#4A90E2',
    secondary: '#89CFF0',
    background: '#F5FCFF',
    text: '#2D3436',
  };

  const handleAuth = async () => {
    setError('');
    if (!email || !password) return setError('Please fill in all fields');
    if (password.length < 6) return setError('Password must be at least 6 characters');

    setIsProcessing(true);
    try {
      if (isLogin) {
        await auth().signInWithEmailAndPassword(email, password);
      } else {
        await auth().createUserWithEmailAndPassword(email, password);
      }
      // Navigate to main app after successful auth
      navigation.navigate('Main');
    } catch (e) {
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : null}
    >
      <LinearGradient
        colors={[colors.primary, colors.secondary]}
        style={styles.gradient}
      >
        <View style={styles.formContainer}>
          <Text style={styles.header}>{isLogin ? 'Login' : 'Sign Up'}</Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity style={styles.button} onPress={handleAuth}>
            <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Sign Up'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsLogin((prev) => !prev)}
          >
            <Text style={styles.switchText}>
              {isLogin ? 'Don’t have an account? Sign Up' : 'Already have an account? Login'}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
  },
  formContainer: {
    marginHorizontal: 20,
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 10,
    elevation: 5,
  },
  header: {
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    height: 50,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    color: '#4A90E2',
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
});

export default AuthScreens;
