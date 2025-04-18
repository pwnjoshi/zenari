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
// *** IMPORTANT: Verify this path is correct for your project structure ***
import { AuthContext } from './screens/AuthProvider';

// --- Screens ---
// *** IMPORTANT: Verify these paths are correct for your project structure ***
import AuthScreens from './screens/AuthScreens';
import HomeScreen from './screens/HomeScreen';
import ChatWelcomeScreen from './screens/ChatWelcomeScreen';
import MoodTrackerScreen from './screens/MoodTrackerScreen';
import ProfileScreen from './screens/ProfileScreen';
import ConnectDoctor from './screens/ConnectDoctor';
import ChatScreen from './screens/ChatScreen';
import Doctors from './screens/Doctors';
import MindfulBreath from './screens/MindfulBreath';
import Resources from './screens/Resources';
import SoundTherapy from './screens/SoundTherapy';
import VoiceModeAI from './screens/VoiceModeAI';
import JournalAI from './screens/JournalAI';
import UserInfoScreen from './screens/UserInfoScreen';
import NotificationScreen from './screens/NotificationScreen';
import MindfulBreathWelcome from './screens/MindfulBreathWelcome';

// --- Colors ---
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
    // Pastel colors (if used for UserInfoScreen theme)
    backgroundPastelTop: '#E0F7FA',
    backgroundPastelBottom: '#FFF9C4',
    primaryPastel: '#FFCCBC',
    primaryDarkPastel: '#FFA68A',
    textPrimaryPastel: '#5D4037',
    textSecondaryPastel: '#A1887F',
    error: '#D32F2F', // Added from UserInfoScreen styles
    inputBackground: '#FFFFFF', // Added from UserInfoScreen styles
    inputBorder: '#E0E0E0', // Added from UserInfoScreen styles
    radioSelected: '#FFAB91', // Added from UserInfoScreen styles
    radioUnselectedBorder: '#BDBDBD', // Added from UserInfoScreen styles
};


// --- Navigation Setup ---
const Tab = createBottomTabNavigator();
const AppStackNav = createNativeStackNavigator(); // Using Native Stack for App screens
const RootStack = createStackNavigator(); // Using Stack for root (allows customization if needed later)

