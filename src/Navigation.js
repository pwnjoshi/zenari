import React, { useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { AuthContext } from './screens/AuthProvider';
import AuthScreens from './screens/AuthScreens';
import HomeScreen from './screens/HomeScreen';
import ChatWelcomeScreen from './screens/ChatWelcomeScreen';
import ConnectDoctor from './screens/ConnectDoctor';
import MoodTrackerScreen from './screens/MoodTrackerScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChatScreen from './screens/ChatScreen';
import Doctors from './screens/Doctors';
import MindfulBreath from './screens/MindfulBreath';
import Resources from './screens/Resources';
import SoundTherapy from './screens/SoundTherapy';

const colors = {
  primary: '#2bedbb',
  inactive: '#C0C0C0',
  background: 'rgba(255, 255, 255, 0.9)',
};

const Tab = createBottomTabNavigator();
const ChatStack = createNativeStackNavigator();
const HomeStack = createNativeStackNavigator();
const RootStack = createStackNavigator();

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

const ChatStackScreen = () => (
  <ChatStack.Navigator screenOptions={{ headerShown: false }}>
    <ChatStack.Screen name="ChatWelcome" component={ChatWelcomeScreen} />
    <ChatStack.Screen name="ConnectDoctor" component={ConnectDoctor} />
    <ChatStack.Screen name="ChatScreen" component={ChatScreen} />
  </ChatStack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false, // ✅ This hides the header from ALL tab screens
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
    <Tab.Screen name="Home" component={HomeStackScreen} />
    <Tab.Screen name="Chat" component={ChatStackScreen} />
    <Tab.Screen name="Mood" component={MoodTrackerScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

const Navigation = () => {
  const { user } = useContext(AuthContext);

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="Main" component={MainTabs} />
      ) : (
        <RootStack.Screen name="AuthScreens" component={AuthScreens} />
      )}
    </RootStack.Navigator>
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
