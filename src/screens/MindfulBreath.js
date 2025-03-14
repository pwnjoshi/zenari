import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated, 
  Platform, 
  TouchableWithoutFeedback 
} from 'react-native';
import Sound from 'react-native-sound';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

const BREATH_PHASES = {
  INHALE: { label: 'Inhale', color: '#4CAF50' },
  HOLD: { label: 'Hold', color: '#FFC107' },
  EXHALE: { label: 'Exhale', color: '#2196F3' }
};

const MindfulBreath = ({ navigation }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [currentPhase, setCurrentPhase] = useState(BREATH_PHASES.INHALE.label);
  const [timeLeft, setTimeLeft] = useState(4);
  const [showSettings, setShowSettings] = useState(false);
  const [phaseSettings, setPhaseSettings] = useState({
    inhale: 4,
    hold: 4,
    exhale: 6
  });

  // Animation and timer refs
  const scaleValue = useRef(new Animated.Value(0.8)).current;
  const opacityValue = useRef(new Animated.Value(0.3)).current;
  const animationRef = useRef(null);
  const timerRef = useRef(null);

  // Audio ref – using react-native-sound
  const soundRef = useRef(null);

  useEffect(() => {
    // For iOS use Sound.MAIN_BUNDLE; for Android use an empty string
    const bundle = Platform.OS === 'ios' ? Sound.MAIN_BUNDLE : '';
    const audioFile = require('../assets/audio/calm_music.mp3');

    const sound = new Sound(audioFile, bundle, (error) => {
      if (error) {
        console.error('Failed to load sound', error);
        return;
      }
      // Optional: set volume if needed
      // sound.setVolume(1);
      sound.setNumberOfLoops(-1); // Loop indefinitely
    });
    soundRef.current = sound;

    return () => {
      clearTimers();
      if (soundRef.current) {
        soundRef.current.stop(() => {
          soundRef.current.release();
          soundRef.current = null;
        });
      }
    };
  }, []);

  const clearTimers = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
      animationRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleSoundToggle = () => {
    if (!soundRef.current) return;
    if (isSoundOn) {
      soundRef.current.pause();
    } else if (isPlaying) {
      soundRef.current.play();
    }
    setIsSoundOn(!isSoundOn);
  };

  const startAnimation = (targetScale, duration) => {
    Animated.parallel([
      Animated.timing(scaleValue, {
        toValue: targetScale,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(opacityValue, {
        toValue: targetScale > 1 ? 1 : 0.3,
        duration: duration * 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const startBreathingCycle = () => {
    const phaseOrder = ['INHALE', 'HOLD', 'EXHALE'];
    let currentIndex = 0;

    const cycle = () => {
      const phaseKey = phaseOrder[currentIndex];
      const duration = phaseSettings[phaseKey.toLowerCase()] * 1000;

      setCurrentPhase(BREATH_PHASES[phaseKey].label);
      setTimeLeft(duration / 1000);

      if (phaseKey === 'INHALE') startAnimation(1.2, duration);
      if (phaseKey === 'EXHALE') startAnimation(0.8, duration);

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => (prev > 1 ? prev - 1 : duration / 1000));
      }, 1000);

      animationRef.current = setTimeout(() => {
        clearInterval(timerRef.current);
        currentIndex = (currentIndex + 1) % phaseOrder.length;
        cycle();
      }, duration);
    };

    cycle();
  };

  const toggleSession = () => {
    if (!isPlaying) {
      if (isSoundOn && soundRef.current) {
        soundRef.current.play();
      }
      startBreathingCycle();
    } else {
      if (isSoundOn && soundRef.current) {
        soundRef.current.pause();
      }
      scaleValue.setValue(0.8);
      opacityValue.setValue(0.3);
      clearTimers();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <View style={styles.container}>
      {/* Breathing Visual */}
      <View style={styles.circleContainer}>
        <Animated.View
          style={[
            styles.circle,
            {
              transform: [{ scale: scaleValue }],
              opacity: opacityValue,
              backgroundColor: BREATH_PHASES[currentPhase.toUpperCase()]?.color,
            },
          ]}
        >
          <Text style={styles.timerText}>{Math.round(timeLeft)}</Text>
          <Text style={styles.phaseText}>{currentPhase}</Text>
        </Animated.View>
        <View style={styles.progressRing} />
      </View>

      {/* Controls Container */}
      <View style={styles.controlsContainer}>
        {/* Sound Toggle */}
        <TouchableOpacity onPress={handleSoundToggle} style={[styles.iconButton, styles.shadow]}>
          <Icon name={isSoundOn ? 'volume-high' : 'volume-off'} size={28} color="#FFF" />
        </TouchableOpacity>

        {/* Main Control */}
        <TouchableOpacity onPress={toggleSession} style={[styles.mainButton, styles.shadow]}>
          <LinearGradient
            colors={isPlaying ? ['#FF5252', '#FF4081'] : ['#4CAF50', '#45C7C1']}
            style={styles.gradient}
          >
            <Icon name={isPlaying ? 'pause' : 'play'} size={42} color="#FFF" style={{ marginLeft: isPlaying ? 0 : 4 }} />
          </LinearGradient>
        </TouchableOpacity>

        {/* Settings Button */}
        <TouchableOpacity onPress={() => setShowSettings(!showSettings)} style={[styles.iconButton, styles.shadow]}>
          <Icon name={showSettings ? 'close' : 'cog'} size={28} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Settings Panel with Backdrop */}
      {showSettings && (
        <>
          <TouchableWithoutFeedback onPress={() => setShowSettings(false)}>
            <View style={styles.backdrop} />
          </TouchableWithoutFeedback>
          <View style={[styles.settingsPanel, styles.shadow]}>
            <Text style={styles.settingsTitle}>Breathing Settings</Text>
            {Object.entries(phaseSettings).map(([phase, value]) => (
              <View key={phase} style={styles.settingItem}>
                <View style={styles.settingHeader}>
                  <Icon
                    name={
                      phase === 'inhale'
                        ? 'weather-windy'
                        : phase === 'hold'
                        ? 'timer-sand'
                        : 'weather-windy-variant'
                    }
                    size={24}
                    color="#64748B"
                  />
                  <Text style={styles.settingLabel}>{phase.charAt(0).toUpperCase() + phase.slice(1)}</Text>
                </View>
                <Slider
                  minimumValue={2}
                  maximumValue={10}
                  step={1}
                  value={value}
                  onValueChange={(val) =>
                    setPhaseSettings((prev) => ({
                      ...prev,
                      [phase]: val,
                    }))
                  }
                  style={styles.slider}
                  minimumTrackTintColor="#4ADE80"
                  maximumTrackTintColor="#CBD5E1"
                  thumbTintColor="#4ADE80"
                />
                <Text style={styles.settingValue}>{value}s</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  circleContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  circle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  progressRing: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 8,
    borderRadius: 140,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  phaseText: {
    fontSize: 32,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    letterSpacing: 1.2,
    marginTop: 16,
  },
  timerText: {
    fontSize: 64,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '200',
    fontFamily: 'Helvetica Neue',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '80%',
  },
  mainButton: {
    backgroundColor: '#FFF',
    borderRadius: 40,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 15,
    borderRadius: 30,
  },
  gradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsPanel: {
    position: 'absolute',
    bottom: 160,
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    padding: 24,
    borderRadius: 24,
    width: '90%',
    zIndex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    zIndex: 0,
  },
  settingItem: {
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  settingLabel: {
    fontSize: 16,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  shadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
});

export default MindfulBreath;
