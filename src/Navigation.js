// RootNavigation.js
import React, { useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

// --- Firebase ---
// Assuming you are using @react-native-firebase correctly elsewhere
import firestore from '@react-native-firebase/firestore';

// --- Auth Context ---
import { AuthContext } from './screens/AuthProvider'; // Ensure this path is correct

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
import myFitness from './screens/myFitness';
import sleep from './screens/sleep';
import multiSport from './screens/multiSport';
import RedeemScreen from './screens/RedeemScreen'; // *** IMPORT RedeemScreen ***

// --- Colors ---
// (Color definition assumed unchanged)
const colors = {
    primary: '#2bedbb', primaryDark: '#1AA897', inactive: '#9E9E9E',
    backgroundTop: '#E6F7FF', backgroundBottom: '#D1EFFF',
    navBackground: '#FFFFFF', white: '#FFFFFF', iconGrey: '#607D8B',
    textSecondary: '#7A8D8E', lightBorder: '#E0E0E0', error: '#D32F2F',
};

// --- Navigation Setup ---
const Tab = createBottomTabNavigator();
const RootStack = createStackNavigator();

// --- Custom Bottom Navigation ---
// (CustomBottomNav implementation assumed unchanged)
const CustomBottomNav = ({ state, descriptors, navigation }) => {
    const getCurrentRouteName = (navState) => {
        if (!navState) return null;
        const route = navState.routes[navState.index];
        if (route.state) { return getCurrentRouteName(route.state); }
        return route.name;
    };
    const currentRouteName = getCurrentRouteName(navigation.getState());
    // console.log("Current Route Name for Tab Bar:", currentRouteName);

    const tabs = [
        { name: 'DiscoverTab', label: 'Discover', icon: 'compass', targetScreen: 'HomeScreen' },
        { name: 'ChatTab', label: 'Chat', icon: 'chatbubbles', targetScreen: 'ChatWelcomeScreen' },
        { name: 'VoiceTab', label: 'Voice', icon: 'mic', targetScreen: 'VoiceModeAI', isCentral: true },
        { name: 'JournalTab', label: 'Journal', icon: 'book', targetScreen: 'JournalAI' },
        { name: 'SoundTab', label: 'Sound', icon: 'musical-notes', targetScreen: 'SoundTherapy' },
    ];

    const isActive = (tabTargetScreen) => {
        const navState = navigation.getState();
        const currentTabRoute = navState.routes[navState.index];
        // This basic check highlights the tab only if the *direct* screen of the tab is active.
        // It won't highlight if you navigate deeper within that tab's stack.
        return currentTabRoute.name === tabTargetScreen;
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
                                onPress={() => navigation.navigate(tab.targetScreen)} // Navigates within RootStack
                                activeOpacity={0.8}
                            >
                                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.centralNavButton}>
                                    <Ionicons name={`${tab.icon}-outline`} size={28} color={colors.white}/>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    }
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.navButtonContainer}
                            onPress={() => navigation.navigate(tab.targetScreen)} // Navigates within MainTabs
                            activeOpacity={0.7}
                        >
                            <Ionicons name={`${tab.icon}${active ? '' : '-outline'}`} size={26} color={iconColor} />
                            <Text style={[styles.navLabel, { color: labelColor }]}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};


// --- Main Tabs Navigator ---
const MainTabs = () => (
    <Tab.Navigator
        tabBar={(props) => <CustomBottomNav {...props} />}
        screenOptions={{ headerShown: false }}
    >
        <Tab.Screen name="HomeScreen" component={HomeScreen} />
        <Tab.Screen name="ChatWelcomeScreen" component={ChatWelcomeScreen} />
        <Tab.Screen name="JournalAI" component={JournalAI} />
        <Tab.Screen name="SoundTherapy" component={SoundTherapy} />
        {/* VoiceModeAI is handled by the central button navigating the RootStack */}
    </Tab.Navigator>
);

// --- Loading Screen ---
const LoadingIndicatorScreen = () => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
    </View>
);

