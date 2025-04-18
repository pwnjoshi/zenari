import React from 'react'; // Keep React import
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    Alert, // Make sure Alert is imported
    ScrollView,
    Platform,
    Dimensions,
    ActivityIndicator
} from 'react-native';
// Removed LinearGradient import temporarily
// import LinearGradient from 'react-native-linear-gradient';
import Video from 'react-native-video';
import MIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';
import Sound from 'react-native-sound';

// --- Firebase Imports (Reverted to Namespaced) ---
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
// ---------------------------------------

// Enable audio playback in silent mode / alongside other apps
Sound.setCategory('Playback', true);

// --- Gamification Constants ---
const POINTS_PER_SOUND_SESSION = 15;
const FIRST_SOUND_ACHIEVEMENT_ID = 'firstSoundTherapy';
const FIRST_SOUND_ACHIEVEMENT_NAME = 'Audio Oasis';
// ----------------------------

// --- Sound Options Data ---
// !!! CRITICAL: VERIFY THESE PATHS ARE CORRECT RELATIVE TO THIS FILE !!!
const soundOptions = [
    { id: 1, title: 'Ocean Waves', icon: 'waves', source: require('../assets/audio/ocean-waves.mp3'), background: require('../assets/waves.mp4'), cardBackground: require('../assets/bg1.jpg') },
    { id: 2, title: 'Forest Rainfall', icon: 'weather-pouring', source: require('../assets/audio/rainforest.mp3'), background: require('../assets/rainforest.mp4'), cardBackground: require('../assets/bg2.jpg') },
    { id: 3, title: 'Zen Garden', icon: 'meditation', source: require('../assets/audio/zen-garden.mp3'), background: require('../assets/zen.mp4'), cardBackground: require('../assets/bg3.jpg') },
];
// --------------------------

// --- Colors ---
const colors = { /* ... colors ... */
    primary: '#2bedbb', primaryDark: '#1AA897', backgroundGradientStart: '#E0F2F7', backgroundGradientEnd: '#B2DFDB', cardBackground: '#FFFFFF', textDark: '#004D40', textLight: '#FFFFFF', textSecondary: '#4DB6AC', iconGrey: '#757575', logoutRed: '#E57373', shadowColor: '#000', gold: '#FFC107', overlayColor: 'rgba(0, 0, 0, 0.4)', playerOverlayColor: 'rgba(0, 0, 0, 0.6)', sliderMinTrack: '#FFFFFF', sliderMaxTrack: 'rgba(255, 255, 255, 0.5)', sliderThumb: '#FFFFFF', stopButtonBg: 'rgba(255, 255, 255, 0.9)', stopButtonIcon: '#B71C1C',
};
// --------------------------

// --- Date Helper Functions ---
const isSameDay = (date1, date2) => { /* ... isSameDay function ... */
    if (!date1 || !date2 || !(date1 instanceof Date) || !(date2 instanceof Date)) return false;
    try { return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate(); }
    catch (e) { console.error("Error in isSameDay comparison:", e); return false; }
};
const isYesterday = (dateToCheck, today) => { /* ... isYesterday function ... */
    if (!dateToCheck || !today || !(dateToCheck instanceof Date) || !(today instanceof Date)) return false;
    try { const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1); return isSameDay(dateToCheck, yesterday); }
    catch (e) { console.error("Error in isYesterday comparison:", e); return false; }
};
// ---------------------------


