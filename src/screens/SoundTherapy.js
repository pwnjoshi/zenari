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
            progress: 0, // Progress in milliseconds
            duration: 0, // Duration in milliseconds
            isLoadingSound: false,
        };
        this.soundRef = null; // Reference to the react-native-sound instance
        this.progressInterval = null; // Interval ID for progress updates
        this.sessionStartTime = null; // Timestamp when session started
        this.soundOptions = soundOptions; // Make sound options accessible
    }

    componentWillUnmount() {
        console.log("[SoundTherapy] Component unmounting. Cleaning up...");
        this.clearProgressTimer();
        // Ensure sound is stopped and released properly
        if (this.soundRef) {
            console.log("[SoundTherapy] Releasing sound resource on unmount.");
            this.soundRef.stop(() => { // Ensure it's stopped before release
                this.soundRef?.release(); // Use optional chaining just in case
                this.soundRef = null;
            });
        }
    }

    // Clears the progress update interval
    clearProgressTimer = () => {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
            // console.log("[SoundTherapy] Progress timer cleared.");
        }
    };

    // Starts the interval to update the progress state
    startProgressTimer = () => {
        this.clearProgressTimer(); // Clear any existing timer first
        console.log("[SoundTherapy] Starting progress timer...");
        this.progressInterval = setInterval(() => {
            // Check if soundRef exists (it might be released during cleanup)
            if (this.soundRef) {
                this.soundRef.getCurrentTime((seconds, isPlayingNow) => {
                    // Check if the component expects the sound to be playing
                    if (this.state.isPlaying) {
                        if (isPlayingNow) {
                            // Update progress state if sound is actively playing
                            this.setState({ progress: seconds * 1000 });
                        }
                        // *** REMOVED THE CHECK THAT CAUSED PREMATURE STOPPING ***
                        // else {
                        //     // This else block was likely causing the issue, as isPlayingNow
                        //     // might briefly be false right after starting.
                        //     // The play() callback handles the actual end of playback.
                        //     console.log("[SoundTherapy Timer] Sound stopped unexpectedly according to getCurrentTime, but state isPlaying is true. Investigating...");
                        //     // this.handleStop(); // DO NOT STOP HERE UNLESS NEEDED
                        // }
                    } else {
                        // If component state is not isPlaying, clear the timer
                        this.clearProgressTimer();
                    }
                });
            } else {
                // If soundRef is null (e.g., after stopping), clear the timer
                this.clearProgressTimer();
            }
        }, 500); // Update progress every 500ms
    };

    // --- Gamification Logic (Namespaced Syntax) ---
    updateGamificationData = async () => {
        const currentUser = auth().currentUser;
        if (!currentUser) { console.log("[SoundTherapy] No user logged in, skipping gamification."); return; }
        const userId = currentUser.uid;
        // References using namespaced syntax
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
                // Use .exists property correctly
                if (!achievementDoc.exists || !achievementDoc.data()?.earned) {
                    console.log(`[SoundTherapy] Unlocking achievement: ${FIRST_SOUND_ACHIEVEMENT_ID}`);
                    transaction.set(firstSoundAchievementRef, { id: FIRST_SOUND_ACHIEVEMENT_ID, name: FIRST_SOUND_ACHIEVEMENT_NAME, earned: true, earnedAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
                }
            });
            console.log('[SoundTherapy] Gamification transaction successful!');
        } catch (error) {
            console.error("[SoundTherapy] Error in gamification transaction: ", error);
            // Improved Error Alert for Timeout
            if (error.code === 'firestore/deadline-exceeded') {
                Alert.alert("Network Timeout", "Could not confirm progress update due to network issues. Your progress might be saved anyway.");
            } else {
                Alert.alert("Update Error", `Could not update progress: ${error.message}`);
            }
        }
    }

    // --- Playback Controls ---
    // Handles selecting and playing a sound
    // --- Playback Controls ---
