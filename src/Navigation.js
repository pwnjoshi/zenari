import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet, View, KeyboardAvoidingView, Platform } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Resources from './screens/Resources';
import SoundTherapy from './screens/SoundTherapy';

// Screens
import HomeScreen from './screens/HomeScreen';
import ChatWelcomeScreen from './screens/ChatWelcomeScreen';
import ConnectDoctor from './screens/ConnectDoctor';
import MoodTrackerScreen from './screens/MoodTrackerScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatScreen from './screens/ChatScreen';
import Doctors from './screens/Doctors';
import MindfulBreath from './screens/MindfulBreath';

const colors = {
  primary: '#2bedbb',         // main accent for active icons
  inactive: '#C0C0C0',          // soft tone for inactive icons
  background: 'rgba(255, 255, 255, 0.9)', // nav bar background
};

const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();

// Home Stack Navigator
const HomeStackScreen = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="Home" component={HomeScreen} />
    <HomeStack.Screen name="Doctors" component={Doctors} />
    <HomeStack.Screen name="ConnectDoctor" component={ConnectDoctor} />
    <HomeStack.Screen name="Breath" component={MindfulBreath} /> 
    <HomeStack.Screen name="Resources" component={Resources} />
    <HomeStack.Screen name="Music" component={SoundTherapy} />
  </HomeStack.Navigator>
);

// Chat Stack Navigator
const ChatStackScreen = () => (
  <ChatStack.Navigator screenOptions={{ headerShown: false }}>
    <ChatStack.Screen name="ChatWelcome" component={ChatWelcomeScreen} />
    <ChatStack.Screen name="ConnectDoctor" component={ConnectDoctor} />
    <ChatStack.Screen name="ChatScreen" component={ChatScreen} />
  </ChatStack.Navigator>
);

const Navigation = () => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={0}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            switch (route.name) {
              case 'Home':
                iconName = focused ? 'home-sharp' : 'home-outline';
                break;
              case 'Chat':
                iconName = focused ? 'chatbubbles-sharp' : 'chatbubbles-outline';
                break;
              case 'Mood':
                iconName = focused ? 'happy-sharp' : 'happy-outline';
                break;
              case 'Profile':
                iconName = focused ? 'person-sharp' : 'person-outline';
                break;
              default:
                iconName = 'home-outline';
            }
            return (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={iconName}
                  size={size}
                  color={color}
                  style={{ transform: [{ scale: focused ? 1.2 : 1 }] }}
                />
              </View>
            );
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.inactive,
          tabBarStyle: styles.tabBar,
          tabBarLabel: () => null,
          tabBarHideOnKeyboard: true,
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeStackScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen
          name="Chat"
          component={ChatStackScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen
          name="Mood"
          component={MoodTrackerScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ headerShown: false }}
        />
      </Tab.Navigator>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    right: 20,
    borderRadius: 30,
    height: 70,
    backgroundColor: colors.background,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    paddingBottom: 0,
    paddingTop: 10,
    marginBottom: 10,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Navigation;
