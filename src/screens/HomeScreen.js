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
  Keyboard // Import Keyboard to dismiss
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
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
};

// --- Mood Options with Lottie URLs ---
// IMPORTANT: Replace placeholder URLs with actual Noto Emoji Lottie JSON URLs
const moodOptions = [
  { emoji: '😄', label: 'Very happy', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f604/lottie.json' }, // Example URL
  { emoji: '🤩', label: 'Excited', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/lottie.json' }, // Placeholder URL! Find correct one.
  { emoji: '😊', label: 'Calm', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/lottie.json' }, // Placeholder URL! Find correct one.
  { emoji: '😟', label: 'Sad', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f61f/lottie.json' }, // Placeholder URL! Find correct one.
  { emoji: '😔', label: 'Worried', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f614/lottie.json' } // Placeholder URL! Find correct one.
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

  // --- New State for Note Feature ---
  const [showAddNoteView, setShowAddNoteView] = useState(false);
  const [note, setNote] = useState('');
  const [pendingMood, setPendingMood] = useState(null);
  // ----------------------------------

  const navigation = useNavigation();

  // --- useEffect ---
  useEffect(() => {
    const loadMood = async () => {
      try {
        const storedMood = await AsyncStorage.getItem('selectedMood');
        // Decide if you want to load previous state
      } catch (error) {
        console.error("Error loading mood from AsyncStorage: ", error);
      }
    };
    loadMood();
  }, []);

  // --- Updated handleMoodSelect ---
  const handleMoodSelect = (mood) => {
    console.log(`handleMoodSelect: Mood selected - ${mood}`);
    setPendingMood(mood);
    setShowMoodOptions(false);
    setConfirmationVisible(false);
    setNote('');
    setShowAddNoteView(true);
  };
  // -----------------------------

  // --- handleSaveMoodAndNote ---
  const handleSaveMoodAndNote = async () => {
    Keyboard.dismiss();
    if (!pendingMood) return;

    console.log(`handleSaveMoodAndNote: Saving mood "${pendingMood}" with note "${note}"`);
    const currentUser = auth().currentUser;

    if (!currentUser) {
        console.log("handleSaveMoodAndNote: User not logged in!");
        Alert.alert("Error", "You must be logged in to save your mood.");
        setShowAddNoteView(false);
        setShowMoodOptions(true);
        setPendingMood(null);
        return;
    }

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
        console.log('handleSaveMoodAndNote: Mood and note saved to Firestore successfully!');

        try {
            await AsyncStorage.setItem('selectedMood', pendingMood);
            console.log("handleSaveMoodAndNote: Mood saved to AsyncStorage.");
        } catch (asyncError) {
            console.error("Error saving mood to AsyncStorage: ", asyncError);
        }

    } catch (error) {
        console.error("Error saving mood/note to Firestore: ", error);
        Alert.alert("Error", "Could not save mood history. Please try again.");
    }

    setSelectedMood(pendingMood);
    setShowAddNoteView(false);

    switch (pendingMood) {
      case 'Sad':
      case 'Worried':
        setSuggestionText("Consider chatting with AI for support or try a mindful breath exercise.");
        setDynamicButtonText("Chat with AI");
        break;
      case 'Very happy':
        setSuggestionText("Great mood! How about continuing with a mindful breath session?");
        setDynamicButtonText("Mindful Breath");
        break;
      default:
        setSuggestionText("");
        setDynamicButtonText("");
    }

    Animated.spring(moodAnimation, { toValue: 1, friction: 4, useNativeDriver: true }).start(() => {
        Animated.spring(moodAnimation, { toValue: 0, friction: 4, useNativeDriver: true }).start();
    });

    setConfirmationVisible(true);
    setPendingMood(null);
  };
  // -----------------------------------------

  // --- Other handlers ---
  const handleDynamicButtonClick = () => {
    if (dynamicButtonText === "Chat with Zenari") {
      navigation.navigate('ChatScreen');
    } else if (dynamicButtonText === "Mindful Breath") {
      navigation.navigate('MindfulBreath');
    }
  };

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
    navigation.navigate('MoodTrackerScreen');
  };

  const handleProfileNavigation = () => {
    navigation.navigate('ProfileScreen');
  };
  // ---------------------------------

  // --- JSX Return (Mood Button Text Visibility Fixed) ---
  return (
    <LinearGradient colors={[colors.backgroundTop, colors.backgroundBottom]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning</Text>
            <Text style={styles.userName}>Pawan 👋</Text>
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
            <Text style={styles.score}>82</Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={styles.scoreTitle}>Wellness Score</Text>
            <View style={styles.scoreSubtitleContainer}>
              <Text style={styles.scoreSubtitle}>+12% from last week</Text>
              <Icon name="chart-line" size={20} color={colors.featureGreen} style={styles.chartIcon} />
            </View>
          </View>
        </View>

        {/* Features Container */}
        <View style={styles.featuresContainer}>
          <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.featureBlue }]}>
            <Icon name="stethoscope" size={36} color="#FFFFFF" />
            <Text style={styles.featureText}>Connect Expert</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.featureGreen }]}>
            <Icon name="leaf" size={36} color="#FFFFFF" />
            <Text style={styles.featureText}>Mindful Breath</Text>
          </TouchableOpacity>
        </View>

        {/* Mood Card */}
        <View style={styles.moodCard}>
          {/* Mood Header (Always Visible) */}
          <View style={styles.moodHeader}>
            <Ionicons name="cloudy-outline" size={20} color={colors.textDark} />
            <Text style={styles.moodTitle}>
                {showAddNoteView ? "Add a note" : "How are you feeling today?"}
            </Text>
            <TouchableOpacity onPress={handleMoodTrackerNavigation} style={styles.arrowButton}>
              <Icon name="arrow-right" size={24} color={colors.textDark} />
            </TouchableOpacity>
          </View>

          {/* Mood Options (Conditionally Rendered) */}
          {showMoodOptions && (
            <>
              {/* Row 1 */}
              <View style={styles.moodOptionsRow}>
                {moodOptions.slice(0, 3).map((mood, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.moodButton}
                    onPress={() => handleMoodSelect(mood.label)}
                  >
                    <View style={styles.moodButtonContent}>
                        <LottieView
                            style={styles.moodLottie}
                            source={{ uri: mood.lottieUrl }}
                            autoPlay
                            loop
                        />
                        {/* Removed numberOfLines={1} to allow wrapping */}
                        <Text style={styles.moodLabel}>{mood.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Row 2 */}
              <View style={[styles.moodOptionsRow, { justifyContent: 'center' }]}>
                {moodOptions.slice(3).map((mood, index) => (
                  <TouchableOpacity
                    key={index + 3}
                    style={styles.moodButton}
                    onPress={() => handleMoodSelect(mood.label)}
                  >
                    <View style={styles.moodButtonContent}>
                         <LottieView
                            style={styles.moodLottie}
                            source={{ uri: mood.lottieUrl }}
                            autoPlay
                            loop
                        />
                         {/* Removed numberOfLines={1} to allow wrapping */}
                        <Text style={styles.moodLabel}>{mood.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Add Note View (Conditionally Rendered) */}
          {showAddNoteView && (
            <View style={styles.addNoteContainer}>
                 <Text style={styles.addNoteHeader}>
                    Feeling: {pendingMood}
                    <LottieView
                        style={styles.addNoteHeaderLottie}
                        source={{ uri: moodOptions.find(m => m.label === pendingMood)?.lottieUrl }}
                        autoPlay
                        loop={false}
                    />
                 </Text>
                 <TextInput
                    style={styles.noteInput}
                    placeholder="Add a note about your mood (optional)..."
                    placeholderTextColor={colors.textSecondary}
                    value={note}
                    onChangeText={setNote}
                    multiline={true}
                    numberOfLines={3}
                 />
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

          {/* Confirmation Card (Conditionally Rendered) */}
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

// --- Styles (Mood Button Label/Layout Styles Updated) ---
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 120,
      flexGrow: 1,
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 35,
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
      padding: 6,
  },
  profileIconContainer: {
      borderRadius: 22,
  },
  wellnessCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 25,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.lightBorder,
  },
  scoreCircle: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    borderWidth: 7,
    borderColor: '#E0F7FA',
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
    height: 150,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  featureText: {
      color: '#FFFFFF',
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
    minHeight: 250,
  },
  moodHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 20,
  },
  moodTitle: {
      fontSize: 19,
      color: colors.textDark,
      fontWeight: '600',
      marginLeft: 12,
      flex: 1,
  },
  arrowButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.6)',
      padding: 8,
      borderRadius: 16,
  },
  moodOptionsRow: {
      flexDirection: 'row',
      // Use space-between for first row, center for second row might need adjustment
      // Let's try space-around and let buttons define their width
      justifyContent: 'space-around',
      marginBottom: 15,
      marginTop: 10,
      alignItems: 'flex-start', // Align items to top if text wraps
  },
  moodButton: {
    backgroundColor: colors.moodButtonBg,
    paddingVertical: 12, // Adjust vertical padding
    paddingHorizontal: 10, // Adjust horizontal padding
    borderRadius: 20, // Slightly less rounded than pill shape
    borderWidth: 1,
    borderColor: colors.moodButtonBorder,
    marginHorizontal: 4, // Spacing between buttons
    // Remove flex: 1 and maxWidth - let content + padding determine width
    // Add a flexible width basis or minWidth if needed
    minWidth: 80, // Ensure a minimum tappable width
    alignItems: 'center', // Center the inner content view horizontally
  },
  moodButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start', // Align items to the start (left)
      width: '100%', // Ensure content tries to fill button padding
  },
  moodLottie: {
      width: 24, // Slightly smaller Lottie
      height: 24,
      marginRight: 8, // Increased space between Lottie and text
  },
  moodLabel: {
      fontSize: 13,
      color: colors.textDark,
      fontWeight: '500',
      flexShrink: 1, // Allow text label to shrink if needed
      textAlign: 'left', // Align text to the left
      // Removed numberOfLines={1} in JSX to allow wrapping
  },
  addNoteContainer: {
      marginTop: 15,
      alignItems: 'center',
  },
  addNoteHeader: {
      fontSize: 16,
      fontWeight: '500',
      color: colors.textDark,
      marginBottom: 15,
      flexDirection: 'row',
      alignItems: 'center',
  },
  addNoteHeaderLottie: {
      width: 22,
      height: 22,
      marginLeft: 5,
  },
  noteInput: {
      backgroundColor: colors.noteInputBg,
      borderColor: colors.lightBorder,
      borderWidth: 1,
      borderRadius: 10,
      width: '100%',
      minHeight: 80,
      padding: 10,
      fontSize: 14,
      textAlignVertical: 'top',
      marginBottom: 20,
      color: colors.textDark,
  },
  addNoteActionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      width: '100%',
  },
  saveNoteButton: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 20,
      alignItems: 'center',
      flex: 1,
      marginHorizontal: 5,
  },
  saveNoteButtonText: {
      color: colors.white,
      fontSize: 16,
      fontWeight: '600',
  },
  skipNoteButton: {
      backgroundColor: colors.cardBackground,
      paddingVertical: 12,
      paddingHorizontal: 30,
      borderRadius: 20,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.primaryDark,
      flex: 1,
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
    paddingTop: 50,
    alignItems: 'center',
    position: 'relative',
    marginTop: 15,
    borderWidth: 1,
    borderColor: colors.lightBorder,
  },
  reloadButton: {
      position: 'absolute',
      top: 15,
      right: 15,
      padding: 8,
      zIndex: 1,
  },
  checkmarkIcon: { marginBottom: 20 },
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
      marginBottom: 18,
      textAlign: 'center',
  },
  suggestionText: {
      marginTop: 12,
      color: colors.textDark,
      fontSize: 14,
      textAlign: 'center',
      paddingHorizontal: 15,
      lineHeight: 20,
  },
  dynamicButton: {
    backgroundColor: colors.featureGreen,
    paddingVertical: 14,
    paddingHorizontal: 35,
    borderRadius: 28,
    marginTop: 20,
    alignItems: 'center',
  },
  dynamicButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default HomeScreen;
