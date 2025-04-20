// RootNavigation.js
import React, { useContext, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity,
    Platform // Import Platform
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

// --- Firebase ---
import firestore from '@react-native-firebase/firestore';

// --- Auth Context ---
import { AuthContext } from './screens/AuthProvider'; // Assuming AuthProvider is in ./screens

// --- Screens ---
import AuthScreens from './screens/AuthScreens';
import HomeScreen from './screens/HomeScreen';
import ChatWelcomeScreen from './screens/ChatWelcomeScreen';
import MoodTrackerScreen from './screens/MoodTrackerScreen';
import ProfileScreen from './screens/ProfileScreen';
import ConnectDoctor from './screens/ConnectDoctor';
import ChatScreen from './screens/ChatScreen';
import Doctors from './screens/Doctors';
import MindfulBreath from './screens/MindfulBreathScreens/CustomMindfulBreath'; // Custom config screen
import Resources from './screens/Resources';
import SoundTherapy from './screens/SoundTherapy';
import VoiceModeAI from './screens/VoiceModeAI';
import JournalAI from './screens/JournalAI';
import UserInfoScreen from './screens/UserInfoScreen';
import NotificationScreen from './screens/NotificationScreen';
import MindfulBreathWelcome from './screens/MindfulBreathWelcome';

// --- Import Specific Breathing Exercise Screens ---
import UjjayiScreen from './screens/MindfulBreathScreens/UjjayiScreen';
import BhramariScreen from './screens/MindfulBreathScreens/BhramariScreen';
import NadiShodhanaScreen from './screens/MindfulBreathScreens/NadiShodhanaScreen';
import SamavrittiScreen from './screens/MindfulBreathScreens/SamavrittiScreen';
import SuryaBhedanaScreen from './screens/MindfulBreathScreens/SuryaBhedanaScreen';
import ChandraBhedanaScreen from './screens/MindfulBreathScreens/ChandraBhedanaScreen';

// --- Import Mini Course Screens ---
// *** ADDED IMPORTS FOR MINI COURSES ***
// (Adjust paths if your files are located elsewhere)
import IntroToMeditationScreen from './screens/Courses/introToMeditation';
import StressReliefScreen from './screens/Courses/stressRelief';
import GratitudePracticeScreen from './screens/Courses/gratitudePractice';
import BetterSleepScreen from './screens/Courses/betterSleep';
// ------------------------------------

// --- Colors ---
// Assuming colors object is defined as before
const colors = {
    primary: '#2bedbb',
    primaryDark: '#1AA897',
    inactive: '#9E9E9E',
    backgroundTop: '#E6F7FF',
    backgroundBottom: '#D1EFFF',
    cardBackground: '#FFFFFF',
    textDark: '#2D5D5E',
    textSecondary: '#7A8D8E',
    featureBlue: '#4A90E2',
    featureGreen: '#4CAF50',
    moodYellow: '#FFF9C4',
    navBackground: '#FFFFFF',
    white: '#FFFFFF',
    iconGrey: '#607D8B',
    lightBorder: '#E0E0E0',
    backgroundPastelTop: '#E0F7FA',
    backgroundPastelBottom: '#FFF9C4',
    primaryPastel: '#FFCCBC',
    primaryDarkPastel: '#FFA68A',
    textPrimaryPastel: '#5D4037',
    textSecondaryPastel: '#A1887F',
    error: '#D32F2F',
    inputBackground: '#FFFFFF',
    inputBorder: '#E0E0E0',
    radioSelected: '#FFAB91',
    radioUnselectedBorder: '#BDBDBD',
};


// --- Navigation Setup ---
const Tab = createBottomTabNavigator();
const AppStackNav = createNativeStackNavigator();
const RootStack = createStackNavigator();

// --- Custom Bottom Navigation ---
const CustomBottomNav = ({ state, descriptors, navigation }) => {
    const getCurrentRouteName = (navState) => {
        if (!navState) return null;
        const route = navState.routes[navState.index];
        if (route.state) { return getCurrentRouteName(route.state); }
        return route.name;
    };
    // Get the state of the parent navigator (RootStack) to determine the current screen
    // even when inside a nested navigator (like AppStack)
    const parentState = navigation.getParent()?.getParent()?.getState(); // Go up two levels for RootStack
    const currentRouteName = parentState ? getCurrentRouteName(parentState) : getCurrentRouteName(state);

    //console.log("Current Visible Route Name:", currentRouteName); // Debug log

    const tabs = [
        { name: 'DiscoverTab', label: 'Discover', icon: 'compass', targetScreen: 'HomeScreen' },
        { name: 'ChatTab', label: 'Chat', icon: 'chatbubbles', targetScreen: 'ChatWelcomeScreen' },
        { name: 'VoiceTab', label: 'Voice', icon: 'mic', targetScreen: 'VoiceModeAI', isCentral: true },
        { name: 'JournalTab', label: 'Journal', icon: 'book', targetScreen: 'JournalAI' },
        { name: 'SoundTab', label: 'Sound', icon: 'musical-notes', targetScreen: 'SoundTherapy' },
    ];

    // Function to check if a tab's target screen OR any screen within its initial stack is active
     const isActive = (tabTargetScreen) => {
         // Direct match for top-level screens in the Tab Navigator
         if (currentRouteName === tabTargetScreen) return true;

         // Add specific checks if needed for deeper screens belonging logically to a tab
         // e.g., if ChatScreen should highlight the ChatTab
         if (tabTargetScreen === 'ChatWelcomeScreen' && currentRouteName === 'ChatScreen') return true;
         // Add more specific checks as needed for other sections

         return false;
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
                                onPress={() => navigation.navigate('App', { screen: tab.targetScreen })} // Navigate within AppStack
                                activeOpacity={0.8}
                            >
                                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.centralNavButton} >
                                    <Ionicons name={`${tab.icon}-outline`} size={28} color={colors.white} />
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    }
                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.navButtonContainer}
                            onPress={() => navigation.navigate(tab.targetScreen)} // Navigate within MainTabs
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


