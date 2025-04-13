/**
 * MoodTrackerScreen.js
 * FINAL VERSION - Set to use Firestore data by default.
 * Includes detailed logging for diagnosing data loading issues.
 * FIXED: Corrected startDate calculation for 'Daily' chart view.
 */
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    Pressable,
    Alert,
    Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import firestore from '@react-native-firebase/firestore';
import { AuthContext } from './AuthProvider'; // Assuming path is correct

// --- Notification & Reminder Imports ---
import notifee, {
    TimestampTrigger,
    TriggerType,
    RepeatFrequency,
    AndroidImportance,
    AuthorizationStatus
} from '@notifee/react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- IMPORT COLORS ---
// *** IMPORTANT: Adjust the path '../constants/colors' if your file is located elsewhere ***
import { colors } from '../constants/colors';
// -------------------

// Optional Calendar Configuration
// LocaleConfig.locales['en'] = LocaleConfig.locales[''];
// LocaleConfig.defaultLocale = 'en';

const { width: screenWidth } = Dimensions.get('window');

// --- Helper Functions ---
const getMoodValue = (moodLabel) => {
    // Assigns a numerical value to each mood for charting
    switch (moodLabel?.toLowerCase()) {
        case 'very happy': return 5;
        case 'excited': return 4;
        case 'stable/calm': return 3;
        case 'worried': return 2;
        case 'sad': return 1;
        default: return 0; // Default for unknown/null moods
    }
};

const getMoodColor = (moodLabel) => {
    // Assigns a specific color to each mood for UI elements
    switch (moodLabel?.toLowerCase()) {
        case 'very happy': return '#FFDA63'; // Example bright yellow
        case 'excited': return colors.excitedOrange;
        case 'stable/calm': return colors.calmGreen;
        case 'sad': return colors.sadBlue;
        case 'worried': return colors.worriedPurple;
        default: return colors.neutralGrey; // Default for unknown/null moods
    }
};

const formatDateISO = (date) => {
    // Formats a Date object into 'YYYY-MM-DD' string
    if (!(date instanceof Date) || isNaN(date)) {
        console.warn("formatDateISO received invalid date:", date);
        // Fallback to current date if input is invalid
        const now = new Date();
        return now.toISOString().split('T')[0];
    }
    // Ensure the date is treated in local timezone before formatting
    // This helps avoid potential off-by-one day errors near midnight UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const getDateNDaysAgo = (days) => {
    // Calculates the date N days before today, setting time to start of day
    const date = new Date();
    date.setDate(date.getDate() - days);
    date.setHours(0, 0, 0, 0); // Normalize to the beginning of the day
    return date;
};
// -----------------------

// --- DEMO DATA Creation (Only used if USE_DEMO_DATA is true) ---
const createDemoData = () => {
  const baseDate = new Date(); // Use a consistent base date

  // --- Demo Moods ---
  const demoMoods = [
      { id: 'm1', mood: 'Stable/Calm', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 0)), note: 'Feeling okay.' },
      { id: 'm2', mood: 'Very Happy', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)), note: 'Great day!' },
      { id: 'm3', mood: 'Worried', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 2)), note: 'Stressful.' },
      { id: 'm4', mood: 'Stable/Calm', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 3)) },
      { id: 'm5', mood: 'Sad', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 4)), note: 'Missing friends.' },
      { id: 'm6', mood: 'Excited', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 5)), note: 'Weekend plans!' },
      { id: 'm7', mood: 'Stable/Calm', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 6)) },
      { id: 'm8', mood: 'Very Happy', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 7)), note: 'Productive.' },
      { id: 'm9', mood: 'Worried', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 10)) },
      { id: 'm10', mood: 'Stable/Calm', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 15)) }
  ];

  // --- Demo Activities ---
  const demoActivities = [
      { id: 'a1', type: 'Sleep', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)), duration: 7.5 },
      { id: 'a2', type: 'Exercise', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)), duration: 1 },
      { id: 'a3', type: 'Social', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 0)), duration: 2 },
      { id: 'a4', type: 'Sleep', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 0)), duration: 8 },
      { id: 'a5', type: 'Exercise', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 2)), duration: 0.75 },
      { id: 'a6', type: 'Sleep', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 2)), duration: 6 },
      { id: 'a7', type: 'Social', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 4)), duration: 3 },
      { id: 'a8', type: 'Sleep', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 4)), duration: 7 },
      { id: 'a9', type: 'Exercise', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 6)), duration: 1.5 },
      { id: 'a10', type: 'Sleep', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 6)), duration: 8.5 }
  ];

  return { demoMoodHistory: demoMoods, demoActivityHistory: demoActivities };
};
// -----------------

// --- AsyncStorage Keys ---
const REMINDER_TIME_KEY = '@MoodTracker_ReminderTime';
const REMINDER_ID_KEY = '@MoodTracker_ReminderId';
// -----------------------

