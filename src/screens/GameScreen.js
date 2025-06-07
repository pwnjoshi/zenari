import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    Platform,
    Pressable,
    Easing,
    AppState,
} from 'react-native';
import Sound from 'react-native-sound';
import LottieView from 'lottie-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

// --- Game Dimensions & Settings ---
const { width, height } = Dimensions.get('window');
const GAME_AREA_HEIGHT = height;
const OBJECT_SIZE = 70;
const TAP_EFFECT_SIZE = 100;
const INITIAL_LIVES = 3;

// --- Haptic Feedback Options ---
const hapticOptions = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
};

// --- Asset Configuration ---
const SOUNDS = {
    BACKGROUND: 'calm_background.mp3',
    NOTES: ['e.mp3', 'f.mp3', 'c.mp3', 'e.mp3'], // Use different notes for a better effect
    MISS: 'note1.mp3', // Use a different sound for misses
    GAME_OVER: 'note1.mp3', // Use a different sound for game over
};

const LOTTIES = {
    FALLING_OBJECT: require('../assets/lottie/gem.json'),
    TAP_EFFECT: require('../assets/lottie/tap_effect.json'),
    // ⚠️ Make sure you have a background lottie file or this will be blank
   // BACKGROUND: require('../assets/lottie/calm_background.json'),
};

// --- Custom Hook for Sound Management ---
const useSoundManager = () => {
    const sounds = useRef({}).current;
    const currentNoteIndex = useRef(0);

    useEffect(() => {
        Sound.setCategory('Playback');
        console.log('Loading sounds...');
        sounds.background = new Sound(SOUNDS.BACKGROUND, Sound.MAIN_BUNDLE, (err) => {
            if (err) { console.error('Failed to load background sound', err); return; }
            sounds.background.setNumberOfLoops(-1).setVolume(0.6);
        });
        sounds.miss = new Sound(SOUNDS.MISS, Sound.MAIN_BUNDLE, (err) => { if (err) console.error('Failed to load miss sound', err); });
        sounds.gameOver = new Sound(SOUNDS.GAME_OVER, Sound.MAIN_BUNDLE, (err) => { if (err) console.error('Failed to load game over sound', err); });
        sounds.notes = SOUNDS.NOTES.map(noteFile => new Sound(noteFile, Sound.MAIN_BUNDLE, (err) => { if (err) console.error(`Failed to load note ${noteFile}`, err); }));
        return () => {
            console.log('Releasing all sounds...');
            Object.values(sounds).forEach(sound => {
                if (Array.isArray(sound)) {
                    sound.forEach(s => s.release());
                } else if (sound?.release) {
                    sound.release();
                }
            });
        };
    }, []);

    const playSound = useCallback((type) => {
        switch (type) {
            case 'background':
                sounds.background?.play();
                break;
            case 'tap':
                if (sounds.notes && sounds.notes.length > 0) {
                    const noteToPlay = sounds.notes[currentNoteIndex.current];
                    noteToPlay?.play();
                    currentNoteIndex.current = (currentNoteIndex.current + 1) % sounds.notes.length;
                }
                break;
            case 'miss':
                sounds.miss?.play();
                break;
            case 'gameOver':
                sounds.gameOver?.play();
                break;
        }
    }, [sounds]);

    const stopAllSounds = useCallback(() => {
        Object.values(sounds).forEach(sound => {
            if (Array.isArray(sound)) {
                sound.forEach(s => s.stop());
            } else if (sound?.stop) {
                sound.stop();
            }
        });
    }, [sounds]);

    return { playSound, stopAllSounds };
};


