import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import auth from '@react-native-firebase/auth';

const colors = {
  primary: '#2bedbb',
  primaryLight: '#a6f9e2',
  primaryDark: '#1fcda9',
  background: '#E6F4F1',
  cardBackground: '#FFFFFF',
  textPrimary: '#2D5D5E',
  textSecondary: '#7A8D8E',
  progressBackground: 'rgba(255,255,255,0.3)',
};

const ProfileScreen = ({ navigation }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [currentPoints, setCurrentPoints] = useState(2450);
  
  const achievements = [
    { id: 1, name: 'Beginner Breath', icon: 'weather-windy', progress: 100, earned: true },
    { id: 2, name: 'Daily Streak', icon: 'fire', progress: 75, earned: false },
    { id: 3, name: 'Zen Master', icon: 'leaf', progress: 30, earned: false },
    { id: 4, name: 'Night Owl', icon: 'moon-waxing-crescent', progress: 45, earned: true },
  ];

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        { 
          text: 'Log Out', 
          onPress: async () => {
            try {
              await auth().signOut();
              navigation.navigate('Auth');
            } catch (error) {
              Alert.alert('Logout Error', error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <LinearGradient 
      colors={[colors.background, '#D1E5E0', '#B7D5CF']} 
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[colors.primaryLight, colors.primary]}
              style={styles.avatarGradient}
            >
              <Icon name="account" size={40} color="#FFF" />
            </LinearGradient>
          </View>
          <Text style={styles.userName}>Zenari</Text>
          <Text style={styles.userEmail}>peace@zenari.com</Text>
        </View>

        {/* Points Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.pointsCard}
          >
            <Icon name="star-circle" size={30} color="#FFF" />
            <Text style={styles.pointsText}>{currentPoints} Points</Text>
            <Text style={styles.levelText}>Level 4 Mindful Explorer</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '65%' }]} />
            </View>
          </LinearGradient>
        </View>

        {/* Achievements Section */}
        <Text style={styles.sectionTitle}>Achievements</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {achievements.map((achievement) => (
            <View key={achievement.id} style={styles.achievementCard}>
              <View style={styles.achievementIcon}>
                <Icon 
                  name={achievement.icon} 
                  size={28} 
                  color={achievement.earned ? colors.primary : '#C0C0C0'} 
                />
              </View>
              <Text style={styles.achievementName}>{achievement.name}</Text>
              <Text style={styles.achievementProgress}>
                {achievement.earned ? 'Unlocked' : `${achievement.progress}%`}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Settings Section */}
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingItem}>
            <Icon name="theme-light-dark" size={24} color={colors.primary} />
            <Text style={styles.settingText}>Dark Mode</Text>
            <TouchableOpacity 
              onPress={() => setDarkMode(!darkMode)}
              style={styles.toggleButton}
            >
              <View style={[styles.toggle, darkMode && { backgroundColor: colors.primary }]}>
                <View style={[styles.toggleKnob, darkMode && styles.toggleKnobActive]}/>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Icon name="bell" size={24} color={colors.primary} />
            <Text style={styles.settingText}>Notifications</Text>
            <TouchableOpacity 
              onPress={() => setNotifications(!notifications)}
              style={styles.toggleButton}
            >
              <View style={[styles.toggle, notifications && { backgroundColor: colors.primary }]}>
                <View style={[styles.toggleKnob, notifications && styles.toggleKnobActive]}/>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Icon name="account-edit" size={24} color={colors.primary} />
            <Text style={styles.settingText}>Edit Profile</Text>
            <Icon name="chevron-right" size={24} color="#C0C0C0" />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
            <Icon name="logout" size={24} color="#FF6B6B" />
            <Text style={[styles.settingText, { color: '#FF6B6B' }]}>Log Out</Text>
            <Icon name="chevron-right" size={24} color="#C0C0C0" />
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <Text style={styles.sectionTitle}>Mindfulness Stats</Text>
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>142</Text>
            <Text style={styles.statLabel}>Sessions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>39h</Text>
            <Text style={styles.statLabel}>Total Time</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>28d</Text>
            <Text style={styles.statLabel}>Streak</Text>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 25,
  },
  avatarContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 15,
  },
  userEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 5,
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 0,
  },
  pointsCard: {
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
  },
  pointsText: {
    fontSize: 28,
    color: '#FFF',
    fontWeight: '600',
    marginVertical: 10,
  },
  levelText: {
    color: '#FFF',
    fontSize: 14,
    marginBottom: 15,
  },
  progressBar: {
    height: 6,
    width: '100%',
    backgroundColor: colors.progressBackground,
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 15,
    marginLeft: 5,
  },
  achievementCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 15,
    marginRight: 15,
    alignItems: 'center',
    width: 120,
    marginBottom: 10,
  },
  achievementIcon: {
    backgroundColor: '#F5F9F8',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  achievementName: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  achievementProgress: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F4F3',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#4B6D6E',
    marginLeft: 15,
  },
  toggleButton: {
    padding: 5,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    padding: 2,
  },
  toggleKnob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 22 }],
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 60,
  },
  statItem: {
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 20,
    width: '30%',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 5,
  },
});

export default ProfileScreen;