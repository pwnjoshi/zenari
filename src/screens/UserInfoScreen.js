// UserInfoScreen.js
import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    Keyboard,
    TouchableWithoutFeedback,
    ActivityIndicator,
    Platform,
    KeyboardAvoidingView,
    ScrollView,
    LayoutAnimation,
    UIManager,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';

// --- Firebase Imports ---
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
// ------------------------

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// --- *** NEW Muted Color Palette *** ---
const colors = {
    backgroundPrimary: '#F4F7F9', // Very light off-white/grey
    gradientTop: '#E9F1F8',    // Soft, slightly desaturated light blue
    gradientBottom: '#F4F7F9', // Match primary background
    primary: '#A0B3D7',      // Muted cornflower blue
    primaryDark: '#7A92C4',     // Darker muted blue
    accent: '#E2CFC4',        // Muted terracotta/rose dust (Use sparingly)
    textHeading: '#2E3A52',    // Darker, slightly desaturated blue/grey
    textBody: '#596780',      // Medium desaturated blue/grey
    textPlaceholder: '#9AA8BC', // Lighter grey
    buttonText: '#FFFFFF',
    inputBackground: '#FFFFFF',
    inputBorder: '#DCE4EC',    // Softer grey border
    inputFocusedBorder: '#A0B3D7', // Muted blue border on focus
    progressBarBackground: '#DCE4EC',
    progressBarFill: '#A0B3D7',
    selectedOptionBg: '#E9F1F8', // Match gradient top
    selectedOptionBorder: '#A0B3D7',
    error: '#E57373',         // Muted Red
    white: '#FFFFFF',
};
// ---------------------------------

// --- Step Definitions (Same as before) ---
const steps = [
    { id: 1, title: "What should we call you?", key: 'fullName' },
    { id: 2, title: "How do you identify?", key: 'gender', options: ['Male', 'Female', 'Other', 'Prefer not to say'] }, // Added 'Prefer not to say'
    { id: 3, title: "What brings you here today?", key: 'primaryGoal', options: ['Reduce Stress', 'Manage Anxiety', 'Improve Sleep', 'Mindfulness', 'Self-Esteem', 'Just Exploring'] },
    { id: 4, title: "What interests you?", key: 'areasOfInterest', options: ['Meditation', 'Breathing', 'Sound Therapy', 'Journaling', 'Sleep Stories', 'Gratitude'], multiSelect: true },
];
const totalSteps = steps.length;
// -----------------------

