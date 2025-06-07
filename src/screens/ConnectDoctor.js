import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width, height } = Dimensions.get('window');

const ConnectDoctor = ({ navigation, route }) => {
  const { doctor } = route.params;
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.content}>
        <View style={styles.profileCircle}>
          {doctor.image ? (
            <Image source={doctor.image} style={styles.profileImage} />
          ) : (
            <Icon name="account" size={80} color="#FFF" />
          )}
        </View>

        <Text style={styles.doctorName}>{doctor.name}</Text>
        <Text style={styles.specialty}>{doctor.specialty}</Text>
        <Text style={styles.callStatus}>Connected</Text>
        <Text style={styles.timer}>{formatTime(callDuration)}</Text>

        <View style={styles.controlsContainer}>
          <TouchableOpacity 
            style={[styles.controlButton, isSpeaker && styles.activeButton]}
            onPress={() => setIsSpeaker(!isSpeaker)}
          >
            <Icon 
              name={isSpeaker ? "volume-high" : "volume-off"} 
              size={28} 
              color="#FFF" 
            />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.endCallButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="phone-hangup" size={36} color="#FFF" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.controlButton, isMuted && styles.activeButton]}
            onPress={() => setIsMuted(!isMuted)}
          >
            <Icon 
              name={isMuted ? "microphone-off" : "microphone"} 
              size={28} 
              color="#FFF" 
            />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  profileCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  doctorName: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 8,
  },
  callStatus: {
    fontSize: 18,
    color: '#4ADE80',
    fontWeight: '500',
    marginBottom: 4,
  },
  timer: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 40,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 30,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeButton: {
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
  },
  endCallButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 0,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
  },
});

export default ConnectDoctor;