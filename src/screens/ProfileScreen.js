// screens/ProfileScreen.js
// FINAL VERSION - Updated June 8, 2025
// - Complete UI Overhaul: Redesigned with a modern "dashboard" layout using a glassmorphism aesthetic.
// - Enhanced Header: Features a larger, centered avatar for a stronger profile focus.
// - Dynamic Grid: Stats, Points, and AI Suggestions are now in a responsive grid.
// - Polished Gamification: Redesigned Achievements and Level Progress cards for a more rewarding feel.
// - Maintained all core logic for fetching, name editing, and image picking.

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity,
    ActivityIndicator, Alert, Platform, PermissionsAndroid, RefreshControl,
    Image, TextInput, Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// *** Firebase & Utility Imports ***
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';

// --- ✅ ENHANCED UI Configuration ---
const colors = {
    primary: '#2bedbb',
    primaryDark: '#1fcda9',
    backgroundStart: '#EBF7F5',
    backgroundEnd: '#D1E5E0',
    cardBackground: '#FFFFFF',
    textPrimary: '#1A3B3A',
    textSecondary: '#5F817F',
    textLight: '#FFFFFF',
    logoutRed: '#D9534F',
    gold: '#FFC107',
    goldGlow: 'rgba(255, 193, 7, 0.5)',
    iconGrey: '#7A8D8E',
    // Glassmorphism Style
    glassBackground: 'rgba(255, 255, 255, 0.65)',
    glassBorder: 'rgba(255, 255, 255, 0.8)',
    // Other UI elements
    editIconBackground: 'rgba(0, 0, 0, 0.5)',
    saveButton: '#2bedbb',
    cancelButton: '#AAAAAA',
    redeemButtonText: '#1A4D2E',
    lockedOverlay: 'rgba(240, 244, 243, 0.7)',
    lockedIcon: '#9DBFBA',
};

const levels = [ { threshold: 0, name: "Mindful Seedling" }, { threshold: 500, name: "Calm Sprout" }, { threshold: 1500, name: "Focused Sapling" }, { threshold: 3000, name: "Centered Tree" }, { threshold: 5000, name: "Zen Master" } ];
const achievementDefinitions = [ { id: 'firstRename', name: 'Identity Update', icon: 'account-edit-outline', description: 'Updated your profile name.' }, { id: 'firstProfilePic', name: 'Picture Perfect', icon: 'camera-account', description: 'Set your first profile picture.' }, { id: 'firstMoodLogged', name: 'First Steps', icon: 'shoe-print', description: 'Logged your first mood.' }, { id: 'beginnerBreath', name: 'Breathe Easy', icon: 'weather-windy', description: 'Completed first breathing exercise.' }, { id: 'firstJournalEntry', name: 'Dear Diary', icon: 'book-open-page-variant-outline', description: 'Wrote your first journal entry.' }, { id: 'dailyStreak3', name: '3 Day Streak', icon: 'fire-circle', description: 'Used the app 3 days in a row.', type: 'streak', value: 3 }, { id: 'dailyStreak7', name: '7 Day Streak', icon: 'fire', description: 'Used the app 7 days in a row.', type: 'streak', value: 7 }, { id: 'pointsMilestone1k', name: '1K Club', icon: 'trophy-variant-outline', description: 'Reached 1000 points.', type: 'points', value: 1000 }, { id: 'sessionMaster10', name: 'Session Master', icon: 'meditation', description: 'Completed 10 mindfulness sessions.', type: 'sessions', value: 10 }, { id: 'explorer', name: 'Feature Explorer', icon: 'compass-outline', description: 'Used 3 different app features.' }, ];

// --- Constants ---
const LOCAL_IMAGE_STORAGE_KEY_PREFIX = '@profileImage_';
const PROFILE_IMAGE_DIR = `${RNFS.DocumentDirectoryPath}/ProfileImages`;
const FETCH_CACHE_DURATION_MS = 60 * 1000;

