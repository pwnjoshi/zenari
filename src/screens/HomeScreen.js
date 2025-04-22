import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    RefreshControl,
    // Image, // Not used directly here currently
    Modal // Modal Import
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Keep for icons
import Ionicons from 'react-native-vector-icons/Ionicons'; // Keep for icons
import LottieView from 'lottie-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Video from 'react-native-video'; // Video Import
import { BlurView } from '@react-native-community/blur'; // BlurView Import

// --- Firebase Imports ---
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
// ------------------------
import { HealthConnect, Constants } from 'react-native-health-connect';

// --- Health Connect Integration Placeholder ---
// TODO: Install and import a suitable library, e.g., import * as HealthConnect from 'react-native-health-connect';
// Replace these placeholders with actual library functions if needed outside the fetch function
const checkHealthConnectAvailability = async () => { console.warn("Health Connect check not implemented"); return 'NotSupported'; };
const requestHealthConnectPermissions = async (permissions) => { console.warn("Health Connect permissions request not implemented for:", permissions); return false; };
const readHealthConnectData = async (dataType) => { console.warn(`Health Connect read not implemented for: ${dataType}`); return null; };
// ------------------------------------------

// --- !! DEMO DATA FLAG !! ---
// Set to true to use hardcoded demo data, false to attempt fetching real data
const USE_DEMO_DATA = true;
// ---------------------------

const { width } = Dimensions.get('window');

// --- Colors ---
const colors = { /* ... colors remain the same ... */
    primary: '#2bedbb', primaryDark: '#1AA897', backgroundTop: '#E6F7FF', backgroundBottom: '#D1EFFF', cardBackground: '#FFFFFF', textDark: '#2D5D5E', textSecondary: '#7A8D8E', featureBlue: '#4A90E2', featureGreen: '#4CAF50', moodYellow: '#FFFDE7', moodButtonBg: '#FFFFFF', moodButtonBorder: '#E0E0E0', moodYellowSelected: '#FFF59D', moodBorderSelected: '#FBC02D', navBackground: '#FFFFFF', lightBorder: '#E0E0E0', iconGrey: '#607D8B', noteInputBg: '#F8F8F8', white: '#FFFFFF', error: '#D32F2F', wellnessPositive: '#4CAF50', wellnessOkay: '#FFC107', wellnessNegative: '#F44336', wellnessUnknown: '#90A4AE', wellnessLoading: '#B0BEC5', courseBlue: '#4FC3F7', courseOrange: '#FFB74D', coursePurple: '#BA68C8', gamePurple: '#9C27B0', streakOrange: '#FFA726',
    modalBackdrop: 'rgba(0, 0, 0, 0.4)', modalButtonBlue: '#007AFF',
    gameOverlay: 'rgba(0, 0, 0, 0.3)',
    calendarDayInactive: '#E0E7FF', calendarDayActive: '#2bedbb', calendarDayToday: '#1AA897',
    fitCircleBorder: '#E0E0E0', fitIconColor: '#455A64', fitBackgroundColor: 'rgba(255, 255, 255, 0.7)',
};

// --- Mood Options & Data ---
const moodOptions = [ { emoji: '😄', label: 'Good', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f604/lottie.json' }, { emoji: '😔', label: 'Rough', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f614/lottie.json' } ];
const moodScores = { 'Good': 5, 'Rough': 1 };
const miniCourses = [ { id: 'med101', title: 'Intro to Meditation', description: 'Learn basics', icon: 'brain', color: colors.courseBlue }, { id: 'stress1', title: 'Stress Relief Breaths', description: 'Quick techniques', icon: 'leaf-circle-outline', color: colors.featureGreen }, { id: 'gratitude1', title: 'Gratitude Practice', description: 'Cultivate positivity', icon: 'heart-outline', color: colors.courseOrange }, { id: 'sleep1', title: 'Better Sleep Tips', description: 'Restful nights', icon: 'power-sleep', color: colors.coursePurple }, ];
const POINTS_PER_MOOD_LOG = 10; const POINTS_PER_NOTE = 5; const FIRST_MOOD_ACHIEVEMENT_ID = 'firstMoodLogged'; const FIRST_MOOD_ACHIEVEMENT_NAME = 'First Steps';

// --- Date Helper Functions ---
const isSameDay = (d1, d2) => { /* ... unchanged ... */ if (!d1 || !d2 || !(d1 instanceof Date) || !(d2 instanceof Date)) return false; try { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); } catch (e) { return false; } };
const isYesterday = (d, t) => { /* ... unchanged ... */ if (!d || !t || !(d instanceof Date) || !(t instanceof Date)) return false; try { const e = new Date(t); e.setDate(t.getDate() - 1); return isSameDay(d, e); } catch (e) { return false; } };
const getLast7Days = () => { /* ... unchanged ... */ const dates = []; const today = new Date(); for (let i = 6; i >= 0; i--) { const date = new Date(today); date.setDate(today.getDate() - i); dates.push(date); } return dates; };
const formatMsDuration = (ms) => { /* ... unchanged ... */ if (ms === null || ms === undefined || ms <= 0) return '--'; const totalMinutes = Math.floor(ms / (1000 * 60)); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; let result = ''; if (hours > 0) result += `${hours}h `; if (minutes > 0) result += `${minutes}m`; return result.trim() || '--'; };
// ---------------------------

