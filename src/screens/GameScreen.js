import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    Animated,
    Platform,
    Pressable, // Using Pressable for better tap handling
    Easing, // Added for more animation control if needed
    AppState // Import AppState for background handling
} from 'react-native';
import SoundPlayer from 'react-native-sound-player'; // *** Ensure this is installed AND linked ***
import LottieView from 'lottie-react-native'; // *** Use Lottie for objects and effects ***

const { width, height } = Dimensions.get('window');
const GAME_AREA_HEIGHT = height * 0.75; // Playable area height
const OBJECT_SIZE = 65; // Size of tappable objects (Lottie view container)
const TAP_EFFECT_SIZE = 90; // Size for the tap effect Lottie container
const INITIAL_LIVES = 3; // Starting number of lives

// Object Types - Retained for potential future variations
const OBJECT_TYPES = ['gem', 'coin', 'powerup']; // Example types

// --- Sound Configuration ---
// !!! CRITICAL: Ensure sound files exist in the correct native folders !!!
// AND that these names/types EXACTLY match your files.
const SOUNDS = {
    // For Android: must be in YourProject/android/app/src/main/res/raw/a.mp3
    // For iOS: must be added to Xcode Project Resources (Target -> Build Phases -> Copy Bundle Resources)
    TAP: { name: 'a', type: 'mp3' }, // The sound for tapping the diamond
    MISS: { name: 'a', type: 'mp3' }, // Sound for missing an object
    GAME_OVER: { name: 'a', type: 'mp3' }, // Sound for game over
    FLOW_MODE: { name: 'a', type: 'mp3' } // Sound for entering flow mode
};

// --- Lottie Asset Configuration ---
// !!! CRITICAL: Make sure these Lottie JSON files exist at the specified paths !!!
const LOTTIES = {
    FALLING_OBJECT: require('../assets/lottie/gem.json'), // The diamond Lottie
    TAP_EFFECT: require('../assets/lottie/tap_effect.json'), // The tap effect Lottie
};