// --- Component ---
const ProfileScreen = ({ navigation }) => {
    // (All state variables remain the same)
    const [userData, setUserData] = useState({ name: 'User', email: 'Loading...' });
    const [localImageUri, setLocalImageUri] = useState(null);
    const [gamificationData, setGamificationData] = useState({ points: 0, levelName: levels[0]?.name || 'Seedling', progress: 0 });
    const [achievementsData, setAchievementsData] = useState(achievementDefinitions.map(def => ({ ...def, earned: false })));
    const [statsData, setStatsData] = useState({ sessions: 0, totalTimeMinutes: 0, currentStreak: 0 });
    const [isLoadingUser, setIsLoadingUser] = useState(true);
    const [isLoadingGamification, setIsLoadingGamification] = useState(true);
    const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isFetchingData, setIsFetchingData] = useState(false);
    const [lastFetchTimestamp, setLastFetchTimestamp] = useState(0);
    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false);
    const [isPickingImage, setIsPickingImage] = useState(false);
    const [progressInsight, setProgressInsight] = useState('');
    const [achievementSuggestion, setAchievementSuggestion] = useState(null);
    const currentUserRef = useRef(auth().currentUser);

    // (All logic functions like `useEffect`, `fetchData`, `handleSaveName`, `handleChooseImage`, etc. remain unchanged)
    useEffect(() => { const unsubscribe = auth().onAuthStateChanged(user => { const previousUserId = currentUserRef.current?.uid; currentUserRef.current = user; if (user && user.uid !== previousUserId) { fetchData(false, true); } else if (!user && previousUserId) { setUserData({ name: 'User', email: 'Login required' }); setGamificationData({ points: 0, levelName: levels[0].name, progress: 0 }); setAchievementsData(achievementDefinitions.map(def => ({ ...def, earned: false }))); setStatsData({ sessions: 0, totalTimeMinutes: 0, currentStreak: 0 }); setLocalImageUri(null); setLastFetchTimestamp(0); setProgressInsight(''); setAchievementSuggestion(null); setIsLoadingUser(false); setIsLoadingGamification(false); setIsLoadingAchievements(false); setIsLoadingStats(false); setIsFetchingData(false); } }); return unsubscribe; }, [fetchData]);
    const calculateLevel = (points) => { let currentLevel = levels[0]; let nextLevel = levels[1] || null; for (let i = 0; i < levels.length; i++) { if (points >= levels[i].threshold) { currentLevel = levels[i]; nextLevel = levels[i + 1] || null; } else { break; } } const pointsInLevel = points - currentLevel.threshold; const pointsForNextLevel = nextLevel ? nextLevel.threshold - currentLevel.threshold : 0; const progress = nextLevel && pointsForNextLevel > 0 ? Math.min(100, Math.max(0, Math.floor((pointsInLevel / pointsForNextLevel) * 100))) : 100; return { levelName: currentLevel.name, progress }; };
    const checkAndAwardAchievement = useCallback(async (achievementId) => { const userId = currentUserRef.current?.uid; if (!userId) return; const definition = achievementDefinitions.find(def => def.id === achievementId); if (!definition) return; const isAlreadyEarnedLocally = achievementsData.find(a => a.id === achievementId)?.earned; if (isAlreadyEarnedLocally) { return; } const achievementRef = firestore().doc(`users/${userId}/achievements/${achievementId}`); try { const doc = await achievementRef.get({ source: 'server' }); if (!doc.exists || !doc.data()?.earned) { await achievementRef.set({ earned: true, earnedAt: firestore.FieldValue.serverTimestamp(), name: definition.name, icon: definition.icon, description: definition.description }, { merge: true }); setAchievementsData(prev => prev.map(a => a.id === achievementId ? { ...a, earned: true } : a)); Alert.alert("🏆 Achievement Unlocked!", definition.name); } else { setAchievementsData(prev => prev.map(a => a.id === achievementId ? { ...a, earned: true } : a)); } } catch (error) { console.error(`[Achieve] Error checking/awarding ${achievementId}:`, error); } }, [achievementsData]);
    const getCurrentImageStorageKey = useCallback(() => { const userId = currentUserRef.current?.uid; if (!userId) return null; return `${LOCAL_IMAGE_STORAGE_KEY_PREFIX}${userId}`; }, []);
    const handleNavigateToRedeem = () => { navigation.navigate('Redeem'); };
    const ensureProfileImageDirExists = useCallback(async () => { try { const exists = await RNFS.exists(PROFILE_IMAGE_DIR); if (!exists) { await RNFS.mkdir(PROFILE_IMAGE_DIR); } } catch (error) { console.error('[FS] Error creating profile image directory:', error); } }, []);
    const formatUriForDisplay = (filePath) => { if (!filePath) return null; const pathWithoutPrefix = filePath.startsWith('file://') ? filePath.substring(7) : filePath; return `file://${pathWithoutPrefix}?t=${Date.now()}`; };
    const loadLocalImage = useCallback(async () => { const storageKey = getCurrentImageStorageKey(); if (!storageKey) { setLocalImageUri(null); return; } try { const storedUri = await AsyncStorage.getItem(storageKey); if (storedUri) { const fileExists = await RNFS.exists(storedUri); if (fileExists) { setLocalImageUri(formatUriForDisplay(storedUri)); } else { await AsyncStorage.removeItem(storageKey); setLocalImageUri(null); } } else { setLocalImageUri(null); } } catch (error) { console.error("Error loading local image:", error); setLocalImageUri(null); } }, [getCurrentImageStorageKey]);
    const saveImageLocally = useCallback(async (sourceUri) => { if (!sourceUri) return; const storageKey = getCurrentImageStorageKey(); if (!storageKey) return; setIsPickingImage(true); try { await ensureProfileImageDirExists(); const timestamp = Date.now(); const fileExtensionMatch = sourceUri.match(/\.(jpg|jpeg|png|gif|webp|heic)(\?|$)/i); const fileExtension = fileExtensionMatch ? fileExtensionMatch[1] : 'jpg'; const localFileName = `profile_${currentUserRef.current?.uid}_${timestamp}.${fileExtension}`; const localDestPath = `${PROFILE_IMAGE_DIR}/${localFileName}`; const oldPath = await AsyncStorage.getItem(storageKey); if (oldPath && oldPath !== localDestPath) { try { if (await RNFS.exists(oldPath)) { await RNFS.unlink(oldPath); } } catch (deleteError) { console.error('[FS] Error deleting old image:', deleteError); } } const sourceExists = await RNFS.exists(sourceUri); if (!sourceExists) throw new Error(`Source file does not exist: ${sourceUri}`); await RNFS.copyFile(sourceUri, localDestPath); await AsyncStorage.setItem(storageKey, localDestPath); setLocalImageUri(formatUriForDisplay(localDestPath)); await checkAndAwardAchievement('firstProfilePic'); } catch (error) { console.error("Error saving image locally:", error); Alert.alert("Save Error", `Could not save picture. ${error.message}`); } finally { setIsPickingImage(false); } }, [getCurrentImageStorageKey, ensureProfileImageDirExists, checkAndAwardAchievement]);
    const generateProgressInsight = useCallback((stats, gamification) => { if (!stats || !gamification) return "Keep up your mindfulness journey!"; const { currentStreak } = stats; const { levelName } = gamification; if (currentStreak >= 7) return `Amazing consistency! You're on a ${currentStreak}-day streak! Keep focusing on your well-being. 🔥`; if (currentStreak >= 3) return `Great job maintaining a ${currentStreak}-day streak! One day at a time makes a big difference.`; if (levelName === "Zen Master") return "You've reached the pinnacle of mindfulness, Zen Master! Continue to inspire."; return "Every mindful moment is a step forward. Keep exploring your journey!"; }, []);
    const generateAchievementSuggestion = useCallback((currentAchievements, stats, gamification) => { if (!currentAchievements || !stats || !gamification) return null; const { currentStreak, sessions } = stats; const { points } = gamification; const isEarned = (id) => currentAchievements.find(a => a.id === id)?.earned; const streakAchievements = achievementDefinitions.filter(a => a.type === 'streak').sort((a, b) => a.value - b.value); for (const ach of streakAchievements) { if (!isEarned(ach.id)) { if (currentStreak === ach.value - 1) return { id: ach.id, text: `Just one more day for the '${ach.name}' achievement!` }; return { id: ach.id, text: `Keep your daily practice going for the '${ach.name}' (${ach.value} days)!` }; } } const pointsAchievements = achievementDefinitions.filter(a => a.type === 'points').sort((a, b) => a.value - b.value); for (const ach of pointsAchievements) { if (!isEarned(ach.id)) { if (points > ach.value * 0.75 && points < ach.value) return { id: ach.id, text: `Close to ${ach.value} points! Aim for the '${ach.name}' badge!` }; return { id: ach.id, text: `Earn points for the '${ach.name}' (${ach.value} points) milestone!` }; } } const sessionAch = achievementDefinitions.find(a => a.id === 'sessionMaster10'); if (sessionAch && !isEarned(sessionAch.id)) { if (sessions >= sessionAch.value - 3 && sessions < sessionAch.value) return { id: sessionAch.id, text: `Only ${sessionAch.value - sessions} more sessions for '${sessionAch.name}'!` }; return { id: sessionAch.id, text: `Complete ${sessionAch.value} sessions for '${sessionAch.name}'!` }; } return null; }, []);
    const imagePickerOptions = { mediaType: 'photo', maxWidth: 500, maxHeight: 500, quality: 0.7, includeBase64: false, saveToPhotos: false };
    const handleImagePickerResponse = useCallback(async (response) => { if (response.didCancel) { return; } if (response.errorCode) { Alert.alert('Image Error', response.errorMessage); return; } if (response.assets && response.assets.length > 0) { const sourceUri = response.assets[0].uri; if (sourceUri) { await saveImageLocally(sourceUri); } else { Alert.alert('Error', 'Could not get the image URI.'); } } }, [saveImageLocally]);
    const requestPermission = async (permission) => { if (Platform.OS === 'android') { try { const granted = await PermissionsAndroid.request(permission); if (granted === PermissionsAndroid.RESULTS.GRANTED) return true; else { Alert.alert('Permission Denied', 'Cannot proceed without required permission.'); return false; } } catch (err) { console.warn(err); return false; } } return true; };
    const launchCameraWithOptions = useCallback(async () => { const hasPermission = await requestPermission(PermissionsAndroid.PERMISSIONS.CAMERA); if (!hasPermission) return; launchCamera(imagePickerOptions, handleImagePickerResponse); }, [handleImagePickerResponse, imagePickerOptions]);
    const launchLibraryWithOptions = useCallback(async () => { const permission = Platform.OS === 'android' && Platform.Version >= 33 ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES : Platform.OS === 'android' ? PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE : null; if (permission) { const hasPermission = await requestPermission(permission); if (!hasPermission) return; } launchImageLibrary(imagePickerOptions, handleImagePickerResponse); }, [handleImagePickerResponse, imagePickerOptions]);
    const handleChooseImage = useCallback(() => { if (isPickingImage) return; Alert.alert( "Select Profile Picture", "Choose source:", [ { text: "Cancel", style: "cancel" }, { text: "Camera", onPress: launchCameraWithOptions }, { text: "Library", onPress: launchLibraryWithOptions }, ], { cancelable: true } ); }, [isPickingImage, launchCameraWithOptions, launchLibraryWithOptions]);
    const fetchData = useCallback(async (isRefresh = false, forceFetch = false) => { if (isFetchingData && !isRefresh) { return; } const currentAuthUser = currentUserRef.current; if (!currentAuthUser) { if (isRefreshing) setIsRefreshing(false); return; } const now = Date.now(); if (!isRefresh && !forceFetch && (now - lastFetchTimestamp < FETCH_CACHE_DURATION_MS)) { setIsLoadingUser(false); setIsLoadingGamification(false); setIsLoadingAchievements(false); setIsLoadingStats(false); if (!progressInsight) setProgressInsight(generateProgressInsight(statsData, gamificationData)); if (!achievementSuggestion) setAchievementSuggestion(generateAchievementSuggestion(achievementsData, statsData, gamificationData)); return; } setIsFetchingData(true); if (!isRefresh || lastFetchTimestamp === 0) { setIsLoadingUser(true); setIsLoadingGamification(true); setIsLoadingAchievements(true); setIsLoadingStats(true); } const userId = currentAuthUser.uid; const userEmail = currentAuthUser.email || 'No email'; let authName = currentAuthUser.displayName || 'User'; setUserData({ name: authName, email: userEmail }); setIsLoadingUser(false); loadLocalImage(); let fetchSuccess = false; let fetchedStats = { ...statsData }; let fetchedGamification = { ...gamificationData }; let fetchedAchievements = [...achievementsData]; try { const userDocRef = firestore().doc(`users/${userId}`); const gamificationRef = firestore().doc(`users/${userId}/gamification/summary`); const achievementsCollectionRef = firestore().collection('users').doc(userId).collection('achievements'); const statsRef = firestore().doc(`users/${userId}/stats/summary`); const results = await Promise.allSettled([ userDocRef.get(), gamificationRef.get(), achievementsCollectionRef.get(), statsRef.get() ]); if (results[0].status === 'fulfilled') { const userDoc = results[0].value; if (userDoc.exists && userDoc.data()?.fullName) { const firestoreName = userDoc.data().fullName; setUserData(prev => prev.name === firestoreName ? prev : { ...prev, name: firestoreName }); } else { setUserData(prev => prev.name === authName ? prev : { ...prev, name: authName }); } } else { setUserData(prev => prev.name === authName ? prev : { ...prev, name: authName }); } if (results[1].status === 'fulfilled') { const doc = results[1].value; const points = doc.exists ? doc.data()?.points || 0 : 0; fetchedGamification = { points, ...calculateLevel(points) }; setGamificationData(fetchedGamification); } if (results[2].status === 'fulfilled') { const snapshot = results[2].value; const earnedAchievementsMap = new Map(); snapshot.docs.forEach(doc => { if (doc.exists && doc.data()?.earned) earnedAchievementsMap.set(doc.id, true); }); fetchedAchievements = achievementDefinitions.map(def => ({ ...def, earned: earnedAchievementsMap.has(def.id) })); setAchievementsData(fetchedAchievements); } if (results[3].status === 'fulfilled') { const doc = results[3].value; const data = doc.exists ? doc.data() : {}; fetchedStats = { sessions: data.sessions || 0, totalTimeMinutes: data.totalTimeMinutes || 0, currentStreak: data.currentStreak || 0 }; setStatsData(fetchedStats); } fetchSuccess = true; } catch (error) { console.error("[Profile] General fetch error:", error); } finally { setProgressInsight(generateProgressInsight(fetchedStats, fetchedGamification)); setAchievementSuggestion(generateAchievementSuggestion(fetchedAchievements, fetchedStats, fetchedGamification)); setIsLoadingGamification(false); setIsLoadingAchievements(false); setIsLoadingStats(false); if (isRefresh) setIsRefreshing(false); setIsFetchingData(false); if (fetchSuccess) { setLastFetchTimestamp(Date.now()); } } }, [isFetchingData, isRefreshing, loadLocalImage, lastFetchTimestamp, statsData, gamificationData, achievementsData, generateProgressInsight, generateAchievementSuggestion, calculateLevel, checkAndAwardAchievement]);
    useFocusEffect(useCallback(() => { const currentAuthUser = currentUserRef.current; if (!currentAuthUser) { setIsLoadingUser(false); setIsLoadingGamification(false); setIsLoadingAchievements(false); setIsLoadingStats(false); setIsFetchingData(false); return; } if (!isFetchingData) { fetchData(false, false); } }, [fetchData, isFetchingData, lastFetchTimestamp]));
    const onRefresh = useCallback(async () => { if (isFetchingData) { return; } setIsRefreshing(true); await fetchData(true, true); }, [fetchData, isFetchingData]);
    const handleEditName = useCallback(() => { setTempName(userData.name); setIsEditingName(true); }, [userData.name]);
    const handleCancelEditName = useCallback(() => { setIsEditingName(false); setTempName(''); Keyboard.dismiss(); }, []);
    const handleSaveName = useCallback(async () => { const newName = tempName.trim(); if (!newName || newName === userData.name) { setIsEditingName(false); setTempName(''); Keyboard.dismiss(); return; } if (newName.length > 40) { Alert.alert("Name Too Long", "Please enter a name shorter than 40 characters."); return; } setIsSavingName(true); Keyboard.dismiss(); const user = currentUserRef.current; if (!user) { Alert.alert("Error", "You must be logged in to change your name."); setIsSavingName(false); return; } try { await user.updateProfile({ displayName: newName }); await firestore().collection('users').doc(user.uid).set({ fullName: newName, lastUpdated: firestore.FieldValue.serverTimestamp() }, { merge: true }); setUserData(prev => ({ ...prev, name: newName })); setIsEditingName(false); setTempName(''); await checkAndAwardAchievement('firstRename'); } catch (error) { console.error("Error updating name:", error); Alert.alert("Update Failed", `Could not update your name. ${error.message}`); } finally { setIsSavingName(false); } }, [tempName, userData.name, checkAndAwardAchievement]);
    const handleLogout = useCallback(() => { Alert.alert('Confirm Logout', 'Are you sure you want to log out?', [ { text: 'Cancel', style: 'cancel' }, { text: 'Log Out', style: 'destructive', onPress: async () => { try { const storageKey = getCurrentImageStorageKey(); await auth().signOut(); if (storageKey) await AsyncStorage.removeItem(storageKey); setLastFetchTimestamp(0); navigation.reset({ index: 0, routes: [{ name: 'Auth' }] }); } catch (error) { console.error("Logout Error: ", error); Alert.alert('Logout Error', error.message); } }} ]); }, [navigation, getCurrentImageStorageKey]);

    // --- Main Render ---
    return (
        <LinearGradient colors={[colors.backgroundStart, colors.backgroundEnd]} style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            >
                {/* --- Profile Header --- */}
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <LinearGradient colors={['#a6f9e2', colors.primary]} style={styles.avatarGradient}>
                            {localImageUri ? (
                                <Image key={localImageUri} source={{ uri: localImageUri, cache: 'reload' }} style={styles.avatarImage} />
                            ) : ( <Icon name="account" size={60} color={colors.textLight} /> )}
                            {isPickingImage && ( <View style={styles.avatarLoadingOverlay}><ActivityIndicator size="large" color={colors.textLight} /></View> )}
                        </LinearGradient>
                        {!isPickingImage && (
                            <TouchableOpacity style={styles.editAvatarButton} onPress={handleChooseImage}>
                                <Icon name="camera-plus-outline" size={20} color={colors.textLight} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.nameEditContainer}>
                        {isEditingName ? (
                            <TextInput style={styles.nameInput} value={tempName} onChangeText={setTempName} autoFocus={true} onSubmitEditing={handleSaveName} returnKeyType="done" editable={!isSavingName} />
                        ) : (
                            <Text style={styles.userName} numberOfLines={1}>{isLoadingUser ? '...' : userData.name}</Text>
                        )}
                        {isEditingName ? (
                            <View style={styles.editNameActions}>
                                <TouchableOpacity onPress={handleSaveName} disabled={isSavingName || !tempName.trim()}><Icon name="check-circle-outline" size={28} color={colors.saveButton} /></TouchableOpacity>
                                <TouchableOpacity onPress={handleCancelEditName} disabled={isSavingName} style={{marginLeft: 10}}><Icon name="close-circle-outline" size={28} color={colors.cancelButton} /></TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity onPress={handleEditName} style={styles.editNameButton}><Icon name="pencil-outline" size={22} color={colors.textSecondary} /></TouchableOpacity>
                        )}
                    </View>
                    <Text style={styles.userEmail} numberOfLines={1}>{isLoadingUser ? ' ' : userData.email}</Text>
                </View>

                {/* --- Dashboard Grid --- */}
                <View style={styles.dashboardGrid}>
                    <View style={[styles.gridItem, styles.gridItemFull]}>
                         <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.pointsCardGradient}>
                            <View style={styles.pointsHeader}>
                                <Text style={styles.pointsText}>{isLoadingGamification ? '...' : gamificationData.points.toLocaleString()}</Text>
                                <Text style={styles.pointsLabel}>Points</Text>
                            </View>
                            <View style={styles.levelContainer}>
                                <Text style={styles.levelText}>{isLoadingGamification ? '...' : gamificationData.levelName}</Text>
                                <View style={styles.progressBar}><View style={[styles.progressFill, { width: `${gamificationData.progress}%` }]} /></View>
                            </View>
                            <TouchableOpacity style={styles.redeemButton} onPress={handleNavigateToRedeem}>
                                <Icon name="gift-outline" size={16} color={colors.redeemButtonText} />
                                <Text style={styles.redeemButtonText}>Redeem Rewards</Text>
                            </TouchableOpacity>
                         </LinearGradient>
                    </View>
                    {achievementSuggestion && (
                        <TouchableOpacity style={[styles.gridItem, styles.gridItemFull, {padding: 20}]} onPress={() => Alert.alert(`Goal: ${achievementDefinitions.find(a=>a.id === achievementSuggestion.id)?.name || 'Next Goal'}`, achievementSuggestion.text)}>
                             <Icon name="target-arrow" size={30} color={colors.gold} style={styles.gridIcon} />
                             <Text style={styles.gridTitle}>Next Goal</Text>
                             <Text style={styles.gridText} numberOfLines={2}>{achievementSuggestion.text}</Text>
                        </TouchableOpacity>
                    )}
                     <View style={styles.gridItem}>
                        <Icon name="fire" size={30} color={colors.gold} style={styles.gridIcon} />
                        <Text style={styles.gridTitle}>Streak</Text>
                        <Text style={styles.gridText}>{isLoadingStats ? '...' : `${statsData.currentStreak} Days`}</Text>
                    </View>
                    <View style={styles.gridItem}>
                        <Icon name="meditation" size={30} color={colors.primary} style={styles.gridIcon} />
                        <Text style={styles.gridTitle}>Sessions</Text>
                        <Text style={styles.gridText}>{isLoadingStats ? '...' : statsData.sessions}</Text>
                    </View>
                </View>

                {/* --- Achievements Section --- */}
                <Text style={styles.sectionTitle}>Achievements</Text>
                <View style={styles.achievementsContainer}>
                    {isLoadingAchievements ? <ActivityIndicator color={colors.primary} style={{height: 140}}/> : (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.achievementsScroll}>
                        {achievementsData.map((ach) => (
                            <TouchableOpacity key={ach.id} style={[styles.achievementCard, ach.earned && styles.achievementEarned]} onPress={() => Alert.alert(ach.name, `${ach.description}\n\nStatus: ${ach.earned ? 'Earned' : 'Locked'}`)}>
                                <View style={[styles.achievementIconContainer, ach.earned && {backgroundColor: colors.gold}]}>
                                    <Icon name={ach.icon} size={32} color={ach.earned ? colors.cardBackground : colors.iconGrey} />
                                </View>
                                <Text style={styles.achievementName} numberOfLines={2}>{ach.name}</Text>
                                {!ach.earned && <View style={styles.lockedOverlay}><Icon name="lock-outline" size={24} color={colors.lockedIcon}/></View>}
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    )}
                </View>

                {/* --- Settings Section --- */}
                <Text style={styles.sectionTitle}>Account</Text>
                <View style={styles.settingsCard}>
                    <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
                        <Icon name="logout-variant" size={24} color={colors.logoutRed} />
                        <Text style={[styles.settingText, { color: colors.logoutRed }]}>Log Out</Text>
                        <Icon name="chevron-right" size={24} color={colors.iconGrey} />
                    </TouchableOpacity>
                </View>
                <View style={{ height: 50 }} />
            </ScrollView>
        </LinearGradient>
    );
};

// --- ✅ ENHANCED Styles ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 30, paddingBottom: 40 },
    // Profile Header
    profileHeader: { alignItems: 'center', marginBottom: 30, },
    avatarContainer: { width: 110, height: 110, borderRadius: 55, elevation: 0, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: {width: 0, height: 5}, backgroundColor: colors.cardBackground, marginBottom: 15, },
    avatarGradient: { flex: 1, borderRadius: 55, justifyContent: 'center', alignItems: 'center' },
    avatarImage: { width: '100%', height: '100%', borderRadius: 55 },
    avatarLoadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 55, justifyContent: 'center', alignItems: 'center' },
    editAvatarButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: colors.editIconBackground, padding: 8, borderRadius: 16, borderWidth: 2, borderColor: colors.cardBackground, },
    nameEditContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 40, },
    userName: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, },
    nameInput: { fontSize: 26, fontWeight: '700', color: colors.textPrimary, borderBottomWidth: 1.5, borderColor: colors.primary, paddingBottom: 4, },
    editNameButton: { paddingLeft: 10, },
    editNameActions: { flexDirection: 'row', alignItems: 'center', paddingLeft: 15, },
    userEmail: { fontSize: 16, color: colors.textSecondary, marginTop: 4, },
    // Dashboard Grid
    dashboardGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 15, },
    gridItem: { backgroundColor: colors.glassBackground, borderWidth: 1, borderColor: colors.glassBorder, borderRadius: 20, width: '48%', padding: 15, marginBottom: 15, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 0, minHeight: 120, justifyContent: 'center'},
    gridItemFull: { width: '100%', },
    gridIcon: { marginBottom: 8, },
    gridTitle: { fontSize: 14, fontWeight: '600', color: colors.textSecondary, marginBottom: 4, },
    gridText: { fontSize: 20, fontWeight: '700', color: colors.textPrimary, textAlign: 'center'},
    // Points Card Specific
    pointsCardGradient: { flex: 1, width: '100%', borderRadius: 20, padding: 20, alignItems: 'center', justifyContent: 'space-between', },
    pointsHeader: { alignItems: 'center', },
    pointsText: { fontSize: 40, fontWeight: 'bold', color: colors.textLight, },
    pointsLabel: { fontSize: 14, color: colors.textLight, opacity: 0.8, fontWeight: '500', },
    levelContainer: { width: '100%', alignItems: 'center', marginVertical: 15, },
    levelText: { color: colors.textLight, fontSize: 16, fontWeight: '600', marginBottom: 8, },
    progressBar: { height: 6, width: '80%', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, },
    progressFill: { height: '100%', backgroundColor: colors.textLight, borderRadius: 3, },
    redeemButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cardBackground, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, },
    redeemButtonText: { color: colors.redeemButtonText, fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
    // Section Title
    sectionTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 15, marginLeft: 5, },
    // Achievements
    achievementsContainer: { minHeight: 140, marginBottom: 20, },
    achievementsScroll: { paddingHorizontal: 5, paddingVertical: 5 },
    achievementCard: { backgroundColor: colors.cardBackground, borderRadius: 20, padding: 10, marginRight: 15, alignItems: 'center', width: 120, height: 140, justifyContent: 'center', borderWidth: 1, borderColor: '#E0E5F1', },
    achievementEarned: { shadowColor: colors.gold, shadowOpacity: 0.5, shadowRadius: 8, elevation: 0, borderColor: colors.gold, },
    achievementIconContainer: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F0F4F3', justifyContent: 'center', alignItems: 'center', marginBottom: 10, },
    achievementName: { fontSize: 13, fontWeight: '500', color: colors.textPrimary, textAlign: 'center', },
    lockedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.lockedOverlay, borderRadius: 20, justifyContent: 'center', alignItems: 'center', },
    // Settings
    settingsCard: { backgroundColor: colors.glassBackground, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: colors.glassBorder, },
    settingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.glassBorder, },
    settingText: { flex: 1, fontSize: 16, color: colors.textPrimary, marginLeft: 18, fontWeight: '500' },
});

export default ProfileScreen;