// --- Root Navigation Component ---
const RootNavigation = () => {
    const authContext = useContext(AuthContext);
    const [profileStatus, setProfileStatus] = useState('checking'); // 'checking', 'incomplete', 'complete'
    const [internalLoading, setInternalLoading] = useState(true); // Manages loading state across auth and profile checks

    // Basic check for AuthContext existence
    if (!authContext) {
        console.error("AuthContext is missing! Ensure RootNavigation is wrapped in AuthProvider.");
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: colors.error }}>Error: AuthProvider missing!</Text>
            </View>
        );
    }

    const { user, loading: authLoading } = authContext;

    // Effect to manage loading based on auth state changes
    useEffect(() => {
        if (authLoading) {
            setInternalLoading(true);
            setProfileStatus('checking'); // Reset profile status while auth is loading
        } else {
            // If auth is done loading, set internal loading based on whether user exists
            // We still need to check profile status if user exists
            setInternalLoading(!!user);
            if (!user) {
                setProfileStatus('checking'); // No user, reset profile status
            }
        }
    }, [user, authLoading]);

    // Effect to check user profile status once authenticated
    useEffect(() => {
        // Only run if auth is done, user exists, and profile status hasn't been determined yet
        if (!authLoading && user && profileStatus === 'checking') {
            setInternalLoading(true); // Ensure loading indicator shows during Firestore check
            const checkUserProfile = async () => {
                try {
                    const userDoc = await firestore().collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const data = userDoc.data();
                        // Check for essential profile fields (adjust as needed)
                        if (data?.fullName?.trim() && data?.gender) {
                            setProfileStatus('complete');
                        } else {
                            setProfileStatus('incomplete');
                        }
                    } else {
                        // User document doesn't exist, profile is incomplete
                        console.warn(`User document not found for uid: ${user.uid}`);
                        setProfileStatus('incomplete');
                    }
                } catch (error) {
                    console.error("Firestore profile check error:", error);
                    // Assume incomplete on error to prompt user info screen
                    setProfileStatus('incomplete');
                } finally {
                    // Firestore check done, stop internal loading
                    setInternalLoading(false);
                }
            };
            checkUserProfile();
        } else if (!authLoading && user && profileStatus !== 'checking' && internalLoading) {
            // If profile status was already determined but we were still loading, stop loading
            setInternalLoading(false);
        } else if (!authLoading && !user) {
            // If auth is done and there's no user, ensure loading stops
             setInternalLoading(false);
        }
    }, [user, authLoading, profileStatus, internalLoading]); // Depend on internalLoading to re-evaluate

    // Display loading indicator during auth check or profile check
    if (internalLoading) {
        return <LoadingIndicatorScreen />;
    }

    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                // User not logged in: Show Auth Flow
                <RootStack.Screen name="Auth" component={AuthScreens} />
            ) : profileStatus === 'incomplete' ? (
                // User logged in but profile incomplete: Show UserInfo Flow
                <RootStack.Screen name="UserInfo">
                    {(props) => (
                        <UserInfoScreen
                            {...props}
                            onProfileComplete={() => {
                                // When profile is completed, re-trigger the check
                                setProfileStatus('checking');
                                setInternalLoading(true); // Show loading while re-checking/transitioning
                            }}
                        />
                    )}
                </RootStack.Screen>
            ) : profileStatus === 'complete' ? (
                // User logged in and profile complete: Show Main App Flow
                <>
                    <RootStack.Screen name="MainTabs" component={MainTabs} />
                    {/* Register all other screens directly in RootStack */}
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
                    {/* Health Connect Screens */}
                    <RootStack.Screen name="myFitness" component={myFitness} />
                    <RootStack.Screen name="sleep" component={sleep} />
                    <RootStack.Screen name="multiSport" component={multiSport} />
                    {/* *** REGISTER RedeemScreen *** */}
                    <RootStack.Screen name="Redeem" component={RedeemScreen} />
                </>
            ) : (
                 // Fallback case (should ideally not be reached if logic is correct)
                 <RootStack.Screen name="FallbackLoading" component={LoadingIndicatorScreen} />
            )}
        </RootStack.Navigator>
    );
};

// --- Styles ---
// (Styles definition assumed unchanged)
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundTop, // Or your app's loading background color
    },
    bottomNavContainer: {
        // Added view for potential future use (e.g., absolute positioning backdrop)
    },
    bottomNav: {
        backgroundColor: colors.navBackground, // White background for the nav bar
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 8,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10, // Handle iOS safe area notch
        // Styling for curved top corners and shadow
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 }, // Shadow upwards
        shadowOpacity: 0.08,
        shadowRadius: 6,
        // Elevation for Android shadow (set to 0 if using border instead)
        elevation: 0, // Using border for consistency or subtle shadow
        // Optional border instead of shadow for a flatter look
         borderTopWidth: Platform.OS === 'android' ? 0 : 1, // Thinner border on iOS if elevation is 0
         borderTopColor: colors.lightBorder,
    },
    navButtonContainer: {
        alignItems: 'center',
        flex: 1, // Distribute space evenly
        paddingVertical: 4,
    },
    navLabel: {
        fontSize: 11,
        marginTop: 2,
        color: colors.textSecondary, // Default inactive label color
    },
    centralNavButtonWrapper: {
        flex: 1, // Takes up space like other buttons
        alignItems: 'center', // Center the button horizontally
    },
    centralNavButton: {
        width: 60, // Diameter of the button
        height: 60,
        borderRadius: 30, // Make it perfectly round
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -35, // Pull the button up significantly
        elevation: 20, // Android shadow for the button itself
        // iOS shadow for the button itself
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});

export default RootNavigation;