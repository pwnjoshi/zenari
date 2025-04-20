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
import { AuthContext } from './screens/AuthProvider';

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
// *** Updated to import individual screen files ***
// *** ASSUMING DEFAULT EXPORTS - Use { UjjayiScreen } if using named exports ***
import UjjayiScreen from './screens/MindfulBreathScreens/UjjayiScreen';
import BhramariScreen from './screens/MindfulBreathScreens/BhramariScreen';
import NadiShodhanaScreen from './screens/MindfulBreathScreens/NadiShodhanaScreen';
import SamavrittiScreen from './screens/MindfulBreathScreens/SamavrittiScreen';
import SuryaBhedanaScreen from './screens/MindfulBreathScreens/SuryaBhedanaScreen';
import ChandraBhedanaScreen from './screens/MindfulBreathScreens/ChandraBhedanaScreen';
// Remove or comment out the placeholder import if it's no longer needed:
// import { ... } from './screens/MindfulBreathScreens/ExercisePlaceholders';

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
// [ CustomBottomNav component code remains the same as before ]
const CustomBottomNav = ({ state, descriptors, navigation }) => {
    const getCurrentRouteName = (navState) => {
        if (!navState) return null;
        const route = navState.routes[navState.index];
        if (route.state) { return getCurrentRouteName(route.state); }
        return route.name;
    };
    const parentState = navigation.getParent()?.getState();
    const currentRouteName = parentState ? getCurrentRouteName(parentState) : getCurrentRouteName(state);

    const tabs = [
        { name: 'DiscoverTab', label: 'Discover', icon: 'compass', targetScreen: 'HomeScreen' },
        { name: 'ChatTab', label: 'Chat', icon: 'chatbubbles', targetScreen: 'ChatWelcomeScreen' },
        { name: 'VoiceTab', label: 'Voice', icon: 'mic', targetScreen: 'VoiceModeAI', isCentral: true },
        { name: 'JournalTab', label: 'Journal', icon: 'book', targetScreen: 'JournalAI' },
        { name: 'SoundTab', label: 'Sound', icon: 'musical-notes', targetScreen: 'SoundTherapy' },
    ];

    const isActive = (tabTargetScreen) => currentRouteName === tabTargetScreen;

    return (
        <View style={styles.bottomNavContainer}>
            <View style={styles.bottomNav}>
                {tabs.map((tab) => {
                    const active = isActive(tab.targetScreen);
                    const iconColor = active ? colors.primary : colors.inactive;
                    const labelColor = active ? colors.primary : colors.textSecondary;

                    if (tab.isCentral) {
                        return (
                            <TouchableOpacity key={tab.name} style={styles.centralNavButtonWrapper} onPress={() => navigation.navigate('App', { screen: tab.targetScreen })} activeOpacity={0.8} >
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
// [ MainTabs component code remains the same as before ]
const MainTabs = () => (
    <Tab.Navigator
        tabBar={(props) => <CustomBottomNav {...props} />}
        screenOptions={{ headerShown: false }}
    >
        <Tab.Screen name="HomeScreen" component={HomeScreen} />
        <Tab.Screen name="ChatWelcomeScreen" component={ChatWelcomeScreen} />
        <Tab.Screen name="JournalAI" component={JournalAI} />
        <Tab.Screen name="SoundTherapy" component={SoundTherapy} />
    </Tab.Navigator>
);

// --- App Stack (Holds Main Tabs and other screens accessible after login) ---
// [ AppStack component code remains the same - screen definitions are correct ]
const AppStack = () => (
    <AppStackNav.Navigator screenOptions={{ headerShown: false }}>
        <AppStackNav.Screen name="MainTabs" component={MainTabs} />
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
        {/* These definitions are correct, they now map to your actual imported screens */}
        <AppStackNav.Screen name="UjjayiScreen" component={UjjayiScreen} />
        <AppStackNav.Screen name="BhramariScreen" component={BhramariScreen} />
        <AppStackNav.Screen name="NadiShodhanaScreen" component={NadiShodhanaScreen} />
        <AppStackNav.Screen name="SamavrittiScreen" component={SamavrittiScreen} />
        <AppStackNav.Screen name="SuryaBhedanaScreen" component={SuryaBhedanaScreen} />
        <AppStackNav.Screen name="ChandraBhedanaScreen" component={ChandraBhedanaScreen} />
        {/* ---------------------------------------------------------- */}

    </AppStackNav.Navigator>
);

// --- Loading Screen Component ---
// [ LoadingIndicatorScreen component code remains the same as before ]
const LoadingIndicatorScreen = () => (
    <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
    </View>
);

// --- Root Navigation (Handles Auth Flow and User Info Check) ---
// [ RootNavigation component code remains the same as before ]
const RootNavigation = () => {
    const authContext = useContext(AuthContext);
    const [profileStatus, setProfileStatus] = useState('checking');
    const [internalLoading, setInternalLoading] = useState(true);

    if (!authContext) {
        console.error("AuthContext is not available. Wrap RootNavigation in AuthProvider.");
        return ( <View style={styles.loadingContainer}><Text style={{ color: 'red' }}>Error: AuthProvider missing!</Text></View> );
    }

    const { user, loading: authLoading } = authContext;

    // Effect 1: Auth Changes
    useEffect(() => {
        console.log(`Auth Effect Triggered: authLoading=${authLoading}, user=${!!user}`);
        if (authLoading) {
            setInternalLoading(true);
            setProfileStatus('checking');
        } else if (!user) {
            setInternalLoading(false);
            setProfileStatus('checking');
        } else {
            setInternalLoading(true);
            setProfileStatus('checking');
        }
    }, [user, authLoading]);

    // Effect 2: Profile Check
    useEffect(() => {
        if (!authLoading && user && profileStatus === 'checking') {
            console.log("Profile Check Effect Triggered: Checking Firestore...");
            setInternalLoading(true);
            const checkUserProfile = async () => {
                try {
                    const userDoc = await firestore().collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        const data = userDoc.data();
                        if (data && data.fullName && data.fullName.trim() !== '' && data.gender) {
                            console.log("Firestore Check Result: Profile Complete.");
                            setProfileStatus('complete');
                        } else {
                            console.log("Firestore Check Result: Profile Incomplete.");
                            setProfileStatus('incomplete');
                        }
                    } else {
                        console.log("Firestore Check Result: User document doesn't exist.");
                        setProfileStatus('incomplete');
                    }
                } catch (error) {
                    console.error("Firestore Check Error:", error);
                    setProfileStatus('incomplete');
                } finally {
                    console.log("Profile check finished, setting internalLoading=false");
                    setInternalLoading(false);
                }
            };
            checkUserProfile();
        } else if (!authLoading && user && profileStatus !== 'checking' && internalLoading) {
             console.log(`Profile Check Effect: Status is ${profileStatus}, ensuring loading is false.`);
             setInternalLoading(false);
        }
    }, [user, authLoading, profileStatus, internalLoading]);


    // --- Render Logic ---
    if (internalLoading) {
        console.log("Rendering: Loading Screen (internalLoading=true)");
        return <LoadingIndicatorScreen />;
    }

    console.log(`Rendering: user=${!!user}, profileStatus=${profileStatus}`);

    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {!user ? (
                <RootStack.Screen name="Auth" component={AuthScreens} />
            ) : profileStatus === 'incomplete' ? (
                 <RootStack.Screen
                    name="UserInfo"
                    component={(props) => (
                        <UserInfoScreen
                            {...props}
                            onProfileComplete={() => {
                                console.log("onProfileComplete triggered in RootNavigation. Re-checking profile...");
                                setProfileStatus('checking');
                                setInternalLoading(true);
                            }}
                        />
                    )}
                />
            ) : profileStatus === 'complete' ? (
                <RootStack.Screen name="App" component={AppStack} />
            ) : (
                 <RootStack.Screen name="FallbackLoading" component={LoadingIndicatorScreen} />
            )}
        </RootStack.Navigator>
    );
};


// --- Styles ---
// [ Styles code remains the same as before ]
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundTop,
    },
    bottomNavContainer: {
        // Style as needed if not using default tabBar prop behavior
    },
    bottomNav: {
        backgroundColor: colors.navBackground,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 8,
        paddingBottom: Platform.OS === 'ios' ? 25 : 10,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 8,
        borderTopWidth: 1,
        borderTopColor: colors.lightBorder,
    },
    navButtonContainer: {
        alignItems: 'center',
        flex: 1,
        paddingVertical: 4,
    },
    navLabel: {
        fontSize: 11,
        marginTop: 2,
        color: colors.textSecondary,
    },
    centralNavButtonWrapper: {
        flex: 1,
        alignItems: 'center',
    },
    centralNavButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -35,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});

export default RootNavigation;