import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    Platform,
    StatusBar, // To potentially adjust status bar style
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Handles notches/status bars
import Icon from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native'; // For placeholder animation
import { useNavigation } from '@react-navigation/native'; // If navigation is needed

// --- Placeholder Colors (Adjust to match your new.gif and theme) ---
const colors = {
    backgroundOverlay: 'rgba(25, 50, 100, 0.1)', // Slight overlay tint if needed over GIF
    textPrimary: '#FFFFFF', // White text usually works well on dark/dynamic backgrounds
    textSecondary: '#E0E0E0', // Lighter white/grey
    micButtonBackground: '#FFFFFF',
    micButtonIcon: '#3B82F6', // Example: Blue icon
    micButtonRipple: 'rgba(59, 130, 246, 0.2)', // Ripple effect color
    iconColor: '#FFFFFF',
};
// -------------------------------------------------------------------

const VoiceModeAIScreen = () => {
    const navigation = useNavigation(); // Hook for navigation actions
    const [isListening, setIsListening] = useState(false);
    const [statusText, setStatusText] = useState('Tap the mic to start');

    const handleMicPress = () => {
        setIsListening(prev => !prev);
        setStatusText(prev => prev === 'Listening...' ? 'Tap the mic to start' : 'Listening...');
        // In a real app: Start/Stop voice recognition here
    };

    return (
        <View style={styles.container}>
             {/* Set status bar style appropriate for the background */}
            <StatusBar barStyle="light-content" />

            <ImageBackground
                // *** Adjust the path to your new.gif file ***
                source={require('../assets/new.gif')} // Example path
                resizeMode="cover" // Cover ensures the GIF fills the screen
                style={styles.backgroundImage}
            >
                {/* Optional overlay for better text readability */}
                <View style={styles.overlay}>

                    {/* Use SafeAreaView to avoid overlapping with status bar/notches */}
                    <SafeAreaView style={styles.safeArea}>

                        {/* Header with Back Button */}
                        <View style={styles.header}>
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={() => navigation.goBack()} // Go back action
                            >
                                <Icon name="arrow-back-outline" size={30} color={colors.iconColor} />
                            </TouchableOpacity>
                        </View>

                        {/* Main Content Area */}
                        <View style={styles.contentArea}>
                            {/* Placeholder for Central Visualizer/Animation */}
                            <LottieView
                                // Replace with a calming animation URL or local file
                                source={{ uri: 'https://assets3.lottiefiles.com/packages/lf20_1vbfj9zz.json' }} // Example: Sound wave/orb
                                style={styles.lottieVisualizer}
                                autoPlay
                                loop
                            />

                            {/* Status Text */}
                            <Text style={styles.statusText}>{statusText}</Text>
                        </View>

                        {/* Footer with Mic Button */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.micButton}
                                onPress={handleMicPress}
                                activeOpacity={0.7}
                            >
                                <Icon
                                   name={isListening ? "mic-off-outline" : "mic-outline"} // Toggle icon
                                   size={38}
                                   color={colors.micButtonIcon} />
                            </TouchableOpacity>
                        </View>

                    </SafeAreaView>
                </View>
            </ImageBackground>
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundImage: {
        flex: 1, // Ensure it fills the container
        width: '100%',
        height: '100%',
    },
    overlay: {
        flex: 1,
        backgroundColor: colors.backgroundOverlay, // Adjust opacity as needed
    },
    safeArea: {
        flex: 1,
        justifyContent: 'space-between', // Pushes header up, footer down
    },
    header: {
        paddingHorizontal: 15,
        paddingTop: Platform.OS === 'android' ? 15 : 0, // Adjust padding for Android status bar
        width: '100%', // Ensure header takes full width for positioning
    },
    backButton: {
        padding: 10, // Increase tap area
        alignSelf: 'flex-start', // Position to the left
    },
    contentArea: {
        flex: 1, // Takes up remaining space between header/footer
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
        paddingHorizontal: 20,
        marginBottom: 100, // Add some space above the mic button area
    },
    lottieVisualizer: {
        width: 250, // Adjust size as needed
        height: 250, // Adjust size as needed
        marginBottom: 30, // Space between animation and text
    },
    statusText: {
        fontSize: 18,
        fontWeight: '500',
        color: colors.textPrimary,
        textAlign: 'center',
        marginTop: 10, // Space below the visualizer/figure
    },
    footer: {
        // Position the footer absolutely or use flexbox in SafeAreaView
        width: '100%',
        alignItems: 'center', // Center the mic button horizontally
        paddingBottom: Platform.OS === 'ios' ? 40 : 30, // Padding at the very bottom
    },
    micButton: {
        width: 80,
        height: 80,
        borderRadius: 40, // Make it perfectly circular
        backgroundColor: colors.micButtonBackground,
        justifyContent: 'center',
        alignItems: 'center',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        // Elevation for Android
        elevation: 0,
    },
    // micIcon style is applied directly via props in the Icon component
});

export default VoiceModeAIScreen;