// --- Main Tabs ---
const MainTabs = () => (
    <Tab.Navigator
        tabBar={(props) => <CustomBottomNav {...props} />}
        screenOptions={{ headerShown: false }}
    >
        {/* These screens are directly managed by the Bottom Tab Navigator */}
        <Tab.Screen name="HomeScreen" component={HomeScreen} />
        <Tab.Screen name="ChatWelcomeScreen" component={ChatWelcomeScreen} />
        {/* VoiceModeAI is handled via the central button onPress directly navigating in AppStack */}
        <Tab.Screen name="JournalAI" component={JournalAI} />
        <Tab.Screen name="SoundTherapy" component={SoundTherapy} />
    </Tab.Navigator>
);

// --- App Stack (Holds Main Tabs and other screens accessible after login) ---
const AppStack = () => (
    <AppStackNav.Navigator
        screenOptions={{
             headerShown: false // Keep headers hidden by default for the stack
        }}
    >
        {/* The MainTabs component itself is the initial screen of this stack */}
        <AppStackNav.Screen name="MainTabs" component={MainTabs} />

        {/* Screens navigable *from* within the MainTabs screens or central button */}
        <AppStackNav.Screen name="Doctors" component={Doctors} />
        <AppStackNav.Screen name="ConnectDoctor" component={ConnectDoctor} />
        <AppStackNav.Screen name="ChatScreen" component={ChatScreen} />
        <AppStackNav.Screen name="MindfulBreathWelcome" component={MindfulBreathWelcome} />
        <AppStackNav.Screen name="MindfulBreathCustom" component={MindfulBreath} />
        <AppStackNav.Screen name="Resources" component={Resources} />
        <AppStackNav.Screen name="MoodTrackerScreen" component={MoodTrackerScreen} />
        <AppStackNav.Screen name="ProfileScreen" component={ProfileScreen} />
        <AppStackNav.Screen name="VoiceModeAI" component={VoiceModeAI} />
        <AppStackNav.Screen name="NotificationScreen" component={NotificationScreen} />

        {/* --- Routes for Specific Breathing Exercise Screens --- */}
        <AppStackNav.Screen name="UjjayiScreen" component={UjjayiScreen} />
        <AppStackNav.Screen name="BhramariScreen" component={BhramariScreen} />
        <AppStackNav.Screen name="NadiShodhanaScreen" component={NadiShodhanaScreen} />
        <AppStackNav.Screen name="SamavrittiScreen" component={SamavrittiScreen} />
        <AppStackNav.Screen name="SuryaBhedanaScreen" component={SuryaBhedanaScreen} />
        <AppStackNav.Screen name="ChandraBhedanaScreen" component={ChandraBhedanaScreen} />

        {/* --- Routes for Mini Course Screens --- */}
        {/* *** ADDED SCREEN DEFINITIONS FOR MINI COURSES *** */}
        <AppStackNav.Screen
             name="med101" // Matches miniCourses id from HomeScreen
             component={IntroToMeditationScreen}
             // Example: Add options if you want a header specifically for this screen
             // options={{ headerShown: true, title: 'Intro to Meditation' }}
         />
         <AppStackNav.Screen
             name="stress1" // Matches miniCourses id
             component={StressReliefScreen}
             // options={{ headerShown: true, title: 'Stress Relief Breaths' }}
         />
         <AppStackNav.Screen
             name="gratitude1" // Matches miniCourses id
             component={GratitudePracticeScreen}
             // options={{ headerShown: true, title: 'Gratitude Practice' }}
         />
         <AppStackNav.Screen
             name="sleep1" // Matches miniCourses id
             component={BetterSleepScreen}
             // options={{ headerShown: true, title: 'Better Sleep Tips' }}
         />
         {/* ------------------------------------- */}

    </AppStackNav.Navigator>
);

