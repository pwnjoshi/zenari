// Resources.js
import React from 'react';
import { ScrollView, View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const Resources = () => {
  // Resource data
  const resources = [
    {
      category: 'Mental Health Articles',
      icon: 'article',
      items: [
        {
          title: 'Understanding Anxiety',
          url: 'https://www.apa.org/topics/anxiety',
          description: 'Learn about anxiety symptoms and management strategies'
        },
        {
          title: 'Mindfulness Techniques',
          url: 'https://www.mindful.org/meditation/mindfulness-getting-started/',
          description: 'Practical guide to mindfulness meditation'
        }
      ]
    },
    {
      category: 'Immediate Help',
      icon: 'emergency',
      items: [
        {
          title: 'Crisis Hotline',
          number: '1-800-273-8255',
          description: '24/7 National Suicide Prevention Lifeline'
        },
        {
          title: 'Text Support',
          number: '741741',
          description: 'Crisis Text Line - Text HOME to connect'
        }
      ]
    },
    {
      category: 'Self-Care Tools',
      icon: 'self-improvement',
      items: [
        {
          title: 'Breathing Exercises',
          screen: 'BreathingExercises',
          description: 'Guided breathing techniques for calmness'
        },
        {
          title: 'Mood Tracker',
          screen: 'MoodTracker',
          description: 'Track your daily emotional patterns'
        }
      ]
    }
  ];

  const handleResourcePress = (resource) => {
    if(resource.url) {
      Linking.openURL(resource.url);
    } else if(resource.number) {
      Linking.openURL(`tel:${resource.number}`);
    }
    // Add navigation handling for internal screens
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.header}>Wellness Resources</Text>
      
      {resources.map((section, index) => (
        <View key={index} style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Icon name={section.icon} size={24} color="#2A5298" />
            <Text style={styles.sectionTitle}>{section.category}</Text>
          </View>
          
          {section.items.map((item, itemIndex) => (
            <TouchableOpacity 
              key={itemIndex}
              style={styles.card}
              onPress={() => handleResourcePress(item)}
            >
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
              {item.number && <Text style={styles.contactNumber}>{item.number}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F8FF',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40
  },
  header: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1A4B7A',
    marginBottom: 30,
    textAlign: 'center'
  },
  sectionContainer: {
    marginBottom: 30
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '500',
    color: '#2A5298',
    marginLeft: 10
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    marginBottom: 15,
    shadowColor: '#2A5298',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1A4B7A',
    marginBottom: 8
  },
  cardDescription: {
    fontSize: 14,
    color: '#4682B4',
    lineHeight: 20,
    marginBottom: 6
  },
  contactNumber: {
    fontSize: 16,
    color: '#2A5298',
    fontWeight: '600',
    marginTop: 8
  }
});

export default Resources;