import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Animated,
    Alert,
    TextInput,
    Keyboard,
    Platform,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
// Removed unused AsyncStorage import based on provided code usage
// import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';

// --- Firebase Imports (Namespaced) ---
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
// ------------------------

const { width } = Dimensions.get('window');

// --- Colors ---
// Assuming colors object is defined as before
const colors = {
    primary: '#2bedbb', primaryDark: '#1AA897', backgroundTop: '#E6F7FF', backgroundBottom: '#D1EFFF', cardBackground: '#FFFFFF', textDark: '#2D5D5E', textSecondary: '#7A8D8E', featureBlue: '#4A90E2', featureGreen: '#4CAF50', moodYellow: '#FFFDE7', moodButtonBg: '#FFFFFF', moodButtonBorder: '#E0E0E0', moodYellowSelected: '#FFF59D', moodBorderSelected: '#FBC02D', navBackground: '#FFFFFF', lightBorder: '#E0E0E0', iconGrey: '#607D8B', noteInputBg: '#F8F8F8', white: '#FFFFFF', error: '#D32F2F', wellnessPositive: '#4CAF50', wellnessOkay: '#FFC107', wellnessNegative: '#F44336', wellnessUnknown: '#90A4AE', wellnessLoading: '#B0BEC5', courseBlue: '#4FC3F7', courseOrange: '#FFB74D', coursePurple: '#BA68C8',
};