// --- Custom Bottom Navigation ---
const CustomBottomNav = ({ state, descriptors, navigation }) => {
    const getCurrentRouteName = (navState) => {
        if (!navState) return null;
        const route = navState.routes[navState.index];
        if (route.state) { return getCurrentRouteName(route.state); }
        return route.name;
    };
    const currentRouteName = getCurrentRouteName(state);
    const tabs = [
        { name: 'DiscoverTab', label: 'Discover', icon: 'compass', targetScreen: 'HomeScreen' },
        { name: 'ChatTab', label: 'Chat', icon: 'chatbubbles', targetScreen: 'ChatWelcomeScreen' },
        { name: 'VoiceTab', label: 'Voice', icon: 'mic', targetScreen: 'VoiceModeAI', isCentral: true },
        { name: 'JournalTab', label: 'Journal', icon: 'book', targetScreen: 'JournalAI' },
        { name: 'SoundTab', label: 'Sound', icon: 'musical-notes', targetScreen: 'SoundTherapy' },
    ];
    const isActive = (screenName) => currentRouteName === screenName;

    return (
        <View style={styles.bottomNavContainer}>
            <View style={styles.bottomNav}>
                {tabs.map((tab) => {
                    const active = isActive(tab.targetScreen);
                    const iconColor = active ? colors.primary : colors.inactive;
                    const labelColor = active ? colors.primary : colors.textSecondary;
                    if (tab.isCentral) {
                        return (
                            <TouchableOpacity key={tab.name} style={styles.centralNavButtonWrapper} onPress={() => navigation.navigate(tab.targetScreen)} activeOpacity={0.8} >
                                <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.centralNavButton} >
                                    <Ionicons name={`${tab.icon}-outline`} size={28} color={colors.white} />
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    }
                    return (
                        <TouchableOpacity key={tab.name} style={styles.navButtonContainer} onPress={() => navigation.navigate(tab.targetScreen)} activeOpacity={0.7} >
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
        {/* Screens directly under the Tab Navigator */}
        <Tab.Screen name="HomeScreen" component={HomeScreen} />
        <Tab.Screen name="ChatWelcomeScreen" component={ChatWelcomeScreen} />
        {/* The VoiceModeAI screen is navigated to via the central button, not listed here */}
        <Tab.Screen name="JournalAI" component={JournalAI} />
        <Tab.Screen name="SoundTherapy" component={SoundTherapy} />
    </Tab.Navigator>
);

// --- App Stack (Holds Main Tabs and other screens accessible after login) ---
const AppStack = () => (
    <AppStackNav.Navigator screenOptions={{ headerShown: false }}>
        <AppStackNav.Screen name="MainTabs" component={MainTabs} />
        <AppStackNav.Screen name="Doctors" component={Doctors} />
        <AppStackNav.Screen name="ConnectDoctor" component={ConnectDoctor} />
        <AppStackNav.Screen name="ChatScreen" component={ChatScreen} />
        <AppStackNav.Screen name="MindfulBreathWelcome" component={MindfulBreathWelcome} />
        <AppStackNav.Screen name="Resources" component={Resources} />
        <AppStackNav.Screen name="MoodTrackerScreen" component={MoodTrackerScreen} />
        <AppStackNav.Screen name="ProfileScreen" component={ProfileScreen} />
        {/* VoiceModeAI is part of the App Stack, accessible via central tab button */}
        <AppStackNav.Screen name="VoiceModeAI" component={VoiceModeAI} />
        <AppStackNav.Screen name="NotificationScreen" component={NotificationScreen} />
    </AppStackNav.Navigator>
);

// --- Loading Screen Component ---
const LoadingIndicatorScreen = () => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
    </View>
);
// --------------------------------

// --- Root Navigation (Handles Auth Flow and User Info Check) ---
const RootNavigation = () => {
    const authContext = useContext(AuthContext);
    // State: 'checking', 'incomplete', 'complete'
    const [profileStatus, setProfileStatus] = useState('checking');
    // Combined loading state for auth check AND profile check
    const [internalLoading, setInternalLoading] = useState(true);

    // Defensive check for AuthContext provider
    if (!authContext) {
        console.error("AuthContext is not available. Wrap RootNavigation in AuthProvider.");
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: 'red' }}>Error: AuthProvider missing!</Text>
            </View>
        );
    }

    const { user, loading: authLoading } = authContext;

    // --- Effect 1: Handles Auth State Changes and sets up for profile check ---
    useEffect(() => {
        console.log(`Auth Effect Triggered: authLoading=${authLoading}, user=${!!user}`);
        if (authLoading) {
            setInternalLoading(true);
            setProfileStatus('checking');
        } else if (!user) {
            // User logged out or initial state is logged out
            setInternalLoading(false); // Stop loading, show Auth screens
            setProfileStatus('checking'); // Reset profile status irrelevant if not logged in
        } else {
            // User is logged in, start profile check process
            setInternalLoading(true); // Start/continue loading until profile checked
            setProfileStatus('checking'); // Set status to trigger profile check effect
        }
    }, [user, authLoading]); // Runs when auth state changes


    // --- Effect 2: Performs the Profile Check when status is 'checking' ---
    useEffect(() => {
        // Only run check if auth is loaded, user exists, and profile needs checking
        if (!authLoading && user && profileStatus === 'checking') {
            console.log("Profile Check Effect Triggered: Checking Firestore...");
            setInternalLoading(true); // Ensure loading indicator shows during check

            const checkUserProfile = async () => {
                try {
                    const userId = user.uid;
                    const userDoc = await firestore()
                        .collection('users')
                        .doc(userId)
                        .get();

                    if (userDoc.exists) {
                        const data = userDoc.data();
                        // *** Adjust field names 'fullName' and 'gender' if necessary ***
                        // Check if essential profile fields exist and are not empty
                        if (data && data.fullName && data.fullName.trim() !== '' && data.gender) {
                            console.log("Firestore Check Result: Profile Complete.");
                            setProfileStatus('complete');
                        } else {
                            console.log("Firestore Check Result: Profile Incomplete.", data);
                            setProfileStatus('incomplete');
                        }
                    } else {
                        console.log("Firestore Check Result: User document doesn't exist.");
                        setProfileStatus('incomplete'); // Needs profile info if doc doesn't exist
                    }
                } catch (error) {
                    console.error("Firestore Check Error:", error);
                    setProfileStatus('incomplete'); // Assume incomplete on error to be safe
                } finally {
                    console.log("Profile check finished, setting internalLoading=false");
                    setInternalLoading(false); // Check finished, stop loading indicator
                }
            };
            checkUserProfile();
        } else if (!authLoading && user && profileStatus !== 'checking') {
            // If status is already determined ('complete' or 'incomplete'), ensure loading is false.
             if (internalLoading) {
                 console.log(`Profile Check Effect: Status is ${profileStatus}, ensuring loading is false.`);
                 setInternalLoading(false);
             }
        }
        // This effect depends on profileStatus to run when the callback triggers a re-check
    }, [user, authLoading, profileStatus, internalLoading]); // Added internalLoading dependency


    // --- Render Logic ---

    // Show loading indicator until internalLoading is false
    if (internalLoading) {
       console.log("Rendering: Loading Screen (internalLoading=true)");
       return <LoadingIndicatorScreen />;
    }

    console.log(`Rendering: user=${!!user}, profileStatus=${profileStatus}`);

    // Render the appropriate stack based on auth and profile status
    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                // --- User Not Logged In ---
                <RootStack.Screen name="Auth" component={AuthScreens} />
            ) : profileStatus === 'incomplete' ? (
                // --- User Logged In, Profile Incomplete ---
                // *** FIX APPLIED HERE ***
                <RootStack.Screen
                    name="UserInfo"
                    // Pass the render function directly to the 'component' prop
                    component={(props) => (
                        <UserInfoScreen
                            {...props} // Pass navigation and route props down
                            // Define the callback function to be called from UserInfoScreen
                            onProfileComplete={() => {
                                console.log("onProfileComplete triggered in RootNavigation. Re-checking profile...");
                                setProfileStatus('checking'); // Set status back to checking
                                setInternalLoading(true);      // Show loading indicator during re-check
                            }}
                        />
                    )}
                />
            ) : profileStatus === 'complete' ? (
                // --- User Logged In, Profile Complete ---
                <RootStack.Screen name="App" component={AppStack} />
            ) : (
                 // --- Fallback/Checking State --- (Should ideally be covered by internalLoading)
                 // This case should technically not be reached if internalLoading handles the checking state.
                 // Kept as a safety fallback.
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
        backgroundColor: colors.backgroundTop, // Use a background color
    },
    bottomNavContainer: {
        // No absolute positioning needed when used with tabBar prop
    },
    bottomNav: {
        backgroundColor: colors.navBackground,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 8,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10, // Adjust padding for safe area notch
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 8, // For Android shadow
        borderTopWidth: 1,
        borderTopColor: colors.lightBorder,
    },
    navButtonContainer: {
        alignItems: 'center',
        flex: 1, // Ensure buttons distribute space evenly
        paddingVertical: 4, // Add some vertical padding
    },
    navLabel: {
        fontSize: 11,
        marginTop: 2,
        // Consider adding fontFamily if using custom fonts
    },
    centralNavButtonWrapper: {
        flex: 1, // Takes up its share of space
        alignItems: 'center', // Center the button horizontally
        // No marginTop needed here, positioning handled by the button itself
    },
    centralNavButton: {
        width: 60,
        height: 60,
        borderRadius: 30, // Perfect circle
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -35, // Pulls the button up
        elevation: 4, // Give central button slight elevation
        shadowColor: '#000', // Optional shadow for central button
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});


export default RootNavigation;