// --- Component ---
const UserInfoScreen = (props) => {
    const { onProfileComplete } = props;

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        fullName: '',
        gender: null,
        primaryGoal: null,
        areasOfInterest: [],
    });
    const [inputFocused, setInputFocused] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const currentStepConfig = steps.find(step => step.id === currentStep);

    // --- Input Handlers (Same as before) ---
    const handleTextInputChange = (text) => { setError(null); setFormData(prev => ({ ...prev, fullName: text })); };
    const handleSingleSelect = (key, value) => { setError(null); setFormData(prev => ({ ...prev, [key]: value })); };
    const handleMultiSelect = (key, value) => { /* ... multi-select logic ... */
        setError(null); setFormData(prev => { const currentSelection = prev[key] || []; const isSelected = currentSelection.includes(value); if (isSelected) { return { ...prev, [key]: currentSelection.filter(item => item !== value) }; } else { return { ...prev, [key]: [...currentSelection, value] }; } });
     };

    // --- *** UPDATED Navigation & Validation *** ---
    const goToNextStep = () => {
        console.log(`goToNextStep called. Current step: ${currentStep}`); // Debug
        Keyboard.dismiss(); // Dismiss keyboard before validation/navigation
        // --- Validation ---
        const currentKey = currentStepConfig?.key; // Use optional chaining
        const currentValue = currentKey ? formData[currentKey] : undefined;
        let isValid = true;
        let validationError = null;

        console.log(`Validating Key: ${currentKey}, Value:`, currentValue); // Debug

        switch (currentKey) {
            case 'fullName':
                if (!currentValue || currentValue.trim() === '') {
                    isValid = false; validationError = 'Please enter your name.';
                }
                break;
            case 'gender':
            case 'primaryGoal':
                if (!currentValue) {
                    isValid = false; validationError = 'Please select an option.';
                }
                break;
            case 'areasOfInterest':
                if (!currentValue || currentValue.length === 0) {
                    isValid = false; validationError = 'Please select at least one area of interest.';
                }
                break;
            default:
                // Should not happen if currentStepConfig is found
                console.warn("Validation skipped: No currentKey found for step", currentStep);
                break;
        }

        if (!isValid) {
            console.log("Validation Failed:", validationError); // Debug
            setError(validationError);
            return; // Stop execution if validation fails
        }

        setError(null); // Clear error if validation passes

        // --- Animate and Go Next ---
        // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // Try commenting out if issues persist
        console.log("Validation Passed. Proceeding to next step or save."); // Debug

        if (currentStep < totalSteps) {
            const nextStep = currentStep + 1;
            console.log(`Setting currentStep to: ${nextStep}`); // Debug
            setCurrentStep(nextStep);
        } else {
            // Last step - Save data
            console.log("Last step reached. Calling handleSaveUserInfo."); // Debug
            handleSaveUserInfo();
        }
    };

    const goToPreviousStep = () => {
        console.log(`goToPreviousStep called. Current step: ${currentStep}`); // Debug
        // LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); // Optional animation
        if (currentStep > 1) {
            const prevStep = currentStep - 1;
            console.log(`Setting currentStep to: ${prevStep}`); // Debug
            setCurrentStep(prevStep);
            setError(null); // Clear error when going back
        }
    };

    // --- Save Data (Same as before) ---
    const handleSaveUserInfo = async () => { /* ... Same save logic ... */
        Keyboard.dismiss();
        if (!formData.fullName || !formData.gender || !formData.primaryGoal || formData.areasOfInterest.length === 0) { Alert.alert("Error", "Please complete all steps."); return; }
        setIsLoading(true); setError(null); const currentUser = auth().currentUser;
        if (!currentUser) { setError('Authentication error...'); Alert.alert('Error', 'No user found...'); setIsLoading(false); return; }
        const userId = currentUser.uid;
        const dataToSave = { ...formData, fullName: formData.fullName.trim(), createdAt: firestore.FieldValue.serverTimestamp(), };
        try { console.log(`Saving user info for UID: ${userId}`, dataToSave); await firestore().collection('users').doc(userId).set(dataToSave, { merge: true }); console.log('User info saved successfully!');
            if (onProfileComplete && typeof onProfileComplete === 'function') { console.log("Calling onProfileComplete callback..."); onProfileComplete(); }
            else { console.warn("onProfileComplete callback not provided!"); Alert.alert("Error", "Setup complete, but couldn't proceed."); setIsLoading(false); }
        } catch (err) { console.error("Firestore save error: ", err); setError('Failed to save information...'); Alert.alert('Error', 'Could not save details.'); setIsLoading(false); }
     };

    // --- Render Input based on Step (Same logic as before) ---
    const renderStepContent = () => { /* ... Same rendering logic based on currentStepConfig ... */
        const key = currentStepConfig?.key;
        const options = currentStepConfig?.options;

        switch (key) {
            case 'fullName':
                return (
                    <TextInput
                        style={[styles.input, inputFocused && styles.inputFocused]}
                        placeholder="Enter your name"
                        placeholderTextColor={colors.textPlaceholder}
                        value={formData.fullName}
                        onChangeText={handleTextInputChange}
                        autoCapitalize="words"
                        onFocus={() => setInputFocused(true)}
                        onBlur={() => setInputFocused(false)}
                        returnKeyType="next"
                        onSubmitEditing={goToNextStep}
                        editable={!isLoading}
                    />
                );
            case 'gender':
            case 'primaryGoal':
                const genderOptions = steps.find(s => s.key === 'gender')?.options || [];
                const goalOptions = steps.find(s => s.key === 'primaryGoal')?.options || [];
                const currentOptions = key === 'gender' ? genderOptions : goalOptions;
                return (
                    <View style={styles.optionsContainer}>
                        {currentOptions.map((option) => (
                            <TouchableOpacity key={option} style={[ styles.optionButton, formData[key] === option && styles.optionButtonSelected ]} onPress={() => handleSingleSelect(key, option)} disabled={isLoading} >
                                <Text style={[ styles.optionText, formData[key] === option && styles.optionTextSelected ]}>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                );
             case 'areasOfInterest':
                 const interestOptions = steps.find(s => s.key === 'areasOfInterest')?.options || [];
                 return (
                    <View style={styles.optionsContainer}>
                        {interestOptions.map((option) => (
                            <TouchableOpacity key={option} style={[ styles.optionButton, formData[key]?.includes(option) && styles.optionButtonSelected ]} onPress={() => handleMultiSelect(key, option)} disabled={isLoading} >
                                <Text style={[ styles.optionText, formData[key]?.includes(option) && styles.optionTextSelected ]}>{option}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                 );
            default:
                return <Text>Loading step...</Text>; // Fallback
        }
     };

    // --- Main Render ---
    return (
        <LinearGradient
            colors={[colors.gradientTop, colors.gradientBottom]}
            style={styles.gradientContainer}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardAvoidingView}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                    <View style={styles.outerContainer}>
                        {/* Progress Bar */}
                        <View style={styles.progressBarContainer}>
                            <View style={[styles.progressBarFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
                        </View>

                        {/* Back Button (Absolute Positioned - Top Left) */}
                        {currentStep > 1 && (
                             <TouchableOpacity
                                style={styles.topLeftBackButton}
                                onPress={goToPreviousStep}
                                disabled={isLoading}
                             >
                                 <Icon name="arrow-back-outline" size={28} color={colors.textBody} />
                            </TouchableOpacity>
                         )}


                        {/* Content Area */}
                        <ScrollView
                            contentContainerStyle={styles.scrollContentContainer}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                         >
                            <View style={styles.contentWrapper}>
                                <Text style={styles.stepTitle}>{currentStepConfig?.title || ' '}</Text>
                                {currentStepConfig?.key !== 'fullName' && (
                                    <Text style={styles.stepSubtitle}>
                                        {currentStepConfig?.multiSelect ? 'Select all that apply.' : 'Select one option.'}
                                    </Text>
                                )}
                                {error && <Text style={styles.errorText}>{error}</Text>}
                                {renderStepContent()}
                             </View>
                        </ScrollView>

                         {/* Footer Navigation Button */}
                        <View style={styles.footer}>
                            {/* // Removed back button from footer */}
                            <TouchableOpacity
                                style={[styles.navButton, styles.nextButtonFullWidth, isLoading && styles.buttonDisabled]} // Adjusted style name
                                onPress={goToNextStep}
                                disabled={isLoading}
                            >
                                {isLoading && currentStep === totalSteps ? (
                                    <ActivityIndicator size="small" color={colors.buttonText} />
                                ) : (
                                    <Text style={styles.nextButtonText}>
                                        {currentStep === totalSteps ? 'Finish Setup' : 'Next'}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

// --- *** UPDATED Styles *** ---
const styles = StyleSheet.create({
    gradientContainer: {
        flex: 1,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    outerContainer: {
        flex: 1,
        paddingTop: Platform.OS === 'ios' ? 60 : 30, // Status bar height
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: colors.progressBarBackground,
        marginHorizontal: 30,
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 25, // Increased space below progress bar
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: colors.progressBarFill,
        borderRadius: 3,
    },
    topLeftBackButton: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 55 : 25, // Position below status bar
        left: 20,
        zIndex: 10, // Ensure it's tappable
        padding: 10, // Increase tap area
    },
    scrollContentContainer: {
        flexGrow: 1,
        justifyContent: 'center', // Center content vertically
        paddingBottom: 120, // More space above footer button
    },
    contentWrapper: {
        paddingHorizontal: 35,
        paddingVertical: 10, // Reduced top/bottom padding here
    },
    stepTitle: {
        fontSize: 24, // Slightly smaller title
        fontWeight: '600', // Medium weight
        color: colors.textHeading,
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 32,
    },
    stepSubtitle: {
        fontSize: 15,
        color: colors.textBody,
        textAlign: 'center',
        marginBottom: 30,
    },
    input: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1.5, // Slightly thicker border
        borderColor: colors.inputBorder,
        borderRadius: 12,
        paddingHorizontal: 20,
        paddingVertical: 16, // Increased padding
        fontSize: 18,
        color: colors.textHeading,
        textAlign: 'center',
        marginBottom: 20,
        // *** REMOVED shadow properties that might cause resizing ***
    },
    inputFocused: {
        borderColor: colors.inputFocusedBorder, // Only change border color on focus
        // *** REMOVED shadow properties ***
    },
    optionsContainer: {
        width: '100%',
    },
    optionButton: {
        backgroundColor: colors.inputBackground,
        borderWidth: 1.5, // Match input border width
        borderColor: colors.inputBorder,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 12,
        alignItems: 'center',
        width: '100%',
    },
    optionButtonSelected: {
        borderColor: colors.selectedOptionBorder,
        backgroundColor: colors.selectedOptionBg,
    },
    optionText: {
        fontSize: 16,
        color: colors.textBody,
        fontWeight: '500',
    },
    optionTextSelected: {
        color: colors.primaryDark,
        fontWeight: '600',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        // Only contain the Next button now
        paddingHorizontal: 30,
        paddingBottom: Platform.OS === 'ios' ? 40 : 30,
        paddingTop: 20, // Add padding above button
        // Removed borderTop, not needed if background matches
        backgroundColor: 'transparent', // Make footer background clear
    },
    navButton: { // Base style for buttons (might be reused if needed)
        paddingVertical: 15, // Standardized padding
        borderRadius: 28, // More rounded
        alignItems: 'center',
        justifyContent: 'center',
    },
    nextButtonFullWidth: { // Style for the single footer button
        backgroundColor: colors.primary,
        width: '100%', // Make button full width
        shadowColor: colors.primaryDark, // Use darker shade for shadow
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    nextButtonText: {
        color: colors.buttonText,
        fontSize: 17, // Slightly larger text
        fontWeight: '600', // Medium weight
    },
    buttonDisabled: {
        backgroundColor: colors.primaryDark, // Use darker primary for disabled state
        opacity: 0.7,
    },
    // Back button style removed from footer section
    errorText: {
        color: colors.error,
        textAlign: 'center',
        marginBottom: 15,
        fontSize: 14,
        fontWeight: '500',
    },
});

export default UserInfoScreen;