// --- Main Screen Component ---
const MoodTrackerScreen = ({ navigation }) => {
    // --- State Declarations ---
    const { user } = useContext(AuthContext); // Get user info from AuthProvider
    const [moodHistory, setMoodHistory] = useState([]); // Stores mood data from Firestore
    const [activityHistory, setActivityHistory] = useState([]); // Stores activity data (currently placeholder)
    const [loading, setLoading] = useState(true); // Loading state for mood data
    const [loadingActivities, setLoadingActivities] = useState(true); // Loading state for activity data
    const [error, setError] = useState(null); // Stores any data fetching errors
    const [timeRange, setTimeRange] = useState('Weekly'); // Controls chart time range ('Daily', 'Weekly', 'Monthly')
    const [selectedDateData, setSelectedDateData] = useState(null); // Data for the selected calendar day modal
    const [isModalVisible, setIsModalVisible] = useState(false); // Controls visibility of the calendar day modal
    // AI Insights State
    const [aiInsight, setAiInsight] = useState(''); // Stores the generated AI insight
    const [isFetchingInsight, setIsFetchingInsight] = useState(false); // Loading state for AI insight
    const [insightError, setInsightError] = useState(null); // Stores AI insight fetching errors
    const [insightFetched, setInsightFetched] = useState(false); // Tracks if an insight has been fetched/attempted
    // Reminders State
    const [reminderTime, setReminderTime] = useState(new Date()); // Stores the selected reminder time
    const [showTimePicker, setShowTimePicker] = useState(false); // Controls visibility of the time picker
    const [isReminderSet, setIsReminderSet] = useState(false); // Tracks if a reminder is currently active
    const [scheduledReminderId, setScheduledReminderId] = useState(null); // Stores the ID of the scheduled notification
    const [reminderLoading, setReminderLoading] = useState(true); // Loading state for reminder setup/cancellation
    // --------------------------

    // --- Configuration Flags ---
    // *** Set to false to use Firestore data, true to use DEMO data ***
    const USE_DEMO_DATA = false; // <<<<----- ENSURES FIRESTORE DATA IS USED
    // ---------------------------

    // --- Memoized Demo Data ---
    // Only creates demo data if USE_DEMO_DATA is true, otherwise returns empty arrays
    const { demoMoodHistory, demoActivityHistory } = useMemo(() => {
        console.log("Memoizing demo data. USE_DEMO_DATA:", USE_DEMO_DATA);
        return USE_DEMO_DATA ? createDemoData() : { demoMoodHistory: [], demoActivityHistory: [] };
    }, [USE_DEMO_DATA]);

    // --- Load Reminder Settings ---
    useEffect(() => {
        // Loads reminder time and ID from AsyncStorage on component mount
        const loadReminderSettings = async () => {
            console.log("Loading reminder settings...");
            setReminderLoading(true);
            try {
                const timeString = await AsyncStorage.getItem(REMINDER_TIME_KEY);
                const storedId = await AsyncStorage.getItem(REMINDER_ID_KEY);

                if (storedId) {
                    console.log("Found stored reminder ID:", storedId);
                    setScheduledReminderId(storedId);
                    setIsReminderSet(true);
                } else {
                    console.log("No stored reminder ID found.");
                    setIsReminderSet(false);
                }

                // Set default time (e.g., 9:00 AM) if nothing is stored or invalid
                const defaultTime = new Date();
                defaultTime.setHours(9, 0, 0, 0);

                if (timeString) {
                    const [hours, minutes] = timeString.split(':').map(Number);
                    if (!isNaN(hours) && !isNaN(minutes)) {
                        const loadedTime = new Date();
                        loadedTime.setHours(hours, minutes, 0, 0);
                        setReminderTime(loadedTime);
                        console.log("Loaded reminder time:", loadedTime.toLocaleTimeString());
                    } else {
                        console.warn("Invalid time string found in storage, using default.");
                        setReminderTime(defaultTime);
                    }
                } else {
                    console.log("No reminder time stored, using default.");
                    setReminderTime(defaultTime);
                }
            } catch (e) {
                console.error("Failed to load reminder settings:", e);
                // Fallback in case of error
                const defaultTime = new Date();
                defaultTime.setHours(9, 0, 0, 0);
                setReminderTime(defaultTime);
                setIsReminderSet(false);
                setScheduledReminderId(null);
            } finally {
                setReminderLoading(false);
                console.log("Reminder settings loading complete.");
            }
        };
        loadReminderSettings();
    }, []); // Empty dependency array ensures this runs only once on mount

    // --- Function to Fetch AI Insight (Using Specific Key/URL) ---
    const fetchAiInsight = useCallback(async (fullHistory) => {
        // !!! SECURITY WARNING: Avoid hardcoding API keys in production apps. Use environment variables or a secure backend. !!!
        const API_KEY = 'AIzaSyC71zqfdneQpkrMNXRCHwkUqHTiZTLqo1M'; // Replace with your actual key if needed
        const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

        // Filter history for the last 7 days (including today)
        const sevenDaysAgo = getDateNDaysAgo(6); // 6 days ago + today = 7 days
        const last7DaysHistory = fullHistory.filter(
            item => item.timestamp instanceof Date && item.timestamp >= sevenDaysAgo
        );

        if (!last7DaysHistory || last7DaysHistory.length === 0) {
            console.log("AI Insight: Not enough data in the last 7 days.");
            setAiInsight("Log mood consistently for 7-day insights!");
            setInsightError(null);
            setInsightFetched(true);
            return;
        }
        if (isFetchingInsight) {
            console.log("AI Insight: Fetch already in progress.");
            return; // Prevent multiple simultaneous requests
        }

        console.log(`Fetching AI insight (7-day) using ${API_URL.split('/')[5]}...`);
        setIsFetchingInsight(true);
        setInsightError(null);
        setAiInsight(''); // Clear previous insight

        try {
            // Prepare data summary for the prompt
            const moodsLast7Days = last7DaysHistory.map(entry => entry.mood).join(', ');
            const moodCountsLast7Days = last7DaysHistory.reduce((acc, item) => {
                acc[item.mood] = (acc[item.mood] || 0) + 1;
                return acc;
            }, {});
            const frequentMoodLast7Days = Object.entries(moodCountsLast7Days).sort(([, a], [, b]) => b - a)[0]?.[0] || 'varied';

            // Construct the prompt for the AI model
            const prompt = `You are a gentle and calming wellness companion. Analyze the user's mood data from the past 7 days. Moods logged include: [${moodsLast7Days}]. The most frequent mood seems to be: ${frequentMoodLast7Days}. Based ONLY on this 7-day data, provide one *very short* (1-2 sentences MAX), sweet, positive, and encouraging insight or suggestion. Focus on simple encouragement or a small actionable tip related to the recent pattern. Be concise and warm.`;
            const requestBody = { contents: [{ parts: [{ text: prompt }] }] };

            // Make the API call
            const response = await fetch(`${API_URL}?key=${API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            // Handle API response
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Try to parse error details
                const errorMsg = `AI Error: ${response.status}. ${errorData?.error?.message || 'No details available.'}`;
                console.error("AI Fetch Error:", errorMsg, errorData);
                throw new Error(errorMsg);
            }
            const data = await response.json();

            // Extract and set the insight text
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const insightText = data.candidates[0].content.parts[0].text.trim();
                setAiInsight(insightText);
                console.log("AI Insight received:", insightText);
            } else {
                console.error('AI Error: Invalid response structure.', data);
                throw new Error(data?.error?.message || 'Invalid response format from AI.');
            }
        } catch (err) {
            console.error("Error fetching AI insight: ", err);
            setInsightError(err.message || "Could not connect to insight service.");
            setAiInsight("Sorry, couldn't generate an insight right now.");
        } finally {
            setIsFetchingInsight(false);
            setInsightFetched(true); // Mark that fetch attempt completed
            console.log("AI Insight fetch finished.");
        }
    }, [isFetchingInsight]); // Dependency: only refetch if isFetchingInsight changes (prevents loops)


    // --- Fetch Mood/Activity Data ---
    useEffect(() => {
        console.log("Data fetching useEffect triggered. User:", user?.uid, "USE_DEMO_DATA:", USE_DEMO_DATA);
        setLoading(true); // Start loading indicator for mood
        setLoadingActivities(true); // Start loading indicator for activities
        setInsightFetched(false); // Reset insight fetched status on data reload
        setError(null); // Clear previous errors

        // --- Option 1: Use Demo Data ---
        if (USE_DEMO_DATA) {
            console.log("MoodTracker: Using DEMO data.");
            setMoodHistory(demoMoodHistory);
            setActivityHistory(demoActivityHistory);
            setLoading(false);
            setLoadingActivities(false);
            setError(null);
            // Fetch insight based on demo data if available
            if (demoMoodHistory.length > 0) {
                fetchAiInsight(demoMoodHistory);
            } else {
                setAiInsight("Using demo data. No mood entries to analyze.");
                setInsightFetched(true);
            }
            // Cleanup function for demo mode (optional)
            return () => { console.log("Cleanup: Demo mode.")};
        }

        // --- Option 2: Use Firestore Data ---
        if (!user) {
            console.log("MoodTracker: No user logged in. Cannot fetch Firestore data.");
            setLoading(false);
            setLoadingActivities(false);
            setError("Please log in to see your mood history.");
            setMoodHistory([]); // Ensure history is empty
            setActivityHistory([]);
            // Cleanup function for no user
            return () => { console.log("Cleanup: No user.")};
        }

        console.log("MoodTracker: Setting up Firestore listeners for user:", user.uid);
        let isMounted = true; // Flag to prevent state updates on unmounted component

        // --- Firestore Listener for Mood History ---
        const unsubscribeMood = firestore()
            .collection('users')
            .doc(user.uid)
            .collection('moodHistory')
            .orderBy('timestamp', 'desc') // Get latest entries first
            .onSnapshot(querySnapshot => {
                if (!isMounted) return; // Don't update if component unmounted
                console.log("MoodTracker: Mood data received from Firestore snapshot.");
                const history = [];
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    // Ensure timestamp is valid and convert Firestore Timestamp to JS Date
                    if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                        history.push({
                            id: doc.id, // Add document ID
                            ...data,
                            timestamp: data.timestamp.toDate() // Convert to Date object
                        });
                    } else {
                        console.warn("Invalid or missing timestamp in mood document:", doc.id, data);
                    }
                });
                console.log(`MoodTracker: Processed ${history.length} mood entries.`);
                setMoodHistory(history); // Update state with fetched data
                setLoading(false); // Stop mood loading indicator
                setError(null); // Clear any previous error
                setInsightFetched(false); // Reset insight status, will refetch below

                // Fetch AI insight only after mood history is updated and non-empty
                if (history.length > 0) {
                    fetchAiInsight(history);
                } else {
                    setAiInsight("Track your mood to get personalized insights!");
                    setInsightFetched(true); // Mark as fetched (no data to fetch from)
                }
            }, err => {
                if (!isMounted) return;
                console.error("Firestore mood listener error:", err);
                setError("Failed to load mood history. Please check connection.");
                setLoading(false);
                setLoadingActivities(false); // Also stop activity loading on mood error
                setMoodHistory([]); // Clear potentially stale data
            });

        // --- Placeholder for Firestore Listener/Fetch for Activity History ---
        // TODO: Replace this with your actual Firestore query for activities
        const fetchActivities = async () => {
             if (!isMounted) return;
             console.log("Fetching activities (placeholder - replace with Firestore query)...");
             setLoadingActivities(true);
             try {
                 // *** SIMULATED DELAY - REPLACE WITH ACTUAL FIRESTORE QUERY ***
                 // Example: const activitySnapshot = await firestore()...get();
                 // const activities = activitySnapshot.docs.map(...)
                 await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
                 if (isMounted) {
                     setActivityHistory([]); // Set fetched activities here
                     console.log("Placeholder activities 'fetched'.");
                 }
             } catch (err) {
                 console.error("Activity fetch error:", err);
                 if (isMounted) {
                    // Set error, potentially preserving existing mood error
                    setError(prevError => prevError || "Failed to load activity history.");
                 }
             } finally {
                 if (isMounted) {
                    setLoadingActivities(false); // Stop activity loading indicator
                 }
             }
         };
         fetchActivities(); // Call the activity fetch function

        // --- Cleanup Function ---
        // This runs when the component unmounts or dependencies change
        return () => {
            console.log("Cleanup: Unsubscribing Firestore listeners.");
            isMounted = false; // Prevent state updates after unmount
            unsubscribeMood(); // Detach the mood listener
            // Add unsubscribe for activity listener here if you implement one
        };

    // Dependencies: Re-run effect if user logs in/out or if DEMO flag changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, USE_DEMO_DATA]); // fetchAiInsight is stable due to useCallback


    // --- Reminder Functions ---

    // Request permission for notifications (iOS and Android >= 33)
    const requestNotificationPermission = useCallback(async () => {
        let hasPermission = false;
        try {
            console.log("Requesting notification permission...");
            if (Platform.OS === 'ios') {
                const settings = await notifee.requestPermission();
                hasPermission = settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
                console.log("iOS Permission Status:", settings.authorizationStatus);
            } else if (Platform.OS === 'android') {
                // Android 13 (API 33) and above requires explicit permission
                if (Platform.Version >= 33) {
                    const settings = await notifee.requestPermission(); // Requests POST_NOTIFICATIONS
                    hasPermission = settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
                     console.log("Android 13+ Permission Status:", settings.authorizationStatus);
                } else {
                    // Below Android 13, permission is granted by default (implicitly)
                    hasPermission = true;
                    console.log("Android < 13: Permission assumed.");
                }
            }

            if (!hasPermission) {
                Alert.alert(
                    "Permission Required",
                    "Notifications are needed to set reminders. Please enable them in your device settings if you wish to use this feature."
                );
            }
        } catch (error) {
            console.error("Error requesting notification permissions:", error);
            Alert.alert("Permission Error", "Could not request notification permissions. Reminders may not work.");
        }
        return hasPermission;
    }, []);

    // Calculate the timestamp for the *next* occurrence of the selected time
    const calculateNextTimestamp = useCallback((selectedTime) => {
        const now = new Date();
        const targetTime = new Date(); // Start with today
        targetTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0); // Set to selected H:M

        // If the target time is in the past for today, schedule it for tomorrow
        if (targetTime.getTime() <= now.getTime()) {
            targetTime.setDate(targetTime.getDate() + 1);
            console.log("Reminder time is past for today, scheduling for tomorrow:", targetTime);
        } else {
             console.log("Scheduling reminder for today:", targetTime);
        }
        return targetTime.getTime(); // Return timestamp in milliseconds
    }, []);

    // Format Date object to a readable time string (e.g., "9:00 AM")
    const formatTime = useCallback((date) => {
        if (!(date instanceof Date) || isNaN(date)) return "Invalid Time";
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }, []);

    // Handle setting or updating the daily reminder
    const handleSetReminder = useCallback(async () => {
        console.log("Attempting to set/update reminder...");
        setReminderLoading(true);

        // 1. Request Permission
        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            console.log("Permission denied, cannot set reminder.");
            setReminderLoading(false);
            return; // Stop if permission not granted
        }

        try {
            // 2. Cancel existing reminder if one exists
            if (scheduledReminderId) {
                console.log("Cancelling existing reminder:", scheduledReminderId);
                await notifee.cancelNotification(scheduledReminderId).catch(e => {
                    // Log warning but continue, maybe ID was stale
                    console.warn("Failed to cancel potentially old notification:", scheduledReminderId, e);
                });
            }

            // 3. Create Notification Channel (Android - safe to call multiple times)
            const channelId = await notifee.createChannel({
                id: 'mood-reminders',
                name: 'Daily Mood Reminders',
                importance: AndroidImportance.DEFAULT, // Or HIGH if needed
                sound: 'default',
            });
            console.log("Notification channel created/ensured:", channelId);

            // 4. Calculate Trigger Timestamp
            const triggerTimestamp = calculateNextTimestamp(reminderTime);

            // 5. Define Trigger (Timestamp type, repeats daily)
            const trigger = {
                type: TriggerType.TIMESTAMP,
                timestamp: triggerTimestamp,
                repeatFrequency: RepeatFrequency.DAILY, // Repeat every day
            };
            console.log("Calculated trigger timestamp:", triggerTimestamp, new Date(triggerTimestamp));

            // 6. Define Notification Details
            const notificationDetails = {
                // Use a consistent ID to allow cancellation/updates
                id: 'daily-mood-reminder-' + user?.uid, // User-specific ID is good practice
                title: 'Mood Check-in! ✨',
                body: `Time to log how you're feeling today. (${formatTime(reminderTime)})`,
                android: {
                    channelId: channelId, // Use the created channel ID
                    pressAction: { id: 'default' }, // Action when notification is pressed
                    importance: AndroidImportance.DEFAULT, // Match channel importance
                    // smallIcon: 'ic_launcher', // Optional: specify custom small icon
                    // color: colors.primary, // Optional: notification accent color
                },
                ios: {
                    sound: 'default', // Default notification sound on iOS
                    // You can add badge count, category identifiers etc. here
                }
            };

            // 7. Schedule the Notification with the Trigger
            console.log("Creating trigger notification...");
            const newReminderId = await notifee.createTriggerNotification(notificationDetails, trigger);
            console.log("Successfully created trigger notification with ID:", newReminderId);

            // 8. Store Reminder Info in AsyncStorage
            const timeString = `${reminderTime.getHours()}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;
            await AsyncStorage.setItem(REMINDER_TIME_KEY, timeString);
            await AsyncStorage.setItem(REMINDER_ID_KEY, newReminderId); // Store the new ID

            // 9. Update State
            setScheduledReminderId(newReminderId);
            setIsReminderSet(true);

            Alert.alert("Reminder Set", `Your daily mood check-in reminder is set for ${formatTime(reminderTime)}.`);

        } catch (error) {
            console.error('Error setting reminder:', error);
            Alert.alert("Reminder Error", "Could not schedule the reminder. Please try again.");
            // Clean up potentially inconsistent state if error occurred after cancellation attempt
            if (scheduledReminderId) {
                await AsyncStorage.removeItem(REMINDER_ID_KEY);
                setScheduledReminderId(null);
                setIsReminderSet(false);
            }
        } finally {
            setReminderLoading(false); // Stop loading indicator
        }
    }, [reminderTime, scheduledReminderId, requestNotificationPermission, calculateNextTimestamp, formatTime, user]); // Include user in dependencies

    // Handle cancelling the active reminder
    const handleCancelReminder = useCallback(async () => {
        console.log("Attempting to cancel reminder...");
        setReminderLoading(true);

        if (scheduledReminderId) {
            try {
                console.log("Cancelling notification with ID:", scheduledReminderId);
                await notifee.cancelNotification(scheduledReminderId);
                console.log("Notification cancelled successfully.");

                // Clear stored data
                await AsyncStorage.removeItem(REMINDER_ID_KEY);
                await AsyncStorage.removeItem(REMINDER_TIME_KEY); // Also clear the time setting

                // Update state
                setScheduledReminderId(null);
                setIsReminderSet(false);

                Alert.alert("Reminder Cancelled", "Your daily reminder has been turned off.");

            } catch (error) {
                console.error('Error cancelling reminder:', error);
                Alert.alert("Cancellation Error", "Could not cancel the reminder. You might need to clear app data or reinstall if issues persist.");
            } finally {
                setReminderLoading(false);
            }
        } else {
            console.log("No scheduled reminder ID found to cancel.");
            // Ensure state and storage are clean even if ID was missing
            if(isReminderSet) setIsReminderSet(false);
            await AsyncStorage.removeItem(REMINDER_ID_KEY);
            await AsyncStorage.removeItem(REMINDER_TIME_KEY);
            setReminderLoading(false);
            // Optionally inform user nothing was set:
            // Alert.alert("No Reminder Set", "There was no active reminder to cancel.");
        }
    }, [scheduledReminderId, isReminderSet]); // Dependencies

    // Callback for when the time is selected in the DateTimePicker
    const onTimeChange = useCallback((event, selectedDate) => {
        // Hide picker immediately on Android after selection/cancel
        if (Platform.OS === 'android') {
            setShowTimePicker(false);
        }
        // Update time only if a date was selected (not cancelled)
        if (selectedDate) {
            console.log("Time selected:", selectedDate);
            setReminderTime(new Date(selectedDate)); // Update state with the new time
             // On iOS, the picker stays visible until dismissed, so we don't hide it here.
             // User needs to tap "Done" or outside the picker on iOS.
        } else {
            console.log("Time picker cancelled or dismissed.");
             // If needed, handle cancellation explicitly (e.g., revert to previous time)
        }
    }, []); // No dependencies needed


    // --- Memoized Chart Data Calculation ---
    const chartData = useMemo(() => {
        console.log(`Recalculating chart data for time range: ${timeRange}, Demo Mode: ${USE_DEMO_DATA}`);

        const currentMoodHistory = USE_DEMO_DATA ? demoMoodHistory : moodHistory;

        if (!currentMoodHistory || currentMoodHistory.length === 0) {
            console.log("Chart Data: No mood history available.");
            return { lineChartData: null, pieChartData: [] };
        }

        // --- Determine Date Range ---
        let startDate;
        const endDate = new Date(); // End date is always today
        endDate.setHours(23, 59, 59, 999); // Ensure end of today is included

        switch (timeRange) {
            case 'Daily':
                // FIX: Directly create today's date at midnight for startDate
                startDate = new Date(); // Get current date/time
                startDate.setHours(0, 0, 0, 0); // Set to beginning of today
                break;
            case 'Weekly':
                startDate = getDateNDaysAgo(6); // Last 7 days
                break;
            case 'Monthly':
            default:
                startDate = getDateNDaysAgo(29); // Last 30 days
                break;
        }
        // Log the calculated start date for verification
        console.log(`Chart Data: Filtering history between ${formatDateISO(startDate)} and ${formatDateISO(endDate)} (Range: ${timeRange})`);


        // --- Filter History ---
        const filteredHistory = currentMoodHistory.filter(item =>
            item.timestamp instanceof Date &&
            item.timestamp >= startDate &&
            item.timestamp <= endDate
        );
        console.log(`Chart Data: Found ${filteredHistory.length} entries in the selected range.`);

        // --- Calculate Daily Averages ---
        const dailyAverages = {};
        filteredHistory.forEach(item => {
            const dateStr = formatDateISO(item.timestamp);
            const moodValue = getMoodValue(item.mood);

            if (!dailyAverages[dateStr]) {
                dailyAverages[dateStr] = { totalValue: 0, count: 0 };
            }
            dailyAverages[dateStr].totalValue += moodValue;
            dailyAverages[dateStr].count += 1;
        });
        console.log("Chart Data: Calculated daily sums/counts:", dailyAverages);

        // --- Generate Labels and Data Points ---
        const labels = [];
        const dataPoints = [];
        const tempDate = new Date(startDate); // Start iteration from the calculated start date
        const rangeEndDate = new Date(endDate);
        let loopDayIndex = 0;
        // Calculate total days only needed for Monthly label logic
        const totalDaysInRange = timeRange === 'Monthly' ? Math.round((rangeEndDate - startDate) / (1000 * 60 * 60 * 24)) + 1 : 0;

        while (tempDate <= rangeEndDate) {
            const dateStr = formatDateISO(tempDate); // Use local timezone formatting
            const dayData = dailyAverages[dateStr];
            let label = '';
            const avgValue = dayData ? parseFloat((dayData.totalValue / dayData.count).toFixed(1)) : 0;

            if (timeRange === 'Daily') {
                // For Daily view, we only process the startDate
                const todayISO = formatDateISO(new Date());
                const tempDateISO = formatDateISO(tempDate);
                 console.log(`[Daily Chart Check] Comparing tempDate=${tempDateISO} with today=${todayISO}`);
                if (tempDateISO === todayISO) {
                    labels.push("Today");
                    dataPoints.push(avgValue);
                     console.log(`[Daily Chart Check] Added 'Today' with value: ${avgValue}`);
                } else {
                     console.warn(`[Daily Chart Check] Mismatch: tempDate ${tempDateISO} is not today ${todayISO}. This shouldn't happen with the fixed startDate.`);
                     // As a fallback, still add the data point if it exists, but label might be wrong
                     if (dayData) {
                         labels.push(tempDateISO); // Use ISO date as label if mismatch occurs
                         dataPoints.push(avgValue);
                     }
                }
                break; // Exit loop after processing the single day for 'Daily' view
            }
            else if (timeRange === 'Weekly') {
                label = tempDate.toLocaleDateString('en-US', { weekday: 'short' });
                labels.push(label);
                dataPoints.push(avgValue);
            }
            else { // Monthly
                const labelInterval = Math.max(1, Math.floor(totalDaysInRange / 6));
                if (loopDayIndex === 0 || loopDayIndex === (totalDaysInRange - 1) || loopDayIndex % labelInterval === 0) {
                    label = tempDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
                }
                labels.push(label);
                dataPoints.push(avgValue);
            }

            tempDate.setDate(tempDate.getDate() + 1);
            loopDayIndex++;
        }

        // --- Finalize Line Chart Data ---
        const finalLabels = labels.length > 0 ? labels : ['No Data'];
        let finalData = dataPoints.length > 0 ? dataPoints : [0];

        // Add 'Start' point only if we have exactly one valid data point (typical for Daily view)
        if (finalLabels.length === 1 && finalLabels[0] !== 'No Data') {
             console.log(`[Chart Finalize] Adding 'Start' point for single data point view (likely Daily). Labels: ${JSON.stringify(finalLabels)}, Data: ${JSON.stringify(finalData)}`);
            finalLabels.unshift('Start');
            finalData.unshift(0);
        }

        const lineChartData = finalLabels[0] !== 'No Data' ? {
            labels: finalLabels,
            datasets: [{
                data: finalData,
                color: (opacity = 1) => colors.primary,
                strokeWidth: 2
            }],
            legend: [`Mood Trend (${timeRange})`]
        } : null;

        console.log(`[chartData] Final Line Chart Labels (${timeRange}):`, lineChartData ? lineChartData.labels : 'None');
        console.log(`[chartData] Final Line Chart Data Points (${timeRange}):`, lineChartData ? lineChartData.datasets[0].data : 'None');

        // --- Calculate Pie Chart Data ---
        const currentMoodHistoryForPie = USE_DEMO_DATA ? demoMoodHistory : moodHistory;
        const moodCountsAllTime = currentMoodHistoryForPie.reduce((acc, item) => {
            if (item.mood) {
                acc[item.mood] = (acc[item.mood] || 0) + 1;
            }
            return acc;
        }, {});

        const pieChartData = Object.entries(moodCountsAllTime)
            .map(([mood, count]) => ({
                name: mood,
                population: count,
                color: getMoodColor(mood),
                legendFontColor: colors.textDark,
                legendFontSize: 13
            }))
            .sort((a, b) => b.population - a.population);

        console.log("[chartData] Final Pie Chart Data:", pieChartData);

        return { lineChartData, pieChartData };

    }, [moodHistory, timeRange, USE_DEMO_DATA, demoMoodHistory]);


    // --- Memoized Marked Dates for Calendar ---
    const markedDates = useMemo(() => {
        console.log("Recalculating marked dates for calendar...");
        const currentMoodHistory = USE_DEMO_DATA ? demoMoodHistory : moodHistory;
        const markings = {}; // Store { 'YYYY-MM-DD': { dotColor: '...', marked: true, moodLabel: '...' } }

        currentMoodHistory.forEach(item => {
            // Ensure timestamp is a valid Date object
            if (!(item.timestamp instanceof Date) || isNaN(item.timestamp)) return;

            const dateString = formatDateISO(item.timestamp);
            const existingMarking = markings[dateString];
            const newColor = getMoodColor(item.mood);
            const newMoodValue = getMoodValue(item.mood);

            // Logic to decide the dot color for the day:
            // - If no entry exists for the day yet, add this one.
            // - If an entry exists, prioritize showing the color of the 'highest' mood logged that day.
            // - If the existing dot is neutral grey (default/unknown), replace it.
            if (!existingMarking ||
                (existingMarking.moodValue !== undefined && newMoodValue > existingMarking.moodValue) ||
                existingMarking.dotColor === colors.neutralGrey)
            {
                markings[dateString] = {
                    dotColor: newColor,
                    marked: true, // Required by react-native-calendars for the dot to show
                    moodLabel: item.mood, // Store the mood label associated with the displayed dot
                    moodValue: newMoodValue // Store mood value for comparison
                };
            }
            // If multiple entries exist on the same day, the dot will reflect the highest mood value logged.
        });
        console.log(`Marked dates calculated: ${Object.keys(markings).length} days marked.`);
        return markings;
    }, [moodHistory, USE_DEMO_DATA, demoMoodHistory]); // Dependencies


    // --- Memoized Timeline Data (Last 7 Days) ---
    const timelineData = useMemo(() => {
        console.log("Recalculating timeline data...");
        // Select data source based on flag
        const currentMoodHistory = USE_DEMO_DATA ? demoMoodHistory : moodHistory;
        const currentActivityHistory = USE_DEMO_DATA ? demoActivityHistory : activityHistory;

        // Combine mood and activity history
        const combinedHistory = [
            ...currentMoodHistory,
            ...currentActivityHistory
        ]
        .filter(item => item.timestamp instanceof Date && !isNaN(item.timestamp)) // Ensure valid timestamps
        .sort((a, b) => a.timestamp - b.timestamp); // Sort chronologically (oldest first)

        // Group entries by date ('YYYY-MM-DD')
        const days = {}; // Store { 'YYYY-MM-DD': { moods: [], activities: [], predominantMood: '...' } }
        combinedHistory.forEach(item => {
            const dateStr = formatDateISO(item.timestamp);
            if (!days[dateStr]) {
                days[dateStr] = { moods: [], activities: [] }; // Initialize day entry if needed
            }

            // Add item to the correct array (moods or activities)
            if (item.mood) { // Check if it's a mood entry
                days[dateStr].moods.push(item);
            } else if (item.type) { // Check if it's an activity entry (assuming 'type' exists)
                let activityEntry = null;
                // Map activity types to icons and colors
                switch (item.type.toLowerCase()) {
                    case 'sleep':
                        activityEntry = { type: 'Sleep', icon: 'bed-outline', color: colors.sleepColor, data: item };
                        break;
                    case 'exercise':
                        activityEntry = { type: 'Exercise', icon: 'barbell-outline', color: colors.exerciseColor, data: item };
                        break;
                    case 'social':
                        activityEntry = { type: 'Social', icon: 'people-outline', color: colors.socialColor, data: item };
                        break;
                    // Add more activity types here as needed
                    default:
                        console.warn("Unknown activity type for timeline:", item.type);
                        // Optionally represent unknown types with a default icon/color
                        // activityEntry = { type: item.type, icon: 'help-circle-outline', color: colors.neutralGrey, data: item };
                        break;
                }
                if (activityEntry) {
                    days[dateStr].activities.push(activityEntry);
                }
            }
        });

        // Process each day: determine predominant mood and deduplicate activities
        Object.keys(days).forEach(dateStr => {
            // Find predominant mood for the day (most frequent, highest value as tie-breaker)
            if (days[dateStr].moods.length > 0) {
                const moodCounts = days[dateStr].moods.reduce((acc, item) => {
                    acc[item.mood] = (acc[item.mood] || 0) + 1;
                    return acc;
                }, {});
                // Sort moods first by count (desc), then by mood value (desc) as tie-breaker
                days[dateStr].predominantMood = Object.entries(moodCounts)
                    .sort(([moodA, countA], [moodB, countB]) => {
                        if (countB !== countA) {
                            return countB - countA; // Higher count first
                        }
                        return getMoodValue(moodB) - getMoodValue(moodA); // Higher mood value first if counts are equal
                    })[0]?.[0]; // Get the mood name of the top entry
            } else {
                days[dateStr].predominantMood = null; // No mood logged for the day
            }

            // Deduplicate activities shown per day (e.g., show only one 'Exercise' icon even if logged twice)
            // This keeps the timeline cleaner. Adjust if you want to show all instances.
            days[dateStr].activities = days[dateStr].activities.filter((act, idx, self) =>
                idx === self.findIndex((a) => (a.type === act.type)) // Keep only the first occurrence of each activity type
            );
        });

        // Get the dates for which we have data, sorted most recent first
        const sortedDaysWithData = Object.keys(days).sort((a, b) => new Date(b) - new Date(a));

        // Take only the last 7 days that *have data*
        const last7DaysWithData = sortedDaysWithData.slice(0, 7);

        // Map to the final structure, reversing to show oldest of the 7 days first
        const finalTimeline = last7DaysWithData
            .map(dateStr => ({ date: dateStr, ...days[dateStr] }))
            .reverse(); // Show chronological order (oldest first)

        console.log(`Timeline data calculated: ${finalTimeline.length} days shown.`);
        return finalTimeline;

    }, [moodHistory, activityHistory, USE_DEMO_DATA, demoMoodHistory, demoActivityHistory]); // Dependencies


    // --- Calendar Day Press Handler ---
    const onDayPress = useCallback((day) => {
        console.log("Calendar day pressed:", day.dateString);
        const currentMoodHistory = USE_DEMO_DATA ? demoMoodHistory : moodHistory;
        const dateString = day.dateString; // 'YYYY-MM-DD'

        // Filter mood entries for the selected date
        const entriesForDay = currentMoodHistory
            .filter(item => item.timestamp instanceof Date && formatDateISO(item.timestamp) === dateString)
            .sort((a, b) => a.timestamp - b.timestamp); // Sort entries chronologically for the modal

        // If entries exist, prepare data for modal and show it
        if (entriesForDay.length > 0) {
            console.log(`Found ${entriesForDay.length} entries for ${dateString}.`);
            setSelectedDateData({
                date: dateString,
                entries: entriesForDay
            });
            setIsModalVisible(true); // Show the modal
        } else {
            console.log(`No entries found for ${dateString}.`);
            setSelectedDateData(null); // Clear any previous selection
            // Optionally, show a brief message that no data exists for this day
            // Alert.alert("No Data", "No mood entries were logged on this day.");
        }
    }, [moodHistory, USE_DEMO_DATA, demoMoodHistory]); // Dependencies


    // --- Chart Configuration & Calendar Theme (Memoized) ---

    // Configuration object for react-native-chart-kit charts
    const chartConfig = useMemo(() => ({
        backgroundGradientFrom: colors.cardBackground, // Chart background start color
        backgroundGradientTo: colors.cardBackground,   // Chart background end color
        decimalPlaces: 1, // Number of decimal places for Y-axis labels (e.g., 3.5)
        color: (opacity = 1) => colors.primary, // Default color for lines, bars, dots
        labelColor: (opacity = 1) => colors.textSecondary, // Color for X and Y axis labels
        style: {
            borderRadius: 16 // Apply border radius to the chart container
        },
        propsForDots: { // Style properties for dots on the line chart
            r: "4", // Radius of the dots
            strokeWidth: "1", // Border width of the dots
            stroke: colors.primaryLight // Border color of the dots
        },
        propsForLabels: { // Style properties for chart labels
            fontSize: 10 // Font size for axis labels
        },
        propsForBackgroundLines: { // Style properties for background grid lines
            stroke: colors.lightBorder, // Color of the grid lines
            strokeDasharray: '' // Make lines solid (no dashes)
        },
    }), []); // Empty dependency array - these values don't change

    // Theme object for react-native-calendars
    const calendarTheme = useMemo(() => ({
        backgroundColor: colors.cardBackground, // Background of the calendar component itself
        calendarBackground: colors.cardBackground, // Background of the actual month view area
        textSectionTitleColor: colors.textSecondary, // Color for day names (Mon, Tue, etc.)
        selectedDayBackgroundColor: colors.primary, // Background color of a selected day
        selectedDayTextColor: colors.white, // Text color of a selected day
        todayTextColor: colors.primary, // Text color of the current day
        dayTextColor: colors.textDark, // Text color for regular days
        textDisabledColor: colors.lightBorder, // Text color for days outside the current month
        dotColor: colors.primary, // Default color for marking dots (overridden by markedDates)
        selectedDotColor: colors.white, // Color of the dot on a selected day
        arrowColor: colors.primary, // Color of the month navigation arrows
        monthTextColor: colors.textDark, // Color of the month/year title
        indicatorColor: colors.primary, // Color for loading indicator (if applicable)
        textDayFontWeight: '300',
        textMonthFontWeight: 'bold',
        textDayHeaderFontWeight: '300',
        textDayFontSize: 14,
        textMonthFontSize: 16,
        textDayHeaderFontSize: 14,
        // Custom style for the week row (day names) if needed
        'stylesheet.calendar.header': {
            week: {
                marginTop: 5,
                flexDirection: 'row',
                justifyContent: 'space-around'
            }
        }
    }), []); // Empty dependency array - these values don't change


    // --- Render Loading/Error/Content ---
    const renderContent = () => {
        // Determine overall loading state
        const isLoading = loading || loadingActivities || reminderLoading;
        // Select current data source
        const currentMoodHistory = USE_DEMO_DATA ? demoMoodHistory : moodHistory;
        const currentActivityHistory = USE_DEMO_DATA ? demoActivityHistory : activityHistory;

        // --- Loading State ---
        if (isLoading) {
            return <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />;
        }

        // --- Error State (only show if not using demo data) ---
        if (error && !USE_DEMO_DATA) {
            return <Text style={styles.errorText}>{error}</Text>;
        }

        // --- Empty State (show if not using demo data and no history exists) ---
        if (currentMoodHistory.length === 0 && currentActivityHistory.length === 0 && !USE_DEMO_DATA && !error) {
             // Added !error check to avoid showing this when an error message is already present
            return (
                <View style={styles.emptyStateContainer}>
                     <Icon name="cloud-offline-outline" size={60} color={colors.textSecondary} />
                     <Text style={styles.infoText}>No data yet!</Text>
                     <Text style={styles.infoText}>Start tracking your mood and activities to see your journey unfold here.</Text>
                     {/* Optional: Add a button to navigate to the tracking screen */}
                     {/* <TouchableOpacity onPress={() => navigation.navigate('TrackMood')} style={styles.trackButton}>
                         <Text style={styles.trackButtonText}>Log First Entry</Text>
                     </TouchableOpacity> */}
                </View>
            );
        }

        // --- Content Rendering ---
        return (
            <>
                {/* --- Mood Analytics Section --- */}
                {/* Show analytics only if there's mood data */}
                {currentMoodHistory.length > 0 ? (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Mood Analytics</Text>
                        {/* Time Range Selector (Daily/Weekly/Monthly) */}
                        <View style={styles.timeRangeSelector}>
                            {['Daily', 'Weekly', 'Monthly'].map(range => (
                                <TouchableOpacity
                                    key={range}
                                    style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
                                    onPress={() => setTimeRange(range)} // Update state on press
                                >
                                    <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>{range}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Line Chart (Mood Trend) */}
                        {chartData?.lineChartData ? (
                            <>
                                <Text style={styles.chartTitle}>Mood Trend ({timeRange})</Text>
                                <LineChart
                                    data={chartData.lineChartData}
                                    width={screenWidth - 60} // Adjust width based on screen size and padding
                                    height={220}
                                    chartConfig={chartConfig} // Use memoized config
                                    bezier // Smooth line curves
                                    style={styles.chartStyle}
                                    fromZero // Ensure Y-axis starts at 0
                                    yLabelsOffset={5} // Padding for Y-axis labels
                                />
                            </>
                        ) : (
                            // Message if no data for the selected line chart range
                            <Text style={styles.infoText}>Not enough data to display a {timeRange.toLowerCase()} trend.</Text>
                        )}

                        {/* Pie Chart (Overall Mood Distribution) */}
                        {chartData?.pieChartData && chartData.pieChartData.length > 0 ? (
                             <>
                                <Text style={styles.chartTitle}>Overall Mood Distribution</Text>
                                <PieChart
                                    data={chartData.pieChartData}
                                    width={screenWidth - 60} // Adjust width
                                    height={200}
                                    chartConfig={chartConfig} // Use memoized config
                                    accessor={"population"} // Key in data array holding the value
                                    backgroundColor={colors.transparent} // Make background transparent
                                    paddingLeft={"15"} // Adjust padding if needed
                                    // 'absolute' shows actual values, remove for percentages
                                    // absolute
                                    style={styles.chartStyle}
                                />
                             </>
                        ) : (
                            // Message if no data for the pie chart
                            <Text style={styles.infoText}>Log your mood more to see the overall distribution.</Text>
                        )}
                    </View>
                ) : (
                    // Card shown if no mood data exists at all
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Mood Analytics</Text>
                        <Icon name="bar-chart-outline" size={24} color={colors.primary} style={styles.sectionIcon}/>
                        <Text style={styles.infoText}>Log your mood entries to see analytics and trends here.</Text>
                    </View>
                )}

                {/* --- AI Insights Section --- */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Insights & Tips (Last 7 Days)</Text>
                    <Icon name="sparkles-outline" size={24} color={colors.primary} style={styles.sectionIcon}/>
                    {/* Show loader while fetching */}
                    {isFetchingInsight ? (
                        <ActivityIndicator size="small" color={colors.primary} style={styles.insightLoader}/>
                    ) : insightError ? (
                        // Show error message if fetching failed
                        <Text style={styles.insightErrorText}>{insightError}</Text>
                    ) : (
                        // Show the fetched insight or a default message
                        <Text style={styles.insightText}>{aiInsight || "Insights based on your recent mood logs will appear here."}</Text>
                    )}
                    {/* Refresh button (only show if not fetching and there's data) */}
                    {!isFetchingInsight && currentMoodHistory.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                console.log("Manual insight refresh triggered.");
                                setInsightFetched(false); // Allow refetch
                                fetchAiInsight(currentMoodHistory); // Fetch insight again
                            }}
                            style={styles.refreshButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Increase tappable area
                        >
                            <Icon name="refresh-outline" size={18} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* --- Timeline Section --- */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Timeline (Last 7 Days)</Text>
                    <Icon name="git-compare-outline" size={24} color={colors.featureGreen} style={styles.sectionIcon}/>
                    {/* Check if timelineData exists and has entries */}
                    {timelineData && Array.isArray(timelineData) && timelineData.length > 0 ? (
                        <View style={styles.timelineContainer}>
                            {/* Map through the timeline days */}
                            {timelineData.map((dayData) => (
                                <View key={dayData.date} style={styles.timelineItem}>
                                    {/* Date Label */}
                                    <Text style={styles.timelineDate}>
                                        {new Date(dayData.date + 'T00:00:00') // Add time to avoid timezone issues
                                            .toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </Text>
                                    {/* Mood Dot and Activity Icons */}
                                    <View style={styles.timelineContent}>
                                        {/* Predominant Mood Dot */}
                                        <View style={[
                                            styles.timelineMoodDot,
                                            // Use mood color or neutral grey if no mood logged
                                            { backgroundColor: getMoodColor(dayData.predominantMood) }
                                        ]} />
                                        {/* Activity Icons */}
                                        <View style={styles.timelineActivities}>
                                            {dayData.activities.map((activity, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.activityIconTouchable}
                                                    // Show details on press (example using Alert)
                                                    onPress={() => Alert.alert(
                                                        activity.type,
                                                        `${USE_DEMO_DATA ? 'Demo' : 'Logged'} ${activity.type} on ${dayData.date}.${activity.data?.duration ? ` Duration: ${activity.data.duration} hrs.` : ''}`
                                                    )}
                                                >
                                                    <Icon name={activity.icon} size={18} color={activity.color} />
                                                </TouchableOpacity>
                                            ))}
                                            {/* Placeholder if no activities logged */}
                                            {dayData.activities.length === 0 && <Text style={styles.noActivityText}>-</Text>}
                                        </View>
                                    </View>
                                </View>
                            ))}
                            {/* Correlation text at the bottom */}
                            <Text style={styles.correlationText}>See how your activities and mood align over time.</Text>
                        </View>
                    ) : (
                        // Message if no data for the timeline
                        <Text style={styles.infoText}>Log your moods and activities to build your timeline.</Text>
                    )}
                </View>

                {/* --- Calendar Section --- */}
                {/* Show calendar only if there's mood data to mark */}
                {currentMoodHistory.length > 0 ? (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Mood Calendar</Text>
                        <Icon name="calendar-outline" size={24} color={colors.featureBlue} style={styles.sectionIcon}/>
                        <Calendar
                            // Use a dynamic key based on current date to force re-render if needed
                            // (though markedDates dependency should handle updates)
                            key={formatDateISO(new Date())}
                            current={formatDateISO(new Date())} // Start calendar on current month
                            onDayPress={onDayPress} // Handle day tap
                            markedDates={markedDates} // Use memoized markings
                            markingType={'dot'} // Use dots for marking
                            monthFormat={'yyyy MMMM'} // Format for month title
                            theme={calendarTheme} // Use memoized theme
                            style={styles.calendarStyle}
                            // Optional: Add min/max date constraints if needed
                            // minDate={'2023-01-01'}
                            // maxDate={formatDateISO(new Date())}
                        />
                        <Text style={styles.infoText}>Tap a day with a dot to see logged entries.</Text>
                    </View>
                ) : (
                     // Card shown if no mood data exists for the calendar
                     <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Mood Calendar</Text>
                        <Icon name="calendar-outline" size={24} color={colors.featureBlue} style={styles.sectionIcon}/>
                        <Text style={styles.infoText}>Log your mood to see entries marked on the calendar.</Text>
                    </View>
                )}

                {/* --- Progress Section (Simple Stats) --- */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Tracking Progress</Text>
                    <Icon name="trending-up-outline" size={24} color={colors.featureGreen} style={styles.sectionIcon}/>
                    {/* Show mood count if available */}
                    <Text style={styles.placeholderText}>
                        {currentMoodHistory.length > 0
                            ? `You've logged your mood ${currentMoodHistory.length} time${currentMoodHistory.length > 1 ? 's' : ''}! Keep it up! ✨`
                            : "Start logging your mood to track progress."}
                    </Text>
                    {/* Show activity count if available */}
                    {/* TODO: Update this when activity fetching is implemented */}
                    <Text style={styles.placeholderText}>
                        {currentActivityHistory.length > 0
                            ? `You've logged ${currentActivityHistory.length} activit${currentActivityHistory.length > 1 ? 'ies' : 'y'}.`
                            : "Log activities like sleep or exercise too!"}
                    </Text>
                </View>

                {/* --- Reminders Section --- */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Daily Reminder</Text>
                    <Icon name="alarm-outline" size={24} color={colors.featureBlue} style={styles.sectionIcon}/>
                    <Text style={styles.reminderInfoText}>Set a time for a daily notification to check in with your mood.</Text>

                    {/* Button to open time picker */}
                    <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => setShowTimePicker(true)} // Show picker on press
                        disabled={reminderLoading} // Disable while loading
                    >
                        <Text style={styles.timePickerButtonText}>Selected Time: {formatTime(reminderTime)}</Text>
                        <Icon name="time-outline" size={18} color={colors.primary} style={{marginLeft: 8}}/>
                    </TouchableOpacity>

                    {/* Time Picker Component (conditionally rendered) */}
                    {showTimePicker && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={reminderTime} // Current selected time
                            mode="time" // Show time picker interface
                            is24Hour={false} // Use AM/PM format
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'} // iOS style preference
                            onChange={onTimeChange} // Handle time changes
                            // Optional: Minimum/Maximum time constraints
                            // minimumDate={new Date(2000, 0, 1, 5, 0)} // e.g., min 5:00 AM
                            // maximumDate={new Date(2000, 0, 1, 23, 0)} // e.g., max 11:00 PM
                        />
                    )}
                     {/* iOS Specific: Add a "Done" button if picker is visible */}
                     {showTimePicker && Platform.OS === 'ios' && (
                        <TouchableOpacity
                            style={styles.iosPickerDoneButton}
                            onPress={() => setShowTimePicker(false)}
                        >
                            <Text style={styles.iosPickerDoneButtonText}>Done</Text>
                        </TouchableOpacity>
                    )}


                    {/* Set/Update and Cancel Buttons */}
                    <View style={styles.reminderButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.reminderActionButton, styles.setButton]}
                            onPress={handleSetReminder}
                            disabled={reminderLoading} // Disable while loading
                        >
                            <Text style={styles.reminderActionButtonText}>{isReminderSet ? 'Update Time' : 'Set Reminder'}</Text>
                        </TouchableOpacity>
                        {/* Show Cancel button only if a reminder is set */}
                        {isReminderSet && (
                            <TouchableOpacity
                                style={[styles.reminderActionButton, styles.cancelButton]}
                                onPress={handleCancelReminder}
                                disabled={reminderLoading} // Disable while loading
                            >
                                <Text style={styles.reminderActionButtonText}>Cancel Reminder</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Loading indicator for reminder actions */}
                    {reminderLoading && <ActivityIndicator size="small" color={colors.primary} style={{marginTop: 10}}/>}

                    {/* Status text showing if reminder is set */}
                    {isReminderSet && !reminderLoading && (
                        <Text style={styles.reminderSetText}>Reminder is active for {formatTime(reminderTime)} daily.</Text>
                    )}
                     {!isReminderSet && !reminderLoading && (
                        <Text style={styles.reminderSetText}>Reminder is currently off.</Text>
                    )}
                </View>
            </>
        );
    };


    // --- Final Render of the Screen ---
    return (
        // Use LinearGradient for background
        <LinearGradient colors={[colors.backgroundTop, colors.backgroundBottom]} style={styles.container}>
            {/* ScrollView to contain all content */}
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false} // Hide scrollbar
            >
                {/* Screen Title */}
                <Text style={styles.screenTitle}>Your Mood Journey</Text>

                {/* Render loading, error, or main content */}
                {renderContent()}

            </ScrollView>

            {/* --- Modal for Calendar Day Details --- */}
             <Modal
                 animationType="fade" // How the modal appears
                 transparent={true} // Allows underlying screen to be partially visible
                 visible={isModalVisible} // Controlled by state
                 onRequestClose={() => setIsModalVisible(false)} // Android back button behavior
             >
                 {/* Overlay to dim the background */}
                 <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
                     {/* Modal Content Box (use Pressable to prevent closing when tapping inside) */}
                     <Pressable style={styles.modalContent} onPress={() => { /* Do nothing, prevents closing */ }}>
                         {/* Modal Title */}
                         <Text style={styles.modalTitle}>
                             Entries for {selectedDateData?.date
                                ? new Date(selectedDateData.date + 'T00:00:00') // Add time part
                                    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                : 'Selected Day'}
                         </Text>
                         {/* Scrollable list for entries */}
                         <ScrollView style={styles.modalScroll}>
                             {selectedDateData?.entries.map((entry, index) => (
                                 <View key={entry.id || index} style={styles.modalEntry}>
                                     {/* Mood Icon, Name, and Time */}
                                     <View style={styles.modalMoodHeader}>
                                         {/* Left side: Dot and Mood */}
                                         <View style={styles.modalMoodInfo}>
                                             <View style={[styles.moodDot, { backgroundColor: getMoodColor(entry.mood)}]} />
                                             <Text style={styles.modalMoodText} numberOfLines={1} ellipsizeMode='tail'>
                                                 {entry.mood || 'Unknown Mood'}
                                             </Text>
                                         </View>
                                         {/* Right side: Timestamp */}
                                         <Text style={styles.modalTimestampText}>
                                             ({entry.timestamp instanceof Date ? formatTime(entry.timestamp) : 'Invalid time'})
                                         </Text>
                                     </View>
                                     {/* Mood Note (if available) */}
                                     {entry.note ? (
                                         <Text style={styles.modalNoteText}>{entry.note}</Text>
                                     ) : (
                                         <Text style={styles.modalNoteTextMuted}>No note added for this entry.</Text>
                                     )}
                                 </View>
                             ))}
                              {/* Message if no entries (shouldn't happen if modal logic is correct, but good fallback) */}
                              {(!selectedDateData || !selectedDateData.entries || selectedDateData.entries.length === 0) && (
                                  <Text style={styles.modalNoteTextMuted}>No mood entries found for this day.</Text>
                              )}
                         </ScrollView>
                         {/* Close Button */}
                         <TouchableOpacity style={styles.closeButton} onPress={() => setIsModalVisible(false)}>
                             <Text style={styles.closeButtonText}>Close</Text>
                         </TouchableOpacity>
                     </Pressable>
                 </Pressable>
             </Modal>
        </LinearGradient>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1, // Take up full screen
    },
    scrollContainer: {
        padding: 20, // Padding around content
        paddingBottom: 50, // Extra padding at bottom
    },
    screenTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 25,
        textAlign: 'center',
    },
    loader: {
        marginTop: '50%', // Center vertically roughly
        marginBottom: 20,
        alignSelf: 'center',
    },
    errorText: {
        color: colors.errorRed,
        textAlign: 'center',
        marginTop: 30,
        fontSize: 16,
        paddingHorizontal: 20,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: '30%', // Adjust as needed
        paddingHorizontal: 30,
    },
    infoText: {
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 15,
        fontSize: 14,
        lineHeight: 20, // Improved readability
        paddingHorizontal: 10,
    },
    sectionCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 15,
        marginBottom: 20,
        // Subtle shadow for depth
        borderWidth: Platform.OS === 'android' ? 0 : 1, // Border for iOS fallback if shadow weak
        borderColor: colors.lightBorder,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.10,
        shadowRadius: 2.22,
        elevation: 0, // Android shadow
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600', // Semi-bold
        color: colors.textDark,
        marginBottom: 15,
    },
    sectionIcon: {
        position: 'absolute',
        top: 15,
        right: 15,
        opacity: 0.6, // Make icon slightly subtle
    },
    placeholderText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginTop: 5,
    },
    // --- Insight Styles ---
    insightLoader: {
        marginVertical: 10,
        alignSelf: 'center',
    },
    insightErrorText: {
        fontSize: 14,
        color: colors.errorRed,
        lineHeight: 20,
        fontStyle: 'italic',
        textAlign:'center',
        paddingHorizontal: 10,
    },
    insightText: {
        fontSize: 14,
        color: colors.textDark,
        lineHeight: 21, // Good spacing for readability
        paddingRight: 30, // Space for refresh icon
        textAlign: 'left', // Align text naturally
    },
    refreshButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        padding: 5, // Make tap area slightly larger if needed via hitSlop
    },
    // --- Chart Styles ---
    chartTitle: {
        fontSize: 15,
        fontWeight: '500', // Medium weight
        color: colors.textDark,
        marginBottom: 5,
        marginLeft: 5, // Align with chart padding
        marginTop: 10,
    },
    chartStyle: {
        marginVertical: 8,
        borderRadius: 16, // Match card radius
    },
    timeRangeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginBottom: 15,
        backgroundColor: colors.backgroundTop, // Subtle background
        borderRadius: 20, // Pill shape
        padding: 4,
        alignSelf: 'center', // Center the selector
    },
    timeRangeButton: {
        paddingVertical: 6,
        paddingHorizontal: 15,
        borderRadius: 16, // Rounded buttons
    },
    timeRangeButtonActive: {
        backgroundColor: colors.primary, // Highlight active button
    },
    timeRangeText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    timeRangeTextActive: {
        color: colors.white, // White text on active button
    },
    // --- Timeline Styles ---
    timelineContainer: {
        marginTop: 10,
    },
    timelineItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightBorder,
    },
    timelineDate: {
        fontSize: 12,
        color: colors.textSecondary,
        fontWeight: '500',
        width: 80, // Fixed width for alignment
        textAlign: 'left',
        marginRight: 5,
    },
    timelineContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, // Take remaining space
        marginLeft: 5,
    },
    timelineMoodDot: {
        width: 12,
        height: 12,
        borderRadius: 6, // Perfect circle
        marginRight: 10,
        borderWidth: 1,
        borderColor: colors.lightBorder, // Subtle border
    },
    timelineActivities: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, // Take remaining space in content row
        flexWrap: 'wrap', // Allow icons to wrap if many
    },
    activityIconTouchable: {
        marginLeft: 8, // Spacing between icons
        padding: 2, // Increase touch area slightly
    },
    noActivityText: {
        fontSize: 14,
        color: colors.textLight, // Very subtle text
        marginLeft: 8,
        fontStyle: 'italic',
    },
    correlationText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontStyle: 'italic',
        marginTop: 15,
        textAlign: 'center',
        lineHeight: 18,
    },
    // --- Calendar Styles ---
    calendarStyle: {
        borderWidth: 1,
        borderColor: colors.lightBorder,
        borderRadius: 8,
        // Add padding if needed inside the calendar border
        // paddingBottom: 10,
    },
    // --- Reminder Styles ---
    reminderInfoText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 15,
        lineHeight: 20,
    },
    timePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.backgroundTop, // Subtle background
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.lightBorder,
        marginBottom: 20,
        justifyContent: 'space-between', // Push text and icon apart
    },
    timePickerButtonText: {
        fontSize: 15,
        color: colors.textDark,
    },
     iosPickerDoneButton: {
        alignSelf: 'flex-end', // Position to the right
        paddingVertical: 8,
        paddingHorizontal: 15,
        marginTop: -10, // Adjust position relative to the picker
        marginBottom: 10,
    },
    iosPickerDoneButtonText: {
        color: colors.primary, // Use theme color for "Done"
        fontSize: 16,
        fontWeight: '600',
    },
    reminderButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly', // Space out buttons
        marginBottom: 10,
        flexWrap: 'wrap', // Allow buttons to wrap on smaller screens
    },
    reminderActionButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20, // Pill shape buttons
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 120, // Ensure buttons have decent width
        marginVertical: 5, // Add vertical space when wrapping
    },
    setButton: {
        backgroundColor: colors.primary,
        marginRight: 5, // Space between buttons
        marginLeft: 5,
    },
    cancelButton: {
        backgroundColor: colors.errorRed,
        marginRight: 5,
        marginLeft: 5,
    },
    reminderActionButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 14,
    },
    reminderSetText: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 10,
        fontStyle: 'italic',
    },
    // --- Modal Styles ---
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)', // Semi-transparent black background
    },
    modalContent: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 20,
        width: '85%', // Modal width relative to screen
        maxHeight: '70%', // Limit modal height
        alignItems: 'center',
        // Shadow for modal
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 0, // Android shadow
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textDark,
        marginBottom: 15,
        textAlign: 'center',
    },
    modalScroll: {
        width: '100%', // Ensure scrollview takes full width of modal content
        marginBottom: 15,
    },
    modalEntry: {
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightBorder,
        paddingBottom: 12,
        width: '100%',
    },
    modalMoodHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        justifyContent: 'space-between', // Push mood info and time apart
        width: '100%',
    },
    modalMoodInfo: { // Container for dot and mood text
        flexDirection: 'row',
        alignItems: 'center',
        flexShrink: 1, // Allow this part to shrink if needed
        marginRight: 10, // Space before timestamp
    },
    moodDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    modalMoodText: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textDark,
        flexShrink: 1, // Allow text to shrink and wrap/ellipsize
    },
    modalTimestampText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'right', // Align time to the right
        marginLeft: 'auto', // Push to the far right
        flexShrink: 0, // Prevent timestamp from shrinking
    },
    modalNoteText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 4,
        paddingLeft: 18, // Indent note under the mood dot
        width: '100%', // Ensure text wraps correctly
        lineHeight: 19,
    },
    modalNoteTextMuted: {
        fontSize: 14,
        color: colors.textLight, // Lighter color for placeholder
        fontStyle: 'italic',
        marginTop: 4,
        paddingLeft: 18, // Indent note under the mood dot
        width: '100%',
    },
    closeButton: {
        backgroundColor: colors.primary,
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 20,
        marginTop: 10, // Space above the button
    },
    closeButtonText: {
        color: colors.white,
        fontWeight: '600',
        fontSize: 15,
    },
});

export default MoodTrackerScreen;
