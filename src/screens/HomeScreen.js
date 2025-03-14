import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  ScrollView
} from 'react-native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const colors = {
  primary: '#2bedbb',         // main accent color
  primaryLight: '#a6f9e2',      // lighter variant for gradients or borders
  primaryDark: '#1fcda9',       // darker variant for contrast
  background: '#F8F9FA',        // overall screen background
  overlayStart: 'rgba(255,255,255,0.9)',
  overlayEnd: 'rgba(245,245,245,0.6)',
  textPrimary: '#2D3436',
  textSecondary: '#6C757D',
  cardBackground: 'rgba(255,255,255,0.9)',
  ringColor: '#d0f8ef',         // a soft variant related to primary for the progress ring
};

const HomeScreen = () => {
  const navigation = useNavigation();

  const features = [
    { 
      id: 1,
      icon: 'leaf',
      title: 'Mindful Breath',
      color: ['#4CAF50', '#8BC34A'],
      route: 'Breath'
    },
    { 
      id: 2,
      icon: 'stethoscope',
      title: 'Connect Expert',
      color: ['#2196F3', '#64B5F6'],
      route: 'Doctors'
    },
    { 
      id: 3,
      icon: 'book-open',
      title: 'Resources',
      color: ['#9C27B0', '#E040FB'],
      route: 'Resources'
    },
    { 
      id: 4,
      icon: 'music',
      title: 'Sound Therapy',
      color: ['#FF5722', '#FF9800'],
      route: 'Music'
    },
  ];

  return (
    <View style={styles.container}>
      <FastImage
        source={require('../assets/new.gif')}
        style={styles.background}
        resizeMode="cover"
      />
      <LinearGradient
        colors={[colors.overlayStart, colors.overlayEnd]}
        style={styles.overlay}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good Morning</Text>
              <Text style={styles.userName}>Pawan 👋</Text>
            </View>
            <TouchableOpacity style={styles.profileButton}>
              <Icon name="account" size={28} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Wellness Card */}
          <View style={styles.wellnessCard}>
            <View style={[styles.progressRing, { borderColor: colors.ringColor }]}>
              <Text style={styles.score}>82</Text>
            </View>
            <View style={styles.wellnessInfo}>
              <Text style={styles.wellnessTitle}>Wellness Score</Text>
              <Text style={styles.wellnessSubtitle}>+12% from last week</Text>
            </View>
            <Icon name="chart-areaspline" size={28} color={colors.primary} />
          </View>

          {/* Features Grid */}
          <View style={styles.gridContainer}>
            {features.map((item) => (
              <TouchableOpacity 
                key={item.id}
                onPress={() => navigation.navigate(item.route)}
                style={[styles.featureCard, { backgroundColor: item.color[0] }]}
              >
                <LinearGradient
                  colors={item.color}
                  style={styles.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Icon 
                    name={item.icon} 
                    size={32} 
                    color="white" 
                    style={styles.featureIcon}
                  />
                  <Text style={styles.featureText}>{item.title}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Daily Affirmation */}
          <View style={styles.affirmationCard}>
            <Text style={styles.affirmationText}>
              "You are stronger than you seem, braver than you think, and smarter than you know."
            </Text>
            <Icon name="flower" size={24} color={colors.primary} style={styles.affirmationIcon} />
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 5,
    flex: 1,
    backgroundColor: colors.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    padding: 20,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 120, // extra padding to ensure bottom elements are not hidden
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  greeting: {
    fontSize: 18,
    color: colors.textSecondary,
    fontFamily: 'Inter-Light',
  },
  userName: {
    fontSize: 28,
    color: colors.textPrimary,
    fontFamily: 'Inter-Bold',
    marginTop: 4,
  },
  profileButton: {
    backgroundColor: colors.overlayStart,
    padding: 12,
    borderRadius: 16,
    elevation: 0,
  },
  wellnessCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    elevation: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  progressRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  score: {
    fontSize: 32,
    color: colors.primary,
    fontFamily: 'Inter-ExtraBold',
  },
  wellnessInfo: {
    flex: 1,
  },
  wellnessTitle: {
    fontSize: 20,
    color: colors.textPrimary,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 4,
  },
  wellnessSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    fontFamily: 'Inter-Regular',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  featureCard: {
    width: width * 0.43,
    height: 140,
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  featureIcon: {
    marginBottom: 12,
  },
  featureText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  affirmationCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 0,
  },
  affirmationText: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    fontFamily: 'Inter-Italic',
    marginRight: 10,
  },
  affirmationIcon: {
    opacity: 0.8,
  },
});

export default HomeScreen;
