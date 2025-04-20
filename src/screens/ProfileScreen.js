// screens/ProfileScreen.js
// FINAL VERSION - Updated Apr 20, 2025
// - Fetches fullName primarily from Firestore, falls back to Auth.
// - Saves fullName to both Auth and Firestore.
// - Includes previous fixes and AI features.

import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Pressable,
    Alert,
    Platform,
    PermissionsAndroid, // Import PermissionsAndroid
    RefreshControl,
    Image,
    TextInput,
    Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// *** Firebase Imports ***
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// *** Local Storage & Image Picker Imports ***
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs'; // For file system operations

// --- Configuration ---

// Colors (ensure these match your app's theme)
const colors = {
    primary: '#2bedbb', primaryLight: '#a6f9e2', primaryDark: '#1fcda9',
    background: '#E6F4F1', backgroundMid: '#D1E5E0', backgroundEnd: '#B7D5CF',
    cardBackground: '#FFFFFF',
    textPrimary: '#1A3B3A', textSecondary: '#5F817F', textLight: '#FFFFFF',
    progressBackground: 'rgba(255,255,255,0.3)', progressFill: '#FFFFFF',
    iconGrey: '#7A8D8E', toggleInactive: '#BDC8C7', logoutRed: '#E57373',
    shadowColor: '#9DBFBA', gold: '#FFC107', lightBorder: '#E0E5F1',
    modalBackground: 'rgba(0, 0, 0, 0.5)', error: '#E57373',
    editIconBackground: 'rgba(0, 0, 0, 0.4)', editIconColor: '#FFFFFF',
    saveButton: '#2bedbb', cancelButton: '#AAAAAA',
    // ** Colors for AI sections **
    insightBackground: '#e0f2f7', // Light cyan/blue background
    suggestionBackground: '#fff8e1', // Light yellow background
    insightBorder: '#b3e5fc', // Border for insight card
    suggestionBorder: '#ffecb3', // Border for suggestion card
};

// Gamification Levels
const levels = [
    { threshold: 0, name: "Mindful Seedling" },
    { threshold: 500, name: "Calm Sprout" },
    { threshold: 1500, name: "Focused Sapling" },
    { threshold: 3000, name: "Centered Tree" },
    { threshold: 5000, name: "Zen Master" }
];

// Achievement Definitions (Including IDs and types needed for suggestions)
const achievementDefinitions = [
    // Profile related
    { id: 'firstRename', name: 'Identity Update', icon: 'account-edit-outline', description: 'Updated your profile name.' },
    { id: 'firstProfilePic', name: 'Picture Perfect', icon: 'camera-account', description: 'Set your first profile picture.' },
    // Basic usage
    { id: 'firstMoodLogged', name: 'First Steps', icon: 'shoe-print', description: 'Logged your first mood.' },
    { id: 'beginnerBreath', name: 'Breathe Easy', icon: 'weather-windy', description: 'Completed first breathing exercise.' },
    { id: 'firstSoundTherapy', name: 'Audio Oasis', icon: 'headphones', description: 'Listened to your first sound therapy session.' },
    { id: 'firstJournalEntry', name: 'Dear Diary', icon: 'book-open-page-variant-outline', description: 'Wrote your first journal entry.' },
    { id: 'firstVoiceNote', name: 'Sound Thoughts', icon: 'microphone-outline', description: 'Saved your first voice note.' },
    // Streaks
    { id: 'dailyStreak3', name: '3 Day Streak', icon: 'fire-circle', description: 'Used the app 3 days in a row.', type: 'streak', value: 3 },
    { id: 'dailyStreak7', name: '7 Day Streak', icon: 'fire', description: 'Used the app 7 days in a row.', type: 'streak', value: 7 },
    // Milestones
    { id: 'moodTracker7', name: 'Consistent Check-in', icon: 'calendar-check-outline', description: 'Logged mood on 7 different days.' }, // Requires separate tracking
    { id: 'pointsMilestone1k', name: '1K Club', icon: 'trophy-variant-outline', description: 'Reached 1000 points.', type: 'points', value: 1000 },
    { id: 'sessionMaster10', name: 'Session Master', icon: 'meditation', description: 'Completed 10 mindfulness sessions.', type: 'sessions', value: 10 },
    { id: 'journalJourneyman', name: 'Journal Journeyman', icon: 'notebook-edit-outline', description: 'Wrote 10 journal entries.', type: 'journal', value: 10 }, // Requires separate tracking
    // Time/Behavior based
    { id: 'mindfulMorning', name: 'Early Bird', icon: 'weather-sunset-up', description: 'Logged mood before 9 AM.' }, // Requires timestamped logs
    { id: 'nightOwl', name: 'Night Owl', icon: 'moon-waxing-crescent', description: 'Logged mood after 10 PM.' }, // Requires timestamped logs
    { id: 'calmSeeker5', name: 'Calm Seeker', icon: 'emoticon-cool-outline', description: 'Logged "Calm" 5 times.' }, // Requires mood value tracking
    { id: 'explorer', name: 'Feature Explorer', icon: 'compass-outline', description: 'Used 3 different app features.' }, // Requires feature usage tracking
];

