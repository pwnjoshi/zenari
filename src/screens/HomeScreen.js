import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Animated,
    Alert, // Import Alert for error messages
    TextInput, // Import TextInput for notes
    Keyboard, // Import Keyboard to dismiss
    Platform // Import Platform for styles
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native'; // Added useFocusEffect
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native'; // Import LottieView

// --- Firebase Imports ---
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth'; // Ensure auth is imported
// ------------------------

const { width } = Dimensions.get('window');

// --- Colors ---
const colors = {
    primary: '#2bedbb',
    primaryDark: '#1AA897', // Darker shade for secondary button text/border
    backgroundTop: '#E6F7FF', // Lighter blue top
    backgroundBottom: '#D1EFFF', // Slightly lighter blue bottom
    cardBackground: '#FFFFFF',
    textDark: '#2D5D5E', // Dark teal for text
    textSecondary: '#7A8D8E', // Greyish text
    featureBlue: '#4A90E2', // Blue feature card
    featureGreen: '#4CAF50', // Green feature card / success
    moodYellow: '#FFFDE7', // Base mood card yellow
    moodButtonBg: '#FFFFFF', // Background for mood buttons
    moodButtonBorder: '#E0E0E0', // Border for mood buttons
    moodYellowSelected: '#FFF59D', // Slightly deeper selected yellow (if needed for selection state)
    moodBorderSelected: '#FBC02D', // Border for selected mood (if needed for selection state)
    navBackground: '#FFFFFF',
    lightBorder: '#E0E0E0', // Light grey for borders
    iconGrey: '#607D8B', // Grey for some icons
    noteInputBg: '#F8F8F8', // Background for note input
    white: '#FFFFFF',
    error: '#D32F2F', // Consistent error color
};