// --- Main Game Screen Component ---
const GameScreen = () => {
    // --- State and Refs ---
    const [objects, setObjects] = useState([]);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [isFlowMode, setIsFlowMode] = useState(false);
    const [lives, setLives] = useState(INITIAL_LIVES);
    const [gameState, setGameState] = useState('Initial');
    const [tapEffects, setTapEffects] = useState([]);

    const objectIdCounter = useRef(0);
    const gameLoopInterval = useRef(null);
    const animatedValues = useRef({}).current;
    const { playSound, stopAllSounds } = useSoundManager();
    const appState = useRef(AppState.currentState);
    
    // --- Game Over Logic ---
    useEffect(() => {
        if (lives <= 0 && gameState === 'Playing') {
            setGameState('GameOver');
            stopAllSounds();
            playSound('gameOver');
        }
    }, [lives, gameState, playSound, stopAllSounds]);

    // --- Object Generation ---
    const generateObject = useCallback(() => {
        if (gameState !== 'Playing') return;
        const id = objectIdCounter.current++;
        const xPos = Math.random() * (width - OBJECT_SIZE);
        const yAnim = new Animated.Value(-OBJECT_SIZE);
        animatedValues[id] = { y: yAnim };
        const newObject = { id, x: xPos, yAnim, lottieSource: LOTTIES.FALLING_OBJECT };
        setObjects(prev => [...prev, newObject]);

        Animated.timing(yAnim, {
            toValue: GAME_AREA_HEIGHT,
            duration: isFlowMode ? 3500 : 5000 + Math.random() * 2000,
            useNativeDriver: true,
            easing: Easing.linear,
        }).start(({ finished }) => {
            if (finished) {
                delete animatedValues[id]; // Clean up animation ref first
                setObjects(prev => prev.filter(obj => obj.id !== id));
                if (gameState === 'Playing') {
                    setLives(prev => prev - 1);
                    setStreak(0);
                    setIsFlowMode(false);
                    playSound('miss');
                }
            }
        });
    }, [gameState, isFlowMode, animatedValues, playSound]);

    // --- Game Loop ---
    useEffect(() => {
        if (gameState === 'Playing') {
            gameLoopInterval.current = setInterval(generateObject, isFlowMode ? 800 : 1200);
        }
        return () => {
            if (gameLoopInterval.current) clearInterval(gameLoopInterval.current);
        };
    }, [gameState, generateObject, isFlowMode]);

    // --- App State Handling (Pause/Resume) ---
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
                if (gameState === 'Playing') setGameState('Paused');
            }
            appState.current = nextAppState;
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [gameState]);

    // --- Tap Handler ---
    const handleTap = useCallback((tappedObject) => {
        if (gameState !== 'Playing' || !animatedValues[tappedObject.id]) return;

        playSound('tap');
        ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);

        const animRef = animatedValues[tappedObject.id];
        const yPos = animRef.y.__getValue();
        showTapEffect(tappedObject.x, yPos);

        animRef.y.stopAnimation();
        delete animatedValues[tappedObject.id];
        setObjects(prev => prev.filter(obj => obj.id !== tappedObject.id));

        setScore(prev => prev + (isFlowMode ? 5 : 1));
        const newStreak = streak + 1;
        setStreak(newStreak);

        if (!isFlowMode && newStreak > 0 && newStreak % 10 === 0) {
            setIsFlowMode(true);
            setTimeout(() => setIsFlowMode(false), 8000);
        }
    }, [gameState, streak, isFlowMode, animatedValues, playSound]);

    // --- Start/Restart Game ---
    const handleStartGame = () => {
        stopAllSounds();
        setScore(0);
        setStreak(0);
        setIsFlowMode(false);
        setLives(INITIAL_LIVES);
        setObjects([]);
        Object.keys(animatedValues).forEach(key => delete animatedValues[key]);
        objectIdCounter.current = 0;
        playSound('background');
        setGameState('Playing');
    };

    // --- UI Effects ---
    const showTapEffect = useCallback((x, y) => {
        const id = Date.now() + Math.random();
        setTapEffects(current => [...current, { id, x, y }]);
        setTimeout(() => setTapEffects(current => current.filter(te => te.id !== id)), 800);
    }, []);

    // --- Render Functions ---
    // ✅ CORRECTED: No longer takes `{ item }` as it's a direct map, not a FlatList renderItem
    const renderObject = (item) => (
        <Animated.View key={item.id} style={[ styles.objectBase, { transform: [{ translateX: item.x }, { translateY: item.yAnim }] } ]}>
            <Pressable onPress={() => handleTap(item)} style={styles.pressableArea}>
                <LottieView source={item.lottieSource} autoPlay loop style={styles.objectLottie} />
            </Pressable>
        </Animated.View>
    );

    const renderTapEffect = (item) => (
        <View key={item.id} style={[styles.tapEffectContainer, { left: item.x, top: item.y }]} pointerEvents="none">
            <LottieView source={LOTTIES.TAP_EFFECT} autoPlay loop={false} style={styles.tapEffectLottie} />
        </View>
    );

    const renderLives = () => Array.from({ length: INITIAL_LIVES }).map((_, i) => (
        <Text key={`life-${i}`} style={[styles.lifeIcon, i >= lives && styles.lifeIconLost]}>💖</Text>
    ));

    return (
        <View style={styles.container}>
            {/* ✅ CORRECTED: Added a check to prevent crashing if the background Lottie is not set */}
            {LOTTIES.BACKGROUND && <LottieView source={LOTTIES.BACKGROUND} autoPlay loop style={styles.backgroundLottie} />}

            {(gameState === 'Playing' || gameState === 'Paused') && (
                <>
                    {/* ✅ CORRECTED: Replaced FlatList with a direct .map render for proper absolute positioning */}
                    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
                        {objects.map(renderObject)}
                        {tapEffects.map(renderTapEffect)}
                    </View>

                    <View style={[styles.hud, isFlowMode && styles.hudFlowMode]}>
                        <View style={styles.livesContainer}>{renderLives()}</View>
                        <Text style={[styles.streakText, isFlowMode && styles.flowModeText]}>
                            {isFlowMode ? '✨ FLOW ✨' : `Streak: ${streak}`}
                        </Text>
                        <Text style={styles.scoreText}>Score: {score}</Text>
                    </View>
                </>
            )}

            {gameState === 'Initial' && (
                <View style={styles.overlay}>
                    <Text style={styles.titleText}>Mindful Tap</Text>
                    <Text style={styles.subtitleText}>Listen to the melody you create.</Text>
                    <Pressable style={styles.button} onPress={handleStartGame}>
                        <Text style={styles.buttonText}>Begin</Text>
                    </Pressable>
                </View>
            )}
            {gameState === 'Paused' && (
                <View style={styles.overlay}>
                    <Text style={styles.titleText}>Paused</Text>
                    <Pressable style={styles.button} onPress={() => setGameState('Playing')}>
                        <Text style={styles.buttonText}>Resume</Text>
                    </Pressable>
                </View>
            )}
            {gameState === 'GameOver' && (
                <View style={styles.overlay}>
                    <Text style={styles.gameOverText}>Game Over</Text>
                    <Text style={styles.finalScoreText}>Final Score: {score}</Text>
                    <Pressable style={styles.button} onPress={handleStartGame}>
                        <Text style={styles.buttonText}>Play Again</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
};

// --- Styles --- (No changes needed here)
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1d2c3f' },
    backgroundLottie: { ...StyleSheet.absoluteFillObject, opacity: 0.7 },
    hud: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)' },
    hudFlowMode: { backgroundColor: 'rgba(255, 215, 0, 0.2)', borderColor: 'rgba(255, 215, 0, 0.8)' },
    scoreText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
    streakText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF' },
    flowModeText: { color: '#FFD700' },
    livesContainer: { flexDirection: 'row' },
    lifeIcon: { fontSize: 22, marginRight: 5, textShadowColor: '#f08080', textShadowRadius: 5 },
    lifeIconLost: { opacity: 0.3 },
    objectBase: { position: 'absolute', width: OBJECT_SIZE, height: OBJECT_SIZE },
    pressableArea: { width: '100%', height: '100%' },
    objectLottie: { width: OBJECT_SIZE, height: OBJECT_SIZE },
    tapEffectContainer: { position: 'absolute', width: TAP_EFFECT_SIZE, height: TAP_EFFECT_SIZE, transform: [{ translateX: -TAP_EFFECT_SIZE / 2 }, { translateY: -TAP_EFFECT_SIZE / 2 }] },
    tapEffectLottie: { width: '100%', height: '100%' },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
    titleText: { fontSize: 52, color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center', textShadowColor: 'rgba(0, 191, 255, 0.7)', textShadowRadius: 10 },
    subtitleText: { fontSize: 18, color: '#B0C4DE', marginTop: 10, marginBottom: 50 },
    gameOverText: { fontSize: 48, color: '#FF6347', fontWeight: 'bold' },
    finalScoreText: { fontSize: 28, color: '#FFFFFF', marginVertical: 20 },
    button: { backgroundColor: '#4682B4', paddingVertical: 15, paddingHorizontal: 45, borderRadius: 30, elevation: 0, shadowColor: '#00BFFF', shadowOpacity: 0.7, shadowRadius: 10 },
    buttonText: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
});

export default GameScreen;