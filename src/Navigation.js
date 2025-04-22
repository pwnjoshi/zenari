// RootNavigation.js
import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// Use EITHER stack or native-stack consistently. Let's try standard stack first.
import { createStackNavigator } from '@react-navigation/stack';
// If standard stack causes issues later, you might switch BOTH RootStack and the (now removed) AppStack to createNativeStackNavigator
// import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

// --- Firebase ---
import firestore from '@react-native-firebase/firestore';

// --- Auth Context ---
import { AuthContext } from './screens/AuthProvider';

// --- Screens (Assume all imports are correct and valid components) ---
import AuthScreens from './screens/AuthScreens';
import HomeScreen from './screens/HomeScreen';
import ChatWelcomeScreen from './screens/ChatWelcomeScreen';
import MoodTrackerScreen from './screens/MoodTrackerScreen';
import ProfileScreen from './screens/ProfileScreen';
import ConnectDoctor from './screens/ConnectDoctor';
import ChatScreen from './screens/ChatScreen';
import Doctors from './screens/Doctors';
import MindfulBreath from './screens/MindfulBreathScreens/CustomMindfulBreath';
import Resources from './screens/Resources';
import SoundTherapy from './screens/SoundTherapy';
import VoiceModeAI from './screens/VoiceModeAI';
import JournalAI from './screens/JournalAI';
import UserInfoScreen from './screens/UserInfoScreen';
import NotificationScreen from './screens/NotificationScreen';
import MindfulBreathWelcome from './screens/MindfulBreathWelcome';
import UjjayiScreen from './screens/MindfulBreathScreens/UjjayiScreen';
import BhramariScreen from './screens/MindfulBreathScreens/BhramariScreen';
import NadiShodhanaScreen from './screens/MindfulBreathScreens/NadiShodhanaScreen';
import SamavrittiScreen from './screens/MindfulBreathScreens/SamavrittiScreen';
import SuryaBhedanaScreen from './screens/MindfulBreathScreens/SuryaBhedanaScreen';
import ChandraBhedanaScreen from './screens/MindfulBreathScreens/ChandraBhedanaScreen';
import IntroToMeditationScreen from './screens/Courses/introToMeditation';
import StressReliefScreen from './screens/Courses/stressRelief';
import GratitudePracticeScreen from './screens/Courses/gratitudePractice';
import BetterSleepScreen from './screens/Courses/betterSleep';
import GameScreen from './screens/GameScreen';
// ----------------------------------------

// --- Colors ---
const colors = {
    primary: '#2bedbb', primaryDark: '#1AA897', inactive: '#9E9E9E',
    backgroundTop: '#E6F7FF', backgroundBottom: '#D1EFFF',
    navBackground: '#FFFFFF', white: '#FFFFFF', iconGrey: '#607D8B',
    textSecondary: '#7A8D8E', lightBorder: '#E0E0E0', error: '#D32F2F',
};

// --- Navigation Setup ---
const Tab = createBottomTabNavigator();
// We removed AppStackNav = createNativeStackNavigator();
const RootStack = createStackNavigator(); // Using standard stack for the root

