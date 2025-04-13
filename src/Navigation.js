// RootNavigation.js
import React, { useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    TouchableOpacity
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createStackNavigator } from '@react-navigation/stack';
// Remove useNavigation and useNavigationState from here if ONLY used in CustomBottomNav
// import { useNavigation, useNavigationState } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

// --- Auth Context ---
import { AuthContext } from './screens/AuthProvider';

// --- Screens ---
// (Keep all your screen imports here)
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


// --- Colors ---
// (Keep your colors object here)
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
};


// --- Navigation Setup ---
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createStackNavigator();

// --- Custom Bottom Navigation (Updated Version from above) ---
const CustomBottomNav = ({ state, descriptors, navigation }) => { // Accept props

    // Helper function to find the deepest active route name
    const getCurrentRouteName = (navState) => {
        if (!navState) return null;
        const route = navState.routes[navState.index];
        // Dive into nested navigators if needed (though MainTabs seems flat here)
        if (route.state) {
            return getCurrentRouteName(route.state);
        }
        return route.name;
    };

    // Get the current route name from the passed-in state prop
    const currentRouteName = getCurrentRouteName(state);

    const tabs = [
        { name: 'DiscoverTab', label: 'Discover', icon: 'compass', targetScreen: 'HomeScreen' },
        { name: 'ChatTab', label: 'Chat', icon: 'chatbubbles', targetScreen: 'ChatWelcomeScreen' },
        { name: 'VoiceTab', label: 'Voice', icon: 'mic', targetScreen: 'VoiceModeAI', isCentral: true },
        { name: 'JournalTab', label: 'Journal', icon: 'book', targetScreen: 'JournalAI' },
        { name: 'SoundTab', label: 'Sound', icon: 'musical-notes', targetScreen: 'SoundTherapy' },
    ];

    // Determine if a tab's target screen is the current active screen
    const isActive = (screenName) => currentRouteName === screenName;

    return (
        <View style={styles.bottomNavContainer}>
            <View style={styles.bottomNav}>
                {tabs.map((tab) => {
                    // Check if the current tab's target screen is active
                    const active = isActive(tab.targetScreen);
                    const iconColor = active ? colors.primary : colors.inactive;
                    const labelColor = active ? colors.primary : colors.textSecondary;

                    // --- Get accessibility props if needed (optional but good practice) ---
                    // const { options } = descriptors[tab.targetScreen]; // Might need adjustments if targetScreen isn't a direct key in descriptors
                    // const accessibilityLabel = options.tabBarAccessibilityLabel !== undefined
                    //     ? options.tabBarAccessibilityLabel
                    //     : `${tab.label}, tab`;
                    // const accessibilityRole = 'button'; // Standard role for tab buttons

                    if (tab.isCentral) {
                        return (
                            <TouchableOpacity
                                key={tab.name}
                                style={styles.centralNavButtonWrapper}
                                // Use the navigation prop passed to the component
                                onPress={() => navigation.navigate(tab.targetScreen)}
                                activeOpacity={0.8}
                                // accessibilityRole={accessibilityRole}
                                // accessibilityLabel={`Maps to ${tab.label}`} // Specific label for central button
                            >
                                <LinearGradient
                                    colors={[colors.primary, colors.primaryDark]}
                                    style={styles.centralNavButton}
                                >
                                    <Ionicons name={`${tab.icon}-outline`} size={28} color={colors.white} />
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    }

                    return (
                        <TouchableOpacity
                            key={tab.name}
                            style={styles.navButtonContainer}
                            // Use the navigation prop passed to the component
                            onPress={() => navigation.navigate(tab.targetScreen)}
                            activeOpacity={0.7}
                            // accessibilityRole={accessibilityRole}
                            // accessibilityState={active ? { selected: true } : {}}
                            // accessibilityLabel={accessibilityLabel}
                        >
                            <Ionicons
                                name={`${tab.icon}${active ? '' : '-outline'}`}
                                size={26}
                                color={iconColor}
                            />
                            <Text style={[styles.navLabel, { color: labelColor }]}>{tab.label}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

// --- Main Tabs ---
// (Keep MainTabs component as it was)
const MainTabs = () => (
    <Tab.Navigator
        // Use the custom component for the tab bar UI
        tabBar={(props) => <CustomBottomNav {...props} />}
        screenOptions={{ headerShown: false }} // Hide default header for tab screens
    >
        {/* Define screens available within the tab navigator */}
        <Tab.Screen name="HomeScreen" component={HomeScreen} />
        <Tab.Screen name="ChatWelcomeScreen" component={ChatWelcomeScreen} />
        {/* VoiceModeAI is handled by the central button, hide default tab bar button */}
        <Tab.Screen name="VoiceModeAI" component={VoiceModeAI} options={{ tabBarButton: () => null }} />
        <Tab.Screen name="JournalAI" component={JournalAI} />
        <Tab.Screen name="SoundTherapy" component={SoundTherapy} />
    </Tab.Navigator>
);

// --- App Stack ---
// (Keep AppStack component as it was)
const AppStack = () => (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
        {/* MainTabs is the entry point containing the bottom navigation */}
        <Stack.Screen name="MainTabs" component={MainTabs} />
        {/* Other screens navigable from within the app */}
        <Stack.Screen name="Doctors" component={Doctors} />
        <Stack.Screen name="ConnectDoctor" component={ConnectDoctor} />
        <Stack.Screen name="ChatScreen" component={ChatScreen} />
        <Stack.Screen name="MindfulBreath" component={MindfulBreath} />
        <Stack.Screen name="Resources" component={Resources} />
        <Stack.Screen name="MoodTrackerScreen" component={MoodTrackerScreen} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
    </Stack.Navigator>
);


// --- Root Navigation ---
// (Keep RootNavigation component as it was)
const RootNavigation = () => {
    const authContext = useContext(AuthContext);

    // Defensive check for AuthContext
    if (!authContext) {
        console.error("AuthContext is not available. Make sure RootNavigation is wrapped in AuthProvider.");
        return (
            <View style={styles.loadingContainer}>
                <Text style={{ color: 'red' }}>Error: AuthProvider missing!</Text>
            </View>
        );
    }

    const { user, loading } = authContext;

    // Show loading indicator while checking auth state
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    // Conditionally render Auth or App stack based on user login status
    return (
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
            {user ? (
                // User is logged in, show the main app stack
                <RootStack.Screen name="App" component={AppStack} />
            ) : (
                // User is not logged in, show the authentication screens
                <RootStack.Screen name="Auth" component={AuthScreens} />
            )}
        </RootStack.Navigator>
    );
};


// --- Styles ---
// (Keep styles object as it was)
const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.backgroundTop, // Use a background color
    },
    bottomNavContainer: {
        // Removed absolute positioning to let it flow naturally with Tab.Navigator
        // position: 'absolute',
        // bottom: 0,
        // left: 0,
        // right: 0,
    },
    bottomNav: {
        backgroundColor: colors.navBackground,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 8,
        paddingBottom: 10, // Adjust as needed for safe areas potentially
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 8, // For Android shadow
        borderTopWidth: 1, // Use a subtle border instead of/with shadow
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
      // --- Remove or comment out these lines ---
      // shadowColor: '#000',
      // shadowOffset: { width: 0, height: 2 },
      // shadowOpacity: 0.2,
      // shadowRadius: 4,
      // elevation: 5,
      // --- End of lines to remove/comment ---
  },
});


export default RootNavigation;