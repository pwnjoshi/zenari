import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Image } from 'react-native';

const colors = {
  primary: '#2bedbb',         // Main accent color
  primaryLight: '#a6f9e2',      // Lighter variant for subtle accents
  primaryDark: '#1fcda9',       // Darker variant for contrast
  background: '#F0F8FF',        // Calm background color
  cardBackground: '#FFFFFF',    // White card background for clean look
  textPrimary: '#1E3A5F',       // Strong dark blue for titles
  textSecondary: '#4682B4',     // Soothing blue for subtitles and stats
  tagBackground: '#E6F4F1',     // Light background for tags
  tagText: '#2E8B57',           // Muted green for tag text
};

const ChatWelcomeScreen = ({ navigation }) => {
  const doctors = [
    {
      id: 1,
      name: "Dr. Ram R. Patel",
      status: "Online",
      tags: ["Depression", "Litim"],
      stats: "✔ 41  241 USREF",
      specialty: "Depression Specialist",
      image: require('../assets/doctor1.jpg'),
      experience: "8 years",
      rating: 4.9,
      nextAvailable: "Today 3:00 PM"
    },
    {
      id: 2,
      name: "Dr. Ayush Khanna",
      status: "Online",
      tags: ["OCD", "800m"],
      stats: "✔ 33  12K USREF",
      specialty: "OCD Specialist",
      image: require('../assets/doctor2.jpg'),
      experience: "6 years",
      rating: 4.8,
      nextAvailable: "Today 4:30 PM"
    },
    {
      id: 3,
      name: 'Dr. Sarthak Kathait',
      specialty: 'Psychiatrist',
      stats: "✔ 41  241 USREF",
      rating: 4.8,
      image: require('../assets/doctor1.jpg'),
      tags: [ 'Depression', 'Stress'],
      nextAvailable: 'Today 4:00 PM'
    },
    {
      id: 4,
      name: 'Dr. Tishar Soni',
      specialty: 'Psychiatrist',
      rating: 4.9,
      image: require('../assets/doctor1.jpg'),
      tags: [ 'Depression', 'Stress'],
      nextAvailable: 'Today 4:00 PM'
    },
  ];

  const handleDoctorPress = (doctor) => {
    navigation.navigate('ConnectDoctor', { doctor });
  };

  return (
    <View style={styles.container}>
      {/* Logo Header */}
      <View style={styles.header}>
        <Image 
          source={require('../assets/zenari.png')} 
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Chat With AI Button */}
      <TouchableOpacity 
        style={styles.chatButton}
        onPress={() => navigation.navigate('ChatScreen')}
      >
        <Text style={styles.chatButtonText}>Chat With Dr. Zenari AI</Text>
      </TouchableOpacity>

      <Text style={styles.connectWith}>or Connect With Human Expert</Text>

      {/* Doctor List */}
      <ScrollView contentContainerStyle={styles.chatList}>
        {doctors.map((doctor) => (
          <TouchableOpacity 
            key={doctor.id}
            style={styles.chatCard}
            onPress={() => handleDoctorPress(doctor)}
          >
            <Image source={doctor.image} style={styles.doctorImage} />
            <View style={styles.textContainer}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle}>{doctor.name}</Text>
                <Text style={styles.chatStatus}>{doctor.status}</Text>
              </View>
              <View style={styles.chatTags}>
                {doctor.tags.map((tag, index) => (
                  <Text key={index} style={styles.tag}>{tag}</Text>
                ))}
              </View>
              <View style={styles.chatFooter}>
                <Text style={styles.stats}>{doctor.stats}</Text>
                <Text style={styles.specialtyText}>{doctor.specialty}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  logo: {
    marginTop: 20,
    width: 400,
    height: 120,
  },
  chatButton: {
    backgroundColor: colors.primary,
    padding: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 50,
  },
  chatButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 0,
  },
  textContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  chatStatus: {
    color: colors.primaryDark,
    fontWeight: '500',
  },
  chatTags: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  tag: {
    backgroundColor: colors.tagBackground,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 20,
    color: colors.tagText,
    fontSize: 14,
  },
  chatFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.background,
    paddingTop: 12,
  },
  stats: {
    color: colors.textSecondary,
    fontWeight: '500',
  },
  specialtyText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
  },
  connectWith: {
    textAlign: 'center',
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 15,
    fontWeight: '500',
  },
  chatList: {
    paddingBottom: 20,
  },
});

export default ChatWelcomeScreen;