// --- Custom Bottom Navigation (Simplified active check might be needed) ---
const CustomBottomNav = ({ state, descriptors, navigation }) => {
    // This function tries to find the deepest active route name
    const getCurrentRouteName = (navState) => {
        if (!navState) return null;
        const route = navState.routes[navState.index];
        if (route.state) { return getCurrentRouteName(route.state); } // Recursively check state
        return route.name;
    };
    const currentRouteName = getCurrentRouteName(navigation.getState()); // Get state from navigation prop
    console.log("Current Route Name for Tab Bar:", currentRouteName); // Debug log

    const tabs = [ { name: 'DiscoverTab', label: 'Discover', icon: 'compass', targetScreen: 'HomeScreen' }, { name: 'ChatTab', label: 'Chat', icon: 'chatbubbles', targetScreen: 'ChatWelcomeScreen' }, { name: 'VoiceTab', label: 'Voice', icon: 'mic', targetScreen: 'VoiceModeAI', isCentral: true }, { name: 'JournalTab', label: 'Journal', icon: 'book', targetScreen: 'JournalAI' }, { name: 'SoundTab', label: 'Sound', icon: 'musical-notes', targetScreen: 'SoundTherapy' }, ];

    const isActive = (tabTargetScreen) => {
        // Simpler check: is the current route name matching the tab's target?
        // For nested screens, we need a more robust way or pass focus info down.
        // Let's start simple and see if direct match works better now.
        // NOTE: This simplified check WON'T highlight the tab if you are deep inside a stack belonging to that tab.
        // A more complex solution might involve navigation listeners or context if needed later.
        const navState = navigation.getState();
        const currentTabRoute = navState.routes[navState.index];
        return currentTabRoute.name === tabTargetScreen;

        // --- PREVIOUS COMPLEX LOGIC (kept for reference if needed) ---
        // const discoverScreens = [ 'HomeScreen', 'Doctors', 'ConnectDoctor', 'MindfulBreathWelcome', 'MindfulBreathCustom', 'Resources', 'MoodTrackerScreen', 'ProfileScreen', 'NotificationScreen', 'GameScreen', 'UjjayiScreen', 'BhramariScreen', 'NadiShodhanaScreen', 'SamavrittiScreen', 'SuryaBhedanaScreen', 'ChandraBhedanaScreen', 'med101', 'stress1', 'gratitude1', 'sleep1' ];
        // const chatScreens = ['ChatWelcomeScreen', 'ChatScreen'];
        // const journalScreens = ['JournalAI'];
        // const soundScreens = ['SoundTherapy'];
        // if (currentRouteName === tabTargetScreen) return true;
        // if (tabTargetScreen === 'HomeScreen' && discoverScreens.includes(currentRouteName)) return true;
        // if (tabTargetScreen === 'ChatWelcomeScreen' && chatScreens.includes(currentRouteName)) return true;
        // if (tabTargetScreen === 'JournalAI' && journalScreens.includes(currentRouteName)) return true;
        // if (tabTargetScreen === 'SoundTherapy' && soundScreens.includes(currentRouteName)) return true;
        // return false;
     };

    return (
        <View style={styles.bottomNavContainer}>
            <View style={styles.bottomNav}>
                {tabs.map((tab) => {
                    const active = isActive(tab.targetScreen);
                    const iconColor = active ? colors.primary : colors.inactive;
                    const labelColor = active ? colors.primary : colors.textSecondary;

                    if (tab.isCentral) {
                        return (
                            <TouchableOpacity
                                key={tab.name}
                                style={styles.centralNavButtonWrapper}
                                // Navigate directly within RootStack now
                                onPress={() => navigation.navigate(tab.targetScreen)}
                                activeOpacity={0.8} >
                                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.centralNavButton} >
                                    <Ionicons name={`${tab.icon}-outline`} size={28} color={colors.white}/>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    }
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.navButtonContainer}
                            onPress={() => navigation.navigate(tab.targetScreen)} // Navigate within MainTabs
                            activeOpacity={0.7} >
                            <Ionicons name={`${tab.icon}${active ? '' : '-outline'}`} size={26} color={iconColor} />
                            <Text style={[styles.navLabel, { color: labelColor }]}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};


// --- Main Tabs ---
const MainTabs = () => (
    <Tab.Navigator tabBar={(props) => <CustomBottomNav {...props} />} screenOptions={{ headerShown: false }} >
        <Tab.Screen name="HomeScreen" component={HomeScreen} />
        <Tab.Screen name="ChatWelcomeScreen" component={ChatWelcomeScreen} />
        <Tab.Screen name="JournalAI" component={JournalAI} />
        <Tab.Screen name="SoundTherapy" component={SoundTherapy} />
         {/* VoiceModeAI is now directly in RootStack, navigated via central button */}
    </Tab.Navigator>
);

// --- App Stack (No longer used as a separate navigator) ---
// const AppStack = () => ( ... ); // REMOVED

// --- Loading Screen ---
const LoadingIndicatorScreen = () => ( <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.primary} /></View> );

// --- Root Navigation (Simplified Structure) ---
const RootNavigation = () => {
    // (AuthContext logic assumed unchanged)
    const authContext = useContext(AuthContext); const [profileStatus, setProfileStatus] = useState('checking'); const [internalLoading, setInternalLoading] = useState(true);
    if (!authContext) { console.error("AuthContext missing!"); return ( <View style={styles.loadingContainer}><Text style={{ color: colors.error }}>Error: AuthProvider!</Text></View> ); }
    const { user, loading: authLoading } = authContext;
    useEffect(() => { if (authLoading) { setInternalLoading(true); setProfileStatus('checking'); } else { setInternalLoading(!!user); if (!user) { setProfileStatus('checking'); } } }, [user, authLoading]);
    useEffect(() => { if (!authLoading && user && profileStatus === 'checking') { setInternalLoading(true); const checkUserProfile = async () => { try { const userDoc = await firestore().collection('users').doc(user.uid).get(); if (userDoc.exists) { const data = userDoc.data(); if (data?.fullName?.trim() && data?.gender) { setProfileStatus('complete'); } else { setProfileStatus('incomplete'); } } else { setProfileStatus('incomplete'); } } catch (error) { console.error("Firestore Check Error:", error); setProfileStatus('incomplete'); } finally { setInternalLoading(false); } }; checkUserProfile(); } else if (!authLoading && user && profileStatus !== 'checking' && internalLoading) { setInternalLoading(false); } }, [user, authLoading, profileStatus, internalLoading]);

    if (internalLoading) { return <LoadingIndicatorScreen />; }

    return (
        // Root Stack manages Auth vs App Screens
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                // Auth Flow
                <RootStack.Screen name="Auth" component={AuthScreens} />
            ) : profileStatus === 'incomplete' ? (
                // Profile Completion Flow
                 <RootStack.Screen name="UserInfo" children={(props) => ( <UserInfoScreen {...props} onProfileComplete={() => { setProfileStatus('checking'); setInternalLoading(true); }} /> )} />
            ) : profileStatus === 'complete' ? (
                // Main App Flow - All screens registered directly here now
                <>
                    <RootStack.Screen name="MainTabs" component={MainTabs} />
                    {/* Other Screens that were in AppStack */}
                    <RootStack.Screen name="Doctors" component={Doctors} />
                    <RootStack.Screen name="ConnectDoctor" component={ConnectDoctor} />
                    <RootStack.Screen name="ChatScreen" component={ChatScreen} />
                    <RootStack.Screen name="MindfulBreathWelcome" component={MindfulBreathWelcome} />
                    <RootStack.Screen name="MindfulBreathCustom" component={MindfulBreath} />
                    <RootStack.Screen name="Resources" component={Resources} />
                    <RootStack.Screen name="MoodTrackerScreen" component={MoodTrackerScreen} />
                    <RootStack.Screen name="ProfileScreen" component={ProfileScreen} />
                    <RootStack.Screen name="VoiceModeAI" component={VoiceModeAI} />
                    <RootStack.Screen name="NotificationScreen" component={NotificationScreen} />
                    <RootStack.Screen name="GameScreen" component={GameScreen} />
                    {/* Breathing Screens */}
                    <RootStack.Screen name="UjjayiScreen" component={UjjayiScreen} />
                    <RootStack.Screen name="BhramariScreen" component={BhramariScreen} />
                    <RootStack.Screen name="NadiShodhanaScreen" component={NadiShodhanaScreen} />
                    <RootStack.Screen name="SamavrittiScreen" component={SamavrittiScreen} />
                    <RootStack.Screen name="SuryaBhedanaScreen" component={SuryaBhedanaScreen} />
                    <RootStack.Screen name="ChandraBhedanaScreen" component={ChandraBhedanaScreen} />
                    {/* Course Screens */}
                    <RootStack.Screen name="med101" component={IntroToMeditationScreen} />
                    <RootStack.Screen name="stress1" component={StressReliefScreen} />
                    <RootStack.Screen name="gratitude1" component={GratitudePracticeScreen} />
                    <RootStack.Screen name="sleep1" component={BetterSleepScreen} />
                </>
            ) : (
                 <RootStack.Screen name="FallbackLoading" component={LoadingIndicatorScreen} />
            )}
        </RootStack.Navigator>
    );
};

// --- Styles ---
// (Styles definition assumed unchanged)
const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.backgroundTop, },
    bottomNavContainer: { },
    bottomNav: { backgroundColor: colors.navBackground, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 8, paddingBottom: Platform.OS === 'ios' ? 25 : 10, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 0, borderTopWidth: Platform.OS === 'android' ? 0 : 1, borderTopColor: colors.lightBorder, },
    navButtonContainer: { alignItems: 'center', flex: 1, paddingVertical: 4, },
    navLabel: { fontSize: 11, marginTop: 2, color: colors.textSecondary, },
    centralNavButtonWrapper: { flex: 1, alignItems: 'center', },
    centralNavButton: { width: 60, height: 60, borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginTop: -35, elevation: 0
        , shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, },
});

export default RootNavigation;