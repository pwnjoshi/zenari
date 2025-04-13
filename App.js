// App.js
import React, { useEffect } from 'react'; // Import useEffect
import { NavigationContainer } from '@react-navigation/native';
import Navigation from './src/Navigation';
// AsyncStorage can be removed if not used directly in App.js, but keep if needed elsewhere
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee, { AndroidImportance } from '@notifee/react-native'; // Import notifee
import { Platform } from 'react-native'; // Import Platform

export default function App() {

  // Run Notifee setup once on app startup
  useEffect(() => {
    async function setupNotificationChannel() {
      // --- Create Notification Channel for Android ---
      // This is required for Android 8.0 (API level 26) and higher.
      // It's best practice to create the channel early in your app's lifecycle.
      if (Platform.OS === 'android') {
        try {
          const channelId = await notifee.createChannel({
            // Use the *exact same* channel ID as in MoodTrackerScreen
            id: 'mood-reminders',
            name: 'Mood Check-in Reminders',
            // Optional: Customize importance, sound, vibration etc.
            importance: AndroidImportance.DEFAULT, // Default importance is usually fine
            // sound: 'default', // Use default notification sound
            // vibration: true, // Enable vibration
            // vibrationPattern: [300, 500], // Optional vibration pattern
          });
          console.log('Notification channel "mood-reminders" created successfully:', channelId);
        } catch (error) {
          console.error('Error creating notification channel "mood-reminders":', error);
        }
      }

      // --- Optional: Request iOS Permissions Early ---
      // You can request iOS permissions here, but it's often better UX
      // to request them *only* when the user explicitly tries to enable
      // reminders within the MoodTrackerScreen itself.
      // if (Platform.OS === 'ios') {
      //   try {
      //       const settings = await notifee.requestPermission();
      //       console.log('iOS Initial Permission Request Status:', settings);
      //   } catch (error) {
      //       console.error('Error requesting iOS permissions on startup:', error);
      //   }
      // }
    }

    setupNotificationChannel(); // Call the setup function

  }, []); // The empty dependency array ensures this effect runs only once when the App component mounts

  // --- Render Navigation ---
  return (
    <NavigationContainer>
      <Navigation />
    </NavigationContainer>
  );
}