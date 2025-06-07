/**
 * HomeScreen.js
 * FINAL VERSION - June 8, 2025
 * - EXPANDED: Increased mood options from 2 to 5 (Great, Good, Okay, Sad, Awful) for more nuanced tracking.
 * - UPGRADED: Updated the mood selection UI to a responsive grid layout.
 * - REFINED: Suggestions after mood logging are now tailored to the new, expanded mood set.
 * - Integrated Health Connect data display and navigation placeholders.
 * - Maintained robust streak calculation and modal display logic.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, Animated,
    Alert, TextInput, Keyboard, Platform, ActivityIndicator, RefreshControl, Modal
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Video from 'react-native-video';
import { BlurView } from '@react-native-community/blur';

// --- Firebase Imports ---
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// --- DEMO DATA FLAG ---
const USE_DEMO_DATA = true;

const { width } = Dimensions.get('window');

// --- App Constants & Colors ---
const STEP_GOAL = 10000;
const SLEEP_GOAL_MS = 8 * 60 * 60 * 1000;
const ACTIVITY_GOAL_MS = 30 * 60 * 1000;

const colors = {
    primary: '#2bedbb', primaryDark: '#1AA897', backgroundTop: '#E6F7FF', backgroundBottom: '#D1EFFF', cardBackground: '#FFFFFF',
    textDark: '#2D5D5E', textSecondary: '#7A8D8E', featureBlue: '#4A90E2', featureGreen: '#4CAF50',
    moodYellow: '#FFFDE7', moodButtonBg: '#FFFFFF', moodButtonBorder: '#E0E0E0', moodYellowSelected: '#FFF59D',
    moodBorderSelected: '#FBC02D', navBackground: '#FFFFFF', lightBorder: '#E0E0E0', iconGrey: '#607D8B',
    noteInputBg: '#F8F8F8', white: '#FFFFFF', error: '#D32F2F', wellnessPositive: '#4CAF50',
    wellnessOkay: '#FFC107', wellnessNegative: '#F44336', wellnessUnknown: '#90A4AE', wellnessLoading: '#B0BEC5',
    courseBlue: '#4FC3F7', courseOrange: '#FFB74D', coursePurple: '#BA68C8', gamePurple: '#9C27B0',
    streakOrange: '#FFA726', modalBackdrop: 'rgba(0, 0, 0, 0.4)', modalButtonBlue: '#007AFF',
    gameOverlay: 'rgba(0, 0, 0, 0.3)', calendarDayInactive: '#E0E7FF', calendarDayActive: '#2bedbb',
    calendarDayToday: '#1AA897', fitCircleBorder: '#E0E0E0', fitIconColor: '#455A64',
    fitBackgroundColor: 'rgba(255, 255, 255, 0.7)', fitGoalTextColor: '#757575',
};

// --- ✅ EXPANDED Mood Options & Data ---
const moodOptions = [
    { emoji: '😄', label: 'Great', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f604/lottie.json' },
    { emoji: '🙂', label: 'Good', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f642/lottie.json' },
    { emoji: '😐', label: 'Okay', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f610/lottie.json' },
    { emoji: '😔', label: 'Sad', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f614/lottie.json' },
    { emoji: '😩', label: 'Awful', lottieUrl: 'https://fonts.gstatic.com/s/e/notoemoji/latest/1f629/lottie.json' }
];

const moodScores = {
    'Great': 5,
    'Good': 4,
    'Okay': 3,
    'Sad': 2,
    'Awful': 1
};
// ------------------------------------

const miniCourses = [ { id: 'med101', title: 'Intro to Meditation', description: 'Learn basics', icon: 'brain', color: colors.courseBlue }, { id: 'gratitude1', title: 'Gratitude Practice', description: 'Cultivate positivity', icon: 'heart-outline', color: colors.courseOrange }, { id: 'sleep1', title: 'Better Sleep Tips', description: 'Restful nights', icon: 'power-sleep', color: colors.coursePurple }, { id: 'stress1', title: 'Stress Relief Breaths', description: 'Quick techniques', icon: 'leaf-circle-outline', color: colors.featureGreen },   ];
const POINTS_PER_MOOD_LOG = 10; const POINTS_PER_NOTE = 5; const FIRST_MOOD_ACHIEVEMENT_ID = 'firstMoodLogged'; const FIRST_MOOD_ACHIEVEMENT_NAME = 'First Steps';

// --- Helper Functions ---
const isSameDay = (d1, d2) => { if (!d1 || !d2 || !(d1 instanceof Date) || !(d2 instanceof Date)) return false; try { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); } catch (e) { return false; } };
const isYesterday = (d, t) => { if (!d || !t || !(d instanceof Date) || !(t instanceof Date)) return false; try { const e = new Date(t); e.setDate(t.getDate() - 1); return isSameDay(d, e); } catch (e) { return false; } };
const getLast7Days = () => { const dates = []; const today = new Date(); for (let i = 6; i >= 0; i--) { const date = new Date(today); date.setDate(today.getDate() - i); dates.push(date); } return dates; };
const formatMsDuration = (ms) => { if (ms === null || ms === undefined || ms <= 0) return '--'; const totalMinutes = Math.floor(ms / (1000 * 60)); const hours = Math.floor(totalMinutes / 60); const minutes = totalMinutes % 60; let result = ''; if (hours > 0) result += `${hours}h `; if (minutes > 0) result += `${minutes}m`; return result.trim() || '0m'; };
const getDateNDaysAgo = (date, days) => { const result = new Date(date); result.setDate(date.getDate() - days); return result; };
// ---------------------------

// --- Demo Data Values ---
const DEMO_DATA = { wellnessSubtitle: 'Feeling good lately!', healthConnect: { steps: 7850, sleepMs: 7 * 60 * 60 * 1000 + 30 * 60 * 1000, activityMs: 45 * 60 * 1000, } };

const HomeScreen = () => {
    // --- State ---
    const [userName, setUserName] = useState('');
    const [isLoadingName, setIsLoadingName] = useState(true);
    const [wellnessScore, setWellnessScore] = useState(null);
    const [wellnessSubtitle, setWellnessSubtitle] = useState(USE_DEMO_DATA && !auth().currentUser ? DEMO_DATA.wellnessSubtitle : 'Loading...');
    const [isLoadingWellness, setIsLoadingWellness] = useState(!USE_DEMO_DATA || !!auth().currentUser);
    const [currentStreakValue, setCurrentStreakValue] = useState(0);
    const [lastActivityDate, setLastActivityDate] = useState(null);
    const [isStreakModalVisible, setStreakModalVisible] = useState(false);
    const [streakToShowInModal, setStreakToShowInModal] = useState(0);
    const [healthConnectData, setHealthConnectData] = useState(USE_DEMO_DATA ? DEMO_DATA.healthConnect : { steps: null, sleepMs: null, activityMs: null });
    const [isLoadingHealthData, setIsLoadingHealthData] = useState(!USE_DEMO_DATA);
    const [selectedMood, setSelectedMood] = useState(null); const [confirmationVisible, setConfirmationVisible] = useState(false); const [suggestionText, setSuggestionText] = useState(''); const [moodAnimation] = useState(new Animated.Value(0)); const [dynamicButtonText, setDynamicButtonText] = useState(''); const [showMoodOptions, setShowMoodOptions] = useState(true); const [showAddNoteView, setShowAddNoteView] = useState(false); const [note, setNote] = useState(''); const [pendingMood, setPendingMood] = useState(null);

    const navigation = useNavigation();
    const hasShownModalThisSessionRef = useRef(false);

    // --- Functions ---
    const fetchUserName = useCallback(async () => { setIsLoadingName(true); const user = auth().currentUser; if (user) { try { const doc = await firestore().collection('users').doc(user.uid).get(); const name = doc.exists ? doc.data()?.fullName : null; setUserName(name ? name.split(' ')[0] : 'Friend'); } catch (e) { console.error("Err fetch name:", e); setUserName('Friend'); } } else { setUserName('Friend'); } setIsLoadingName(false); }, []);
    const analyzeMoodsAndScore = (moodHistory) => { if (!moodHistory || moodHistory.length === 0) { return { score: null, subtitle: 'Log your mood to see insights.' }; } let totalScoreValue = 0, scoredCount = 0; moodHistory.forEach(entry => { const scoreValue = moodScores[entry.mood]; if (scoreValue !== undefined) { totalScoreValue += scoreValue; scoredCount++; } }); const averageOutOf5 = scoredCount > 0 ? (totalScoreValue / scoredCount) : null; const scoreOutOf100 = averageOutOf5 !== null ? Math.round(averageOutOf5 * 20) : null; let subtitle = "Keep tracking your moods!"; if (scoreOutOf100 === null) { subtitle = "Log your mood to see insights."; } else if (scoreOutOf100 >= 70) { subtitle = "Feeling good lately!"; } else if (scoreOutOf100 >= 40) { subtitle = "Doing okay overall."; } else { subtitle = "Seems a bit rough recently."; } return { score: scoreOutOf100, subtitle: subtitle }; };
    const fetchWellnessAndActivityData = useCallback(async () => { if (USE_DEMO_DATA && !auth().currentUser) { setWellnessSubtitle(DEMO_DATA.wellnessSubtitle); setIsLoadingWellness(false); return; } setIsLoadingWellness(true); setWellnessScore(null); setWellnessSubtitle('Loading...'); const user = auth().currentUser; if (!user) { setWellnessSubtitle('Log in to track wellness'); setIsLoadingWellness(false); return; } try { const userId = user.uid; const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); sevenDaysAgo.setHours(0, 0, 0, 0); const sevenDaysAgoTimestamp = firestore.Timestamp.fromDate(sevenDaysAgo); const querySnapshot = await firestore().collection('users').doc(userId).collection('moodHistory').where('timestamp', '>=', sevenDaysAgoTimestamp).orderBy('timestamp', 'desc').limit(30).get(); const fetchedMoods = querySnapshot.docs.map(doc => ({ mood: doc.data().mood })); const wellnessInfo = analyzeMoodsAndScore(fetchedMoods); setWellnessScore(wellnessInfo.score); setWellnessSubtitle(wellnessInfo.subtitle); } catch (e) { console.error("Err fetch wellness/activity:", e); setWellnessScore(null); setWellnessSubtitle('Could not load data.'); } finally { setIsLoadingWellness(false); } }, []);
    const fetchHealthConnectData = useCallback(async () => { if (USE_DEMO_DATA) { setHealthConnectData(DEMO_DATA.healthConnect); setIsLoadingHealthData(false); return; } setIsLoadingHealthData(true); setHealthConnectData({ steps: null, sleepMs: null, activityMs: null }); setTimeout(() => setIsLoadingHealthData(false), 500); }, []);
    const checkAndUpdateStreak = useCallback(async () => { const user = auth().currentUser; if (!user) return; const userId = user.uid; const statsRef = firestore().collection('users').doc(userId).collection('stats').doc('summary'); try { const statsDoc = await statsRef.get(); const statsData = statsDoc.exists ? statsDoc.data() : {}; const lastTs = statsData.lastActivityDate; const currentStreakInDB = statsData.currentStreak || 0; const today = new Date(); let lastDate = null; if (lastTs && typeof lastTs.toDate === 'function') { try { lastDate = lastTs.toDate(); } catch (e) { lastDate = null; } } if (lastDate && isSameDay(lastDate, today)) { return; } let newStreak = 1; if (lastDate && isYesterday(lastDate, today)) { newStreak = currentStreakInDB + 1; } if (newStreak !== currentStreakInDB || !lastDate || !isSameDay(lastDate, today)) { await statsRef.set({ currentStreak: newStreak, lastActivityDate: firestore.FieldValue.serverTimestamp() }, { merge: true }); } } catch (error) { console.error("Error check/update streak:", error); } }, []);

    // --- Effects ---
    useEffect(() => { fetchUserName(); }, [fetchUserName]);
    useEffect(() => { const currentUser = auth().currentUser; if (!currentUser) { setCurrentStreakValue(0); setLastActivityDate(null); hasShownModalThisSessionRef.current = false; return; } const userId = currentUser.uid; const statsRef = firestore().collection('users').doc(userId).collection('stats').doc('summary'); const unsubscribe = statsRef.onSnapshot( (docSnapshot) => { const data = docSnapshot.data(); const streakFromDB = docSnapshot.exists ? (data?.currentStreak || 0) : 0; const lastTs = docSnapshot.exists ? data?.lastActivityDate : null; let lastDate = null; if (lastTs && typeof lastTs.toDate === 'function') { try { lastDate = lastTs.toDate(); } catch(e) { /* ignore */ } } setCurrentStreakValue(streakFromDB); setLastActivityDate(lastDate); }, (error) => { console.error("[STREAK LISTENER] Error:", error); setCurrentStreakValue(0); setLastActivityDate(null); } ); return () => unsubscribe(); }, []);
    useEffect(() => { const currentUser = auth().currentUser; if (currentUser && !hasShownModalThisSessionRef.current) { const checkAndShow = async () => { await checkAndUpdateStreak(); try { const userId=currentUser.uid; const sRef=firestore().collection('users').doc(userId).collection('stats').doc('summary'); const sDoc=await sRef.get(); const lStreak=sDoc.exists?(sDoc.data()?.currentStreak||0):0; if(lStreak>0){setStreakToShowInModal(lStreak);setStreakModalVisible(true);}}catch(e){console.error("Err fetch streak modal:",e);} hasShownModalThisSessionRef.current=true;}; checkAndShow();} else if(!currentUser){hasShownModalThisSessionRef.current=false;} }, [checkAndUpdateStreak]);
    useFocusEffect(useCallback(() => { console.log("HomeScreen focused - Fetching data..."); fetchUserName(); const user = auth().currentUser; if (user) { fetchWellnessAndActivityData(); fetchHealthConnectData(); checkAndUpdateStreak(); } else if (USE_DEMO_DATA) { fetchWellnessAndActivityData(); fetchHealthConnectData(); } else { setWellnessScore(null); setWellnessSubtitle('Log in to track wellness'); setCurrentStreakValue(0); setLastActivityDate(null); setHealthConnectData({ steps: null, sleepMs: null, activityMs: null }); setIsLoadingWellness(false); setIsLoadingHealthData(false); hasShownModalThisSessionRef.current = false; } return () => { console.log("HomeScreen blurred - Hiding streak modal if visible"); setStreakModalVisible(false); }; }, [checkAndUpdateStreak, fetchUserName, fetchWellnessAndActivityData, fetchHealthConnectData]));

    // ✅ UPDATED: Mood Handling Functions with new suggestions
    const handleMoodSelect = (mood) => { setPendingMood(mood); setShowMoodOptions(false); setConfirmationVisible(false); setNote(''); setShowAddNoteView(true); };
    const handleSaveMoodAndNote = async () => { Keyboard.dismiss(); if (!pendingMood) return; const currentUser = auth().currentUser; if (!currentUser) { Alert.alert("Error", "Logged out."); return; } const userId = currentUser.uid; const moodToSave = pendingMood; const noteToSave = note.trim(); const moodData = { mood: moodToSave, note: noteToSave, timestamp: firestore.FieldValue.serverTimestamp(), userId: userId }; let pointsToAdd = POINTS_PER_MOOD_LOG + (noteToSave.length > 0 ? POINTS_PER_NOTE : 0); const moodHistoryCollectionRef = firestore().collection('users').doc(userId).collection('moodHistory'); const gamificationRef = firestore().collection('users').doc(userId).collection('gamification').doc('summary'); const firstMoodAchievementRef = firestore().collection('users').doc(userId).collection('achievements').doc(FIRST_MOOD_ACHIEVEMENT_ID); const statsRef = firestore().collection('users').doc(userId).collection('stats').doc('summary'); let isFirstMoodEver = false; try { const existingMoodSnapshot = await moodHistoryCollectionRef.limit(1).get(); isFirstMoodEver = existingMoodSnapshot.empty; } catch(error) { console.error("Err checking mood:", error); Alert.alert("Error", "Verify history fail."); return; } try { await firestore().runTransaction(async (t) => { const newMoodRef = moodHistoryCollectionRef.doc(); t.set(newMoodRef, moodData); t.set(gamificationRef, { points: firestore.FieldValue.increment(pointsToAdd), lastUpdated: firestore.FieldValue.serverTimestamp() }, { merge: true }); if (isFirstMoodEver) { const achievementDoc = await t.get(firstMoodAchievementRef); if (!achievementDoc.exists || !achievementDoc.data()?.earned) { t.set(firstMoodAchievementRef, { id: FIRST_MOOD_ACHIEVEMENT_ID, name: FIRST_MOOD_ACHIEVEMENT_NAME, earned: true, earnedAt: firestore.FieldValue.serverTimestamp() }, { merge: true }); Alert.alert("Achievement!", `"${FIRST_MOOD_ACHIEVEMENT_NAME}" earned!`); } } t.set(statsRef, { sessions: firestore.FieldValue.increment(1), lastActivityDate: firestore.FieldValue.serverTimestamp() }, { merge: true }); }); await checkAndUpdateStreak(); } catch (error) { console.error("Err transaction: ", error); Alert.alert("Error Saving", `Could not save. ${error.message}`); return; } setSelectedMood(moodToSave); setShowAddNoteView(false); switch (moodToSave) { case 'Great': case 'Good': setSuggestionText("Fantastic! Consider writing in your journal to capture this positive moment."); setDynamicButtonText("Open Journal"); break; case 'Okay': setSuggestionText("A moment of mindfulness can make a big difference. Try a short breathing exercise?"); setDynamicButtonText("Mindful Breath"); break; case 'Sad': case 'Awful': setSuggestionText("It's okay to not be okay. Talking it out or a calming breath can help."); setDynamicButtonText("Chat with AI"); break; default: setSuggestionText(""); setDynamicButtonText(""); } Animated.spring(moodAnimation, { toValue: 1, friction: 4, useNativeDriver: true }).start(() => { Animated.spring(moodAnimation, { toValue: 0, friction: 4, useNativeDriver: true }).start(); }); setConfirmationVisible(true); setPendingMood(null); fetchWellnessAndActivityData(); fetchHealthConnectData(); };
    const handleDynamicButtonClick = () => { switch (dynamicButtonText) { case "Chat with AI": navigation.navigate('ChatScreen'); break; case "Mindful Breath": navigation.navigate('MindfulBreathWelcome'); break; case "Open Journal": navigation.navigate('JournalAI'); break; } };
    const handleReload = () => { setConfirmationVisible(false); setShowAddNoteView(false); setShowMoodOptions(true); setSelectedMood(null); setPendingMood(null); setNote(''); setSuggestionText(''); setDynamicButtonText(''); };

    // --- Navigation Functions ---
    const handleHConnectNavigation = (targetScreen) => { if (!targetScreen) return; try { navigation.navigate(targetScreen); } catch (e) { console.error(`Nav Error: ${targetScreen}.`, e); Alert.alert("Nav Error", `Could not open screen.`); } };
    const handleMoodTrackerNavigation = () => { navigation.navigate('MoodTrackerScreen'); };
    const handleProfileNavigation = () => { navigation.navigate('ProfileScreen'); };
    const handleNotificationNavigation = () => { navigation.navigate('NotificationScreen'); };
    const handleCoursePress = (course) => { try { navigation.navigate(course.id); } catch (e) { console.error(`Nav Error: ${course.id}.`, e); Alert.alert("Nav Error", `Could not open "${course.title}".`); } };
    const handleGameNavigation = () => { try { navigation.navigate('GameScreen'); } catch (e) { console.error(`Nav Error: GameScreen.`, e); Alert.alert("Nav Error", "Could not open game."); } };
    
    // --- Helper & Render Functions ---
    const getWellnessScoreColor = (score) => { if (score === null || score === undefined) return colors.wellnessUnknown; if (score >= 70) return colors.wellnessPositive; if (score >= 40) return colors.wellnessOkay; return colors.wellnessNegative; };
    const getStreakSubtitle = (streak) => { if (streak <= 0) return "Log your mood daily to start a streak!"; if (streak === 1) return "Great start! Keep it up tomorrow!"; if (streak < 7) return `That's ${streak} days in a row! Fantastic consistency!`; if (streak < 14) return "Wow, a full week straight! You're building a strong habit."; if (streak < 30) return `${streak} days straight! Amazing dedication!`; return "Incredible! You're making wellness a priority every day!"; };
    const renderStreakCalendar = useCallback(() => { const days = getLast7Days(); const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S']; const today = new Date(); let streakEndDate = null; if (lastActivityDate instanceof Date) { if (isSameDay(lastActivityDate, today)) { streakEndDate = today; } else if (isYesterday(lastActivityDate, today)) { streakEndDate = lastActivityDate; } } let streakStartDate = null; if (streakEndDate && currentStreakValue > 0) { streakStartDate = getDateNDaysAgo(streakEndDate, currentStreakValue - 1); streakStartDate.setHours(0, 0, 0, 0); } return ( <View style={styles.streakCalendarContainer}>{days.map((day, index) => { const isToday = isSameDay(day, today); const dayOfWeek = day.getDay(); let isActive = false; if (streakStartDate && streakEndDate) { const currentDayStart = new Date(day); currentDayStart.setHours(0, 0, 0, 0); if (currentDayStart.getTime() >= streakStartDate.getTime() && currentDayStart.getTime() <= streakEndDate.getTime()) { isActive = true; } } return ( <View key={index} style={styles.dayContainer}><Text style={styles.dayLabelText}>{dayLabels[dayOfWeek]}</Text><View style={[ styles.dayIndicator, isActive && styles.dayIndicatorActive ]}>{isToday && <View style={styles.todayMarker} />}</View></View> ); })}</View> ); }, [currentStreakValue, lastActivityDate]);
    const renderHealthConnectDataItem = useCallback((iconName, value, unit, isLoading, goal, onPress, isCenter = false) => { let displayValue = '--'; let goalValueStr = ''; let content; if (unit === 'steps') goalValueStr = `/ ${goal.toLocaleString()}`; else if (unit === 'sleep' || unit === 'activity') goalValueStr = `/ ${formatMsDuration(goal)}`; if (isLoading) { content = <ActivityIndicator size="small" color={colors.wellnessLoading} />; } else { if (value !== null && value !== undefined && value >= 0) { if (unit === 'steps') displayValue = value.toLocaleString(); else if (unit === 'sleep' || unit === 'activity') displayValue = formatMsDuration(value); else displayValue = value.toString(); } else { displayValue = '--'; } content = ( <><Text style={[styles.fitDataValue, isCenter && styles.fitDataValueCenter]} numberOfLines={1} adjustsFontSizeToFit>{displayValue}</Text><Text style={[styles.fitDataGoal, isCenter && styles.fitDataGoalCenter]} numberOfLines={1} adjustsFontSizeToFit>{goalValueStr}</Text></> ); } return ( <TouchableOpacity onPress={onPress} style={[styles.fitDataCircle, isCenter && styles.fitDataCircleCenter]} activeOpacity={0.7}><Icon name={iconName} size={isCenter ? 36 : 32} color={colors.fitIconColor} style={[styles.fitDataIcon, isCenter && styles.fitDataIconCenter]}/>{content}</TouchableOpacity> ); }, []);

    // --- JSX Return ---
    return (
        <LinearGradient colors={[colors.backgroundTop, colors.backgroundBottom]} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} refreshControl={ <RefreshControl refreshing={isLoadingName || isLoadingWellness || isLoadingHealthData} onRefresh={() => { fetchUserName(); fetchWellnessAndActivityData(); fetchHealthConnectData(); checkAndUpdateStreak(); }} tintColor={colors.primary} /> }>
                <View style={styles.header}>
                    <View style={styles.headerLeft}><Text style={styles.greeting}>Good morning,</Text><Text style={styles.userName} numberOfLines={1} ellipsizeMode="tail">{isLoadingName ? 'Loading...' : userName}</Text></View>
                    <View style={styles.headerRight}><TouchableOpacity style={styles.iconButton} onPress={handleNotificationNavigation}><Ionicons name="notifications-outline" size={26} color={colors.iconGrey} /></TouchableOpacity><TouchableOpacity style={[styles.iconButton, styles.profileIconContainer]} onPress={handleProfileNavigation}><Ionicons name="person-circle-outline" size={30} color={colors.iconGrey} /></TouchableOpacity></View>
                </View>

                <View style={styles.fitDataSection}>
                    {renderHealthConnectDataItem("shoe-print", healthConnectData.steps, 'steps', isLoadingHealthData, STEP_GOAL, () => handleHConnectNavigation('myFitness'))}
                    {renderHealthConnectDataItem("power-sleep", healthConnectData.sleepMs, 'sleep', isLoadingHealthData, SLEEP_GOAL_MS, () => handleHConnectNavigation('sleep'), true)}
                    {renderHealthConnectDataItem("walk", healthConnectData.activityMs, 'activity', isLoadingHealthData, ACTIVITY_GOAL_MS, () => handleHConnectNavigation('multiSport'))}
                </View>

                <View style={styles.insightsCard}>
                    <View style={styles.insightsHeaderRow}><Text style={styles.insightsTitle}>Your Progress</Text><Text style={styles.wellnessSubtitleStyle} numberOfLines={1}>{isLoadingWellness ? 'Loading insights...' : wellnessSubtitle}</Text></View>
                    <View style={styles.insightsRow}><View style={styles.streakInfoContainer}><View style={styles.streakValueRow}><Icon name="fire" size={28} color={colors.streakOrange} style={styles.streakIconBig}/><Text style={styles.streakValueBig}>{currentStreakValue}</Text></View><Text style={styles.streakInfoSubtitle}>Day Streak</Text></View>{renderStreakCalendar()}</View>
                </View>

                <View style={styles.featuresContainer}>
                    <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.featureBlue }]} onPress={() => navigation.navigate('Doctors')}><Icon name="stethoscope" size={36} color={colors.white} /><Text style={styles.featureText}>Connect Expert</Text></TouchableOpacity>
                    <TouchableOpacity style={[styles.featureCard, { backgroundColor: colors.featureGreen }]} onPress={() => navigation.navigate('MindfulBreathWelcome')}><Icon name="leaf" size={36} color={colors.white} /><Text style={styles.featureText}>Mindful Breath</Text></TouchableOpacity>
                </View>

                <View style={styles.gameCard}>
                    <Video source={require('../assets/a.mp4')} style={styles.backgroundVideo} repeat={true} resizeMode="cover" muted={true} paused={false} ignoreSilentSwitch={"obey"} onError={(e) => console.log("Video Error:", e)} />
                    <BlurView style={styles.blurView} blurType="dark" blurAmount={8} />
                    <View style={styles.gameCardOverlay} />
                    <View style={styles.gameCardContent}><Icon name="gamepad-variant-outline" size={36} color={colors.white} style={styles.gameIcon} /><View style={styles.gameTextContainer}> <Text style={styles.gameTitle}>Feeling Playful?</Text> <Text style={styles.gameDescription}>Take a short break and play a relaxing game to reset your mind.</Text> </View><TouchableOpacity style={styles.gameButton} onPress={handleGameNavigation}> <Text style={styles.gameButtonText}>Play Now</Text> <Icon name="arrow-right-circle" size={20} color={colors.white} style={{marginLeft: 8}}/> </TouchableOpacity></View>
                </View>

                <View style={styles.coursesSection}>
                    <Text style={styles.coursesTitle}>Discover Mini Courses</Text>
                    <ScrollView horizontal={true} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.coursesScrollView}>
                        {miniCourses.map((course) => (<TouchableOpacity key={course.id} style={[styles.courseCard, { backgroundColor: course.color }]} onPress={() => handleCoursePress(course)} ><View style={styles.courseIconContainer}><Icon name={course.icon} size={28} color={colors.white} style={styles.courseIcon} /></View><View style={styles.courseTextContainer}><Text style={styles.courseTitle}>{course.title}</Text><Text style={styles.courseDescription} numberOfLines={2}>{course.description}</Text></View></TouchableOpacity>))}
                    </ScrollView>
                </View>

                <View style={styles.moodCard}>
                    { !confirmationVisible && ( <View style={styles.moodHeader}> <Ionicons name="cloudy-outline" size={20} color={colors.textDark} /> <Text style={styles.moodTitle}>{showAddNoteView ? "Add a note" : "How are you feeling today?"}</Text> <TouchableOpacity onPress={handleMoodTrackerNavigation} style={styles.arrowButton}> <Icon name="arrow-right" size={24} color={colors.textDark} /> </TouchableOpacity> </View> )}
                    { showMoodOptions && !showAddNoteView && !confirmationVisible && ( <View style={styles.moodOptionsContainer}> {moodOptions.map((mood) => ( <TouchableOpacity key={mood.label} style={styles.moodButton} onPress={() => handleMoodSelect(mood.label)}> <LottieView style={styles.moodLottie} source={{ uri: mood.lottieUrl }} autoPlay loop /> <Text style={styles.moodLabel}>{mood.label}</Text> </TouchableOpacity> ))} </View> )}
                    { showAddNoteView && !confirmationVisible && ( <View style={styles.addNoteContainer}> <View style={styles.addNoteHeaderContent}> <Text style={styles.addNoteHeaderText}>Feeling: {pendingMood}</Text> {pendingMood && moodOptions.find(m => m.label === pendingMood)?.lottieUrl && ( <LottieView style={styles.addNoteHeaderLottie} source={{ uri: moodOptions.find(m => m.label === pendingMood)?.lottieUrl }} autoPlay loop={false} /> )} </View> <TextInput style={styles.noteInput} placeholder="Add a note about your mood (optional)..." placeholderTextColor={colors.textSecondary} value={note} onChangeText={setNote} multiline={true} /> <View style={styles.addNoteActionsContainer}> <TouchableOpacity style={styles.skipNoteButton} onPress={handleSaveMoodAndNote}><Text style={styles.skipNoteButtonText}>Skip Note</Text></TouchableOpacity> <TouchableOpacity style={styles.saveNoteButton} onPress={handleSaveMoodAndNote}><Text style={styles.saveNoteButtonText}>Save Mood</Text></TouchableOpacity> </View> </View> )}
                    { confirmationVisible && ( <View style={styles.confirmationCard}> <TouchableOpacity onPress={handleReload} style={styles.reloadButton}><Icon name="reload" size={24} color={colors.iconGrey} /></TouchableOpacity> <Icon name="check-circle" size={30} color={colors.featureGreen} style={styles.checkmarkIcon} /> <Text style={styles.confirmationText}>You're feeling {selectedMood}!</Text> <Text style={styles.checkInCompleteText}>Check-in complete!</Text> {suggestionText ? <Text style={styles.suggestionText}>{suggestionText}</Text> : null} {dynamicButtonText && ( <TouchableOpacity onPress={handleDynamicButtonClick} style={styles.dynamicButton}><Text style={styles.dynamicButtonText}>{dynamicButtonText}</Text></TouchableOpacity> )} </View> )}
                </View>
            </ScrollView>
            <Modal animationType="slide" transparent={true} visible={isStreakModalVisible} onRequestClose={() => setStreakModalVisible(false)} >
                <View style={styles.modalOverlay}><View style={styles.modalContent}><Icon name="fire" size={60} color={colors.streakOrange} style={styles.modalIcon} /><Text style={styles.modalTitle}>{streakToShowInModal} day streak!</Text><Text style={styles.modalSubtitle}>{getStreakSubtitle(streakToShowInModal)}</Text><TouchableOpacity style={styles.modalButton} onPress={() => setStreakModalVisible(false)} ><Text style={styles.modalButtonText}>Continue</Text></TouchableOpacity></View></View>
            </Modal>
        </LinearGradient>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1 }, scrollContainer: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 40, flexGrow: 1 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, paddingHorizontal: 5, paddingTop: Platform.OS === 'ios' ? 10 : 0 }, headerLeft: { marginRight: 10 }, greeting: { fontSize: 16, color: colors.textSecondary, marginBottom: 2 }, userName: { fontSize: 26, color: colors.textDark, fontWeight: '700' }, headerRight: { flexDirection: 'row', alignItems: 'center' }, iconButton: { marginLeft: 8, padding: 6 }, profileIconContainer: { borderRadius: 22 },
    fitDataSection: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 25, paddingHorizontal: 5 },
    fitDataCircle: { width: width * 0.25, height: width * 0.25, maxWidth: 90, maxHeight: 90, borderRadius: 45, borderWidth: 2, borderColor: colors.fitCircleBorder, backgroundColor: colors.fitBackgroundColor, justifyContent: 'center', alignItems: 'center', padding: 8 },
    fitDataCircleCenter: { width: width * 0.28, height: width * 0.28, maxWidth: 110, maxHeight: 110, borderRadius: 55 },
    fitDataIcon: { marginBottom: 4 }, fitDataIconCenter: { marginBottom: 6 }, fitDataValue: { fontSize: 15, fontWeight: '700', color: colors.textDark, textAlign: 'center', marginBottom: 1 },
    fitDataValueCenter: { fontSize: 17 }, fitDataGoal: { fontSize: 11, color: colors.fitGoalTextColor, fontWeight: '500', textAlign: 'center' }, fitDataGoalCenter: { fontSize: 12 },
    insightsCard: { backgroundColor: colors.cardBackground, borderRadius: 20, paddingVertical: 15, paddingHorizontal: 20, marginBottom: 25, borderWidth: 1, borderColor: colors.lightBorder, },
    insightsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    insightsTitle: { fontSize: 16, fontWeight: '600', color: colors.textDark },
    wellnessSubtitleStyle: { fontSize: 12, color: colors.textSecondary, flexShrink: 1, textAlign: 'right', marginLeft: 10 },
    insightsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    streakInfoContainer: { alignItems: 'center', marginRight: 15 },
    streakValueRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
    streakIconBig: { marginRight: 4 }, streakValueBig: { fontSize: 30, fontWeight: 'bold', color: colors.streakOrange },
    streakInfoSubtitle: { fontSize: 12, color: colors.textSecondary },
    streakCalendarContainer: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    dayContainer: { alignItems: 'center' }, dayLabelText: { fontSize: 11, color: colors.textSecondary, marginBottom: 4, fontWeight: '500' },
    dayIndicator: { width: 28, height: 28, borderRadius: 6, backgroundColor: colors.calendarDayInactive, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 0, 0, 0.05)' },
    dayIndicatorActive: { backgroundColor: colors.calendarDayActive, borderColor: colors.primaryDark, borderWidth: 1.5 },
    todayMarker: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.calendarDayToday, position: 'absolute', bottom: 3 },
    featuresContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
    featureCard: { width: width * 0.44, minHeight: 140, borderRadius: 20, justifyContent: 'center', alignItems: 'center', padding: 15 },
    featureText: { color: colors.white, fontSize: 16, fontWeight: '600', marginTop: 15, textAlign: 'center' },
    gameCard: { borderRadius: 20, marginBottom: 25, alignItems: 'center', overflow: 'hidden', position: 'relative', backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.lightBorder, },
    backgroundVideo: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, },
    blurView: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, zIndex: 1 },
    gameCardOverlay: { position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, backgroundColor: colors.gameOverlay, borderRadius: 20, zIndex: 2 },
    gameCardContent: { padding: 20, alignItems: 'center', width: '100%', zIndex: 3 },
    gameIcon: { marginBottom: 10 }, gameTextContainer: { alignItems: 'center', marginBottom: 20 },
    gameTitle: { fontSize: 18, fontWeight: '600', color: colors.white, marginBottom: 5 },
    gameDescription: { fontSize: 14, color: 'rgba(255, 255, 255, 0.95)', textAlign: 'center', paddingHorizontal: 10, lineHeight: 18 },
    gameButton: { backgroundColor: colors.gamePurple, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 25, flexDirection: 'row', alignItems: 'center' },
    gameButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
    coursesSection: { marginTop: 0, marginBottom: 25 },
    coursesTitle: { fontSize: 20, fontWeight: '600', color: colors.textDark, marginBottom: 15 },
    coursesScrollView: { paddingLeft: 5, paddingRight: 20 },
    courseCard: { width: width * 0.6, borderRadius: 15, marginRight: 15, padding: 18, flexDirection: 'column', justifyContent: 'space-between', minHeight: 110 },
    courseIconContainer: { borderRadius: 20, padding: 8, alignSelf: 'flex-start', marginBottom: 10 },
    courseIcon: {}, courseTextContainer: {}, courseTitle: { fontSize: 16, fontWeight: 'bold', color: colors.white, marginBottom: 5 },
    courseDescription: { fontSize: 13, color: 'rgba(255, 255, 255, 0.9)', lineHeight: 18 },
    moodCard: { backgroundColor: colors.moodYellow, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#EDE7B0', marginBottom: 30, },
    moodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    moodTitle: { fontSize: 17, color: colors.textDark, fontWeight: '600', marginLeft: 12, flex: 1 },
    arrowButton: { backgroundColor: 'rgba(255, 255, 255, 0.6)', padding: 8, borderRadius: 16 },
    // ✅ UPDATED: Styles for the new mood grid layout
    moodOptionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap', // Allow buttons to wrap to the next line
        justifyContent: 'center', // Center the items
        alignItems: 'center',
        width: '100%',
        marginBottom: 15,
    },
    moodButton: {
        backgroundColor: colors.moodButtonBg,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.moodButtonBorder,
        alignItems: 'center',
        justifyContent: 'center',
        width: '30%', // Approx. 3 per row with spacing
        margin: '1.5%', // Spacing between buttons
        paddingVertical: 15,
        minHeight: 80,
    },
    moodLottie: {
        width: 32,
        height: 32,
        marginBottom: 8,
    },
    moodLabel: {
        fontSize: 14,
        color: colors.textDark,
        fontWeight: '500',
        textAlign: 'center'
    },
    // --- End of updated styles ---
    addNoteContainer: { marginTop: 15, alignItems: 'center' },
    addNoteHeaderContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    addNoteHeaderText: { fontSize: 16, fontWeight: '500', color: colors.textDark },
    addNoteHeaderLottie: { width: 22, height: 22, marginLeft: 8 },
    noteInput: { backgroundColor: colors.noteInputBg, borderColor: colors.lightBorder, borderWidth: 1, borderRadius: 10, width: '100%', height: 80, padding: 12, fontSize: 14, textAlignVertical: 'top', marginBottom: 20, color: colors.textDark },
    addNoteActionsContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
    saveNoteButton: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', flex: 1, marginHorizontal: 5 },
    saveNoteButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
    skipNoteButton: { backgroundColor: colors.cardBackground, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1.5, borderColor: colors.primaryDark, flex: 1, marginHorizontal: 5 },
    skipNoteButtonText: { color: colors.primaryDark, fontSize: 16, fontWeight: '600' },
    confirmationCard: { backgroundColor: colors.cardBackground, borderRadius: 20, padding: 25, paddingTop: 50, alignItems: 'center', position: 'relative', marginTop: 15, borderWidth: 1, borderColor: colors.lightBorder, minHeight: 230, justifyContent: 'center' },
    reloadButton: { position: 'absolute', top: 15, right: 15, padding: 8, zIndex: 10 },
    checkmarkIcon: { marginBottom: 15 }, confirmationText: { fontSize: 18, fontWeight: '600', color: colors.textDark, textAlign: 'center' },
    checkInCompleteText: { fontSize: 14, color: colors.textSecondary, marginTop: 6, marginBottom: 15, textAlign: 'center' },
    suggestionText: { marginTop: 10, color: colors.textDark, fontSize: 14, textAlign: 'center', paddingHorizontal: 15, lineHeight: 20, marginBottom: 15 },
    dynamicButton: { backgroundColor: colors.primary, paddingVertical: 14, paddingHorizontal: 35, borderRadius: 28, marginTop: 15, alignItems: 'center' },
    dynamicButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.modalBackdrop },
    modalContent: { backgroundColor: colors.white, borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 30, alignItems: 'center', paddingBottom: Platform.OS === 'ios' ? 40 : 30 },
    modalIcon: { marginBottom: 20 }, modalTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textDark, marginBottom: 10, textAlign: 'center' },
    modalSubtitle: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 30, lineHeight: 22 },
    modalButton: { backgroundColor: colors.modalButtonBlue, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 25, width: '80%', alignItems: 'center' },
    modalButtonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});

export default HomeScreen;