// --- Mood Options with Lottie URLs ---
// IMPORTANT: Replace placeholder URLs with actual Noto Emoji Lottie JSON URLs if needed
const moodOptions = [
    { emoji: '😄', label: 'Very happy', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f604/lottie.json' },
    { emoji: '🤩', label: 'Excited', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/lottie.json' },
    { emoji: '😊', label: 'Calm', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/lottie.json' },
    { emoji: '😟', label: 'Sad', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f61f/lottie.json' },
    { emoji: '😔', label: 'Worried', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f614/lottie.json' }
];
// -------------------------------------

const HomeScreen = () => {
    // Existing State
    const [selectedMood, setSelectedMood] = useState(null);
    const [confirmationVisible, setConfirmationVisible] = useState(false);
    const [suggestionText, setSuggestionText] = useState('');
    const [moodAnimation] = useState(new Animated.Value(0));
    const [dynamicButtonText, setDynamicButtonText] = useState('');
    const [showMoodOptions, setShowMoodOptions] = useState(true);

    // --- Note Feature State ---
    const [showAddNoteView, setShowAddNoteView] = useState(false);
    const [note, setNote] = useState('');
    const [pendingMood, setPendingMood] = useState(null);

    // --- User Name State ---
    const [userName, setUserName] = useState(''); // Start empty or with a placeholder text maybe?
    const [isLoadingName, setIsLoadingName] = useState(true); // Start loading

    const navigation = useNavigation();

    // --- Function to Fetch User Name ---
    const fetchUserName = async () => {
        console.log("Attempting to fetch user name...");
        setIsLoadingName(true); // Indicate loading start
        const currentUser = auth().currentUser;

        if (currentUser) {
            try {
                const userId = currentUser.uid;
                console.log(`Workspaceing name for user ID: ${userId}`);
                const userDocument = await firestore()
                    .collection('users')
                    .doc(userId)
                    .get();

                if (userDocument.exists) {
                    const userData = userDocument.data();
                    // *** --- LOOK FOR 'fullName' FIELD NOW --- ***
                    const name = userData?.fullName;
                    // *** ------------------------------------ ***

                    if (name && name.trim() !== '') {
                        console.log(`Workspaceed name: ${name}`);
                        // Extract only the first name if desired
                        const firstName = name.split(' ')[0];
                        setUserName(firstName); // Displaying only the first name
                        // OR: setUserName(name); // To display full name
                    } else {
                        console.log("User document exists but 'fullName' field is missing or empty.");
                        setUserName('Friend'); // Fallback if name field is missing/empty
                    }
                } else {
                    console.log("User document not found in Firestore.");
                    setUserName('Friend'); // Fallback if document doesn't exist
                }
            } catch (error) {
                console.error("Error fetching user name from Firestore: ", error);
                setUserName('Friend'); // Fallback on error
            }
        } else {
            console.log("No user currently logged in, cannot fetch name.");
            setUserName('Friend'); // Fallback if no user
        }
        setIsLoadingName(false); // Finish loading attempt
    };
    // --------------------------------

    // --- useEffect for initial load ---
    useEffect(() => {
        // This runs once when the component mounts initially
        fetchUserName();

        const loadInitialMood = async () => {
            try {
                const storedMood = await AsyncStorage.getItem('selectedMood');
                // Potentially set selectedMood based on stored value if desired
            } catch (error) {
                console.error("Error loading initial mood from AsyncStorage: ", error);
            }
        };
        loadInitialMood();

    }, []); // Empty dependency array ensures this runs only once on mount


    // --- useFocusEffect to refetch name when screen comes into focus ---
    // This helps if the user navigates away (e.g., to profile to change name)
    // and comes back. It might not be necessary if name changes are rare.
    useFocusEffect(
        React.useCallback(() => {
          console.log("HomeScreen focused, re-fetching user name.");
          fetchUserName();
          // Optional: Reset mood selection UI when screen focuses?
          // handleReload(); // Uncomment if you want to reset mood selection on focus
          return () => {
            // Optional cleanup if needed when screen loses focus
            console.log("HomeScreen blurred");
          };
        }, [])
     );
     // --------------------------------------------------------------------

    // --- Mood Selection Handler ---
    const handleMoodSelect = (mood) => {
        console.log(`handleMoodSelect: Mood selected - ${mood}`);
        setPendingMood(mood);
        setShowMoodOptions(false);
        setConfirmationVisible(false);
        setNote('');
        setShowAddNoteView(true);
    };
    // -----------------------------

    // --- Save Mood and Note Handler ---
    const handleSaveMoodAndNote = async () => {
        Keyboard.dismiss();
        if (!pendingMood) return;

        const currentUser = auth().currentUser;
        if (!currentUser) {
            Alert.alert("Error", "You must be logged in to save your mood.");
            // Reset UI
            setShowAddNoteView(false);
            setShowMoodOptions(true);
            setPendingMood(null);
            return;
        }

        console.log(`handleSaveMoodAndNote: Saving mood "${pendingMood}" with note "${note}"`);
        try {
            const userId = currentUser.uid;
            const moodData = {
                mood: pendingMood,
                note: note.trim(),
                timestamp: firestore.FieldValue.serverTimestamp(),
            };

            console.log("handleSaveMoodAndNote: Attempting to save to Firestore...");
            await firestore()
                .collection('users')
                .doc(userId)
                .collection('moodHistory')
                .add(moodData);
            console.log('handleSaveMoodAndNote: Mood and note saved successfully!');

            // Optionally save last selected mood to AsyncStorage
            // try {
            //     await AsyncStorage.setItem('selectedMood', pendingMood);
            // } catch (asyncError) {
            //     console.error("Error saving mood to AsyncStorage: ", asyncError);
            // }

        } catch (error) {
            console.error("Error saving mood/note to Firestore: ", error);
            Alert.alert("Error", "Could not save mood history. Please try again.");
            // Don't proceed with UI changes if save fails
            return;
        }

        // --- UI Updates After Successful Save ---
        setSelectedMood(pendingMood);
        setShowAddNoteView(false); // Hide note view

        // Set suggestions based on mood
        switch (pendingMood) {
            case 'Sad':
            case 'Worried':
                setSuggestionText("Consider chatting with AI for support or try a mindful breath exercise.");
                setDynamicButtonText("Chat with AI"); // Adjust text/target as needed
                break;
            case 'Very happy':
            case 'Excited':
            case 'Calm':
                setSuggestionText("Great! Reflect on this feeling or try a mindful breath session.");
                setDynamicButtonText("Mindful Breath"); // Adjust text/target
                break;
            default:
                setSuggestionText("");
                setDynamicButtonText("");
        }

        // Trigger animation (optional)
        Animated.spring(moodAnimation, { toValue: 1, friction: 4, useNativeDriver: true }).start(() => {
            Animated.spring(moodAnimation, { toValue: 0, friction: 4, useNativeDriver: true }).start();
        });

        setConfirmationVisible(true); // Show confirmation card
        setPendingMood(null); // Clear pending mood
        // Keep showMoodOptions false until user reloads
    };
    // -----------------------------------------

    // --- Other Handlers ---
    const handleDynamicButtonClick = () => {
        if (dynamicButtonText === "Chat with AI") {
            navigation.navigate('ChatScreen'); // Ensure 'ChatScreen' exists in navigator
        } else if (dynamicButtonText === "Mindful Breath") {
            navigation.navigate('MindfulBreath'); // Ensure 'MindfulBreath' exists
        }
    };

    // Reset the mood selection UI
    const handleReload = () => {
        console.log("handleReload: Resetting mood view");
        setConfirmationVisible(false);
        setShowAddNoteView(false);
        setShowMoodOptions(true);
        setSelectedMood(null);
        setPendingMood(null);
        setNote('');
        setSuggestionText('');
        setDynamicButtonText('');
    };

    const handleMoodTrackerNavigation = () => {
        navigation.navigate('MoodTrackerScreen'); // Ensure 'MoodTrackerScreen' exists
    };

    const handleProfileNavigation = () => {
        navigation.navigate('ProfileScreen'); // Ensure 'ProfileScreen' exists
    };
    // ---------------------------------

    // --- JSX Return ---
    return (
        <LinearGradient colors={[colors.backgroundTop, colors.backgroundBottom]} style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Good Morning,</Text>
                        {/* --- Updated User Name Text --- */}
                        <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                            {isLoadingName ? 'Loading...' : userName}
                        </Text>
                        {/* ----------------------------- */}
                    </View>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconButton}>
                            <Ionicons name="notifications-outline" size={26} color={colors.iconGrey} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, styles.profileIconContainer]}
                            onPress={handleProfileNavigation}
                        >
                            <Ionicons name="person-circle-outline" size={30} color={colors.iconGrey} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Wellness Card */}
                <View style={styles.wellnessCard}>
                    <View style={styles.scoreCircle}>
                        {/* Placeholder score */}
                        <Text style={styles.score}>82</Text>
                    </View>
                    <View style={styles.scoreInfo}>
                        <Text style={styles.scoreTitle}>Wellness Score</Text>
                        <View style={styles.scoreSubtitleContainer}>
                            {/* Placeholder subtitle */}
                            <Text style={styles.scoreSubtitle}>+12% from last week</Text>
                            <Icon name="chart-line" size={20} color={colors.featureGreen} style={styles.chartIcon} />
                        </View>
                    </View>
                </View>

                {/* Features Container */}
                <View style={styles.featuresContainer}>
                    <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.featureBlue }]}>
                        <Icon name="stethoscope" size={36} color={colors.white} />
                        <Text style={styles.featureText}>Connect Expert</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                         style={[styles.featureCard, { backgroundColor: colors.featureGreen }]}
                         onPress={() => navigation.navigate('MindfulBreath')} // Example direct navigation
                    >
                        <Icon name="leaf" size={36} color={colors.white} />
                        <Text style={styles.featureText}>Mindful Breath</Text>
                    </TouchableOpacity>
                </View>

                {/* Mood Card - Renders different content based on state */}
                <View style={styles.moodCard}>
                    {/* Mood Header (Always Visible unless confirmation shown) */}
                    {!confirmationVisible && (
                         <View style={styles.moodHeader}>
                            <Ionicons name="cloudy-outline" size={20} color={colors.textDark} />
                            <Text style={styles.moodTitle}>
                                {showAddNoteView ? "Add a note" : "How are you feeling today?"}
                            </Text>
                            <TouchableOpacity onPress={handleMoodTrackerNavigation} style={styles.arrowButton}>
                                <Icon name="arrow-right" size={24} color={colors.textDark} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Mood Options (Show if options are active) */}
                    {showMoodOptions && !showAddNoteView && !confirmationVisible && (
                        <>
                            {/* Split mood options into rows */}
                            <View style={styles.moodOptionsRow}>
                                {moodOptions.slice(0, 3).map((mood) => (
                                    <TouchableOpacity
                                        key={mood.label} style={styles.moodButton}
                                        onPress={() => handleMoodSelect(mood.label)} >
                                        <View style={styles.moodButtonContent}>
                                            <LottieView style={styles.moodLottie} source={{ uri: mood.lottieUrl }} autoPlay loop />
                                            <Text style={styles.moodLabel}>{mood.label}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={[styles.moodOptionsRow, { justifyContent: 'center' }]}>
                                {moodOptions.slice(3).map((mood) => (
                                     <TouchableOpacity
                                        key={mood.label} style={styles.moodButton}
                                        onPress={() => handleMoodSelect(mood.label)} >
                                        <View style={styles.moodButtonContent}>
                                            <LottieView style={styles.moodLottie} source={{ uri: mood.lottieUrl }} autoPlay loop />
                                            <Text style={styles.moodLabel}>{mood.label}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Add Note View (Show if adding note) */}
                    {showAddNoteView && !confirmationVisible && (
                        <View style={styles.addNoteContainer}>
                             {/* Display selected mood with Lottie */}
                             <View style={styles.addNoteHeaderContent}>
                                <Text style={styles.addNoteHeaderText}>Feeling: {pendingMood}</Text>
                                <LottieView
                                    style={styles.addNoteHeaderLottie}
                                    source={{ uri: moodOptions.find(m => m.label === pendingMood)?.lottieUrl }}
                                    autoPlay
                                    loop={false} // Play once
                                />
                             </View>
                             {/* Note Input */}
                             <TextInput
                                style={styles.noteInput}
                                placeholder="Add a note about your mood (optional)..."
                                placeholderTextColor={colors.textSecondary}
                                value={note}
                                onChangeText={setNote}
                                multiline={true}
                                numberOfLines={3} // Suggests initial height
                                scrollEnabled={true} // Allow scrolling if text exceeds height
                            />
                            {/* Action Buttons */}
                            <View style={styles.addNoteActionsContainer}>
                                <TouchableOpacity style={styles.skipNoteButton} onPress={handleSaveMoodAndNote}>
                                    <Text style={styles.skipNoteButtonText}>Skip Note</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.saveNoteButton} onPress={handleSaveMoodAndNote}>
                                    <Text style={styles.saveNoteButtonText}>Save Mood</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {/* Confirmation Card (Show after saving mood) */}
                    {confirmationVisible && (
                        <View style={styles.confirmationCard}>
                            <TouchableOpacity onPress={handleReload} style={styles.reloadButton}>
                                <Icon name="reload" size={24} color={colors.iconGrey} />
                            </TouchableOpacity>
                            <Icon name="check-circle" size={30} color={colors.featureGreen} style={styles.checkmarkIcon} />
                            <Text style={styles.confirmationText}>You're feeling {selectedMood}!</Text>
                            <Text style={styles.checkInCompleteText}>Check-in complete!</Text>
                            {suggestionText ? <Text style={styles.suggestionText}>{suggestionText}</Text> : null}
                            {dynamicButtonText && (
                                <TouchableOpacity onPress={handleDynamicButtonClick} style={styles.dynamicButton}>
                                    <Text style={styles.dynamicButtonText}>{dynamicButtonText}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>
        </LinearGradient>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 120, // Ensure enough space at the bottom
        flexGrow: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 35,
        paddingTop: Platform.OS === 'ios' ? 10 : 0, // Adjust padding for status bar
    },
    greeting: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    userName: {
        fontSize: 30,
        color: colors.textDark,
        fontWeight: '700',
        marginTop: 4,
    },
    headerIcons: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        marginLeft: 18,
        padding: 6, // Make tap area slightly larger
    },
    profileIconContainer: {
        borderRadius: 22, // Circular background if needed
    },
    wellnessCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        padding: 25,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 0,
        borderWidth: Platform.OS === 'android' ? 0 : 1, // Optional subtle border for iOS
        borderColor: colors.lightBorder,
    },
    scoreCircle: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        borderWidth: 7,
        borderColor: '#E0F7FA',
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 25,
    },
    score: {
        fontSize: 30,
        color: colors.primary,
        fontWeight: 'bold',
    },
    scoreInfo: { flex: 1 },
    scoreTitle: {
        fontSize: 20,
        color: colors.textDark,
        fontWeight: '600',
        marginBottom: 6,
    },
    scoreSubtitleContainer: { flexDirection: 'row', alignItems: 'center' },
    scoreSubtitle: { fontSize: 14, color: colors.textSecondary },
    chartIcon: { marginLeft: 10 },
    featuresContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
    },
    featureCard: {
        width: width * 0.43,
        // height: 150, // Can let content define height or set fixed
        minHeight: 140,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 0,
    },
    featureText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
        marginTop: 15,
        textAlign: 'center',
    },
    moodCard: {
        backgroundColor: colors.moodYellow,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F5F5DC',
        minHeight: 250, // Ensure minimum height
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 0,
        marginBottom: 20,
    },
    moodHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 25, // Increased spacing
    },
    moodTitle: {
        fontSize: 19,
        color: colors.textDark,
        fontWeight: '600',
        marginLeft: 12,
        flex: 1, // Allow text to take available space
    },
    arrowButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.6)',
        padding: 8,
        borderRadius: 16,
    },
    moodOptionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 15,
        marginTop: 10,
        alignItems: 'flex-start',
    },
    moodButton: {
        backgroundColor: colors.moodButtonBg,
        paddingVertical: 10,
        paddingHorizontal: 10, // Adjusted padding
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.moodButtonBorder,
        marginHorizontal: 3, // Slightly reduced margin
        minWidth: 85, // Adjusted min width
        maxWidth: width * 0.28, // Max width to prevent overflow
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 0,
    },
    moodButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    moodLottie: {
        width: 22, // Slightly smaller
        height: 22,
        marginRight: 5,
    },
    moodLabel: {
        fontSize: 12, // Slightly smaller font
        color: colors.textDark,
        fontWeight: '500',
        flexShrink: 1, // Allow text to shrink
        textAlign: 'center',
    },
    addNoteContainer: {
        marginTop: 15,
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    addNoteHeaderContent: { // Replaces addNoteHeader style for better layout
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    addNoteHeaderText: { // Style for the text part
        fontSize: 16,
        fontWeight: '500',
        color: colors.textDark,
    },
    addNoteHeaderLottie: { // Style for the Lottie animation next to text
        width: 22,
        height: 22,
        marginLeft: 8,
    },
    noteInput: {
        backgroundColor: colors.noteInputBg,
        borderColor: colors.lightBorder,
        borderWidth: 1,
        borderRadius: 10,
        width: '100%',
        minHeight: 80,
        maxHeight: 120, // Prevent excessive height
        padding: 12,
        fontSize: 14,
        textAlignVertical: 'top',
        marginBottom: 20,
        color: colors.textDark,
    },
    addNoteActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    saveNoteButton: {
        backgroundColor: colors.primary,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignItems: 'center',
        flex: 1, // Equal width with skip button
        marginHorizontal: 5,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 0,
    },
    saveNoteButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    skipNoteButton: {
        backgroundColor: colors.cardBackground,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: colors.primaryDark,
        flex: 1, // Equal width with save button
        marginHorizontal: 5,
    },
    skipNoteButtonText: {
        color: colors.primaryDark,
        fontSize: 16,
        fontWeight: '600',
    },
    confirmationCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        padding: 25,
        paddingTop: 50, // Extra padding for reload button space
        alignItems: 'center',
        position: 'relative',
        marginTop: 15, // Or adjust as needed
        borderWidth: 1,
        borderColor: colors.lightBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 0,
        minHeight: 250, // Match mood card min height maybe
        justifyContent: 'center', // Center content vertically
    },
    reloadButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 8,
        zIndex: 10,
    },
    checkmarkIcon: { marginBottom: 15 }, // Reduced margin
    confirmationText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textDark,
        textAlign: 'center',
    },
    checkInCompleteText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 6,
        marginBottom: 15, // Reduced margin
        textAlign: 'center',
    },
    suggestionText: {
        marginTop: 10, // Reduced margin
        color: colors.textDark,
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 15,
        lineHeight: 20,
        marginBottom: 15,
    },
    dynamicButton: {
        backgroundColor: colors.primary, // Using primary theme color
        paddingVertical: 14,
        paddingHorizontal: 35,
        borderRadius: 28,
        marginTop: 15, // Reduced margin
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 0,
    },
    dynamicButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});

export default HomeScreen;