// Handles selecting and playing a sound
playSound = (soundOption) => {
    console.log('[SoundTherapy] playSound called for:', soundOption.title);
    if (this.state.isLoadingSound) {
        console.log("[SoundTherapy] Already loading a sound, ignoring request.");
        return; // Prevent multiple loads
    }
    // If another sound is already playing, stop it first
    if (this.soundRef) {
        console.log("[SoundTherapy] Stopping previous sound before playing new one.");
        this.handleStop(); // Stop and clean up previous sound
    }

    // Set loading state and current sound immediately
    this.setState({ isLoadingSound: true, progress: 0, duration: 0, currentSound: soundOption, isPlaying: false });

    // Attempt gamification update (can happen while loading)
    this.updateGamificationData();

    console.log('[SoundTherapy] Loading sound from source:', soundOption.source);
    const newSound = new Sound(soundOption.source, (error) => {
        // Loading finished callback
        this.setState({ isLoadingSound: false }); // Loading is done, regardless of error

        if (error) {
            console.error('[SoundTherapy] Failed to load sound:', error);
            Alert.alert("Error", `Failed to load audio: ${error.message}`);
            this.setState({ currentSound: null }); // Reset current sound if loading failed
            return;
        }

        // --- 💡 DIAGNOSTIC & VALIDATION ---
        const duration = newSound.getDuration();
        console.log(`[SoundTherapy] Sound loaded. Duration: ${duration} seconds.`);

        // If duration is 0 or -1, the file path is likely wrong or the file is corrupt.
        if (duration <= 0) {
            Alert.alert(
                "Audio Error",
                "The sound file could not be prepared for playback. Please verify the asset path and file integrity."
            );
            this.setState({ currentSound: null });
            newSound.release(); // Clean up the failed sound instance
            return;
        }

        // --- Sound loaded successfully ---
        this.soundRef = newSound; // Store reference
        this.sessionStartTime = Date.now(); // Record start time
        this.setState({ duration: duration * 1000 }); // Update state with duration

        newSound.setVolume(1);
        newSound.setNumberOfLoops(-1); // Loop indefinitely

        // --- ✅ THE FIX ---
        // Introduce a short delay to allow the native audio player to initialize.
        setTimeout(() => {
            // Check if the component is still trying to play this sound
            if (this.soundRef && this.state.currentSound?.id === soundOption.id) {
                newSound.play((success) => {
                    if (!success) {
                        console.error('[SoundTherapy] Playback failed unexpectedly.');
                        // Only show an alert if the app was still in a playing state
                        if(this.state.isPlaying) {
                           Alert.alert("Playback Error", "The selected sound failed to play.");
                        }
                    }
                    // This callback might fire if stopped manually, so we clean up.
                    this.handleStop();
                });

                // Update state to reflect that playback has started
                this.setState({ isPlaying: true });
                this.startProgressTimer(); // Start updating the progress bar
            }
        }, 500); // 100ms delay is usually sufficient
    });
};

    // Handles stopping the currently playing sound
    handleStop = () => {
        console.log("[SoundTherapy] handleStop called.");
        this.clearProgressTimer(); // Stop progress updates
        this.setState({ isLoadingSound: false }); // Ensure loading indicator is off

        if (this.soundRef) {
            const soundToRelease = this.soundRef;
            this.soundRef = null; // Clear the reference *before* async stop/release

            console.log("[SoundTherapy] Stopping and releasing sound...");
            soundToRelease.stop(() => {
                console.log("[SoundTherapy] Sound stopped.");
                soundToRelease.release(); // Release resources after stopping
                console.log("[SoundTherapy] Sound released.");
            });
        }

        // Reset player state
        this.setState({ isPlaying: false, currentSound: null, progress: 0, duration: 0 });
        this.sessionStartTime = null; // Reset session start time
    };


    // --- UI Rendering ---
    render() {
        const { currentSound, progress, duration, isPlaying, isLoadingSound } = this.state;

        return (
            // Use a standard View wrapper instead of LinearGradient for now
            <View style={styles.container}>
                <Text style={styles.header}>Sound Therapy</Text>

                {/* Show Grid or Player */}
                {!currentSound ? (
                    // Sound Selection Grid
                    <ScrollView contentContainerStyle={styles.gridContainer}>
                        {this.soundOptions.map((sound) => (
                            <TouchableOpacity
                                key={sound.id}
                                style={styles.soundCard}
                                onPress={() => this.playSound(sound)}
                                activeOpacity={0.7}
                            >
                                <ImageBackground
                                    source={sound.cardBackground}
                                    style={styles.cardImageBackground}
                                    resizeMode="cover"
                                    borderRadius={18} // Match card's borderRadius
                                >
                                    <View style={styles.cardContent}>
                                        <MIcon name={sound.icon} size={36} color={colors.textLight} style={styles.cardIcon} />
                                        <Text style={styles.cardTitle}>{sound.title}</Text>
                                    </View>
                                </ImageBackground>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                ) : (
                    // Sound Player View
                    <View style={styles.playerContainer}>
                        {/* Background Video (Optional) */}
                        {currentSound.background && (
                            <Video
                                source={currentSound.background}
                                style={StyleSheet.absoluteFill}
                                resizeMode="cover"
                                repeat={true}
                                muted={true} // Background video is always muted
                                paused={!isPlaying || isLoadingSound} // Pause video if sound isn't playing/loading
                                playInBackground={true}
                                playWhenInactive={true}
                                ignoreSilentSwitch={"ignore"}
                                onError={(e) => console.log('[Video Error]', e)}
                            />
                        )}
                        {/* Player Overlay */}
                        <View style={styles.playerOverlay}>
                            {isLoadingSound ? (
                                // Loading Indicator
                                <ActivityIndicator size="large" color={colors.textLight} />
                            ) : (
                                // Player Controls
                                <>
                                    <Text style={styles.currentTitle}>{currentSound.title}</Text>
                                    {/* Progress Bar */}
                                    <Slider
                                        style={styles.progressBar}
                                        minimumValue={0}
                                        maximumValue={Math.max(1, duration)} // Ensure max is at least 1 to prevent errors
                                        value={Math.min(progress, duration)} // Clamp value to duration
                                        minimumTrackTintColor={colors.sliderMinTrack}
                                        maximumTrackTintColor={colors.sliderMaxTrack}
                                        thumbTintColor={colors.sliderThumb}
                                        disabled={true} // Slider is display-only
                                    />
                                    {/* Controls */}
                                    <View style={styles.controls}>
                                        {/* Stop Button */}
                                        <TouchableOpacity onPress={this.handleStop} style={styles.mainButton}>
                                            <MIcon name="stop" size={32} color={colors.stopButtonIcon} />
                                        </TouchableOpacity>
                                        {/* Add Play/Pause button here if needed later */}
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

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.backgroundGradientStart, // Use start color as solid background
    },
    header: {
        fontSize: 26, // Slightly smaller header
        fontWeight: 'bold',
        color: colors.textDark,
        marginTop: Platform.OS === 'ios' ? 60 : 30, // Adjusted top margin
        marginBottom: 25, // Adjusted bottom margin
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    gridContainer: {
        paddingHorizontal: 15,
        paddingBottom: 30,
    },
    soundCard: {
        width: '100%',
        height: 160, // Slightly smaller cards
        marginBottom: 18, // Adjusted spacing
        borderRadius: 18, // Slightly less rounded
        overflow: 'hidden',
        elevation: 4, // Slightly reduced elevation
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.18, // Adjusted shadow
        shadowRadius: 4,
        backgroundColor: colors.cardBackground,
    },
    cardImageBackground: {
        flex: 1,
        justifyContent: 'flex-end', // Align content to bottom
    },
    cardContent: {
        backgroundColor: colors.overlayColor, // Semi-transparent overlay
        paddingVertical: 12, // Adjusted padding
        paddingHorizontal: 18, // Adjusted padding
        alignItems: 'center',
    },
    cardIcon: {
        marginBottom: 6, // Reduced spacing
    },
    cardTitle: {
        fontSize: 18, // Adjusted font size
        color: colors.textLight,
        fontWeight: '600',
        textAlign: 'center',
    },
    playerContainer: {
        flex: 1,
        margin: 15,
        borderRadius: 18, // Match card radius
        overflow: 'hidden',
        elevation: 5, // Slightly reduced elevation
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.22,
        shadowRadius: 5,
        justifyContent: 'center', // Center content vertically
        alignItems: 'center', // Center content horizontally
        backgroundColor: '#333', // Fallback background if video doesn't load
    },
    playerOverlay: {
        ...StyleSheet.absoluteFillObject, // Take up entire space
        backgroundColor: colors.playerOverlayColor, // Darker overlay for player
        justifyContent: 'center', // Center vertically
        alignItems: 'center', // Center horizontally
        padding: 20, // Consistent padding
    },
    currentTitle: {
        fontSize: 28, // Slightly smaller title
        color: colors.textLight,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40, // Adjusted spacing
    },
    progressBar: {
        width: '90%', // Slightly narrower bar
        height: 40, // Standard height
        marginVertical: 20, // Adjusted spacing
    },
    controls: {
        marginTop: 40, // Adjusted spacing
    },
    mainButton: { // Style for the Stop button
        backgroundColor: colors.stopButtonBg, // White-ish background
        padding: 20, // Slightly smaller padding
        borderRadius: 40, // Make it circular
        elevation: 6, // Slightly reduced elevation
        shadowColor: colors.shadowColor,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
    },
});

export default SoundTherapy;
