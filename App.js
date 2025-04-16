import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Platform } from 'react-native'; // Import Platform

// --- Your App Navigation ---
import Navigation from './src/Navigation';

// --- Notification Setup ---
import notifee, { AndroidImportance } from '@notifee/react-native';

// --- Toast Message Setup ---
import Toast from 'react-native-toast-message'; // 1. Import the Toast component

// AsyncStorage (Keep if used elsewhere, otherwise remove)
import AsyncStorage from '@react-native-async-storage/async-storage';


export default function App() {

  // --- Notification Channel Setup Effect ---
  useEffect(() => {
    async function setupNotificationChannel() {
      // Create notification channel for Android 8.0+
      if (Platform.OS === 'android') {
        try {
          const channelId = await notifee.createChannel({
            // Use the *exact same* channel ID as used when displaying notifications
            id: 'mood-reminders', // Example channel ID
            name: 'Mood Check-in Reminders', // User-visible channel name
            importance: AndroidImportance.DEFAULT, // Importance level
          });
          console.log('Notification channel "mood-reminders" created successfully:', channelId);
        } catch (error) {
          console.error('Error creating notification channel "mood-reminders":', error);
        }
      }
      // Optional: iOS permission request (consider doing it later when needed)
    }

    setupNotificationChannel(); // Run setup on mount

  }, []); // Empty dependency array ensures this runs only once

  // --- Render Navigation and Toast ---
  return (
    <NavigationContainer>
      {/* Use a Fragment (<>...</>) to render multiple components */}
      <>
        {/* Your main app navigation */}
        <Navigation />

        {/* 2. Render the Toast component here */}
        {/* It needs to be rendered once at the top level */}
        {/* It doesn't display anything itself until Toast.show() is called */}
        <Toast />
      </>
    </NavigationContainer>
  );
}