// --- Demo Data Values ---
const DEMO_DATA = { /* ... unchanged ... */
    userName: 'DemoUser', wellnessSubtitle: 'Feeling good lately!', currentStreakValue: 12,
    activityDays: [true, true, false, true, true, true, true],
    healthConnect: { steps: 7850, sleepMs: 7 * 60 * 60 * 1000 + 30 * 60 * 1000, activityMs: 45 * 60 * 1000, }
};
// ----------------------

const HomeScreen = () => {
    // --- State ---
    const [userName, setUserName] = useState(USE_DEMO_DATA ? DEMO_DATA.userName : '');
    const [isLoadingName, setIsLoadingName] = useState(!USE_DEMO_DATA);
    const [wellnessScore, setWellnessScore] = useState(null);
    const [wellnessSubtitle, setWellnessSubtitle] = useState(USE_DEMO_DATA ? DEMO_DATA.wellnessSubtitle : 'Loading...');
    const [isLoadingWellness, setIsLoadingWellness] = useState(!USE_DEMO_DATA);
    const [currentStreakValue, setCurrentStreakValue] = useState(USE_DEMO_DATA ? DEMO_DATA.currentStreakValue : 0);
    const [isStreakModalVisible, setStreakModalVisible] = useState(false);
    const [streakToShowInModal, setStreakToShowInModal] = useState(0);
    const [activityDays, setActivityDays] = useState(USE_DEMO_DATA ? DEMO_DATA.activityDays : Array(7).fill(false));

    // State for Health Connect data
    const [healthConnectData, setHealthConnectData] = useState(USE_DEMO_DATA ? DEMO_DATA.healthConnect : { steps: null, sleepMs: null, activityMs: null });
    const [isLoadingHealthData, setIsLoadingHealthData] = useState(!USE_DEMO_DATA);

    // Mood logging state
    const [selectedMood, setSelectedMood] = useState(null); const [confirmationVisible, setConfirmationVisible] = useState(false); const [suggestionText, setSuggestionText] = useState(''); const [moodAnimation] = useState(new Animated.Value(0)); const [dynamicButtonText, setDynamicButtonText] = useState(''); const [showMoodOptions, setShowMoodOptions] = useState(true); const [showAddNoteView, setShowAddNoteView] = useState(false); const [note, setNote] = useState(''); const [pendingMood, setPendingMood] = useState(null);

    const navigation = useNavigation();
    const hasShownModalThisSessionRef = useRef(false);

    // --- Functions ---

    const fetchUserName = useCallback(async () => { /* ... unchanged ... */ if (USE_DEMO_DATA) { setUserName(DEMO_DATA.userName); setIsLoadingName(false); return; } setIsLoadingName(true); const user = auth().currentUser; if(user){ try { const doc = await firestore().collection('users').doc(user.uid).get(); const name = doc.exists ? doc.data()?.fullName : null; setUserName(name ? name.split(' ')[0] : 'Friend'); } catch(e) { console.error("Err fetch name:",e); setUserName('Friend'); } } else { setUserName('Friend'); } setIsLoadingName(false); },[]);
    const analyzeMoodsAndScore = (moodHistory) => { /* ... unchanged ... */ const activityDates = new Set(); if (!moodHistory || moodHistory.length === 0) { return { score: null, subtitle: 'Log your mood to see insights.', activityDates }; } let totalScoreValue = 0, scoredCount = 0; moodHistory.forEach(entry => { const scoreValue = moodScores[entry.mood]; if (scoreValue !== undefined) { totalScoreValue += scoreValue; scoredCount++; } if (entry.timestamp && typeof entry.timestamp.toDate === 'function') { try { const date = entry.timestamp.toDate(); activityDates.add(date.toDateString()); } catch(e) { /* ignore */ } } }); const averageOutOf5 = scoredCount > 0 ? (totalScoreValue / scoredCount) : null; const scoreOutOf100 = averageOutOf5 !== null ? Math.round(averageOutOf5 * 20) : null; let subtitle = "Keep tracking your moods!"; if (scoreOutOf100 === null) { subtitle = "Log your mood to see insights."; } else if (scoreOutOf100 >= 70) { subtitle = "Feeling good lately!"; } else if (scoreOutOf100 >= 40) { subtitle = "Doing okay overall."; } else { subtitle = "Seems a bit rough recently."; } return { score: scoreOutOf100, subtitle: subtitle, activityDates }; };
    const fetchWellnessAndActivityData = useCallback(async () => { /* ... unchanged ... */ if (USE_DEMO_DATA) { setWellnessSubtitle(DEMO_DATA.wellnessSubtitle); setActivityDays(DEMO_DATA.activityDays); setIsLoadingWellness(false); return; } setIsLoadingWellness(true); setWellnessScore(null); setWellnessSubtitle('Loading...'); setActivityDays(Array(7).fill(false)); const user = auth().currentUser; if (!user) { setWellnessSubtitle('Log in to track wellness'); setIsLoadingWellness(false); return; } try { const userId = user.uid; const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0); const sevenDaysAgoTimestamp = firestore.Timestamp.fromDate(sevenDaysAgo); const querySnapshot = await firestore().collection('users').doc(userId).collection('moodHistory').where('timestamp', '>=', sevenDaysAgoTimestamp).orderBy('timestamp', 'desc').limit(30).get(); const fetchedMoods = querySnapshot.docs.map(doc => ({ mood: doc.data().mood, timestamp: doc.data().timestamp })); const wellnessInfo = analyzeMoodsAndScore(fetchedMoods); setWellnessScore(wellnessInfo.score); setWellnessSubtitle(wellnessInfo.subtitle); const last7Days = getLast7Days(); const newActivityDays = last7Days.map(dayDate => wellnessInfo.activityDates.has(dayDate.toDateString())); setActivityDays(newActivityDays); console.log("Activity Days:", newActivityDays); } catch (e) { console.error("Err fetch wellness/activity:", e); setWellnessScore(null); setWellnessSubtitle('Could not load data.'); } finally { setIsLoadingWellness(false); } }, []);

    // --- Placeholder Function for Health Connect Data ---
    const fetchHealthConnectData = useCallback(async () => {
        if (USE_DEMO_DATA) { setHealthConnectData(DEMO_DATA.healthConnect); setIsLoadingHealthData(false); return; } // Use Demo Data

        setIsLoadingHealthData(true);
        const user = auth().currentUser;
        if (!user) { setIsLoadingHealthData(false); return; }

        console.log("Attempting to fetch Health Connect data (Placeholder)...");
        // --------------------------------------------------
        // TODO: Replace with ACTUAL Health Connect library calls
        // --------------------------------------------------
        // 1. Import your chosen Health Connect library:
        //    e.g., import * as HealthConnect from 'react-native-health-connect';

        try {
            // 2. Check if Health Connect is available/installed (using library function)
            //    const isAvailable = await HealthConnect.isAvailable();
            //    if (!isAvailable) { throw new Error('Health Connect not available'); }

            // 3. Define needed permissions (using library's constants/helpers)
            //    const permissions = [
            //      HealthConnect.Permissions.Steps,
            //      HealthConnect.Permissions.SleepSession,
            //      HealthConnect.Permissions.ActiveMinutes // Or ExerciseSession, depending on library
            //    ];
            // const readPermissions = permissions.map(p => p.Read);

            // 4. Request Permissions (using library function)
            //    const granted = await HealthConnect.requestPermissions(readPermissions);
            //    if (!granted) { throw new Error('Permissions not granted'); }

            // 5. Fetch data for today (using library functions)
            //    const today = new Date();
            //    const startOfDay = new Date(today.setHours(0,0,0,0));
            //    const endOfDay = new Date(today.setHours(23,59,59,999));
            //    const options = { startDate: startOfDay.toISOString(), endDate: endOfDay.toISOString() };

            //    const stepsResult = await HealthConnect.readSteps(options); // Example
            //    const sleepResult = await HealthConnect.readSleepSessions(options); // Example
            //    const activityResult = await HealthConnect.readActivity(options); // Example (library specific)

            //    // --- FAKE DATA / Placeholder ---
            await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
            const fetchedSteps = 0; // Process stepsResult
            const fetchedSleepMs = 0; // Process sleepResult
            const fetchedActivityMs = 0; // Process activityResult
            //    // --- END FAKE DATA ---

             setHealthConnectData({ steps: fetchedSteps, sleepMs: fetchedSleepMs, activityMs: fetchedActivityMs });

        } catch (err) {
             console.error("Error fetching Health Connect data (Placeholder):", err);
             // Handle specific errors like permissions denied, Health Connect not installed etc.
             Alert.alert("Health Data Error", `Could not load health data: ${err.message}. Make sure Health Connect is installed and permissions are granted.`);
             setHealthConnectData({ steps: null, sleepMs: null, activityMs: null }); // Clear on error
        } finally {
            setIsLoadingHealthData(false);
        }
        // --------------------------------------------------
    }, []);

    const checkAndUpdateStreak = useCallback(async () => { /* ... unchanged ... */ const user = auth().currentUser; if (!user) return; const userId = user.uid; const statsRef = firestore().collection('users').doc(userId).collection('stats').doc('summary'); try { const statsDoc = await statsRef.get(); const statsData = statsDoc.exists ? statsDoc.data() : {}; const lastTs = statsData.lastActivityDate; const currentStreakInDB = statsData.currentStreak || 0; const today = new Date(); let lastDate = null; if (lastTs && typeof lastTs.toDate === 'function') { try { lastDate = lastTs.toDate(); } catch (e) { lastDate = null; } } if (lastDate && isSameDay(lastDate, today)) { return; } let newStreak = 1; if (lastDate && isYesterday(lastDate, today)) { newStreak = currentStreakInDB + 1; } if (newStreak !== currentStreakInDB || !lastDate || !isSameDay(lastDate, today)) { await statsRef.set({ currentStreak: newStreak, lastActivityDate: firestore.FieldValue.serverTimestamp() }, { merge: true }); console.log(`[STREAK LOGIC] DB Updated: Streak ${currentStreakInDB} -> ${newStreak}`); } } catch (error) { console.error("Error check/update streak:", error); } }, []);

    // --- Effects ---
    useEffect(() => { fetchUserName(); }, [fetchUserName]);
    useEffect(() => { /* ... unchanged streak listener ... */ const currentUser = auth().currentUser; if (!currentUser) { setCurrentStreakValue(0); hasShownModalThisSessionRef.current = false; return; } const userId = currentUser.uid; const statsRef = firestore().collection('users').doc(userId).collection('stats').doc('summary'); const unsubscribe = statsRef.onSnapshot( (docSnapshot) => { const streakFromDB = docSnapshot.exists ? (docSnapshot.data()?.currentStreak || 0) : 0; setCurrentStreakValue(streakFromDB); }, (error) => { console.error("[STREAK LISTENER] Error:", error); setCurrentStreakValue(0); } ); return () => unsubscribe(); }, []);
    useEffect(() => { /* ... unchanged streak modal logic ... */ const currentUser = auth().currentUser; if (currentUser && !hasShownModalThisSessionRef.current) { const checkAndShow = async () => { await checkAndUpdateStreak(); try { const userId=currentUser.uid; const sRef=firestore().collection('users').doc(userId).collection('stats').doc('summary'); const sDoc=await sRef.get(); const lStreak=sDoc.exists?(sDoc.data()?.currentStreak||0):0; if(lStreak>0){setStreakToShowInModal(lStreak);setStreakModalVisible(true);}}catch(e){console.error("Err fetch streak modal:",e);} hasShownModalThisSessionRef.current=true;}; checkAndShow();} else if(!currentUser){hasShownModalThisSessionRef.current=false;} }, [checkAndUpdateStreak]);

    useFocusEffect(useCallback(() => {
        console.log("HomeScreen focused - Fetching data...");
        const user = auth().currentUser;
        if (user || USE_DEMO_DATA) {
            fetchUserName();
            fetchWellnessAndActivityData();
            fetchHealthConnectData(); // Fetch Health Connect data placeholder
            checkAndUpdateStreak();
        } else {
             setUserName('Friend'); setWellnessScore(null); setWellnessSubtitle('Log in to track wellness'); setActivityDays(Array(7).fill(false)); setCurrentStreakValue(0); setHealthConnectData({ steps: null, sleepMs: null, activityMs: null }); setIsLoadingName(false); setIsLoadingWellness(false); setIsLoadingHealthData(false); hasShownModalThisSessionRef.current = false;
        }
        return () => { console.log("HomeScreen blurred - Hiding streak modal if visible"); setStreakModalVisible(false); };
    }, [checkAndUpdateStreak, fetchUserName, fetchWellnessAndActivityData, fetchHealthConnectData])); // Add fetchHealthConnectData dependency

    // --- Mood Handling Functions ---
    const handleMoodSelect = (mood) => { /* ... unchanged ... */ setPendingMood(mood); setShowMoodOptions(false); setConfirmationVisible(false); setNote(''); setShowAddNoteView(true); };
    const handleSaveMoodAndNote = async () => { /* ... unchanged mood saving logic, triggers fetchWellnessAndActivityData, fetchHealthConnectData ... */ Keyboard.dismiss(); if (!pendingMood) return; const currentUser = auth().currentUser; if (!currentUser) { Alert.alert("Error", "Logged out."); return; } const userId = currentUser.uid; const moodToSave = pendingMood; const noteToSave = note.trim(); const moodData = { mood: moodToSave, note: noteToSave, timestamp: firestore.FieldValue.serverTimestamp(), userId: userId }; let pointsToAdd = POINTS_PER_MOOD_LOG + (noteToSave.length > 0 ? POINTS_PER_NOTE : 0); const moodHistoryCollectionRef = firestore().collection('users').doc(userId).collection('moodHistory'); const gamificationRef = firestore().collection('users').doc(userId).collection('gamification').doc('summary'); const firstMoodAchievementRef = firestore().collection('users').doc(userId).collection('achievements').doc(FIRST_MOOD_ACHIEVEMENT_ID); const statsRef = firestore().collection('users').doc(userId).collection('stats').doc('summary'); let isFirstMoodEver = false; try { const existingMoodSnapshot = await moodHistoryCollectionRef.limit(1).get(); isFirstMoodEver = existingMoodSnapshot.empty; } catch(error) { console.error("Err checking mood:", error); Alert.alert("Error", "Verify history fail."); return; } try { await firestore().runTransaction(async (t) => { const newMoodRef = moodHistoryCollectionRef.doc(); t.set(newMoodRef, moodData); t.set(gamificationRef, { points: firestore.FieldValue.increment(pointsToAdd), lastUpdated: firestore.FieldValue.serverTimestamp() }, { merge: true }); if (isFirstMoodEver) { const achievementDoc = await t.get(firstMoodAchievementRef); if (!achievementDoc.exists || !achievementDoc.data()?.earned) { t.set(firstMoodAchievementRef, { id: FIRST_MOOD_ACHIEVEMENT_ID, name: FIRST_MOOD_ACHIEVEMENT_NAME, earned: true, earnedAt: firestore.FieldValue.serverTimestamp() }, { merge: true }); Alert.alert("Achievement!", `"${FIRST_MOOD_ACHIEVEMENT_NAME}" earned!`); } } t.set(statsRef, { sessions: firestore.FieldValue.increment(1), lastActivityDate: firestore.FieldValue.serverTimestamp() }, { merge: true }); }); await checkAndUpdateStreak(); } catch (error) { console.error("Err transaction: ", error); Alert.alert("Error Saving", `Could not save. ${error.message}`); return; } setSelectedMood(moodToSave); setShowAddNoteView(false); switch (moodToSave) { case 'Rough': setSuggestionText("Chat with AI or try breathing?"); setDynamicButtonText("Chat with AI"); break; case 'Good': setSuggestionText("Reflect or try mindful breathing?"); setDynamicButtonText("Mindful Breath"); break; default: setSuggestionText(""); setDynamicButtonText(""); } Animated.spring(moodAnimation, { toValue: 1, friction: 4, useNativeDriver: true }).start(() => { Animated.spring(moodAnimation, { toValue: 0, friction: 4, useNativeDriver: true }).start(); }); setConfirmationVisible(true); setPendingMood(null); fetchWellnessAndActivityData(); fetchHealthConnectData(); };
    const handleDynamicButtonClick = () => { /* ... unchanged ... */ if (dynamicButtonText === "Chat with AI") { navigation.navigate('ChatScreen'); } else if (dynamicButtonText === "Mindful Breath") { navigation.navigate('MindfulBreathWelcome'); } };
    const handleReload = () => { /* ... unchanged ... */ setConfirmationVisible(false); setShowAddNoteView(false); setShowMoodOptions(true); setSelectedMood(null); setPendingMood(null); setNote(''); setSuggestionText(''); setDynamicButtonText(''); };

    // --- Navigation Functions ---
    const handleMoodTrackerNavigation = () => { navigation.navigate('MoodTrackerScreen'); };
    const handleProfileNavigation = () => { navigation.navigate('ProfileScreen'); };
    const handleNotificationNavigation = () => { navigation.navigate('NotificationScreen'); };
    const handleCoursePress = (course) => { /* ... unchanged ... */ try { navigation.navigate(course.id); } catch (e) { console.error(`Nav Error: screen "${course.id}".`, e); Alert.alert("Nav Error", `Could not open "${course.title}".`); } };
    const handleGameNavigation = () => { /* ... unchanged ... */ try { navigation.navigate('GameScreen'); } catch (e) { console.error(`Nav Error: screen "GameScreen".`, e); Alert.alert("Nav Error", "Could not open game."); } };

    // --- Helper Functions ---
    const getWellnessScoreColor = (score) => { /* ... unchanged ... */ if (score === null || score === undefined) return colors.wellnessUnknown; if (score >= 70) return colors.wellnessPositive; if (score >= 40) return colors.wellnessOkay; return colors.wellnessNegative; };
    const getStreakSubtitle = (streak) => { /* ... unchanged ... */ if (streak <= 0) return "Log your mood daily to start a streak!"; if (streak === 1) return "Great start! Keep it up tomorrow!"; if (streak < 7) return `That's ${streak} days in a row! Fantastic consistency!`; if (streak < 14) return "Wow, a full week straight! You're building a strong habit."; if (streak < 30) return `${streak} days straight! Amazing dedication!`; return "Incredible! You're making wellness a priority every day!"; };
    const renderStreakCalendar = () => { /* ... unchanged ... */ const days = getLast7Days(); const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; return ( <View style={styles.streakCalendarContainer}>{days.map((day, index) => { const isActive = activityDays[index]; const isToday = isSameDay(day, new Date()); const dayOfWeek = day.getDay(); return ( <View key={index} style={styles.dayContainer}><Text style={styles.dayLabelText}>{dayLabels[dayOfWeek]}</Text><View style={[styles.dayIndicator, isActive && styles.dayIndicatorActive,]}>{isToday && <View style={styles.todayMarker} />}</View></View> ); })}</View> ); };

    // --- Render Health Connect Data Item ---
    const renderHealthConnectDataItem = (iconName, value, unit, isLoading) => {
         let displayValue = '--';
         if (isLoading) {
             displayValue = <ActivityIndicator size="small" color={colors.wellnessLoading} />;
         } else if (value !== null && value !== undefined) {
             if (unit === 'steps') displayValue = value.toLocaleString();
             else if (unit === 'sleep' || unit === 'activity') displayValue = formatMsDuration(value);
             else displayValue = value;
             // Ensure displayValue is always a string or element for Text component
             if (typeof displayValue !== 'string' && !React.isValidElement(displayValue)) {
                 displayValue = '--'; // Fallback if formatting fails
             }
         }
        return (
            <View style={styles.fitDataCircle}>
                 <Icon name={iconName} size={32} color={colors.fitIconColor} style={styles.fitDataIcon}/>
                 <Text style={styles.fitDataValue}>
                     {displayValue}
                 </Text>
            </View>
        );
    };
    // ------------------------------------------

    // --- JSX Return ---
    return (
        <LinearGradient colors={[colors.backgroundTop, colors.backgroundBottom]} style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                refreshControl={ <RefreshControl refreshing={isLoadingName || isLoadingWellness || isLoadingHealthData} onRefresh={() => { fetchUserName(); fetchWellnessAndActivityData(); fetchHealthConnectData(); checkAndUpdateStreak(); }} tintColor={colors.primary} /> }
            >
                {/* Header */}
                 <View style={styles.header}>
                     <View style={styles.headerLeft}>
                         <Text style={styles.greeting}>Good morning,</Text>
                         <Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">{isLoadingName ? 'Loading...' : userName}</Text>
                     </View>
                     <View style={styles.headerRight}>
                         <TouchableOpacity style={styles.iconButton} onPress={handleNotificationNavigation}><Ionicons name="notifications-outline" size={26} color={colors.iconGrey} /></TouchableOpacity>
                         <TouchableOpacity style={[styles.iconButton, styles.profileIconContainer]} onPress={handleProfileNavigation}><Ionicons name="person-circle-outline" size={30} color={colors.iconGrey} /></TouchableOpacity>
                     </View>
                 </View>

                 {/* Health Connect Data Section (Below Header) */}
                 <View style={styles.fitDataSection}>
                      {renderHealthConnectDataItem("shoe-print", healthConnectData.steps, 'steps', isLoadingHealthData)}
                      {renderHealthConnectDataItem("power-sleep", healthConnectData.sleepMs, 'sleep', isLoadingHealthData)}
                      {renderHealthConnectDataItem("walk", healthConnectData.activityMs, 'activity', isLoadingHealthData)}
                 </View>
                 {/* --- End Health Connect Section --- */}

                 {/* Insights Card (Streak + Mood Subtitle Only) */}
                 <View style={styles.insightsCard}>
                     <View style={styles.insightsHeaderRow}>
                          <Text style={styles.insightsTitle}>Your Progress</Text>
                          <Text style={styles.wellnessSubtitleStyle} numberOfLines={1}>
                               {isLoadingWellness ? 'Loading insights...' : wellnessSubtitle}
                           </Text>
                      </View>
                      <View style={styles.insightsRow}>
                         <View style={styles.streakInfoContainer}>
                              <View style={styles.streakValueRow}>
                                  <Icon name="fire" size={28} color={colors.streakOrange} style={styles.streakIconBig}/>
                                  <Text style={styles.streakValueBig}>{currentStreakValue}</Text>
                              </View>
                             <Text style={styles.streakInfoSubtitle}>Day Streak</Text>
                         </View>
                         {renderStreakCalendar()}
                     </View>
                 </View>
                 {/* --- End Insights Card --- */}


                {/* Features Container */}
                <View style={styles.featuresContainer}>
                    {/* ... Feature Cards unchanged ... */}
                    <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.featureBlue }]} onPress={() => navigation.navigate('Doctors')}>
                         <Icon name="stethoscope" size={36} color={colors.white} />
                         <Text style={styles.featureText}>Connect Expert</Text>
                     </TouchableOpacity>
                     <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.featureGreen }]} onPress={() => navigation.navigate('MindfulBreathWelcome')}>
                         <Icon name="leaf" size={36} color={colors.white} />
                         <Text style={styles.featureText}>Mindful Breath</Text>
                     </TouchableOpacity>
                </View>

                {/* Game Section */}
                <View style={styles.gameCard}>
                     {/* ... Game Card unchanged ... */}
                     <Video source={require('../assets/a.mp4')} style={styles.backgroundVideo} repeat={true} resizeMode="cover" muted={true} paused={false} ignoreSilentSwitch={"obey"} onError={(e) => console.log("Video Error:", e)} />
                     <BlurView style={styles.blurView} blurType="light" blurAmount={8} />
                     <View style={styles.gameCardOverlay} />
                     <View style={styles.gameCardContent}>
                         <Icon name="gamepad-variant-outline" size={36} color={colors.white} style={styles.gameIcon} />
                         <View style={styles.gameTextContainer}> <Text style={styles.gameTitle}>Feeling Playful?</Text> <Text style={styles.gameDescription}>Take a short break and play a relaxing game to reset your mind.</Text> </View>
                         <TouchableOpacity style={styles.gameButton} onPress={handleGameNavigation}> <Text style={styles.gameButtonText}>Play Now</Text> <Icon name="arrow-right-circle" size={20} color={colors.white} style={{marginLeft: 8}}/> </TouchableOpacity>
                     </View>
                </View>

                {/* Mini Courses Section */}
                <View style={styles.coursesSection}>
                     {/* ... Courses unchanged ... */}
                     <Text style={styles.coursesTitle}>Discover Mini Courses</Text>
                     <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coursesScrollView}>
                         {miniCourses.map((course) => (
                             <TouchableOpacity key={course.id} style={[styles.courseCard, { backgroundColor: course.color }]} onPress={() => handleCoursePress(course)} >
                                 <View style={styles.courseIconContainer}><Icon name={course.icon} size={28} color={colors.white} style={styles.courseIcon} /></View>
                                 <View style={styles.courseTextContainer}><Text style={styles.courseTitle}>{course.title}</Text><Text style={styles.courseDescription} numberOfLines={2}>{course.description}</Text></View>
                             </TouchableOpacity>
                         ))}
                     </ScrollView>
                </View>

                {/* Mood Card */}
                <View style={styles.moodCard}>
                     {/* ... Mood Card unchanged ... */}
                     { !confirmationVisible && ( <View style={styles.moodHeader}> <Ionicons name="cloudy-outline" size={20} color={colors.textDark} /> <Text style={styles.moodTitle}>{showAddNoteView ? "Add a note" : "How are you feeling today?"}</Text> <TouchableOpacity onPress={handleMoodTrackerNavigation} style={styles.arrowButton}> <Icon name="arrow-right" size={24} color={colors.textDark} /> </TouchableOpacity> </View> )}
                     { showMoodOptions && !showAddNoteView && !confirmationVisible && ( <View style={styles.moodOptionsContainer}> <View style={styles.moodOptionsRow}> {moodOptions.map((mood) => ( <TouchableOpacity key={mood.label} style={styles.moodButton} onPress={() => handleMoodSelect(mood.label)}> <View style={styles.moodButtonContent}> <LottieView style={styles.moodLottie} source={{ uri: mood.lottieUrl }} autoPlay loop /> <Text style={styles.moodLabel}>{mood.label}</Text> </View> </TouchableOpacity> ))} </View> </View> )}
                     { showAddNoteView && !confirmationVisible && ( <View style={styles.addNoteContainer}> <View style={styles.addNoteHeaderContent}> <Text style={styles.addNoteHeaderText}>Feeling: {pendingMood}</Text> {pendingMood && moodOptions.find(m => m.label === pendingMood)?.lottieUrl && ( <LottieView style={styles.addNoteHeaderLottie} source={{ uri: moodOptions.find(m => m.label === pendingMood)?.lottieUrl }} autoPlay loop={false} /> )} </View> <TextInput style={styles.noteInput} placeholder="Add a note about your mood (optional)..." placeholderTextColor={colors.textSecondary} value={note} onChangeText={setNote} multiline={true} numberOfLines={3} scrollEnabled={true} returnKeyType="done" blurOnSubmit={true} /> <View style={styles.addNoteActionsContainer}> <TouchableOpacity style={styles.skipNoteButton} onPress={handleSaveMoodAndNote}><Text style={styles.skipNoteButtonText}>Skip Note</Text></TouchableOpacity> <TouchableOpacity style={styles.saveNoteButton} onPress={handleSaveMoodAndNote}><Text style={styles.saveNoteButtonText}>Save Mood</Text></TouchableOpacity> </View> </View> )}
                     { confirmationVisible && ( <View style={styles.confirmationCard}> <TouchableOpacity onPress={handleReload} style={styles.reloadButton}><Icon name="reload" size={24} color={colors.iconGrey} /></TouchableOpacity> <Icon name="check-circle" size={30} color={colors.featureGreen} style={styles.checkmarkIcon} /> <Text style={styles.confirmationText}>You're feeling {selectedMood}!</Text> <Text style={styles.checkInCompleteText}>Check-in complete!</Text> {suggestionText ? <Text style={styles.suggestionText}>{suggestionText}</Text> : null} {dynamicButtonText && ( <TouchableOpacity onPress={handleDynamicButtonClick} style={styles.dynamicButton}><Text style={styles.dynamicButtonText}>{dynamicButtonText}</Text></TouchableOpacity> )} </View> )}
                </View>

            </ScrollView>

            {/* Streak Popup Modal */}
             <Modal animationType="slide" transparent={true} visible={isStreakModalVisible} onRequestClose={() => setStreakModalVisible(false)} >
                 {/* ... Modal unchanged ... */}
                 <View style={styles.modalOverlay}>
                     <View style={styles.modalContent}>
                         <Icon name="fire" size={60} color={colors.streakOrange} style={styles.modalIcon} />
                         <Text style={styles.modalTitle}>{streakToShowInModal} day streak!</Text>
                         <Text style={styles.modalSubtitle}>{getStreakSubtitle(streakToShowInModal)}</Text>
                         <TouchableOpacity style={styles.modalButton} onPress={() => setStreakModalVisible(false)} >
                             <Text style={styles.modalButtonText}>Continue</Text>
                         </TouchableOpacity>
                     </View>
                 </View>
             </Modal>

        </LinearGradient>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 40, flexGrow: 1 },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 5, // Reduce space before Fit data
        paddingHorizontal: 5, paddingTop: Platform.OS === 'ios' ? 10 : 0
    },
    headerLeft: { marginRight: 10 },
    greeting: { fontSize: 16, color: colors.textSecondary, marginBottom: 2 },
    userName: { fontSize: 26, color: colors.textDark, fontWeight: '700' },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    iconButton: { marginLeft: 8, padding: 6 },
    profileIconContainer: { borderRadius: 22 },

    // --- Health Connect Display Styles (Below Header) ---
    fitDataSection: { // Container for the row of fit circles
        flexDirection: 'row',
        justifyContent: 'space-around', // Distribute circles evenly
        alignItems: 'center',
        marginVertical: 25, // INCREASED vertical space
        paddingHorizontal: 5,
    },
    fitDataCircle: { // Made LARGER
        width: width * 0.26, // Slightly larger percentage
        height: width * 0.26,
        maxWidth: 100, // Increased max size
        maxHeight: 100,
        borderRadius: 50, // Half of max height/width
        borderWidth: 2,
        borderColor: colors.fitCircleBorder,
        backgroundColor: colors.fitBackgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8, // Adjusted padding
    },
    fitDataIcon: {
        marginBottom: 6, // More space
    },
    fitDataValue: {
        fontSize: 18, // Larger font size for data
        fontWeight: '700',
        color: colors.textDark,
        marginTop: 2,
    },
    // --- End Health Connect Styles ---

    // --- UPDATED Insights Card Styles ---
    insightsCard: {
         backgroundColor: colors.cardBackground, borderRadius: 20, paddingVertical: 15, paddingHorizontal: 20,
         marginBottom: 25, borderWidth: Platform.OS === 'android' ? 0 : 1, borderColor: colors.lightBorder, shadowColor: "#000", shadowOffset: { width: 0, height: 1, }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
    },
    insightsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, },
     insightsTitle: { fontSize: 16, fontWeight: '600', color: colors.textDark, },
     wellnessSubtitleStyle: { fontSize: 12, color: colors.textSecondary, flexShrink: 1, textAlign: 'right', marginLeft: 10, },
    insightsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', },
    streakInfoContainer: { alignItems: 'center', marginRight: 15, },
    streakValueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, },
    streakIconBig: { marginRight: 4, },
    streakValueBig: { fontSize: 30, fontWeight: 'bold', color: colors.streakOrange, },
    streakInfoSubtitle: { fontSize: 12, color: colors.textSecondary, },
    streakCalendarContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', },
    dayContainer: { alignItems: 'center', },
    dayLabelText: { fontSize: 11, color: colors.textSecondary, marginBottom: 4, fontWeight: '500', },
    dayIndicator: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.calendarDayInactive, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.05)', },
    dayIndicatorActive: { backgroundColor: colors.calendarDayActive, borderColor: colors.primaryDark, borderWidth: 1.5, },
    todayMarker: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.calendarDayToday, position: 'absolute', bottom: 3, },
    // --- End Insights Card Styles ---

    featuresContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    featureCard: { width: width * 0.44, minHeight: 140, borderRadius: 20, justifyContent: 'center', alignItems: 'center', padding: 15 },
    featureText: { color: colors.white, fontSize: 16, fontWeight: '600', marginTop: 15, textAlign: 'center' },
    gameCard: { borderRadius: 20, marginBottom: 25, alignItems: 'center', overflow: 'hidden', position: 'relative', backgroundColor: colors.cardBackground, borderWidth: Platform.OS === 'android' ? 0 : 1, borderColor: colors.lightBorder, },
    backgroundVideo: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, },
    blurView: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, zIndex: 1 },
    gameCardOverlay: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, backgroundColor: colors.gameOverlay, borderRadius: 20, zIndex: 2, },
    gameCardContent: { padding: 20, alignItems: 'center', width: '100%', zIndex: 3, },
    gameIcon: { marginBottom: 10, },
    gameTextContainer: { alignItems: 'center', marginBottom: 20, },
    gameTitle: { fontSize: 18, fontWeight: '600', color: colors.white, marginBottom: 5, },
    gameDescription: { fontSize: 14, color: 'rgba(255, 255, 255, 0.95)', textAlign: 'center', paddingHorizontal: 10, lineHeight: 18 },
    gameButton: { backgroundColor: colors.gamePurple, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, flexDirection: 'row', alignItems: 'center', },
    gameButtonText: { color: colors.white, fontSize: 16, fontWeight: '600', },
    coursesSection: { marginTop: 0, marginBottom: 25 },
    coursesTitle: { fontSize: 20, fontWeight: '600', color: colors.textDark, marginBottom: 15 },
    coursesScrollView: { paddingLeft: 5, paddingRight: 20 },
    courseCard: { width: width * 0.6, borderRadius: 15, marginRight: 15, padding: 18, flexDirection: 'column', justifyContent: 'space-between', minHeight: 110 },
    courseIconContainer: { borderRadius: 20, padding: 8, alignSelf: 'flex-start', marginBottom: 10 },
    courseIcon: {}, courseTextContainer: {},
    courseTitle: { fontSize: 16, fontWeight: 'bold', color: colors.white, marginBottom: 5 },
    courseDescription: { fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 18 },
    moodCard: { backgroundColor: colors.moodYellow, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#EDE7B0', marginBottom: 30, },
    moodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, },
    moodTitle: { fontSize: 17, color: colors.textDark, fontWeight: '600', marginLeft: 12, flex: 1 },
    arrowButton: { backgroundColor: 'rgba(255, 255, 255, 0.6)', padding: 8, borderRadius: 16 },
    moodOptionsContainer: { alignItems: 'center', width: '100%', marginBottom: 15, },
    moodOptionsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-start', width: '100%', },
    moodButton: { backgroundColor: colors.moodButtonBg, paddingVertical: 15, paddingHorizontal: 10, borderRadius: 18, borderWidth: 1, borderColor: colors.moodButtonBorder, alignItems: 'center', flex: 1, marginHorizontal: 5, },
    moodButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    moodLottie: { width: 26, height: 26, marginRight: 6 },
    moodLabel: { fontSize: 14, color: colors.textDark, fontWeight: '500', flexShrink: 1, textAlign: 'center' },
    addNoteContainer: { marginTop: 15, alignItems: 'center', },
    addNoteHeaderContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    addNoteHeaderText: { fontSize: 16, fontWeight: '500', color: colors.textDark },
    addNoteHeaderLottie: { width: 22, height: 22, marginLeft: 8 },
    noteInput: { backgroundColor: colors.noteInputBg, borderColor: colors.lightBorder, borderWidth: 1, borderRadius: 10, width: '100%', minHeight: 80, maxHeight: 120, padding: 12, fontSize: 14, textAlignVertical: 'top', marginBottom: 20, color: colors.textDark },
    addNoteActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    saveNoteButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', flex: 1, marginHorizontal: 5, },
    saveNoteButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
    skipNoteButton: { backgroundColor: colors.cardBackground, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primaryDark, flex: 1, marginHorizontal: 5 },
    skipNoteButtonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '600' },
    confirmationCard: { backgroundColor: colors.cardBackground, borderRadius: 20, padding: 25, paddingTop: 50, alignItems: 'center', position: 'relative', marginTop: 15, borderWidth: 1, borderColor: colors.lightBorder, minHeight: 230, justifyContent: 'center' },
    reloadButton: { position: 'absolute', top: 15, right: 15, padding: 8, zIndex: 10 },
    checkmarkIcon: { marginBottom: 15 },
    confirmationText: { fontSize: 18, fontWeight: '600', color: colors.textDark, textAlign: 'center' },
    checkInCompleteText: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 15, textAlign: 'center' },
    suggestionText: { marginTop: 10, color: colors.textDark, fontSize: 14, textAlign: 'center', paddingHorizontal: 15, lineHeight: 20, marginBottom: 15 },
    dynamicButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 35, borderRadius: 28, marginTop: 15, alignItems: 'center', },
    dynamicButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.modalBackdrop, },
    modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 30, alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 40 : 30, },
    modalIcon: { marginBottom: 20, },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textDark, marginBottom: 10, textAlign: 'center', },
    modalSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 22, },
    modalButton: { backgroundColor: colors.modalButtonBlue, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 25, width: '80%', alignItems: 'center', },
    modalButtonText: { color: colors.white, fontSize: 16, fontWeight: '600', },
});

export default HomeScreen;