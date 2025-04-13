/**
 * DiscoverScreen.js
 * Placeholder screen for the Discover tab content.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

// --- Colors (You might want to import these from a central location) ---
const colors = {
  primary: '#2bedbb',
  backgroundTop: '#E6F7FF',
  backgroundBottom: '#D1EFFF',
  textDark: '#2D5D5E',
};
// ---------------------------------------------------------------------

const DiscoverScreen = () => {
  return (
    <LinearGradient
      colors={[colors.backgroundTop, colors.backgroundBottom]}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>
          Explore features, resources, and more.
        </Text>
        {/* Add your Discover screen content here */}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary || '#7A8D8E', // Fallback color
    textAlign: 'center',
  },
});

export default DiscoverScreen;
