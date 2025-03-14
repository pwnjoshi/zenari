import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';

const Doctors = () => {
  const navigation = useNavigation();
  
  const doctors = [
    {
      id: 1,
      name: 'Dr. Rakesh Patel',
      specialty: 'Psychiatrist',
      experience: '12 years',
      rating: 4.9,
      reviews: 284,
      image: require('../assets/doctor1.jpg'),
      tags: ['Anxiety', 'Depression', 'Stress'],
      nextAvailable: 'Today 4:00 PM'
    },
    {
      id: 2,
      name: 'Dr. Himanshu Singh',
      specialty: 'Clinical Psychologist',
      experience: '8 years',
      rating: 4.8,
      reviews: 192,
      image: require('../assets/doctor2.jpg'),
      tags: ['Relationships', 'Trauma', 'PTSD'],
      nextAvailable: 'Tomorrow 10:00 AM'
    },
    {
        id: 3,
        name: 'Dr. Sarthak Kathait',
        specialty: 'Psychiatrist',
        experience: '12 years',
        rating: 4.9,
        reviews: 284,
        image: require('../assets/doctor1.jpg'),
        tags: ['Anxiety', 'Depression', 'Stress'],
        nextAvailable: 'Today 4:00 PM'
      },
      {
        id: 4,
        name: 'Dr. Tishar Soni',
        specialty: 'Psychiatrist',
        experience: '12 years',
        rating: 4.9,
        reviews: 284,
        image: require('../assets/doctor1.jpg'),
        tags: ['Anxiety', 'Depression', 'Stress'],
        nextAvailable: 'Today 4:00 PM'
      },
  ];
  

  const handleDoctorPress = (doctor) => {
    navigation.navigate('ConnectDoctor', { doctor });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => handleDoctorPress(item)}
      activeOpacity={0.9}
    >
      <View style={styles.profileContainer}>
        <Image source={item.image} style={styles.profileImage} />
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.specialty}>{item.specialty}</Text>
          
          <View style={styles.metaContainer}>
            <View style={styles.ratingContainer}>
              <Icon name="star" size={14} color="#FFC107" />
              <Text style={styles.ratingText}>{item.rating}</Text>
              <Text style={styles.reviewsText}>({item.reviews})</Text>
            </View>
            <View style={styles.experienceContainer}>
              <Icon name="work" size={14} color="#6C757D" />
              <Text style={styles.experienceText}>{item.experience}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tagsContainer}>
        {item.tags.map((tag, index) => (
          <View key={index} style={styles.tag}>
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ))}
      </View>

      <View style={styles.availability}>
        <Icon name="access-time" size={14} color="#4CAF50" />
        <Text style={styles.availabilityText}>{item.nextAvailable}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <Text style={styles.title}>Mental Health Experts</Text>
        <Text style={styles.subtitle}>Verified professionals ready to help</Text>
      </View>

      <FlatList
        data={doctors}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 24,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 0,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6C757D',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 0,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImage: {
    width: 72,
    height: 72,
    borderRadius: 16,
    marginRight: 16,
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 4,
  },
  specialty: {
    fontSize: 14,
    color: '#6C757D',
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#2D3436',
    marginLeft: 4,
    fontWeight: '500',
  },
  reviewsText: {
    fontSize: 12,
    color: '#6C757D',
    marginLeft: 4,
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  experienceText: {
    fontSize: 12,
    color: '#6C757D',
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#1976D2',
    fontWeight: '500',
  },
  availability: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  availabilityText: {
    fontSize: 13,
    color: '#4CAF50',
    marginLeft: 8,
    fontWeight: '500',
  },
});

export default Doctors;