// --- Main Game Screen Component ---
const GameScreen = () => {
    // --- State Variables ---
    const [objects, setObjects] = useState([]);
    const [score, setScore] = useState(0);
    const [streak, setStreak] = useState(0);
    const [comboCount, setComboCount] = useState(0);
    const [isFlowMode, setIsFlowMode] = useState(false);
    const [floatingTexts, setFloatingTexts] = useState([]);
    const [tapEffects, setTapEffects] = useState([]);
    const [lives, setLives] = useState(INITIAL_LIVES);
    const [gameState, setGameState] = useState('Initial');

    // --- Refs ---
    const objectIdCounter = useRef(0);
    const gameLoopInterval = useRef(null);
    const animatedValues = useRef({}).current;
    const appState = useRef(AppState.currentState);

    // --- Sound Player Helper ---
    // Your logs show this function IS being called successfully by the JS.
    // Focus on NATIVE setup if sound doesn't play.
    const playSoundFile = useCallback((soundInfo) => {
        console.log("playSoundFile called with:", soundInfo);

        if (!soundInfo || !soundInfo.name || !soundInfo.type) {
             console.warn("playSoundFile: Invalid soundInfo", soundInfo); return; }
        if (gameState === 'Paused') {
             console.log("playSoundFile: Game paused, sound skipped."); return; }

        console.log(`===> Attempting SoundPlayer.playSoundFile('${soundInfo.name}', '${soundInfo.type}')`);
        try {
            SoundPlayer.playSoundFile(soundInfo.name, soundInfo.type);
            // *** Your logs show this line is reached, meaning JS call was successful ***
            console.log(`===> SoundPlayer.playSoundFile called successfully for ${soundInfo.name}.${soundInfo.type}`);
        } catch (e) {
            // This block is NOT being hit according to your logs, but keep it for future issues.
            console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
            console.error(`!!! ERROR playing sound ${soundInfo.name}.${soundInfo.type} !!!`, e);
            console.error(`!!! CHECK NATIVE SETUP (linking, file path/location in android/res/raw or iOS Resources), and device volume/mute !!!`);
            console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
        }
    }, [gameState]);

    // --- Game Over Trigger Effect ---
    useEffect(() => {
        if (lives <= 0 && gameState === 'Playing') {
            console.log("Lives reached zero! Game Over.");
            setGameState('GameOver');
            playSoundFile(SOUNDS.GAME_OVER); // Play game over sound if setup correctly
        }
    }, [lives, gameState, playSoundFile]);

    // --- Object Generation Function ---
    const generateObject = useCallback(() => {
        if (gameState !== 'Playing') return;
        const id = objectIdCounter.current++;
        const type = OBJECT_TYPES[Math.floor(Math.random() * OBJECT_TYPES.length)];
        const xPos = Math.random() * (width - OBJECT_SIZE);
        const yPos = -OBJECT_SIZE * 1.5;
        const yAnim = new Animated.Value(yPos);
        const opacityAnim = new Animated.Value(1);
        animatedValues[id] = { y: yAnim, opacity: opacityAnim };
        const newObject = { id, type, x: xPos, yAnim, opacityAnim, lottieSource: LOTTIES.FALLING_OBJECT, createdAt: Date.now() };
        setObjects(prevObjects => [...prevObjects, newObject]);
        Animated.timing(newObject.yAnim, { toValue: GAME_AREA_HEIGHT + OBJECT_SIZE, duration: 5000 + Math.random() * 3000, useNativeDriver: true, easing: Easing.linear, })
        .start(({ finished }) => {
            if (finished && animatedValues[id]) {
                 setObjects(prev => prev.filter(obj => obj.id !== id));
                 delete animatedValues[id];
                 if (gameState === 'Playing') {
                     console.log(`Object ${id} missed. Losing a life.`);
                     setLives(prevLives => prevLives - 1); setStreak(0); setComboCount(0); setIsFlowMode(false);
                     playSoundFile(SOUNDS.MISS); // Play miss sound if setup correctly
                 }
             }
        });
    }, [animatedValues, gameState, playSoundFile]);

    // --- Game Loop Effect ---
    useEffect(() => {
        const setupInterval = () => {
            if (gameLoopInterval.current) clearInterval(gameLoopInterval.current); gameLoopInterval.current = null;
            if (gameState === 'Playing') { gameLoopInterval.current = setInterval(generateObject, 1200); console.log("Game loop started."); }
            else { console.log(`Game loop stopped (State: ${gameState}).`); }
        };
        setupInterval();
        return () => { if (gameLoopInterval.current) clearInterval(gameLoopInterval.current); };
    }, [gameState, generateObject]);

    // --- AppState Handling (Pause/Resume) ---
     useEffect(() => {
         const subscription = AppState.addEventListener('change', nextAppState => {
             if (appState.current.match(/active/) && nextAppState.match(/inactive|background/) && gameState === 'Playing') { console.log('App backgrounded. Pausing game.'); setGameState('Paused'); }
             else if (appState.current.match(/inactive|background/) && nextAppState === 'active' && gameState === 'Paused') { console.log('App foregrounded. Resuming game.'); setGameState('Playing'); }
             appState.current = nextAppState;
         });
         return () => { subscription.remove(); };
     }, [gameState]);

    // --- Floating Text Animation ---
    const showFloatingText = useCallback((text, x, y, isSpecial = false) => {
        const id = Date.now() + Math.random(); const currentY = typeof y === 'number' ? y : GAME_AREA_HEIGHT / 2;
        const newText = { id, text, x, y: currentY, isSpecial, opacity: new Animated.Value(1), yOffset: new Animated.Value(0), scale: new Animated.Value(isSpecial ? 1.2 : 1) };
        setFloatingTexts(current => [...current, newText]);
        Animated.parallel([
            Animated.timing(newText.yOffset, { toValue: -50, duration: 1400, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
            Animated.timing(newText.opacity, { toValue: 0, duration: 1400, delay: 150, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
            Animated.timing(newText.scale, { toValue: isSpecial ? 1.5 : 1, duration: 1400, useNativeDriver: true})
        ]).start(() => { setFloatingTexts(current => current.filter(ft => ft.id !== id)); });
    }, []);

    // --- Tap Effect Animation ---
    const showTapEffect = useCallback((pageX, pageY) => {
        const id = Date.now() + Math.random(); const newEffect = { id, pageX, pageY };
        setTapEffects(current => [...current, newEffect]);
        setTimeout(() => { setTapEffects(current => current.filter(te => te.id !== id)); }, 600);
    }, []);

    // --- Tap Handler ---
    const handleTap = useCallback((tappedObject, event) => {
        if (gameState !== 'Playing') return;
        const objectStateExists = objects.some(obj => obj.id === tappedObject.id);
        const animationRefExists = !!animatedValues[tappedObject.id];
        if (!objectStateExists || !animationRefExists) return;
        console.log(`Processing tap for object ID: ${tappedObject.id}`);
        const currentObjectAnim = animatedValues[tappedObject.id];
        let pageX = tappedObject.x + OBJECT_SIZE / 2, pageY = GAME_AREA_HEIGHT / 2;
        try { if (typeof currentObjectAnim.y?.getValue === 'function') pageY = currentObjectAnim.y.getValue() + OBJECT_SIZE / 2; else if (typeof currentObjectAnim.y?.__getValue === 'function') pageY = currentObjectAnim.y.__getValue() + OBJECT_SIZE / 2; } catch (e) { /* fallback */ }
        if (event && event.nativeEvent && typeof event.nativeEvent.pageX === 'number') pageX = event.nativeEvent.pageX; if (event && event.nativeEvent && typeof event.nativeEvent.pageY === 'number') pageY = event.nativeEvent.pageY;
        showTapEffect(pageX, pageY);
        if (typeof currentObjectAnim.y?.stopAnimation === 'function') currentObjectAnim.y.stopAnimation();
        Animated.timing(currentObjectAnim.opacity, { toValue: 0, duration: 150, useNativeDriver: true, easing: Easing.in(Easing.ease), })
        .start(() => { setObjects(prev => prev.filter(obj => obj.id !== tappedObject.id)); if (animatedValues[tappedObject.id]) delete animatedValues[tappedObject.id]; });
        console.log("Calling playSoundFile for TAP sound...");
        playSoundFile(SOUNDS.TAP); // *** This call seems successful based on logs ***
        setScore(prev => prev + 1); let currentYPos = pageY - OBJECT_SIZE / 2;
        showFloatingText('+1', tappedObject.x, currentYPos); if (Math.random() < 0.1) showFloatingText('Nice!', tappedObject.x, currentYPos - 25);
        setStreak(prevStreak => {
            const newStreak = prevStreak + 1;
            setComboCount(prevCombo => { const newCombo = prevCombo + 1; if (newCombo >= 5) { setIsFlowMode(prevFlow => { if (!prevFlow) { console.log("Entering Flow Mode!"); playSoundFile(SOUNDS.FLOW_MODE); showFloatingText('✨ FLOW ✨', width / 2 - 50, GAME_AREA_HEIGHT * 0.1, true); } return true; }); } return newCombo; });
            if (newStreak > 0 && newStreak % 5 === 0) { showFloatingText(`Streak ${newStreak}!`, tappedObject.x, currentYPos - 50, true); } return newStreak;
        });
    }, [gameState, objects, animatedValues, playSoundFile, showFloatingText, showTapEffect]);

    // --- Start/Restart Game Handler ---
    const handleStartGame = useCallback(() => {
         console.log('Starting/Restarting Game...');
         setScore(0); setStreak(0); setComboCount(0); setIsFlowMode(false); setLives(INITIAL_LIVES); setObjects([]); setFloatingTexts([]); setTapEffects([]);
         Object.keys(animatedValues).forEach(key => { const anims = animatedValues[key]; anims?.y?.stopAnimation(); anims?.opacity?.stopAnimation(); delete animatedValues[key]; });
         objectIdCounter.current = 0; setGameState('Playing');
    }, [animatedValues]);

    // --- Render Functions (wrapped in useCallback) ---
    const renderObject = useCallback((object) => {
        const currentAnims = animatedValues[object.id]; if (!currentAnims) return null; const isComboTarget = isFlowMode;
        return ( <Animated.View key={object.id} style={[ styles.objectBase, { transform: [{ translateX: object.x }, { translateY: currentAnims.y }], opacity: currentAnims.opacity, shadowColor: isComboTarget ? '#FFD700' : 'transparent', shadowOffset: { width: 0, height: 0 }, shadowOpacity: isComboTarget ? 0.9 : 0, shadowRadius: isComboTarget ? 15 : 0, elevation: isComboTarget ? 10 : 1, } ]} >
                 <Pressable onPress={(event) => handleTap(object, event)} style={styles.pressableArea} disabled={gameState !== 'Playing'} >
                     {!object.lottieSource ? <Text style={{color: 'red'}}>⚠️ Lottie Missing</Text> : ( <LottieView source={object.lottieSource} autoPlay loop={true} style={styles.objectLottie} /> )}
                 </Pressable></Animated.View> );
    }, [animatedValues, handleTap, isFlowMode, gameState]);

    const renderFloatingText = useCallback((textInfo) => ( <Animated.Text key={textInfo.id} style={[ styles.floatingText, { left: textInfo.x, top: textInfo.y, opacity: textInfo.opacity, transform: [{ translateY: textInfo.yOffset }, { scale: textInfo.scale }], color: textInfo.isSpecial ? '#FF8F00' : '#004D40', fontSize: textInfo.isSpecial ? 22 : 18 } ]} pointerEvents="none" >{textInfo.text}</Animated.Text> ), []);
    const renderTapEffect = useCallback((effectInfo) => ( <View key={effectInfo.id} style={[ styles.tapEffectContainer, { left: effectInfo.pageX, top: effectInfo.pageY } ]} pointerEvents="none" > {!LOTTIES.TAP_EFFECT ? <Text style={{color: 'red'}}>⚠️ Lottie Missing</Text> : ( <LottieView source={LOTTIES.TAP_EFFECT} autoPlay loop={false} style={styles.tapEffectLottie} speed={1.5} /> )} </View> ), []);
    const renderLives = useCallback(() => { let lifeIcons = []; for (let i = 0; i < INITIAL_LIVES; i++) { lifeIcons.push( <Text key={`life-${i}`} style={[styles.lifeIcon, i >= lives ? styles.lifeIconLost : null]}>❤️</Text> ); } return <View style={styles.livesContainer}>{lifeIcons}</View>; }, [lives]);

    // --- Main Component Render ---
    return (
        <View style={styles.container}>
            <View style={[styles.background]} />
            {gameState === 'Initial' && ( <View style={styles.overlay}><Text style={styles.titleText}>Mindful Tap</Text><Pressable style={styles.button} onPress={handleStartGame}><Text style={styles.buttonText}>Start Game</Text></Pressable></View> )}
            {(gameState === 'Playing' || gameState === 'Paused') && ( <View style={styles.gameArea}>{objects.map(renderObject)}{floatingTexts.map(renderFloatingText)}{tapEffects.map(renderTapEffect)}</View> )}
            {(gameState === 'Playing' || gameState === 'Paused') && ( <View style={styles.hud}>{renderLives()}<Text style={[styles.streakText, isFlowMode && styles.flowModeText]}>{isFlowMode ? '✨ FLOW ✨' : `Streak: ${streak}`}</Text><Text style={styles.scoreText}>Score: {score}</Text></View> )}
            {gameState === 'Paused' && ( <View style={styles.overlay}><Text style={styles.overlayText}>Paused</Text><Pressable style={[styles.button, {marginTop: 30}]} onPress={() => setGameState('Playing')}><Text style={styles.buttonText}>Resume</Text></Pressable></View> )}
            {gameState === 'GameOver' && ( <View style={styles.overlay}><Text style={styles.gameOverText}>Game Over!</Text><Text style={styles.finalScoreText}>Final Score: {score}</Text><Pressable style={styles.button} onPress={handleStartGame}><Text style={styles.buttonText}>Play Again?</Text></Pressable></View> )}
        </View>
    );
};

// --- Styles ---
// Styles are identical to the previous version, no changes needed here.
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E0F7FA', },
    background: { ...StyleSheet.absoluteFillObject, backgroundColor: '#E0F7FA', },
    gameArea: { height: GAME_AREA_HEIGHT, /* overflow: 'hidden', */ },
    objectBase: { position: 'absolute', width: OBJECT_SIZE, height: OBJECT_SIZE, backgroundColor: Platform.OS === 'android' ? 'rgba(0,0,0,0.01)' : 'transparent', borderRadius: OBJECT_SIZE / 2, },
    pressableArea: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center', },
    objectLottie: { width: OBJECT_SIZE * 1.3, height: OBJECT_SIZE * 1.3, },
    hud: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 15, right: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, },
    scoreText: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2, minWidth: 80, textAlign: 'right' },
    streakText: { fontSize: 16, color: '#FFFFFF', fontWeight: 'bold', textShadowColor: 'rgba(0, 0, 0, 0.6)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2, },
    flowModeText: { color: '#FFD700', },
    livesContainer: { flexDirection: 'row', },
    lifeIcon: { fontSize: 20, marginRight: 4, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 2}, // Added subtle shadow to hearts
    lifeIconLost: { opacity: 0.3, },
    floatingText: { position: 'absolute', fontWeight: 'bold', textShadowColor: 'rgba(255, 255, 255, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3, pointerEvents: 'none', },
    tapEffectContainer: { position: 'absolute', width: TAP_EFFECT_SIZE, height: TAP_EFFECT_SIZE, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', transform: [ { translateX: -TAP_EFFECT_SIZE / 2 }, { translateY: -TAP_EFFECT_SIZE / 2 } ] },
    tapEffectLottie: { width: '100%', height: '100%', },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20, },
    titleText: { fontSize: 48, color: '#FFFFFF', fontWeight: 'bold', marginBottom: 40, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4, },
    overlayText: { fontSize: 30, color: '#FFFFFF', fontWeight: 'bold', marginBottom: 30, textAlign: 'center', },
    gameOverText: { fontSize: 48, color: '#FF5252', fontWeight: 'bold', marginBottom: 20, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.7)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4, },
    finalScoreText: { fontSize: 28, color: '#FFFFFF', marginBottom: 40, textAlign: 'center', },
    button: { backgroundColor: '#2196F3', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30, elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, },
    buttonText: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center', },
});

export default GameScreen;