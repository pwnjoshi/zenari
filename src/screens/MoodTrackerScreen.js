import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  SectionList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Slider from '@react-native-community/slider';

const MOOD_LEVELS = [
  { emoji: '😡', label: 'Angry', color: '#89CFF0' },
  { emoji: '😞', label: 'Sad', color: '#87CEEB' },
  { emoji: '😐', label: 'Neutral', color: '#A7C7E7' },
  { emoji: '😊', label: 'Happy', color: '#B0E0E6' },
  { emoji: '😄', label: 'Excited', color: '#ADD8E6' },
];

const formatDate = (date) =>
  date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
const formatTime = (date) =>
  date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

const MoodTrackerScreen = () => {
  const [selectedMoodIndex, setSelectedMoodIndex] = useState(2); // Default to Neutral
  const [moodHistory, setMoodHistory] = useState([]);
  const [note, setNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const selectedMood = MOOD_LEVELS[selectedMoodIndex];

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const storedHistory = await AsyncStorage.getItem('@moodHistory');
        if (storedHistory) {
          const parsedHistory = JSON.parse(storedHistory).map(item => ({
            ...item,
            timestamp: new Date(item.timestamp),
          }));
          setMoodHistory(parsedHistory);
        }
      } catch (error) {
        console.log('Error loading mood history:', error);
      }
    };
    loadHistory();
  }, []);

  const sections = Object.values(
    moodHistory.reduce((acc, entry) => {
      const dateKey = entry.timestamp.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = { title: dateKey, data: [] };
      }
      acc[dateKey].data.push(entry);
      return acc;
    }, {})
  );

  const handleSaveMood = async () => {
    try {
      const newEntry = {
        id: Date.now().toString(),
        mood: selectedMood.label,
        score: selectedMoodIndex,
        note: note,
        timestamp: new Date(),
      };

      const updatedHistory = [newEntry, ...moodHistory];
      setMoodHistory(updatedHistory);
      setNote('');

      await AsyncStorage.setItem('@moodHistory', JSON.stringify(updatedHistory));
    } catch (error) {
      console.log('Error saving mood entry:', error);
    }
  };

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItem}>
      <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
      <View style={[styles.moodIndicator, { backgroundColor: MOOD_LEVELS[item.score].color + '20' }]}>
        <Text style={[styles.historyEmoji, { color: MOOD_LEVELS[item.score].color }]}>
          {MOOD_LEVELS[item.score].emoji}
        </Text>
      </View>
      <View style={styles.historyTextContainer}>
        <Text style={styles.historyMoodLabel}>{MOOD_LEVELS[item.score].label}</Text>
        <Text style={styles.historyNote}>{item.note || 'No notes'}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.innerContainer}>
            <LinearGradient
              colors={[ '#56dbb8', '#21edb8']}
              style={styles.headerGradient}>
              <Text style={styles.header}>Mood Tracker</Text>
            </LinearGradient>

            <View style={styles.content}>
              <View style={styles.moodSelector}>
                <View style={styles.moodDisplay}>
                  <Text style={styles.selectedMoodEmoji}>{selectedMood.emoji}</Text>
                  <Text style={styles.selectedMoodLabel}>{selectedMood.label}</Text>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0}
                  maximumValue={4}
                  step={1}
                  value={selectedMoodIndex}
                  minimumTrackTintColor="#56dbb8"
                  maximumTrackTintColor="#56dbb8"
                  thumbTintColor="#87CEEB"
                  onValueChange={(value) => setSelectedMoodIndex(Math.round(value))}
                />
              </View>

              <View style={styles.noteContainer}>
                <Icon
                  name="text-box-outline"
                  size={20}
                  color="#50f2c8"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.noteInput}
                  placeholder="How are you feeling today?"
                  placeholderTextColor="#94A3B8"
                  value={note}
                  onChangeText={setNote}
                  multiline
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveMood}>
                <LinearGradient
                  colors={['#50f2c8', '#2bedbb']}
                  style={styles.gradientButton}>
                  <Text style={styles.saveButtonText}>
                    <Icon name="check" size={18} color="#FFF" /> Save Entry
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleHistoryButton}
                onPress={() => setShowHistory(!showHistory)}>
                <Text style={styles.toggleHistoryText}>
                  {showHistory ? 'Hide History' : 'View History'}
                </Text>
              </TouchableOpacity>

              {showHistory && (
                <View style={styles.historyContainer}>
                  <Text style={styles.sectionTitle}>Mood History</Text>
                  {moodHistory.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Icon name="weather-cloudy" size={48} color="#CBD5E1" />
                      <Text style={styles.emptyStateText}>
                        Your mood history will appear here
                      </Text>
                    </View>
                  ) : (
                    <SectionList
                      sections={sections}
                      keyExtractor={(item) => item.id}
                      renderItem={renderHistoryItem}
                      renderSectionHeader={({ section }) => (
                        <View style={styles.sectionHeader}>
                          <Text style={styles.sectionHeaderText}>
                            {formatDate(new Date(section.title))}
                          </Text>
                        </View>
                      )}
                    />
                  )}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F9FF',
  
  },
  scrollContainer: {
    flexGrow: 1,
  
  },
  innerContainer: {
    flex: 1,
  
  },
  headerGradient: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    
  },
  header: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    
  },
  content: {
    padding: 20,
  },
  moodSelector: {
    marginBottom: 25,
  },
  moodDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 15,
    marginBottom: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  selectedMoodEmoji: {
    fontSize: 32,
    marginRight: 10,
    color: '#1E3A8A',
  },
  selectedMoodLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  inputIcon: {
    marginRight: 10,
  },
  noteInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1E3A8A',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleHistoryButton: {
    alignItems: 'center',
    padding: 10,
  },
  toggleHistoryText: {
    color: '#87CEEB',
    fontSize: 14,
    fontWeight: '500',
  },
  historyContainer: {
    marginTop: 20,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 10,
    color: '#94A3B8',
    fontSize: 14,
  },
  sectionHeader: {
    backgroundColor: '#F0F9FF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginVertical: 5,
  },
  sectionHeaderText: {
    color: '#1E3A8A',
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    marginVertical: 6,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0F2FE',
  },
  historyTime: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 12,
  },
  moodIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#E0F2FE',
  },
  historyEmoji: {
    fontSize: 20,
  },
  historyTextContainer: {
    flex: 1,
  },
  historyMoodLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  historyNote: {
    fontSize: 14,
    color: '#64748B',
  },
});

export default MoodTrackerScreen;