// --- Constants ---
const LOCAL_IMAGE_STORAGE_KEY_PREFIX = '@profileImage_';
const PROFILE_IMAGE_DIR_NAME = 'ProfileImages';
const PROFILE_IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/${PROFILE_IMAGE_DIR_NAME}`;
const FETCH_CACHE_DURATION_MS = 60 * 1000; // Cache duration: 60 seconds
const screenWidth = Dimensions.get('window').width;

// --- Component ---
const ProfileScreen = ({ navigation }) => {
    // --- State ---
    const [userData, setUserData] = useState({ name: 'User', email: 'Loading...' });
    const [localImageUri, setLocalImageUri] = useState(null); // Will be prefixed with file://
    const [gamificationData, setGamificationData] = useState({ points: 0, levelName: levels[0]?.name || 'Seedling', progress: 0 });
    const [achievementsData, setAchievementsData] = useState(achievementDefinitions.map(def => ({ ...def, earned: false })));
    const [statsData, setStatsData] = useState({ sessions: 0, totalTimeMinutes: 0, currentStreak: 0 });

    // Loading & Fetching States
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isLoadingGamification, setIsLoadingGamification] = useState(true);
    const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [lastFetchTimestamp, setLastFetchTimestamp] = useState(0);

    // Editing States
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);
    const [isPickingImage, setIsPickingImage] = useState(false);

    // Preferences States
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState(true);

    // ** State for AI Features **
    const [progressInsight, setProgressInsight] = useState(''); // Personalized insight text
    const [achievementSuggestion, setAchievementSuggestion] = useState(null); // Suggested achievement { id, text }

    // --- Refs ---
    const currentUserRef = useRef(auth().currentUser);

    // --- Effects ---
    // Keep currentUserRef updated on auth state changes
    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged(user => {
            console.log("[Auth] Auth state changed.");
            const previousUserId = currentUserRef.current?.uid;
            currentUserRef.current = user;

             // Re-fetch or clear data if user changes *while screen is mounted*
            if (user && user.uid !== previousUserId) {
                 console.log("[Auth] User changed, forcing data fetch.");
                 fetchData(false, true); // Force fetch for new user
            } else if (!user && previousUserId) {
                 // Clear user specific state if logged out while screen is focused
                 console.log("[Auth] User logged out, clearing state.");
                 setUserData({ name: 'User', email: 'Login required' });
                 setGamificationData({ points: 0, levelName: levels[0].name, progress: 0 });
                 setAchievementsData(achievementDefinitions.map(def => ({ ...def, earned: false })));
                 setStatsData({ sessions: 0, totalTimeMinutes: 0, currentStreak: 0 });
                 setLocalImageUri(null);
                 setLastFetchTimestamp(0);
                 setProgressInsight(''); setAchievementSuggestion(null); // Clear AI state
                 setIsLoadingUser(false); setIsLoadingGamification(false); setIsLoadingAchievements(false); setIsLoadingStats(false); setIsFetchingData(false);
            }
        });
        return unsubscribe;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // fetchData is added later via useCallback

    // --- Helper Functions ---

    /** Calculates user level and progress based on points. */
    const calculateLevel = (points) => {
        let currentLevel = levels[0]; let nextLevel = levels[1] || null;
        for (let i = 0; i < levels.length; i++) { if (points >= levels[i].threshold) { currentLevel = levels[i]; nextLevel = levels[i + 1] || null; } else { break; } }
        const pointsInLevel = points - currentLevel.threshold; const pointsForNextLevel = nextLevel ? nextLevel.threshold - currentLevel.threshold : 0;
        const progress = nextLevel && pointsForNextLevel > 0 ? Math.min(100, Math.max(0, Math.floor((pointsInLevel / pointsForNextLevel) * 100))) : 100;
        return { levelName: currentLevel.name, progress };
    };

    /** Checks and awards achievements in Firestore and updates local state. */
    const checkAndAwardAchievement = useCallback(async (achievementId) => {
        const userId = currentUserRef.current?.uid; if (!userId) return;
        const definition = achievementDefinitions.find(def => def.id === achievementId); if (!definition) return;
        // Check local state first to avoid unnecessary Firestore read if already known to be earned
        const isAlreadyEarnedLocally = achievementsData.find(a => a.id === achievementId)?.earned;
        if (isAlreadyEarnedLocally) {
            // console.log(`[Achieve] Already earned locally: ${achievementId}`); // Optional log
            return;
        }

        console.log(`[Achieve] Checking/Attempting: ${achievementId}`);
        const achievementRef = firestore().doc(`users/${userId}/achievements/${achievementId}`);
        try {
            const doc = await achievementRef.get({ source: 'server' }); // Ensure we check the server
            if (!doc.exists || !doc.data()?.earned) {
                // Award the achievement
                await achievementRef.set({
                    earned: true,
                    earnedAt: firestore.FieldValue.serverTimestamp(),
                    name: definition.name,
                    icon: definition.icon,
                    description: definition.description
                }, { merge: true });
                console.log(`[Achieve] Awarded: ${achievementId}`);
                // Update local state immediately
                setAchievementsData(prev => prev.map(a => a.id === achievementId ? { ...a, earned: true } : a));
                Alert.alert("🏆 Achievement Unlocked!", definition.name);
            } else {
                 // If it exists on server but wasn't marked locally, sync local state
                 console.log(`[Achieve] Syncing earned status from server: ${achievementId}`);
                 setAchievementsData(prev => prev.map(a => a.id === achievementId ? { ...a, earned: true } : a));
            }
        } catch (error) { console.error(`[Achieve] Error checking/awarding ${achievementId}:`, error); }
    }, [achievementsData]); // Dependency on achievementsData to check local state

    /** Gets the AsyncStorage key for the user's profile image. */
    const getCurrentImageStorageKey = useCallback(() => { const userId = currentUserRef.current?.uid; if (!userId) return null; return `${LOCAL_IMAGE_STORAGE_KEY_PREFIX}${userId}`; }, []);

    /** Creates the profile image directory if it doesn't exist. */
    const ensureProfileImageDirExists = useCallback(async () => {
        try { const exists = await RNFS.exists(PROFILE_IMAGE_DIR); if (!exists) { await RNFS.mkdir(PROFILE_IMAGE_DIR); console.log('[FS] Profile image directory created.'); } }
        catch (error) { console.error('[FS] Error creating profile image directory:', error); }
    }, []);

     /** Correctly formats a local path for display in an Image component */
     const formatUriForDisplay = (filePath) => {
         if (!filePath) return null;
         const pathWithoutPrefix = filePath.startsWith('file://') ? filePath.substring(7) : filePath;
         // Append timestamp for cache busting
         return `file://${pathWithoutPrefix}?t=${Date.now()}`;
     };

    /** Loads the profile image URI from local storage. */
    const loadLocalImage = useCallback(async () => {
        const storageKey = getCurrentImageStorageKey(); if (!storageKey) { setLocalImageUri(null); return; }
        try {
            const storedUri = await AsyncStorage.getItem(storageKey);
            if (storedUri) {
                const fileExists = await RNFS.exists(storedUri);
                if (fileExists) { console.log('[Profile] Local image path found:', storedUri); setLocalImageUri(formatUriForDisplay(storedUri)); }
                else { console.log('[Profile] Stored image path not found, clearing:', storedUri); await AsyncStorage.removeItem(storageKey); setLocalImageUri(null); }
            } else { setLocalImageUri(null); }
        } catch (error) { console.error("Error loading local image:", error); setLocalImageUri(null); }
    }, [getCurrentImageStorageKey]);

    /** Saves the selected image locally. */
    const saveImageLocally = useCallback(async (sourceUri) => {
        if (!sourceUri) return; const storageKey = getCurrentImageStorageKey(); if (!storageKey) return;
        setIsPickingImage(true);
        try {
            await ensureProfileImageDirExists();
            const timestamp = Date.now();
            const fileExtensionMatch = sourceUri.match(/\.(jpg|jpeg|png|gif|webp|heic)(\?|$)/i);
            const fileExtension = fileExtensionMatch ? fileExtensionMatch[1] : 'jpg';
            const localFileName = `profile_${currentUserRef.current?.uid}_${timestamp}.${fileExtension}`;
            const localDestPath = `${PROFILE_IMAGE_DIR}/${localFileName}`;

            const oldPath = await AsyncStorage.getItem(storageKey);
            if (oldPath && oldPath !== localDestPath) {
                 try { if (await RNFS.exists(oldPath)) { await RNFS.unlink(oldPath); console.log('[FS] Old image deleted:', oldPath); } }
                 catch (deleteError) { console.error('[FS] Error deleting old image:', deleteError); }
            }

            const sourceExists = await RNFS.exists(sourceUri); if (!sourceExists) throw new Error(`Source file does not exist: ${sourceUri}`);
            console.log(`[FS] Copying from ${sourceUri} to ${localDestPath}`);
            await RNFS.copyFile(sourceUri, localDestPath);
            console.log(`[FS] Copied file to ${localDestPath}`);

            await AsyncStorage.setItem(storageKey, localDestPath);
            setLocalImageUri(formatUriForDisplay(localDestPath)); // Update state for immediate display
            console.log('[Profile] Image saved locally.');
            await checkAndAwardAchievement('firstProfilePic');
        } catch (error) { console.error("Error saving image locally:", error); Alert.alert("Save Error", `Could not save picture. ${error.message}`); }
        finally { setIsPickingImage(false); }
    }, [getCurrentImageStorageKey, ensureProfileImageDirExists, checkAndAwardAchievement]);

    // --- AI Feature Helper Functions ---

    /** Generates a simple personalized insight based on current data. */
    const generateProgressInsight = useCallback((stats, gamification) => {
        if (!stats || !gamification) return "Keep up your mindfulness journey!";
        const { currentStreak } = stats; const { levelName } = gamification;
        if (currentStreak >= 7) return `Amazing consistency! You're on a ${currentStreak}-day streak! Keep focusing on your well-being. 🔥`;
        if (currentStreak >= 3) return `Great job maintaining a ${currentStreak}-day streak! One day at a time makes a big difference.`;
        if (levelName === "Zen Master") return "You've reached the pinnacle of mindfulness, Zen Master! Continue to inspire.";
        if (levelName === "Centered Tree") return "Like a strong tree, your practice is well-rooted. Keep growing!";
        if (levelName === "Focused Sapling") return "Your focus is sharpening! Keep nurturing your practice.";
        if (levelName === "Calm Sprout") return "You're blossoming beautifully! Keep exploring techniques.";
        if (currentStreak > 0) return `You're building momentum with a ${currentStreak}-day streak. Keep it going!`;
        if (stats.sessions > 0) return "Every session counts towards a calmer you. Keep practicing!";
        return "Every mindful moment is a step forward. Keep exploring your journey!";
    }, []);

    /** Generates a suggestion for the next achievable achievement. */
    const generateAchievementSuggestion = useCallback((currentAchievements, stats, gamification) => {
        if (!currentAchievements || !stats || !gamification) return null;
        const { currentStreak, sessions } = stats; const { points } = gamification;
        const isEarned = (id) => currentAchievements.find(a => a.id === id)?.earned;

        const streakAchievements = achievementDefinitions.filter(a => a.type === 'streak').sort((a, b) => a.value - b.value);
        for (const ach of streakAchievements) { if (!isEarned(ach.id)) { if (currentStreak === ach.value - 1) return { id: ach.id, text: `Just one more day for the '${ach.name}' achievement!` }; return { id: ach.id, text: `Keep your daily practice going for the '${ach.name}' (${ach.value} days)!` }; } }
        const pointsAchievements = achievementDefinitions.filter(a => a.type === 'points').sort((a, b) => a.value - b.value);
        for (const ach of pointsAchievements) { if (!isEarned(ach.id)) { if (points > ach.value * 0.75 && points < ach.value) return { id: ach.id, text: `Close to ${ach.value} points! Aim for the '${ach.name}' badge!` }; return { id: ach.id, text: `Earn points for the '${ach.name}' (${ach.value} points) milestone!` }; } }
        const sessionAch = achievementDefinitions.find(a => a.id === 'sessionMaster10');
        if (sessionAch && !isEarned(sessionAch.id)) { if (sessions >= sessionAch.value - 3 && sessions < sessionAch.value) return { id: sessionAch.id, text: `Only ${sessionAch.value - sessions} more sessions for '${sessionAch.name}'!` }; return { id: sessionAch.id, text: `Complete ${sessionAch.value} sessions for '${sessionAch.name}'!` }; }
        const explorerAch = achievementDefinitions.find(a => a.id === 'explorer');
        if (explorerAch && !isEarned(explorerAch.id)) { return { id: explorerAch.id, text: "Try different features like journaling or sound therapy for 'Feature Explorer'!" }; }
        return null; // No specific suggestion found
    }, []);

    // --- Image Picker Logic ---
    const imagePickerOptions = { mediaType: 'photo', maxWidth: 500, maxHeight: 500, quality: 0.7, includeBase64: false, saveToPhotos: false };

    const handleImagePickerResponse = useCallback(async (response) => {
        if (response.didCancel) { console.log('User cancelled image picker'); return; }
        if (response.errorCode) { console.log('ImagePicker Error: ', response.errorMessage); Alert.alert('Image Error', response.errorMessage); return; }
        if (response.assets && response.assets.length > 0) {
            const sourceUri = response.assets[0].uri;
            if (sourceUri) { await saveImageLocally(sourceUri); } // Save and update state
            else { Alert.alert('Error', 'Could not get the image URI.'); }
        } else { console.log('ImagePicker Response: No assets found.'); }
    }, [saveImageLocally]); // Dependency

    const requestPermission = async (permission) => {
        if (Platform.OS === 'android') {
            try { const granted = await PermissionsAndroid.request(permission); if (granted === PermissionsAndroid.RESULTS.GRANTED) return true; else { console.log('Permission denied:', permission); Alert.alert('Permission Denied', 'Cannot proceed without required permission.'); return false; } }
            catch (err) { console.warn(err); return false; }
        } return true; // iOS permissions handled differently (usually via Info.plist)
    };

    const launchCameraWithOptions = useCallback(async () => {
        const hasPermission = await requestPermission(PermissionsAndroid.PERMISSIONS.CAMERA); if (!hasPermission) return;
        launchCamera(imagePickerOptions, handleImagePickerResponse);
    }, [handleImagePickerResponse, imagePickerOptions]);

    const launchLibraryWithOptions = useCallback(async () => {
        const permission = Platform.OS === 'android' && Platform.Version >= 33 ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES : Platform.OS === 'android' ? PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE : null;
        if (permission) { const hasPermission = await requestPermission(permission); if (!hasPermission) return; }
        launchImageLibrary(imagePickerOptions, handleImagePickerResponse);
    }, [handleImagePickerResponse, imagePickerOptions]);

    const handleChooseImage = useCallback(() => {
        if (isPickingImage) return;
        Alert.alert( "Select Profile Picture", "Choose source:", [ { text: "Cancel", style: "cancel" }, { text: "Camera", onPress: launchCameraWithOptions }, { text: "Library", onPress: launchLibraryWithOptions }, ], { cancelable: true } );
    }, [isPickingImage, launchCameraWithOptions, launchLibraryWithOptions]);

    // --- Data Fetching Logic (Main Function) --- // <<< UPDATED
    const fetchData = useCallback(async (isRefresh = false, forceFetch = false) => {
        if (isFetchingData && !isRefresh) { console.log(`[Profile] Fetch skipped: Already fetching.`); return; }
        if (isFetchingData && isRefresh) { console.log(`[Profile] Note: Refresh triggered while fetch in progress.`); }

        const currentAuthUser = currentUserRef.current;
        if (!currentAuthUser) { console.log("[Profile] Fetch skipped: No user."); if (isRefreshing) setIsRefreshing(false); return; }

        const now = Date.now();
        if (!isRefresh && !forceFetch && (now - lastFetchTimestamp < FETCH_CACHE_DURATION_MS)) {
            console.log(`[Profile] Fetch skipped: Cache valid.`);
            // Ensure loading states are false even if cache hit
            setIsLoadingUser(false); setIsLoadingGamification(false); setIsLoadingAchievements(false); setIsLoadingStats(false);
            // Regenerate AI content from existing state if needed (or rely on state not changing)
            if (!progressInsight) setProgressInsight(generateProgressInsight(statsData, gamificationData));
            if (!achievementSuggestion) setAchievementSuggestion(generateAchievementSuggestion(achievementsData, statsData, gamificationData));
            return;
        }

        setIsFetchingData(true);
        if (!isRefresh || lastFetchTimestamp === 0) { // Show loading indicators on first load or forced refresh
            setIsLoadingUser(true); setIsLoadingGamification(true); setIsLoadingAchievements(true); setIsLoadingStats(true);
        }
        console.log(`[Profile] Fetching data... (isRefresh: ${isRefresh}, forceFetch: ${forceFetch})`);
        const userId = currentAuthUser.uid;
        const userEmail = currentAuthUser.email || 'No email';
        let authName = currentAuthUser.fullName || 'User'; // Initial name from Auth

        // Set initial data quickly from Auth (might be overridden by Firestore)
        setUserData({ name: authName, email: userEmail });
        setIsLoadingUser(false); // Mark basic user info as loaded

        // Load local image in parallel
        loadLocalImage();

        let fetchSuccess = false;
        let fetchedStats = { ...statsData }; // Use current state as default
        let fetchedGamification = { ...gamificationData };
        let fetchedAchievements = [...achievementsData];

        try {
            // Define Firestore references
            const userDocRef = firestore().doc(`users/${userId}`);
            const gamificationRef = firestore().doc(`users/${userId}/gamification/summary`);
            const achievementsCollectionRef = firestore().collection('users').doc(userId).collection('achievements');
            const statsRef = firestore().doc(`users/${userId}/stats/summary`);

            // Fetch all data in parallel
            const results = await Promise.allSettled([
                userDocRef.get(), // Fetch user doc first (index 0)
                gamificationRef.get(), // Index 1
                achievementsCollectionRef.get(), // Index 2
                statsRef.get() // Index 3
            ]);

            // Process User Document specifically for name
            if (results[0].status === 'fulfilled') {
                const userDoc = results[0].value;
                if (userDoc.exists && userDoc.data()?.fullName) {
                    const firestoreName = userDoc.data().fullName;
                    console.log(`[Profile] Using Firestore name: "${firestoreName}"`);
                    // Update userData state ONLY if different from current state to avoid unnecessary renders
                    setUserData(prev => prev.name === firestoreName ? prev : { ...prev, name: firestoreName });
                } else {
                    console.log("[Profile] No fullName in Firestore, using Auth name:", authName);
                    // Ensure state reflects Auth name if Firestore doc exists but lacks the field or doc doesn't exist
                     setUserData(prev => prev.name === authName ? prev : { ...prev, name: authName });
                }
            } else {
                console.error("[Profile] User doc fetch failed:", results[0].reason);
                // Keep the Auth name already set in the initial state update
                 setUserData(prev => prev.name === authName ? prev : { ...prev, name: authName });
            }

            // Process Gamification (index 1)
            if (results[1].status === 'fulfilled') {
                const doc = results[1].value; const points = doc.exists ? doc.data()?.points || 0 : 0;
                fetchedGamification = { points, ...calculateLevel(points) }; setGamificationData(fetchedGamification);
            } else { console.error("[Profile] Gamification fetch failed:", results[1].reason); }

            // Process Achievements (index 2)
            if (results[2].status === 'fulfilled') {
                const snapshot = results[2].value; const earnedAchievementsMap = new Map();
                snapshot.docs.forEach(doc => { if (doc.exists && doc.data()?.earned) earnedAchievementsMap.set(doc.id, true); });
                fetchedAchievements = achievementDefinitions.map(def => ({ ...def, earned: earnedAchievementsMap.has(def.id) })); setAchievementsData(fetchedAchievements);
            } else { console.error("[Profile] Achievements fetch failed:", results[2].reason); }

            // Process Stats (index 3)
            if (results[3].status === 'fulfilled') {
                const doc = results[3].value; const data = doc.exists ? doc.data() : {};
                fetchedStats = { sessions: data.sessions || 0, totalTimeMinutes: data.totalTimeMinutes || 0, currentStreak: data.currentStreak || 0 }; setStatsData(fetchedStats);
            } else { console.error("[Profile] Stats fetch failed:", results[3].reason); }

            fetchSuccess = true;

        } catch (error) { console.error("[Profile] General fetch error:", error); }
        finally {
            // Generate AI Content using potentially updated fetched data
            setProgressInsight(generateProgressInsight(fetchedStats, fetchedGamification));
            setAchievementSuggestion(generateAchievementSuggestion(fetchedAchievements, fetchedStats, fetchedGamification));

            // Cleanup loading states
            setIsLoadingGamification(false); setIsLoadingAchievements(false); setIsLoadingStats(false);
            if (isRefresh) setIsRefreshing(false);
            setIsFetchingData(false);
            if (fetchSuccess) { setLastFetchTimestamp(Date.now()); console.log("[Profile] Fetch completed successfully."); }
            else { console.log("[Profile] Fetch completed with errors."); }
        }
    }, [
        isFetchingData, isRefreshing, loadLocalImage, lastFetchTimestamp,
        statsData, gamificationData, achievementsData, // Include for AI regeneration on cache hit
        generateProgressInsight, generateAchievementSuggestion, calculateLevel, // Helpers
        checkAndAwardAchievement // Added checkAndAwardAchievement
    ]);

    // Add fetchData to the dependency array of the auth listener effect
    useEffect(() => {
        const unsubscribe = auth().onAuthStateChanged(user => {
            console.log("[Auth] Auth state changed.");
            const previousUserId = currentUserRef.current?.uid;
            currentUserRef.current = user;
            if (user && user.uid !== previousUserId) { console.log("[Auth] User changed, forcing data fetch."); fetchData(false, true); }
            else if (!user && previousUserId) { console.log("[Auth] User logged out, clearing state."); /* ... clear state ... */ }
        });
        return unsubscribe;
    }, [fetchData]); // Add fetchData here


    // --- Effect: Fetch Data on Screen Focus (with Caching) ---
     useFocusEffect(useCallback(() => {
        const focusTime = Date.now(); console.log(`[Profile] Screen focused. Last fetch: ${lastFetchTimestamp}`);
        const currentAuthUser = currentUserRef.current;
        if (!currentAuthUser) { console.log("[Profile] Focus: No user."); setIsLoadingUser(false); setIsLoadingGamification(false); setIsLoadingAchievements(false); setIsLoadingStats(false); setIsFetchingData(false); return; }
        if (!isFetchingData) { fetchData(false, false); } // Check cache internally
        else { console.log("[Profile] Focus: Fetch already in progress."); }
        return () => { /* console.log("[Profile] Screen blurred."); */ };
    }, [fetchData, isFetchingData, lastFetchTimestamp])); // Added lastFetchTimestamp


    // --- Handler: Pull-to-Refresh ---
    const onRefresh = useCallback(async () => {
        console.log("[Profile] Refresh triggered.");
        if (isFetchingData) { console.log("[Profile] Refresh skipped: Already fetching."); return; }
        setIsRefreshing(true);
        await fetchData(true, true); // Force fetch on refresh
    }, [fetchData, isFetchingData]);

    // --- Handlers: Name Editing ---
    const handleEditName = useCallback(() => { setTempName(userData.name); setIsEditingName(true); }, [userData.name]);
    const handleCancelEditName = useCallback(() => { setIsEditingName(false); setTempName(''); Keyboard.dismiss(); }, []);
    const handleSaveName = useCallback(async () => {
        const newName = tempName.trim();
        if (!newName || newName === userData.name) { setIsEditingName(false); setTempName(''); Keyboard.dismiss(); return; }
        if (newName.length > 40) { Alert.alert("Name Too Long", "Please enter a name shorter than 40 characters."); return; }

        setIsSavingName(true); Keyboard.dismiss();
        const user = currentUserRef.current;
        if (!user) { Alert.alert("Error", "You must be logged in to change your name."); setIsSavingName(false); return; }

        try {
            // Update Auth first
            await user.updateProfile({ fullName: newName });
            console.log('[Auth] Auth profile fullName updated.');

            // Then update Firestore
            await firestore().collection('users').doc(user.uid).set({ fullName: newName, lastUpdated: firestore.FieldValue.serverTimestamp() }, { merge: true });
            console.log('[Firestore] User document fullName updated.');

            // Update local state last
            setUserData(prev => ({ ...prev, name: newName }));
            setIsEditingName(false); setTempName('');
            console.log('[Profile] Name updated successfully.');
            await checkAndAwardAchievement('firstRename');
        } catch (error) {
            console.error("Error updating name:", error);
            // Attempt to rollback Auth update if Firestore fails? (More complex, maybe just alert user)
            Alert.alert("Update Failed", `Could not update your name fully. Please try again.\nError: ${error.message}`);
        }
        finally { setIsSavingName(false); }
    }, [tempName, userData.name, checkAndAwardAchievement]);

    // --- Handler: Logout ---
    const handleLogout = useCallback(() => {
        Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Log Out', style: 'destructive', onPress: async () => {
                try {
                    console.log('[Auth] Logging out...');
                    const storageKey = getCurrentImageStorageKey(); // Get key before signing out
                    await auth().signOut(); // Auth listener will handle state clearing
                    if (storageKey) await AsyncStorage.removeItem(storageKey); // Clear image path
                    setLastFetchTimestamp(0); // Reset fetch timestamp
                    console.log('[Auth] Logout successful.');
                    // Reset navigation to Auth stack (adjust 'Auth' if your stack name is different)
                    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
                }
                catch (error) { console.error("Logout Error: ", error); Alert.alert('Logout Error', error.message); }
            }}
        ]);
    }, [navigation, getCurrentImageStorageKey]);

    // --- UI Rendering Helpers ---
    const renderSection = (isLoading, children) => {
        if (isLoading) { return <View style={styles.loadingContainer}><ActivityIndicator size="small" color={colors.primary} /></View>; }
        return children;
    };
    const renderAvatar = useCallback(() => {
        const showEditButton = getCurrentImageStorageKey() !== null; // Only show if user is logged in
        return (
            <View style={styles.avatarContainer}>
                <LinearGradient colors={[colors.primaryLight, colors.primary]} style={styles.avatarGradient}>
                    {localImageUri ? (
                        <Image key={localImageUri} /* Add key to force update */ source={{ uri: localImageUri, cache: 'reload' }} style={styles.avatarImage} resizeMode="cover" />
                    ) : ( <Icon name="account" size={40} color={colors.textLight} /> )}
                    {isPickingImage && ( <View style={styles.avatarLoadingOverlay}><ActivityIndicator size="large" color={colors.textLight} /></View> )}
                </LinearGradient>
                {showEditButton && !isPickingImage && (
                    <TouchableOpacity style={styles.editAvatarButton} onPress={handleChooseImage} disabled={isPickingImage}>
                        <Icon name="camera-plus-outline" size={16} color={colors.editIconColor} />
                    </TouchableOpacity>
                )}
            </View>
        );
    }, [localImageUri, isPickingImage, handleChooseImage, getCurrentImageStorageKey]);

    // --- Main Render ---
    return (
        <LinearGradient colors={[colors.background, colors.backgroundMid, colors.backgroundEnd]} style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.cardBackground} />}
            >

                {/* --- Profile Header (Side-by-Side Layout - Name & Email Only) --- */}
                <View style={styles.profileHeader}>
                    <View style={styles.profileInfoContainer}>
                        {renderAvatar()}
                        <View style={styles.profileTextContainer}>
                            {/* Name Edit Section */}
                            <View style={styles.nameEditContainer}>
                                {isEditingName ? (
                                    <TextInput
                                        style={styles.nameInput} value={tempName} onChangeText={setTempName}
                                        autoFocus={true} placeholder="Enter name" placeholderTextColor={colors.textSecondary}
                                        onSubmitEditing={handleSaveName} maxLength={40} returnKeyType="done" editable={!isSavingName} />
                                ) : (
                                    <TouchableOpacity onPress={handleEditName} disabled={isLoadingUser || isSavingName} style={styles.nameTouchable}>
                                        <Text style={styles.userName} numberOfLines={1} ellipsizeMode='tail'>
                                            {isLoadingUser && !userData.name ? 'Loading...' : (userData.name || 'User')}
                                        </Text>
                                    </TouchableOpacity>
                                )}
                                {!isEditingName ? (
                                    <TouchableOpacity onPress={handleEditName} style={styles.editNameButton} disabled={isLoadingUser || isSavingName}>
                                        <Icon name="pencil-outline" size={18} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.editNameActions}>
                                        <TouchableOpacity onPress={handleSaveName} disabled={isSavingName || !tempName.trim() || tempName.trim() === userData.name} style={styles.saveCancelButton}>
                                            {isSavingName ? <ActivityIndicator size="small" color={colors.saveButton}/> : <Icon name="check" size={22} color={colors.saveButton} />}
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={handleCancelEditName} disabled={isSavingName} style={styles.saveCancelButton}>
                                            <Icon name="close" size={22} color={colors.cancelButton} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Email */}
                             <Text style={styles.userEmail} numberOfLines={1} ellipsizeMode="tail">
                                 {isLoadingUser && userData.email === 'Loading...' ? '' : userData.email}
                             </Text>

                        </View>
                    </View>
                </View>


                 {/* --- AI Sections --- */}
                 {!isLoadingStats && !isLoadingGamification && progressInsight ? (
                     <View style={[styles.aiCard, styles.insightCard]}>
                         <Icon name="lightbulb-on-outline" size={22} color={colors.primaryDark} style={styles.aiIcon} />
                         <Text style={styles.aiText}>{progressInsight}</Text>
                     </View>
                 ) : null }

                 {!isLoadingAchievements && !isLoadingStats && !isLoadingGamification && achievementSuggestion ? (
                     <TouchableOpacity
                         style={[styles.aiCard, styles.suggestionCard]}
                         onPress={() => {
                             const achDef = achievementDefinitions.find(a => a.id === achievementSuggestion.id);
                             if (achDef) { Alert.alert(`Goal: ${achDef.name}`, `${achDef.description}\n\nSuggestion: ${achievementSuggestion.text}`); }
                             else { Alert.alert('Next Goal Suggestion', achievementSuggestion.text); }
                         }}
                         activeOpacity={0.7}
                     >
                         <Icon name="target-arrow" size={22} color={colors.gold} style={styles.aiIcon} />
                         <View style={styles.aiTextContainer}>
                             <Text style={styles.aiSuggestionTitle}>Next Goal Suggestion:</Text>
                             <Text style={styles.aiText}>{achievementSuggestion.text}</Text>
                         </View>
                         <Icon name="chevron-right" size={20} color={colors.textSecondary} />
                     </TouchableOpacity>
                 ) : null}


                {/* --- Points Card --- */}
                <View style={[styles.card, styles.pointsCardContainer]}>
                    {renderSection(isLoadingGamification,
                        <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.pointsCardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                            <Icon name="star-four-points-outline" size={32} color={colors.textLight} style={styles.pointsIcon}/>
                            <Text style={styles.pointsText}>{gamificationData.points.toLocaleString()} Points</Text>
                            <Text style={styles.levelText}>{gamificationData.levelName}</Text>
                            <View style={styles.progressBarContainer}>
                                <Text style={styles.progressLabel}>Next Level</Text>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${gamificationData.progress}%` }]} />
                                </View>
                            </View>
                        </LinearGradient>
                    )}
                </View>

                {/* --- Achievements Section --- */}
                <Text style={styles.sectionTitle}>Achievements</Text>
                <View style={styles.achievementsContainer}>
                    {renderSection(isLoadingAchievements,
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
                            {achievementsData.map((achievement) => (
                                <TouchableOpacity key={achievement.id} style={[styles.achievementCard, !achievement.earned && styles.achievementLocked]} onPress={() => Alert.alert(achievement.name, `${achievement.description}\n\nStatus: ${achievement.earned ? 'Earned' : 'Locked'}`)} activeOpacity={0.7}>
                                    <View style={[styles.achievementIconContainer, achievement.earned && styles.achievementEarnedIconBg]}>
                                        <Icon name={achievement.icon} size={30} color={achievement.earned ? colors.gold : colors.iconGrey} />
                                    </View>
                                    <Text style={styles.achievementName} numberOfLines={2}>{achievement.name}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    )}
                </View>

                {/* --- Stats Section --- */}
                <Text style={styles.sectionTitle}>Mindfulness Stats</Text>
                <View style={styles.statsContainer}>
                    {renderSection(isLoadingStats, <>
                        <View style={styles.statItem}>
                            <Icon name="meditation" size={28} color={colors.primary} />
                            <Text style={styles.statValue}>{statsData.sessions}</Text>
                            <Text style={styles.statLabel}>Sessions</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Icon name="clock-time-eight-outline" size={28} color={colors.primary} />
                            <Text style={styles.statValue}>{`${Math.floor(statsData.totalTimeMinutes / 60)}h ${statsData.totalTimeMinutes % 60}m`}</Text>
                            <Text style={styles.statLabel}>Total Time</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Icon name="fire" size={28} color={statsData.currentStreak > 0 ? colors.gold : colors.primary} />
                            <Text style={styles.statValue}>{statsData.currentStreak}d</Text>
                            <Text style={styles.statLabel}>Streak</Text>
                        </View>
                    </>)}
                </View>

                {/* --- Preferences Section --- */}
                <Text style={styles.sectionTitle}>Preferences</Text>
                <View style={styles.card}>
                    <View style={styles.settingItem}>
                        <Icon name="theme-light-dark" size={24} color={colors.primary} />
                        <Text style={styles.settingText}>Dark Mode</Text>
                        <TouchableOpacity onPress={() => { setDarkMode(!darkMode); Alert.alert("Dark Mode", "App-wide dark mode requires global state management (not implemented)."); }} style={styles.toggleButton}>
                            <View style={[styles.toggle, darkMode && { backgroundColor: colors.primary }]}>
                                <View style={[styles.toggleKnob, darkMode && styles.toggleKnobActive]}/>
                            </View>
                        </TouchableOpacity>
                    </View>
                    <View style={[styles.settingItem, styles.settingItemNoBorder]}>
                        <Icon name="bell-outline" size={24} color={colors.primary} />
                        <Text style={styles.settingText}>Notifications</Text>
                        <TouchableOpacity onPress={() => { setNotifications(!notifications); Alert.alert("Notifications", "Notification preferences saved (locally - not implemented)."); }} style={styles.toggleButton}>
                            <View style={[styles.toggle, notifications && { backgroundColor: colors.primary }]}>
                                <View style={[styles.toggleKnob, notifications && styles.toggleKnobActive]}/>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- Account Section --- */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.card}>
                    <TouchableOpacity style={[styles.settingItem, styles.settingItemNoBorder]} onPress={handleLogout}>
                        <Icon name="logout-variant" size={24} color={colors.logoutRed} />
                        <Text style={[styles.settingText, { color: colors.logoutRed }]}>Log Out</Text>
                        <Icon name="chevron-right" size={24} color={colors.iconGrey} />
                    </TouchableOpacity>
                </View>

                {/* Bottom Spacer */}
                <View style={{ height: 50 }} />
            </ScrollView>
        </LinearGradient>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 30, paddingBottom: 40 },
    profileHeader: { width: '100%', marginBottom: 25, },
    profileInfoContainer: { flexDirection: 'row', alignItems: 'center', width: '100%', },
    avatarContainer: { width: 80, height: 80, borderRadius: 40, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6, position: 'relative', backgroundColor: colors.primaryLight, borderWidth: 2, borderColor: colors.cardBackground, marginRight: 15, },
    avatarGradient: { flex: 1, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 40 },
    avatarLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    editAvatarButton: { position: 'absolute', bottom: -2, right: -2, backgroundColor: colors.editIconBackground, padding: 5, borderRadius: 12, borderWidth: 1, borderColor: colors.cardBackground, elevation: 5, },
    profileTextContainer: { flex: 1, justifyContent: 'center', height: 80, },
    nameEditContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, width: '100%', },
    nameTouchable: { flexShrink: 1, marginRight: 25, },
    userName: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, textAlign: 'left', },
    nameInput: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, borderBottomWidth: 1, borderColor: colors.primary, paddingVertical: Platform.OS === 'ios' ? 6 : 0, paddingHorizontal: 5, textAlign: 'left', flexGrow: 1, marginRight: 5, },
    editNameButton: { position: 'absolute', right: 0, top: 0, bottom: 0, justifyContent: 'center', paddingLeft: 5, },
    editNameActions: { flexDirection: 'row', alignItems: 'center', },
    saveCancelButton: { padding: 4, marginLeft: 6, },
    userEmail: { fontSize: 14, color: colors.textSecondary, textAlign: 'left', marginTop: 0, marginBottom: 4, width: '95%', },
    card: { backgroundColor: colors.cardBackground, borderRadius: 18, marginBottom: 25, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3, borderWidth: Platform.OS === 'android' ? 0 : 1, borderColor: 'rgba(0,0,0,0.05)' },
    pointsCardContainer: { padding: 0, overflow: 'hidden', minHeight: 180, justifyContent: 'center' },
    pointsCardGradient: { padding: 25, alignItems: 'center' },
    pointsIcon: { marginBottom: 8 },
    pointsText: { fontSize: 30, color: colors.textLight, fontWeight: 'bold', marginVertical: 4 },
    levelText: { color: colors.textLight, fontSize: 16, fontWeight: '500', marginBottom: 18 },
    progressBarContainer: { width: '100%', alignItems: 'center' },
    progressLabel: { color: 'rgba(255, 255, 255, 0.8)', fontSize: 12, marginBottom: 5, alignSelf: 'flex-end' },
    progressBar: { height: 8, width: '100%', backgroundColor: colors.progressBackground, borderRadius: 4, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: colors.progressFill, borderRadius: 4 },
    sectionTitle: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginBottom: 18, marginLeft: 5, marginTop: 15 },
    achievementsContainer: { marginBottom: 10, minHeight: 150, justifyContent: 'center' },
    achievementsScroll: { paddingBottom: 15, paddingLeft: 5 },
    achievementCard: { backgroundColor: colors.cardBackground, borderRadius: 15, padding: 15, marginRight: 12, alignItems: 'center', width: 110, height: 130, justifyContent: 'center', shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 2, borderWidth: 1, borderColor: colors.lightBorder },
    achievementLocked: { opacity: 0.6 },
    achievementIconContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#F0F4F3', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    achievementEarnedIconBg: { backgroundColor: colors.primaryLight },
    achievementName: { fontSize: 13, fontWeight: '500', color: colors.textPrimary, textAlign: 'center', marginBottom: 4 },
    settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.lightBorder },
    settingItemNoBorder: { borderBottomWidth: 0 },
    settingText: { flex: 1, fontSize: 16, color: colors.textPrimary, marginLeft: 18 },
    toggleButton: {},
    toggle: { width: 50, height: 28, borderRadius: 14, backgroundColor: colors.toggleInactive, justifyContent: 'center', padding: 2 },
    toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
    toggleKnobActive: { transform: [{ translateX: 22 }] },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5, marginBottom: 30, minHeight: 100, alignItems:'stretch' },
    statItem: { backgroundColor: colors.cardBackground, borderRadius: 15, paddingVertical: 15, paddingHorizontal: 10, width: '31%', alignItems: 'center', justifyContent: 'center', shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2, borderWidth: Platform.OS === 'android' ? 0 : 1, borderColor: 'rgba(0,0,0,0.04)' },
    statValue: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
    statLabel: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
    loadingIndicator: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingContainer: { minHeight: 100, justifyContent: 'center', alignItems: 'center' },
    aiCard: { borderRadius: 15, padding: 15, marginBottom: 20, flexDirection: 'row', alignItems: 'center', shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 2, borderWidth: 1, },
    insightCard: { backgroundColor: colors.insightBackground, borderColor: colors.insightBorder, },
    suggestionCard: { backgroundColor: colors.suggestionBackground, borderColor: colors.suggestionBorder, },
    aiIcon: { marginRight: 12, alignSelf: 'flex-start', marginTop: 2, },
    aiTextContainer: { flex: 1, marginRight: 8, },
    aiSuggestionTitle: { fontWeight: '600', color: colors.textPrimary, fontSize: 14, marginBottom: 3, },
    aiText: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 20, },
});

export default ProfileScreen;
