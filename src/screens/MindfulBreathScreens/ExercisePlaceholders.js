import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';

// Reuse your color scheme
const COLORS = { /* ... your COLORS object ... */
    background: '#F4F8F7', text: '#3A506B', primary: '#6AB7A8', border: '#D8E2EB',
};

const PlaceholderScreen = ({ route, screenTitle }) => {
  // Get the exercise data passed as a parameter
  const exerciseData = route.params?.exerciseData;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{screenTitle || exerciseData?.name || 'Breathing Exercise'}</Text>
        {exerciseData ? (
          <>
            <Text style={styles.info}>English Name: {exerciseData.englishName}</Text>
            <Text style={styles.info}>Duration: {exerciseData.duration}</Text>
            <Text style={styles.info}>Level: {exerciseData.level}</Text>
            <Text style={styles.placeholder}>
              Build the specific UI, instructions, timer, and animation for {exerciseData.name} here.
            </Text>
          </>
        ) : (
          <Text style={styles.placeholder}>Exercise data not found.</Text>
        )}
        {/* Add Back Button */}
      </View>
    </SafeAreaView>
  );
};

// Create specific exports for each screen using the placeholder
export const UjjayiScreen = (props) => <PlaceholderScreen {...props} screenTitle="Ujjayi (Ocean Breath)" />;
export const BhramariScreen = (props) => <PlaceholderScreen {...props} screenTitle="Bhramari (Humming Bee)" />;
export const NadiShodhanaScreen = (props) => <PlaceholderScreen {...props} screenTitle="Nadi Shodhana (Alternate Nostril)" />;
export const SamavrittiScreen = (props) => <PlaceholderScreen {...props} screenTitle="Samavritti (Box Breathing)" />;
export const SuryaBhedanaScreen = (props) => <PlaceholderScreen {...props} screenTitle="Surya Bhedana (Right Nostril)" />;
export const ChandraBhedanaScreen = (props) => <PlaceholderScreen {...props} screenTitle="Chandra Bhedana (Left Nostril)" />;


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  info: {
     fontSize: 16,
     color: COLORS.textSecondary,
     marginBottom: 8,
  },
  placeholder: {
    fontSize: 16,
    color: COLORS.primary,
    marginTop: 30,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    borderRadius: 8
  },
});

export default PlaceholderScreen; // Export the placeholder screen for use in other files
// You might need a default export if used directly, but named exports are fine for RootNavigation
// export default PlaceholderScreen; // Or export one specific screen as default if needed