// --- Loading Screen Component ---
const LoadingIndicatorScreen = () => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
    </View>
);

// --- Root Navigation (Handles Auth Flow and User Info Check) ---
const RootNavigation = () => {
    const authContext = useContext(AuthContext);
    const [profileStatus, setProfileStatus] = useState('checking'); // 'checking', 'incomplete', 'complete'
    const [internalLoading, setInternalLoading] = useState(true); // Combined loading state

    // Ensure AuthContext is available
    if (!authContext) {
        console.error("AuthContext is not available. Wrap RootNavigation in AuthProvider.");
        return ( <View style={styles.loadingContainer}><Text style={{ color: colors.error }}>Error: AuthProvider missing!</Text></View> );
    }

    const { user, loading: authLoading } = authContext;

    // Effect 1: React to Authentication Changes
    useEffect(() => {
        console.log(`[Auth Effect] Auth state changed: authLoading=${authLoading}, user=${!!user}`);
        if (authLoading) {
            // If auth is loading, we are definitely in a loading state overall
            setInternalLoading(true);
            setProfileStatus('checking'); // Reset profile status while auth loads
        } else {
            // If auth is done loading, internalLoading depends on subsequent profile check (if user exists)
            // If no user, we are done loading. If user exists, keep loading until profile is checked.
            setInternalLoading(!!user); // True if user exists (needs profile check), false if no user
            if (!user) {
                setProfileStatus('checking'); // Reset profile status if user logged out
            }
        }
    }, [user, authLoading]);

    // Effect 2: Check User Profile in Firestore once authenticated
    useEffect(() => {
        // Only run if auth is finished, we have a user, and we haven't determined profile status yet
        if (!authLoading && user && profileStatus === 'checking') {
            console.log("[Profile Effect] Checking user profile in Firestore...");
            setInternalLoading(true); // Ensure loading indicator is shown during check
            const checkUserProfile = async () => {
                try {
                    const userDoc = await firestore().collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const data = userDoc.data();
                        // Check for essential profile fields (adjust as needed)
                        if (data && data.fullName && data.fullName.trim() !== '' && data.gender) {
                            console.log("[Profile Effect] Firestore Check Result: Profile Complete.");
                            setProfileStatus('complete');
                        } else {
                            console.log("[Profile Effect] Firestore Check Result: Profile Incomplete.");
                            setProfileStatus('incomplete');
                        }
                    } else {
                        console.log("[Profile Effect] Firestore Check Result: User document doesn't exist.");
                        setProfileStatus('incomplete'); // Treat non-existent doc as incomplete profile
                    }
                } catch (error) {
                    console.error("[Profile Effect] Firestore Check Error:", error);
                    // Decide how to handle DB errors, maybe retry or show error?
                    // For now, treat as incomplete to prompt user.
                    setProfileStatus('incomplete');
                } finally {
                    console.log("[Profile Effect] Profile check finished.");
                    setInternalLoading(false); // Profile check is done, stop loading indicator
                }
            };
            checkUserProfile();
        } else if (!authLoading && user && profileStatus !== 'checking' && internalLoading) {
             // Edge case: If profileStatus was determined but internalLoading is still true, set it to false.
             console.log(`[Profile Effect] Ensuring internalLoading is false as profileStatus is ${profileStatus}.`);
             setInternalLoading(false);
        }
    }, [user, authLoading, profileStatus, internalLoading]); // Rerun if user, authLoading, or profileStatus changes


    // --- Render Logic ---
    if (internalLoading) {
        // Show loading screen if either auth state is loading OR profile is being checked
        console.log("Rendering: Loading Screen (internalLoading=true)");
        return <LoadingIndicatorScreen />;
    }

    console.log(`Rendering Navigation: user=${!!user}, profileStatus=${profileStatus}`);

    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                // Not Logged In: Show Auth Screens
                <RootStack.Screen name="Auth" component={AuthScreens} />
            ) : profileStatus === 'incomplete' ? (
                // Logged In, Profile Incomplete: Show User Info Screen
                 <RootStack.Screen
                     name="UserInfo"
                     // Pass the callback to force a re-check after completion
                     children={(props) => (
                         <UserInfoScreen
                             {...props}
                             onProfileComplete={() => {
                                 console.log("onProfileComplete called in RootNavigation. Triggering profile re-check.");
                                 setProfileStatus('checking'); // Set back to checking
                                 setInternalLoading(true);     // Show loading while re-checking
                             }}
                         />
                     )}
                 />
            ) : profileStatus === 'complete' ? (
                // Logged In, Profile Complete: Show Main App Stack
                <RootStack.Screen name="App" component={AppStack} />
            ) : (
                 // Fallback / Error State - Should ideally not be reached if logic is correct
                 <RootStack.Screen name="FallbackLoading" component={LoadingIndicatorScreen} />
            )}
        </RootStack.Navigator>
    );
};


// --- Styles ---
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundTop, // Use a theme color
    },
    bottomNavContainer: {
        // Wraps the bottom nav, useful for absolute positioning if needed, but defaults work fine
    },
    bottomNav: {
        backgroundColor: colors.navBackground,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 8,
        // Adjust paddingBottom for notch/home indicator space on iOS
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        // Shadow/Elevation for depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 8,
        // Subtle top border
        borderTopWidth: Platform.OS === 'android' ? 0 : 1, // Border only for iOS if using shadow on Android
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
        color: colors.textSecondary, // Default color
    },
    centralNavButtonWrapper: {
        flex: 1, // Take up its designated space
        alignItems: 'center', // Center the button horizontally
    },
    centralNavButton: {
        width: 60,
        height: 60,
        borderRadius: 30, // Make it circular
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -35, // Adjust to lift the button partially above the nav bar
        elevation: 4, // Android shadow
        // iOS shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});

export default RootNavigation;