// --- Mood Options ---
const moodOptions = [
    { emoji: '😄', label: 'Happy', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f604/lottie.json' },
    { emoji: '🤩', label: 'Excited', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f929/lottie.json' },
    { emoji: '😊', label: 'Calm', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60a/lottie.json' },
    { emoji: '😟', label: 'Sad', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f61f/lottie.json' },
    { emoji: '😔', label: 'Worried', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f614/lottie.json' }
];

// --- Mood Scoring Map ---
const moodScores = {
    'Happy': 5, 'Excited': 4, 'Calm': 4, 'Worried': 2, 'Sad': 1,
};

// --- Mini Courses Data ---
const miniCourses = [
    { id: 'med101', title: 'Intro to Meditation', description: 'Learn the basics of mindfulness in 5 minutes.', icon: 'brain', color: colors.courseBlue },
    { id: 'stress1', title: 'Stress Relief Breaths', description: 'Quick techniques to calm your nerves.', icon: 'leaf-circle-outline', color: colors.featureGreen },
    { id: 'gratitude1', title: 'Gratitude Practice', description: 'Cultivate positivity with a simple daily exercise.', icon: 'heart-outline', color: colors.courseOrange },
    { id: 'sleep1', title: 'Better Sleep Tips', description: 'Simple habits for more restful nights.', icon: 'power-sleep', color: colors.coursePurple },
];

// --- Gamification Constants ---
const POINTS_PER_MOOD_LOG = 10;
const POINTS_PER_NOTE = 5;
const FIRST_MOOD_ACHIEVEMENT_ID = 'firstMoodLogged';
const FIRST_MOOD_ACHIEVEMENT_NAME = 'First Steps';
// ----------------------------

// --- Date Helper Functions ---
const isSameDay = (date1, date2) => {
    if (!date1 || !date2 || !(date1 instanceof Date) || !(date2 instanceof Date)) return false;
    try { return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate(); }
    catch (e) { console.error("Error in isSameDay comparison:", e); return false; }
};
const isYesterday = (dateToCheck, today) => {
    if (!dateToCheck || !today || !(dateToCheck instanceof Date) || !(today instanceof Date)) return false;
    try { const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1); return isSameDay(dateToCheck, yesterday); }
    catch (e) { console.error("Error in isYesterday comparison:", e); return false; }
};
// ---------------------------

const HomeScreen = () => {
    // --- State ---
    const [selectedMood, setSelectedMood] = useState(null);
    const [confirmationVisible, setConfirmationVisible] = useState(false);
    const [suggestionText, setSuggestionText] = useState('');
    const [moodAnimation] = useState(new Animated.Value(0));
    const [dynamicButtonText, setDynamicButtonText] = useState('');
    const [showMoodOptions, setShowMoodOptions] = useState(true);
    const [showAddNoteView, setShowAddNoteView] = useState(false);
    const [note, setNote] = useState('');
    const [pendingMood, setPendingMood] = useState(null);
    const [userName, setUserName] = useState('');
    const [isLoadingName, setIsLoadingName] = useState(true);
    const [wellnessScore, setWellnessScore] = useState(null);
    const [wellnessSubtitle, setWellnessSubtitle] = useState('Loading mood insights...');
    const [isLoadingWellness, setIsLoadingWellness] = useState(true);

    const navigation = useNavigation();

    // --- Functions ---
    const fetchUserName = useCallback(async () => {
        console.log("[Home] Attempting to fetch user name (namespaced)...");
        setIsLoadingName(true);
        const currentUser = auth().currentUser; // Namespaced
        if (currentUser) {
            try {
                const userId = currentUser.uid;
                const userDocument = await firestore().collection('users').doc(userId).get(); // Namespaced

                if (userDocument.exists) {
                    const name = userDocument.data()?.fullName;
                    setUserName(name ? name.split(' ')[0] : 'Friend');
                } else {
                    console.log("[Home] User document not found.");
                    setUserName('Friend');
                }
            } catch (error) { console.error("[Home] Error fetching user name:", error); setUserName('Friend'); }
        } else {
            console.log("[Home] No user logged in for fetchUserName.");
            setUserName('Friend');
        }
        setIsLoadingName(false);
    }, []);

    const analyzeMoodsAndScore = (moodHistory) => {
        if (!moodHistory || moodHistory.length === 0) { return { score: null, subtitle: 'Log your mood to see insights.' }; }
        let totalScoreValue = 0, scoredCount = 0;
        moodHistory.forEach(entry => { const scoreValue = moodScores[entry.mood]; if (scoreValue !== undefined) { totalScoreValue += scoreValue; scoredCount++; } });
        const averageOutOf5 = scoredCount > 0 ? (totalScoreValue / scoredCount) : null;
        const scoreOutOf100 = averageOutOf5 !== null ? Math.round(averageOutOf5 * 20) : null;
        let subtitle = "Keep tracking your moods!";
        if (scoreOutOf100 === null) { subtitle = "Log your mood to see insights."; }
        else if (scoreOutOf100 >= 80) { subtitle = "Feeling great lately!"; }
        else if (scoreOutOf100 >= 60) { subtitle = "Doing okay overall."; }
        else { subtitle = "Seems a bit tough recently."; }
        return { score: scoreOutOf100, subtitle: subtitle };
    };

    const fetchWellnessData = useCallback(async () => {
        console.log("[Home] Attempting to fetch wellness data (namespaced)...");
        setIsLoadingWellness(true); setWellnessScore(null); setWellnessSubtitle('Loading mood insights...');
        const currentUser = auth().currentUser; // Namespaced
        if (!currentUser) { setWellnessSubtitle('Log in to see your wellness insights.'); setIsLoadingWellness(false); return; }
        try {
            const userId = currentUser.uid;
            const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            const sevenDaysAgoTimestamp = firestore.Timestamp.fromDate(sevenDaysAgo); // Namespaced Timestamp

            const moodQuerySnapshot = await firestore() // Namespaced
                .collection('users').doc(userId)
                .collection('moodHistory')
                .where('timestamp', '>=', sevenDaysAgoTimestamp)
                .orderBy('timestamp', 'desc')
                .get();

            const fetchedMoods = moodQuerySnapshot.docs.map(doc => ({ mood: doc.data().mood }));
            console.log(`[Home] Fetched ${fetchedMoods.length} moods for wellness analysis.`);
            const wellnessInfo = analyzeMoodsAndScore(fetchedMoods);
            setWellnessScore(wellnessInfo.score); setWellnessSubtitle(wellnessInfo.subtitle);
        } catch (error) { console.error("[Home] Error fetching/analyzing mood history:", error); setWellnessScore(null); setWellnessSubtitle('Could not load mood insights.'); }
        finally { setIsLoadingWellness(false); }
    }, []); // Dependencies correctly listed below (useCallback)

    const checkAndUpdateStreak = useCallback(async () => {
        const currentUser = auth().currentUser; // Namespaced
        if (!currentUser) return;

        const userId = currentUser.uid;
        const statsRef = firestore().collection('users').doc(userId).collection('stats').doc('summary'); // Namespaced

        try {
            console.log("[STREAK DEBUG] Checking daily streak (namespaced)...");
            const statsDoc = await statsRef.get(); // Namespaced
            const statsData = statsDoc.exists ? statsDoc.data() : {};
            console.log('[STREAK DEBUG] Fetched statsData:', JSON.stringify(statsData));

            const lastActivityTimestamp = statsData.lastActivityDate;
            const currentStreak = statsData.currentStreak || 0;
            console.log('[STREAK DEBUG] lastActivityTimestamp from DB:', lastActivityTimestamp);
            console.log('[STREAK DEBUG] currentStreak from DB:', currentStreak);

            const today = new Date();
            let lastActivityDate = null;

            if (lastActivityTimestamp && typeof lastActivityTimestamp.toDate === 'function') {
                try { lastActivityDate = lastActivityTimestamp.toDate(); }
                catch (toDateError) { console.error('[STREAK DEBUG] Error calling toDate():', toDateError); lastActivityDate = null; }
            } else if (lastActivityTimestamp) { console.warn("[STREAK DEBUG] lastActivityDate field is not a valid Firestore Timestamp object."); }
            else { console.log('[STREAK DEBUG] lastActivityTimestamp is null or undefined.'); }

            if (lastActivityDate && isSameDay(lastActivityDate, today)) { console.log("[STREAK DEBUG] Activity already recorded today."); return; }

            let newStreak = 1;
            if (lastActivityDate && isYesterday(lastActivityDate, today)) { newStreak = currentStreak + 1; }
            else { console.log("[STREAK DEBUG] Starting/Resetting streak to 1."); }

            if (newStreak !== currentStreak || !lastActivityDate || !isSameDay(lastActivityDate, today)) {
                 console.log(`[STREAK DEBUG] Updating Firestore: newStreak=${newStreak}`);
                 await statsRef.set({ // Namespaced set/merge and FieldValue
                     currentStreak: newStreak,
                     lastActivityDate: firestore.FieldValue.serverTimestamp()
                 }, { merge: true });
                 console.log("[STREAK DEBUG] Firestore update complete.");
                 // TODO: Check streak achievements
            } else { console.log("[STREAK DEBUG] No streak update needed in Firestore."); }

        } catch (error) { console.error("Error checking/updating streak:", error); }
    }, []); // Dependencies correctly listed below (useCallback)

    // --- Effects ---
    useEffect(() => { fetchUserName(); }, [fetchUserName]);

    useFocusEffect(useCallback(() => {
        console.log("HomeScreen focused - Running updates...");
        fetchUserName();
        fetchWellnessData();
        checkAndUpdateStreak();
        return () => {
            console.log("HomeScreen blurred");
            // Optional: Cleanup logic when screen loses focus
        };
    }, [fetchUserName, fetchWellnessData, checkAndUpdateStreak])); // Dependencies for focus effect
    // -------------------------------------

    const handleMoodSelect = (mood) => {
        setPendingMood(mood); setShowMoodOptions(false); setConfirmationVisible(false);
        setNote(''); setShowAddNoteView(true);
    };

    // --- Save Mood and Note Handler (Namespaced) ---
    const handleSaveMoodAndNote = async () => {
        Keyboard.dismiss();
        if (!pendingMood) return;
        const currentUser = auth().currentUser; // Namespaced
        if (!currentUser) { Alert.alert("Error", "You must be logged in."); return; }

        const userId = currentUser.uid;
        const moodToSave = pendingMood;
        const noteToSave = note.trim();
        console.log(`Saving mood "${moodToSave}" with note "${noteToSave}" for user ${userId}`);

        const moodData = { mood: moodToSave, note: noteToSave, timestamp: firestore.FieldValue.serverTimestamp(), userId: userId }; // Namespaced FieldValue
        let pointsToAdd = POINTS_PER_MOOD_LOG + (noteToSave.length > 0 ? POINTS_PER_NOTE : 0);

        // References using Namespaced Syntax
        const moodHistoryCollectionRef = firestore().collection('users').doc(userId).collection('moodHistory');
        const gamificationRef = firestore().collection('users').doc(userId).collection('gamification').doc('summary');
        const firstMoodAchievementRef = firestore().collection('users').doc(userId).collection('achievements').doc(FIRST_MOOD_ACHIEVEMENT_ID);
        const statsRef = firestore().collection('users').doc(userId).collection('stats').doc('summary');

        let isFirstMoodEver = false;
        try {
            const existingMoodSnapshot = await moodHistoryCollectionRef.limit(1).get(); // Namespaced get()
            isFirstMoodEver = existingMoodSnapshot.empty; // Use .empty property
        } catch(error) { console.error("Error checking for existing moods:", error); Alert.alert("Error", "Could not verify mood history."); return; }

        try {
            console.log("Starting Firestore transaction (namespaced)...");
            await firestore().runTransaction(async (transaction) => { // Namespaced runTransaction
                // 1. Save Mood
                const newMoodRef = moodHistoryCollectionRef.doc();
                transaction.set(newMoodRef, moodData); // Use transaction set

                // 2. Update Points
                transaction.set(gamificationRef, { // Namespaced FieldValue
                    points: firestore.FieldValue.increment(pointsToAdd),
                    lastUpdated: firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log(`Points incremented by: ${pointsToAdd}`);

                // 3. Check/Unlock Achievement
                if (isFirstMoodEver) {
                    const achievementDoc = await transaction.get(firstMoodAchievementRef); // Namespaced transaction get
                    if (!achievementDoc.exists || !achievementDoc.data()?.earned) {
                        console.log(`Unlocking achievement: ${FIRST_MOOD_ACHIEVEMENT_ID}`);
                        transaction.set(firstMoodAchievementRef, { // Namespaced FieldValue
                            id: FIRST_MOOD_ACHIEVEMENT_ID, name: FIRST_MOOD_ACHIEVEMENT_NAME, earned: true, earnedAt: firestore.FieldValue.serverTimestamp()
                        }, { merge: true });
                    }
                }
                // 4. Update Stats
                transaction.set(statsRef, { // Namespaced FieldValue
                    sessions: firestore.FieldValue.increment(1),
                    lastActivityDate: firestore.FieldValue.serverTimestamp() // Update last activity on save too
                }, { merge: true });
                console.log(`Session count incremented`);
            });
            console.log('Firestore transaction successful!');
        } catch (error) {
            console.error("Error in Firestore transaction: ", error);
            Alert.alert("Error Saving Progress", `Could not save mood or update progress. Please check your connection and try again. Details: ${error.message}`);
            return; // Stop execution if save fails
        }

        // --- UI Updates After Successful Save ---
        setSelectedMood(moodToSave); setShowAddNoteView(false);
        switch (moodToSave) {
             case 'Sad': case 'Worried': setSuggestionText("Consider chatting with AI or try a mindful breath exercise."); setDynamicButtonText("Chat with AI"); break;
             case 'Happy': case 'Excited': case 'Calm': setSuggestionText("Great! Reflect on this feeling or try a mindful breath session."); setDynamicButtonText("Mindful Breath"); break;
             default: setSuggestionText(""); setDynamicButtonText("");
        }
        // Mood Animation (using existing state variable)
        Animated.spring(moodAnimation, { toValue: 1, friction: 4, useNativeDriver: true }).start(() => {
            Animated.spring(moodAnimation, { toValue: 0, friction: 4, useNativeDriver: true }).start();
        });
        setConfirmationVisible(true); setPendingMood(null);
        fetchWellnessData(); // Refresh wellness score display after successful save
        // No need to call checkAndUpdateStreak here, it's handled by transaction & useFocusEffect
    };
    // -----------------------------------------

    // --- Other Handlers ---
    const handleDynamicButtonClick = () => {
        if (dynamicButtonText === "Chat with AI") { navigation.navigate('ChatScreen'); } // Ensure 'ChatScreen' exists in navigator
        else if (dynamicButtonText === "Mindful Breath") { navigation.navigate('MindfulBreathWelcome'); } // Ensure 'MindfulBreathWelcome' exists
    };

    const handleReload = () => {
        console.log("handleReload: Resetting mood view");
        setConfirmationVisible(false); setShowAddNoteView(false); setShowMoodOptions(true);
        setSelectedMood(null); setPendingMood(null); setNote('');
        setSuggestionText(''); setDynamicButtonText('');
    };

    const handleMoodTrackerNavigation = () => {
        navigation.navigate('MoodTrackerScreen'); // Ensure 'MoodTrackerScreen' exists
    };

    const handleProfileNavigation = () => {
        navigation.navigate('ProfileScreen'); // Ensure 'ProfileScreen' exists
    };

    const handleNotificationNavigation = () => {
        navigation.navigate('NotificationScreen'); // Ensure 'NotificationScreen' exists
    };

    // --- UPDATED handleCoursePress ---
    const handleCoursePress = (course) => {
        console.log("Navigating to course:", course.title, "with ID/Screen Name:", course.id);

        // IMPORTANT: Ensure you have registered screens in your navigator
        // with names matching the 'id' values in the miniCourses array
        // (e.g., 'med101', 'stress1', 'gratitude1', 'sleep1').
        try {
             navigation.navigate(course.id); // Use course.id as the screen name
             // You can also pass params if needed, e.g.:
             // navigation.navigate(course.id, { courseDetails: course });
        } catch (error) {
             console.error(`Navigation Error: Failed to navigate to screen "${course.id}". Is it registered in the navigator?`, error);
             Alert.alert(
                 "Navigation Error",
                 `Could not open the course "${course.title}". Please ensure the app is configured correctly.`
             );
        }
    };
    // ---------------------------------

    // --- Helper to get Wellness Score Color ---
    const getWellnessScoreColor = (score) => {
        if (score === null || score === undefined) return colors.wellnessUnknown;
        if (score >= 80) return colors.wellnessPositive;
        if (score >= 60) return colors.wellnessOkay;
        return colors.wellnessNegative;
    };
    // -----------------------------------------

    // --- JSX Return ---
    return (
        <LinearGradient colors={[colors.backgroundTop, colors.backgroundBottom]} style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                refreshControl={ // Keep RefreshControl
                    <RefreshControl
                        refreshing={isLoadingName || isLoadingWellness} // Show indicator while loading either
                        onRefresh={() => {
                            console.log("Manual refresh triggered");
                            fetchUserName(); // Re-fetch name on refresh too
                            fetchWellnessData();
                            checkAndUpdateStreak(); // Check streak on refresh
                        }}
                        tintColor={colors.primary}
                    />
                }
            >
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Good morning,</Text>
                        <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">
                            {isLoadingName ? 'Loading...' : userName}
                        </Text>
                    </View>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconButton} onPress={handleNotificationNavigation}>
                            <Ionicons name="notifications-outline" size={26} color={colors.iconGrey} />
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.iconButton, styles.profileIconContainer]} onPress={handleProfileNavigation}>
                            <Ionicons name="person-circle-outline" size={30} color={colors.iconGrey} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Wellness Card */}
                <View style={styles.wellnessCard}>
                     <View style={[styles.scoreCircle, { borderColor: isLoadingWellness ? colors.wellnessLoading : getWellnessScoreColor(wellnessScore) }]}>
                        {isLoadingWellness ? ( <ActivityIndicator size="small" color={colors.wellnessLoading} /> )
                         : ( <Text style={[styles.scoreText, { color: getWellnessScoreColor(wellnessScore) }]}>{wellnessScore !== null ? wellnessScore : '--'}</Text> )}
                     </View>
                     <View style={styles.scoreInfo}>
                         <Text style={styles.scoreTitle}>Wellness Score</Text>
                         <View style={styles.scoreSubtitleContainer}>
                             {/* RemovedTouchableOpacity/Icon - can be re-added if history navigation needed here */}
                             <Text style={styles.scoreSubtitle}>{isLoadingWellness ? 'Analyzing moods...' : wellnessSubtitle}</Text>
                         </View>
                     </View>
                 </View>

                {/* Features Container */}
                <View style={styles.featuresContainer}>
                    <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.featureBlue }]} onPress={() => navigation.navigate('Doctors')}> {/* Ensure 'Doctors' screen exists */}
                        <Icon name="stethoscope" size={36} color={colors.white} />
                        <Text style={styles.featureText}>Connect Expert</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.featureGreen }]} onPress={() => navigation.navigate('MindfulBreathWelcome')}> {/* Ensure 'MindfulBreathWelcome' screen exists */}
                        <Icon name="leaf" size={36} color={colors.white} />
                        <Text style={styles.featureText}>Mindful Breath</Text>
                    </TouchableOpacity>
                </View>

                {/* Mood Card */}
                <View style={styles.moodCard}>
                    {/* Mood Header (conditional) */}
                    {!confirmationVisible && (
                        <View style={styles.moodHeader}>
                            <Ionicons name="cloudy-outline" size={20} color={colors.textDark} />
                            <Text style={styles.moodTitle}>{showAddNoteView ? "Add a note" : "How are you feeling today?"}</Text>
                            <TouchableOpacity onPress={handleMoodTrackerNavigation} style={styles.arrowButton}>
                                <Icon name="arrow-right" size={24} color={colors.textDark} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Mood Options (conditional) */}
                    {showMoodOptions && !showAddNoteView && !confirmationVisible && (
                        <>
                            <View style={styles.moodOptionsRow}>
                                {moodOptions.slice(0, 3).map((mood) => (
                                    <TouchableOpacity key={mood.label} style={styles.moodButton} onPress={() => handleMoodSelect(mood.label)}>
                                        <View style={styles.moodButtonContent}>
                                            <LottieView style={styles.moodLottie} source={{ uri: mood.lottieUrl }} autoPlay loop />
                                            <Text style={styles.moodLabel}>{mood.label}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={[styles.moodOptionsRow, { justifyContent: 'center' }]}>
                                {moodOptions.slice(3).map((mood) => (
                                     <TouchableOpacity key={mood.label} style={styles.moodButton} onPress={() => handleMoodSelect(mood.label)}>
                                         <View style={styles.moodButtonContent}>
                                             <LottieView style={styles.moodLottie} source={{ uri: mood.lottieUrl }} autoPlay loop />
                                             <Text style={styles.moodLabel}>{mood.label}</Text>
                                         </View>
                                     </TouchableOpacity>
                                ))}
                            </View>
                        </>
                    )}

                    {/* Add Note View (conditional) */}
                    {showAddNoteView && !confirmationVisible && (
                        <View style={styles.addNoteContainer}>
                            <View style={styles.addNoteHeaderContent}>
                                <Text style={styles.addNoteHeaderText}>Feeling: {pendingMood}</Text>
                                {pendingMood && moodOptions.find(m => m.label === pendingMood)?.lottieUrl && ( // Check if Lottie URL exists
                                     <LottieView
                                         style={styles.addNoteHeaderLottie}
                                         source={{ uri: moodOptions.find(m => m.label === pendingMood)?.lottieUrl }}
                                         autoPlay
                                         loop={false} // Play once
                                     />
                                )}
                            </View>
                            <TextInput
                                style={styles.noteInput}
                                placeholder="Add a note about your mood (optional)..."
                                placeholderTextColor={colors.textSecondary}
                                value={note}
                                onChangeText={setNote}
                                multiline={true}
                                numberOfLines={3} // Suggestion for initial height
                                scrollEnabled={true} // Allow scrolling if text exceeds size
                                returnKeyType="done" // Optional: Set keyboard return key
                                blurOnSubmit={true} // Optional: Dismiss keyboard on done
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

                    {/* Confirmation Card (conditional) */}
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

                {/* Mini Courses Section */}
                <View style={styles.coursesSection}>
                    <Text style={styles.coursesTitle}>Discover Mini Courses</Text>
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coursesScrollView}>
                        {miniCourses.map((course) => (
                            <TouchableOpacity
                                key={course.id}
                                style={[styles.courseCard, { backgroundColor: course.color }]}
                                onPress={() => handleCoursePress(course)} // Directly uses the updated handler
                            >
                                <View style={styles.courseIconContainer}>
                                    <Icon name={course.icon} size={28} color={colors.white} style={styles.courseIcon} />
                                </View>
                                <View style={styles.courseTextContainer}>
                                    <Text style={styles.courseTitle}>{course.title}</Text>
                                    <Text style={styles.courseDescription} numberOfLines={2}>{course.description}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

            </ScrollView>
        </LinearGradient>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120, flexGrow: 1 }, // Added flexGrow
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35, paddingTop: Platform.OS === 'ios' ? 10 : 0 },
    greeting: { fontSize: 16, color: colors.textSecondary },
    userName: { fontSize: 30, color: colors.textDark, fontWeight: '700', marginTop: 4, maxWidth: width * 0.6 }, // Limit width
    headerIcons: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { marginLeft: 18, padding: 6 },
    profileIconContainer: { borderRadius: 22 }, // Ensures padding hits rounded area
    wellnessCard: { backgroundColor: colors.cardBackground, borderRadius: 20, padding: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3, borderWidth: Platform.OS === 'android' ? 0 : 1, borderColor: colors.lightBorder },
    scoreCircle: { width: 75, height: 75, borderRadius: 37.5, borderWidth: 7, backgroundColor: colors.white, justifyContent: 'center', alignItems: 'center', marginRight: 25 },
    scoreText: { fontSize: 30, fontWeight: 'bold' },
    scoreInfo: { flex: 1 }, // Allow text to take remaining space
    scoreTitle: { fontSize: 20, color: colors.textDark, fontWeight: '600', marginBottom: 6 },
    scoreSubtitleContainer: { flexDirection: 'row', alignItems: 'center' },
    scoreSubtitle: { fontSize: 14, color: colors.textSecondary, flexShrink: 1 }, // Allow subtitle to shrink if needed
    // chartIcon: { marginLeft: 10 }, // Removed as icon was removed from JSX above
    featuresContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
    featureCard: { width: width * 0.43, minHeight: 140, borderRadius: 20, justifyContent: 'center', alignItems: 'center', padding: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 5 },
    featureText: { color: colors.white, fontSize: 16, fontWeight: '600', marginTop: 15, textAlign: 'center' },
    moodCard: { backgroundColor: colors.moodYellow, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F5F5DC', minHeight: 250, // Ensure consistent minimum height
         shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, marginBottom: 30 },
    moodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 25 },
    moodTitle: { fontSize: 17, color: colors.textDark, fontWeight: '600', marginLeft: 12, flex: 1 }, // Allow title to take space
    arrowButton: { backgroundColor: 'rgba(255, 255, 255, 0.6)', padding: 8, borderRadius: 16 },
    moodOptionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10, marginTop: 5, alignItems: 'flex-start' }, // Use flex-start for consistent vertical align
    moodButton: { backgroundColor: colors.moodButtonBg, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, borderColor: colors.moodButtonBorder, marginHorizontal: 3, // Spacing between buttons
        minWidth: 85, maxWidth: width * 0.28, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
    moodButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    moodLottie: { width: 22, height: 22, marginRight: 5 },
    moodLabel: { fontSize: 12, color: colors.textDark, fontWeight: '500', flexShrink: 1, textAlign: 'center' },
    addNoteContainer: { marginTop: 15, alignItems: 'center', paddingHorizontal: 5 }, // Added padding
    addNoteHeaderContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    addNoteHeaderText: { fontSize: 16, fontWeight: '500', color: colors.textDark },
    addNoteHeaderLottie: { width: 22, height: 22, marginLeft: 8 },
    noteInput: { backgroundColor: colors.noteInputBg, borderColor: colors.lightBorder, borderWidth: 1, borderRadius: 10, width: '100%', minHeight: 80, // Increased minHeight slightly
        maxHeight: 120, padding: 12, fontSize: 14, textAlignVertical: 'top', marginBottom: 20, color: colors.textDark },
    addNoteActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    saveNoteButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', flex: 1, marginHorizontal: 5, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
    saveNoteButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
    skipNoteButton: { backgroundColor: colors.cardBackground, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primaryDark, flex: 1, marginHorizontal: 5 },
    skipNoteButtonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '600' },
    confirmationCard: { backgroundColor: colors.cardBackground, borderRadius: 20, padding: 25, paddingTop: 50, // More top padding to push content down
        alignItems: 'center', position: 'relative', marginTop: 15, borderWidth: 1, borderColor: colors.lightBorder, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 2, minHeight: 250, // Ensure consistent minimum height
        justifyContent: 'center' }, // Center content vertically
    reloadButton: { position: 'absolute', top: 15, right: 15, padding: 8, zIndex: 10 }, // Ensure it's above content
    checkmarkIcon: { marginBottom: 15 },
    confirmationText: { fontSize: 18, fontWeight: '600', color: colors.textDark, textAlign: 'center' },
    checkInCompleteText: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 15, textAlign: 'center' },
    suggestionText: { marginTop: 10, color: colors.textDark, fontSize: 14, textAlign: 'center', paddingHorizontal: 15, lineHeight: 20, marginBottom: 15 },
    dynamicButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 35, borderRadius: 28, marginTop: 15, alignItems: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 3, elevation: 3 },
    dynamicButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
    coursesSection: { marginTop: 10, marginBottom: 20 },
    coursesTitle: { fontSize: 20, fontWeight: '600', color: colors.textDark, marginBottom: 15 },
    coursesScrollView: { paddingRight: 20 }, // Ensure last card doesn't touch edge
    courseCard: { width: width * 0.65, borderRadius: 15, marginRight: 15, padding: 18, flexDirection: 'column', // Changed to column for better structure
        justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 4, minHeight: 110 }, // Added minHeight
    courseIconContainer: { /*backgroundColor: 'rgba(255,255,255,0.2)',*/ borderRadius: 20, padding: 8, alignSelf: 'flex-start', marginBottom: 10 }, // Removed semi-transparent bg, align icon
    courseIcon: { /* No specific styles needed here unless offset required */ },
    courseTextContainer: { /* Container for text below icon */ },
    courseTitle: { fontSize: 16, fontWeight: 'bold', color: colors.white, marginBottom: 5 },
    courseDescription: { fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 18 },
    // loadingIndicator: { marginVertical: 20, height: 50 }, // Removed style, using ActivityIndicator directly
});

export default HomeScreen;