// Using Class Component structure as provided initially
class SoundTherapy extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            isPlaying: false,
            currentSound: null,
            progress: 0,
            duration: 0,
            isLoadingSound: false,
        };
        this.soundRef = null;
        this.progressInterval = null;
        this.sessionStartTime = null;
        this.soundOptions = soundOptions;
    }

    componentWillUnmount() { /* ... componentWillUnmount ... */
        this.clearProgressTimer();
        if (this.soundRef) { this.soundRef.release(); this.soundRef = null; }
    }
    clearProgressTimer = () => { /* ... clearProgressTimer ... */
        if (this.progressInterval) { clearInterval(this.progressInterval); this.progressInterval = null; }
    };
    startProgressTimer = () => { /* ... startProgressTimer ... */
        this.clearProgressTimer();
        this.progressInterval = setInterval(() => {
            if (this.soundRef && this.state.isPlaying) {
                this.soundRef.getCurrentTime((seconds, isPlayingNow) => {
                    if (isPlayingNow) { this.setState({ progress: seconds * 1000 }); }
                    else if (this.state.isPlaying) { console.log("[SoundTherapy] Sound stopped unexpectedly."); this.handleStop(); }
                });
            } else { this.clearProgressTimer(); }
        }, 500);
    };

    // --- Gamification Logic (Namespaced Syntax) ---
    updateGamificationData = async () => {
        const currentUser = auth().currentUser;
        if (!currentUser) { console.log("No user logged in, skipping gamification."); return; }
        const userId = currentUser.uid;
        const gamificationRef = firestore().collection('users').doc(userId).collection('gamification').doc('summary');
        const firstSoundAchievementRef = firestore().collection('users').doc(userId).collection('achievements').doc(FIRST_SOUND_ACHIEVEMENT_ID);
        const statsRef = firestore().collection('users').doc(userId).collection('stats').doc('summary');

        try {
            console.log("[SoundTherapy] Starting gamification transaction (namespaced)...");
            await firestore().runTransaction(async (transaction) => {
                // 1. Update Points & Stats
                transaction.set(gamificationRef, { points: firestore.FieldValue.increment(POINTS_PER_SOUND_SESSION), lastUpdated: firestore.FieldValue.serverTimestamp() }, { merge: true });
                transaction.set(statsRef, { sessions: firestore.FieldValue.increment(1), lastActivityDate: firestore.FieldValue.serverTimestamp() }, { merge: true });
                console.log(`[SoundTherapy] Points/Sessions incremented.`);
                // 2. Check/Unlock Achievement
                const achievementDoc = await transaction.get(firstSoundAchievementRef);
                if (!achievementDoc.exists || !achievementDoc.data()?.earned) { // Use .exists property
                    console.log(`[SoundTherapy] Unlocking achievement: ${FIRST_SOUND_ACHIEVEMENT_ID}`);
                    transaction.set(firstSoundAchievementRef, { id: FIRST_SOUND_ACHIEVEMENT_ID, name: FIRST_SOUND_ACHIEVEMENT_NAME, earned: true, earnedAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
                }
            });
            console.log('[SoundTherapy] Gamification transaction successful!');
        } catch (error) {
            console.error("[SoundTherapy] Error in gamification transaction: ", error);
            // *** Improved Error Alert for Timeout ***
            if (error.code === 'firestore/deadline-exceeded') {
                Alert.alert(
                    "Network Timeout",
                    "Could not confirm progress update due to network issues. Your progress might be saved anyway. Please check your profile later."
                );
            } else {
                // Generic error for other transaction failures
                Alert.alert(
                    "Update Error",
                    `Could not update progress: ${error.message}`
                );
            }
        }
    }

    // --- Playback Controls ---
    playSound = (soundOption) => { /* ... playSound function (mostly unchanged) ... */
        console.log('[SoundTherapy] playSound called for:', soundOption.title);
        if (this.state.isLoadingSound) return;
        if (this.soundRef) { this.handleStop(); }

        this.setState({ isLoadingSound: true, progress: 0, duration: 0, currentSound: soundOption, isPlaying: false });
        this.updateGamificationData(); // Attempt gamification update

        const newSound = new Sound(soundOption.source, (error) => {
            this.setState({ isLoadingSound: false });
            if (error) {
                console.error('[SoundTherapy] Failed to load sound:', error);
                Alert.alert("Error", `Failed to load audio: ${error.message}`);
                this.setState({ currentSound: null }); return;
            }
            console.log('[SoundTherapy] Sound loaded. Duration:', newSound.getDuration());
            this.soundRef = newSound;
            const durationMs = newSound.getDuration() * 1000;
            this.sessionStartTime = Date.now();
            this.setState({ duration: durationMs });
            newSound.setVolume(1);
            newSound.play((success) => {
                if (success) { console.log('[SoundTherapy] Playback finished successfully.'); this.handleStop(); }
                else { console.error('[SoundTherapy] Playback failed.'); this.handleStop(); }
            });
            this.setState({ isPlaying: true });
            this.startProgressTimer();
        });
    };

    handleStop = () => { /* ... handleStop function (unchanged) ... */
        console.log("[SoundTherapy] handleStop called.");
        this.clearProgressTimer();
        this.setState({ isLoadingSound: false });
        if (this.soundRef) {
            const soundToRelease = this.soundRef; this.soundRef = null;
            soundToRelease.stop(() => { console.log("[SoundTherapy] Sound stopped and released."); soundToRelease.release(); });
        }
        this.setState({ isPlaying: false, currentSound: null, progress: 0, duration: 0 });
        this.sessionStartTime = null;
    };


    // --- UI Rendering ---
    render() { /* ... render function (mostly unchanged, uses View wrapper) ... */
        const { currentSound, progress, duration, isPlaying, isLoadingSound } = this.state;
        return (
            <View style={styles.container}>
                <Text style={styles.header}>Sound Therapy</Text>
                {!currentSound ? (
                    <ScrollView contentContainerStyle={styles.gridContainer}>
                        {this.soundOptions.map((sound) => (
                            <TouchableOpacity key={sound.id} style={styles.soundCard} onPress={() => this.playSound(sound)} activeOpacity={0.7}>
                                <ImageBackground source={sound.cardBackground} style={styles.cardImageBackground} resizeMode="cover" borderRadius={18}>
                                    <View style={styles.cardContent}>
                                        <MIcon name={sound.icon} size={36} color={colors.textLight} style={styles.cardIcon} />
                                        <Text style={styles.cardTitle}>{sound.title}</Text>
                                    </View>
                                </ImageBackground>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    <View style={styles.playerContainer}>
                        {currentSound.background && ( <Video source={currentSound.background} style={StyleSheet.absoluteFill} resizeMode="cover" repeat={true} muted={true} paused={!isPlaying || isLoadingSound} playInBackground={true} playWhenInactive={true} ignoreSilentSwitch={"ignore"} onError={(e) => console.log('[Video Error]', e)} /> )}
                        <View style={styles.playerOverlay}>
                            {isLoadingSound ? ( <ActivityIndicator size="large" color={colors.textLight} /> )
                            : ( <>
                                    <Text style={styles.currentTitle}>{currentSound.title}</Text>
                                    <Slider style={styles.progressBar} minimumValue={0} maximumValue={Math.max(1, duration)} value={Math.min(progress, duration)} minimumTrackTintColor={colors.sliderMinTrack} maximumTrackTintColor={colors.sliderMaxTrack} thumbTintColor={colors.sliderThumb} disabled={true} />
                                    <View style={styles.controls}>
                                        <TouchableOpacity onPress={this.handleStop} style={styles.mainButton}>
                                            <MIcon name="stop" size={32} color={colors.stopButtonIcon} />
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    }
}

const styles = StyleSheet.create({ /* ... styles (mostly unchanged) ... */
    container: { flex: 1, backgroundColor: colors.backgroundGradientStart, },
    header: { fontSize: 28, fontWeight: 'bold', color: colors.textDark, marginTop: Platform.OS === 'ios' ? 70 : 40, marginBottom: 30, textAlign: 'center', paddingHorizontal: 20, },
    gridContainer: { paddingHorizontal: 15, paddingBottom: 30, },
    soundCard: { width: '100%', height: 170, marginBottom: 20, borderRadius: 20, overflow: 'hidden', elevation: 5, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, backgroundColor: colors.cardBackground, },
    cardImageBackground: { flex: 1, justifyContent: 'flex-end', },
    cardContent: { backgroundColor: colors.overlayColor, paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', },
    cardIcon: { marginBottom: 8, },
    cardTitle: { fontSize: 19, color: colors.textLight, fontWeight: '600', textAlign: 'center', },
    playerContainer: { flex: 1, margin: 15, borderRadius: 20, overflow: 'hidden', elevation: 6, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 6, justifyContent: 'center', alignItems: 'center' },
    playerOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.playerOverlayColor, justifyContent: 'center', alignItems: 'center', padding: 25, },
    currentTitle: { fontSize: 30, color: colors.textLight, fontWeight: 'bold', textAlign: 'center', marginBottom: 50, },
    progressBar: { width: '95%', height: 40, marginVertical: 25, },
    controls: { marginTop: 50, },
    mainButton: { backgroundColor: colors.stopButtonBg, padding: 25, borderRadius: 50, elevation: 8, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, },
});

export default SoundTherapy;
