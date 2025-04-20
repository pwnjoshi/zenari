/**
 * MoodTrackerScreen.js
 * FINAL VERSION - Updated Apr 20, 2025
 * - Fixed automatic AI insight refresh loop by correcting useCallback dependencies.
 * - Integrated NEW Calming Color Scheme (COLORS constant).
 * - Removed old color imports and defaultColors/safeColors logic.
 * - Updated getMoodColor to use new COLORS scheme.
 * - Updated chartConfig, calendarTheme, and StyleSheet to use new COLORS.
 * - Mapped timeline activity icons to new COLORS.
 * - Fixed AI Insight API Key usage (imports from @env).
 * - Added validation check for the imported API key.
 * - Pie Chart now reflects the selected time range (Daily, Weekly, Monthly).
 * - Includes detailed logging for diagnosing data loading issues.
 * - Corrected startDate calculation for 'Daily' chart view.
 * - Refined 'Daily' Line Chart to show individual entries.
 * - Added dynamic keys to charts for forced re-renders.
 * - Added 'No Data' message for Pie Chart.
 * - Fixed "Invalid hook call" error by moving formatTime (useCallback) inside the component.
 * - ***FIXED CHART RESPONSIVENESS (Apr 20): Adjusted chart width calculation based on container padding. Removed fixed PieChart paddingLeft. Removed LineChart yLabelsOffset.***
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

// --- NEW COLOR SCHEME ---
const COLORS = {
    background: '#F4F8F7', // Very light, slightly cool grey
    primary: '#6AB7A8',     // Muted Teal/Turquoise
    primaryLight: '#A8D8CF', // Lighter Teal
    secondary: '#F7D9AE',    // Soft Peach/Orange Accent
    secondaryLight: '#FBEFDD', // Very Light Peach
    accent: '#A8A6CE',      // Muted Lavender (Used for prompts/accents)
    accentLight: '#DCDAF8', // Very Light Lavender

    text: '#3A506B',        // Dark Slate Blue (Good contrast)
    textSecondary: '#6B819E', // Medium Slate Blue
    lightText: '#A3B1C6',    // Light Slate Blue (Placeholders)
    white: '#FFFFFF',
    cardBackground: '#FFFFFF',
    border: '#D8E2EB',        // Light Grey-Blue Border
    error: '#E57373',         // Soft Red
    disabled: '#B0BEC5',       // Blue Grey (Standard disabled)

    // Mood Specific Colors (Updated)
    happy: '#FFD166',        // Sunny Yellow ('Very Happy', 'Excited')
    sad: '#90BDE1',          // Soft Blue ('Sad')
    calm: '#6AB7A8',         // Primary Teal ('Stable/Calm')
    neutral: '#B0BEC5',       // Disabled/Neutral Grey (Default)
    anxious: '#F7A072',       // Warmer Orange ('Worried') // Consider mapping 'Worried' here
    stressed: '#A8A6CE',      // Accent Lavender // Consider mapping 'Worried' or a new mood here
    grateful: '#FFC46B',      // Golden Yellow // If 'Grateful' mood is added

    // Activity Specific Colors (Mapped to new scheme)
    sleepColor: '#90BDE1', // Soft Blue (like sad)
    exerciseColor: '#6AB7A8', // Primary Teal (like calm)
    socialColor: '#F7D9AE', // Soft Peach (Secondary)

    tagBackground: '#E6F4F1',        // Light Teal Background for Tags
    suggestionBackground: '#FBEFDD',  // Light Peach Background for Suggestions

    recording: '#E57373',         // Error color for recording indication
    playButton: '#6AB7A8',        // Primary Teal for play button
    deleteButton: '#B0BEC5',     // Subtle Grey for delete icon (less alarming)
    transparent: 'transparent', // Keep transparent
};
// -----------------------

// --- IMPORT API KEY ---
import { GEMINI_API_KEY } from '@env'; // Import the key from .env
// --------------------


// Optional Calendar Configuration
// LocaleConfig.locales['en'] = LocaleConfig.locales[''];
// LocaleConfig.defaultLocale = 'en';

const { width: screenWidth } = Dimensions.get('window');
// --- Calculate Chart Width based on screen and padding ---
// Screen padding (20*2=40) + Card padding (15*2=30) = 70 total horizontal padding
const chartWidth = screenWidth - 70;
// -----------------------------------------------------


// --- Helper Functions (Using new COLORS) ---
const getMoodValue = (moodLabel) => {
    // Assigns a numerical value to each mood for charting
    switch (moodLabel?.toLowerCase()) {
        case 'very happy': return 5;
        case 'excited': return 4;
        case 'stable/calm': return 3;
        case 'worried': return 2; // Consider mapping to anxious/stressed values if needed
        case 'sad': return 1;
        default: return 0; // Default for unknown/null moods
    }
};

const getMoodColor = (moodLabel) => {
    // Assigns a specific color from the new COLORS scheme
    switch (moodLabel?.toLowerCase()) {
        case 'very happy': return COLORS.happy; // Sunny Yellow
        case 'excited': return COLORS.secondary; // Soft Peach/Orange Accent (Differentiate from Very Happy)
        case 'stable/calm': return COLORS.calm; // Primary Teal
        case 'sad': return COLORS.sad; // Soft Blue
        case 'worried': return COLORS.anxious; // Warmer Orange
        // Add other moods here if needed (e.g., grateful, stressed)
        // case 'grateful': return COLORS.grateful;
        // case 'stressed': return COLORS.stressed;
        default: return COLORS.neutral; // Neutral Grey for unknown/null moods
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
        { id: 'm1', mood: 'Stable/Calm', timestamp: new Date(new Date(baseDate).setHours(9, 15, 0, 0)), note: 'Feeling okay.' }, // Today 9:15 AM
        { id: 'm11', mood: 'Very Happy', timestamp: new Date(new Date(baseDate).setHours(14, 30, 0, 0)), note: 'Good lunch!' }, // Today 2:30 PM
        { id: 'm2', mood: 'Very Happy', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)), note: 'Great day!' },
        { id: 'm12', mood: 'Excited', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)) },
        { id: 'm3', mood: 'Worried', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 2)), note: 'Stressful.' },
        { id: 'm4', mood: 'Stable/Calm', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 3)) },
        { id: 'm5', mood: 'Sad', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 4)), note: 'Missing friends.' },
        { id: 'm6', mood: 'Excited', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 5)), note: 'Weekend plans!' },
        { id: 'm7', mood: 'Stable/Calm', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 6)) },
        { id: 'm8', mood: 'Very Happy', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 7)), note: 'Productive.' },
        { id: 'm9', mood: 'Worried', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 10)) },
        { id: 'm10', mood: 'Stable/Calm', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 15)) },
    ];

    // --- Demo Activities ---
    const demoActivities = [
        { id: 'a1', type: 'Sleep', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)), duration: 7.5 },
        { id: 'a2', type: 'Exercise', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)), duration: 1 },
        { id: 'a3', type: 'Social', timestamp: new Date(new Date(baseDate).setHours(18, 0, 0, 0)), duration: 2 }, // Today 6:00 PM
        { id: 'a4', type: 'Sleep', timestamp: new Date(new Date(baseDate).setHours(7, 0, 0, 0)), duration: 8 }, // Today 7:00 AM
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
    const USE_DEMO_DATA = true; // <<<<----- CHANGE THIS TO false TO USE FIRESTORE
    // ---------------------------

    // <<< FIX: Moved formatTime inside the component body >>>
    // Format Date object to a readable time string (e.g., "9:00 AM")
    // Used for Daily chart labels and Modal timestamps
    const formatTime = useCallback((date) => {
        if (!(date instanceof Date) || isNaN(date)) return "Invalid Time";
        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    }, []);
    // <<< END FIX >>>

    // --- Memoized Demo Data ---
    // Only creates demo data if USE_DEMO_DATA is true, otherwise returns empty arrays
    const { demoMoodHistory, demoActivityHistory } = useMemo(() => {
        console.log("[DEBUG] Memoizing demo data. USE_DEMO_DATA:", USE_DEMO_DATA);
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

    // --- Function to Fetch AI Insight ---
    const fetchAiInsight = useCallback(async (fullHistory) => {
        const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

        // API Key Validation
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_REAL_GEMINI_API_KEY_HERE' || GEMINI_API_KEY.length < 10) {
            console.warn("AI Insight: GEMINI_API_KEY not configured or invalid in .env file. Skipping fetch.");
            setAiInsight("AI insights unavailable (API key missing or invalid).");
            setInsightError("API Key needed for insights.");
            setInsightFetched(true);
             // Ensure loading state is false if we return early
            if (isFetchingInsight) setIsFetchingInsight(false);
            return;
        }

        // Prevent concurrent fetches
        if (isFetchingInsight) {
            console.log("AI Insight: Fetch already in progress.");
            return;
        }

        // Filter history for the last 7 days
        const sevenDaysAgo = getDateNDaysAgo(6);
        const last7DaysHistory = fullHistory.filter(
            item => item.timestamp instanceof Date && item.timestamp >= sevenDaysAgo
        );

        if (!last7DaysHistory || last7DaysHistory.length === 0) {
            console.log("AI Insight: Not enough data in the last 7 days.");
            setAiInsight("Log mood consistently for 7-day insights!");
            setInsightError(null);
            setInsightFetched(true);
            return; // No need to fetch if no data
        }

        console.log(`Generating AI insight (7-day) using Gemini API...`);
        setIsFetchingInsight(true); // Set loading state HERE
        setInsightError(null);
        setAiInsight(''); // Clear previous insight

        try {
            // Prepare data summary
            const moodsLast7Days = last7DaysHistory.map(entry => entry.mood).join(', ');
            const moodCountsLast7Days = last7DaysHistory.reduce((acc, item) => {
                acc[item.mood] = (acc[item.mood] || 0) + 1;
                return acc;
            }, {});
            const frequentMoodLast7Days = Object.entries(moodCountsLast7Days).sort(([, a], [, b]) => b - a)[0]?.[0] || 'varied';

            // Construct prompt
            const prompt = `You are a gentle and calming wellness companion. Analyze the user's mood data from the past 7 days. Moods logged include: [${moodsLast7Days}]. The most frequent mood seems to be: ${frequentMoodLast7Days}. Based ONLY on this 7-day data, provide one *very short* (1-2 sentences MAX), sweet, positive, and encouraging insight or suggestion. Focus on simple encouragement or a small actionable tip related to the recent pattern. Be concise and warm.`;
            const requestBody = { contents: [{ parts: [{ text: prompt }] }] };

            // Make API call
            const response = await fetch(`${API_URL_BASE}?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            // Handle response
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = `AI Error: ${response.status}. ${errorData?.error?.message || 'No details available.'}`;
                console.error("AI Fetch Error:", errorMsg, errorData);
                throw new Error(errorMsg);
            }
            const data = await response.json();

            // Extract insight
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
            setIsFetchingInsight(false); // Set loading state false HERE
            setInsightFetched(true);
            console.log("AI Insight fetch finished.");
        }
        // --- CORRECTED DEPENDENCY ARRAY ---
        // Removed isFetchingInsight. Dependencies are stable setters or constants, so empty array is fine.
        // fetchAiInsight's reference will now be stable unless its definition changes.
    }, []); // <<<<----- CORRECTED DEPENDENCY ARRAY


    // --- Fetch Mood/Activity Data ---
    useEffect(() => {
        console.log("Data fetching useEffect triggered. User:", user?.uid, "USE_DEMO_DATA:", USE_DEMO_DATA);
        setLoading(true);
        setLoadingActivities(true);
        // Don't reset insightFetched here, let fetchAiInsight handle it
        // setInsightFetched(false);
        setError(null);

        // Determine which history to use
        const historyToAnalyze = USE_DEMO_DATA ? demoMoodHistory : moodHistory;

        // Use Demo Data
        if (USE_DEMO_DATA) {
            console.log("MoodTracker: Using DEMO data.");
            setMoodHistory(demoMoodHistory);
            setActivityHistory(demoActivityHistory);
            setLoading(false);
            setLoadingActivities(false);
            setError(null);
            if (demoMoodHistory.length > 0 && !insightFetched) { // Fetch only if not already fetched
                fetchAiInsight(demoMoodHistory);
            } else if (demoMoodHistory.length === 0) {
                setAiInsight("Using demo data. No mood entries to analyze.");
                setInsightFetched(true); // Mark as fetched (or attempted)
            }
            return () => { console.log("Cleanup: Demo mode.") };
        }

        // Use Firestore Data
        if (!user) {
            console.log("MoodTracker: No user logged in. Cannot fetch Firestore data.");
            setLoading(false);
            setLoadingActivities(false);
            setError("Please log in to see your mood history.");
            setMoodHistory([]);
            setActivityHistory([]);
            setAiInsight(''); // Clear insight if no user
            setInsightError(null);
            setInsightFetched(false); // Reset fetch status on logout
            return () => { console.log("Cleanup: No user.") };
        }

        console.log("MoodTracker: Setting up Firestore listeners for user:", user.uid);
        let isMounted = true;
        let initialFetchDone = false; // Flag to fetch insight only once on initial load

        // Firestore Listener for Mood History
        const unsubscribeMood = firestore()
            .collection('users')
            .doc(user.uid)
            .collection('moodHistory')
            .orderBy('timestamp', 'desc')
            .onSnapshot(querySnapshot => {
                if (!isMounted) return;
                console.log("[DEBUG] MoodTracker: Firestore snapshot received.");
                const history = [];
                querySnapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.timestamp && typeof data.timestamp.toDate === 'function') {
                        history.push({
                            id: doc.id,
                            ...data,
                            timestamp: data.timestamp.toDate()
                        });
                    } else {
                        console.warn("Invalid or missing timestamp in mood document:", doc.id, data);
                    }
                });
                console.log(`[DEBUG] MoodTracker: Processed ${history.length} mood entries. Setting state...`);

                // Check if history actually changed before triggering insight fetch
                // NOTE: This shallow comparison might not be sufficient for deep changes.
                // For simplicity, we'll fetch if it's the first load or if history length changes.
                // A more robust check would involve comparing IDs or timestamps.
                const historyChanged = !initialFetchDone || history.length !== moodHistory.length;

                setMoodHistory(history); // Update state
                console.log(`[DEBUG] MoodTracker: State update complete. Loading: false.`);
                setLoading(false); // Mood data loaded
                setError(null);

                // Fetch AI insight only on initial load with data or if data meaningfully changes
                // Avoid fetching on every minor snapshot update if data hasn't really changed.
                if (history.length > 0 && historyChanged) {
                    console.log("[DEBUG] History changed or initial load with data, fetching AI insight.");
                    fetchAiInsight(history);
                } else if (history.length === 0) {
                    setAiInsight("Track your mood to get personalized insights!");
                    setInsightFetched(true); // Mark as attempted even if no data
                }
                initialFetchDone = true; // Mark initial processing done

            }, err => {
                if (!isMounted) return;
                console.error("Firestore mood listener error:", err);
                setError("Failed to load mood history. Please check connection.");
                setLoading(false);
                setLoadingActivities(false); // Ensure all loading stops on error
                setMoodHistory([]);
                setActivityHistory([]); // Clear activity history too
                setAiInsight(''); // Clear insight on error
                setInsightError("Failed to load data for insights.");
                setInsightFetched(true); // Mark as attempted
            });

        // Placeholder for Activity History Fetch (runs once)
        const fetchActivities = async () => {
            if (!isMounted) return;
            console.log("Fetching activities (placeholder)...");
            setLoadingActivities(true);
            try {
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate delay
                if (isMounted) {
                    setActivityHistory([]); // Replace with actual Firestore fetch if needed
                    console.log("Placeholder activities 'fetched'.");
                }
            } catch (err) {
                console.error("Activity fetch error:", err);
                if (isMounted) {
                    setError(prevError => prevError || "Failed to load activity history.");
                }
            } finally {
                if (isMounted) {
                    setLoadingActivities(false);
                }
            }
        };
        fetchActivities();

        // Cleanup Function
        return () => {
            console.log("Cleanup: Unsubscribing Firestore listeners.");
            isMounted = false;
            unsubscribeMood();
        };
        // The main effect should only depend on user and USE_DEMO_DATA.
        // fetchAiInsight has a stable reference now due to useCallback([]).
        // moodHistory updates trigger the listener, which *conditionally* calls fetchAiInsight.
    }, [user, USE_DEMO_DATA, fetchAiInsight]); // Removed moodHistory, added fetchAiInsight (now stable)


    // --- Reminder Functions ---

    // Request permission
    const requestNotificationPermission = useCallback(async () => {
        let hasPermission = false;
        try {
            console.log("Requesting notification permission...");
            if (Platform.OS === 'ios') {
                const settings = await notifee.requestPermission();
                hasPermission = settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
                console.log("iOS Permission Status:", settings.authorizationStatus);
            } else if (Platform.OS === 'android') {
                if (Platform.Version >= 33) { // Android 13+ requires explicit permission
                    const settings = await notifee.requestPermission();
                    hasPermission = settings.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
                    console.log("Android 13+ Permission Status:", settings.authorizationStatus);
                } else { // Below Android 13, permission is granted by default at install time
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

    // Calculate next timestamp
    const calculateNextTimestamp = useCallback((selectedTime) => {
        const now = new Date();
        const targetTime = new Date();
        targetTime.setHours(selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);

        if (targetTime.getTime() <= now.getTime()) {
            // If the time has passed for today, schedule for tomorrow
            targetTime.setDate(targetTime.getDate() + 1);
            console.log("Reminder time is past for today, scheduling for tomorrow:", targetTime);
        } else {
             console.log("Scheduling reminder for today:", targetTime);
        }
        return targetTime.getTime();
    }, []);

    // Set reminder
    const handleSetReminder = useCallback(async () => {
        console.log("Attempting to set/update reminder...");
        setReminderLoading(true);

        const hasPermission = await requestNotificationPermission();
        if (!hasPermission) {
            console.log("Permission denied, cannot set reminder.");
            setReminderLoading(false);
            return;
        }

        try {
            // Cancel existing reminder first if one exists
            if (scheduledReminderId) {
                console.log("Cancelling existing reminder:", scheduledReminderId);
                await notifee.cancelNotification(scheduledReminderId).catch(e => {
                    // Warn but continue if cancellation fails (might be an old/invalid ID)
                    console.warn("Failed to cancel potentially old notification:", scheduledReminderId, e);
                });
            }

            // Create/Ensure notification channel exists (required for Android 8+)
            const channelId = await notifee.createChannel({
                id: 'mood-reminders',
                name: 'Daily Mood Reminders',
                importance: AndroidImportance.DEFAULT, // Adjust importance if needed
                sound: 'default',
            });
            console.log("Notification channel created/ensured:", channelId);

            // Calculate trigger timestamp
            const triggerTimestamp = calculateNextTimestamp(reminderTime);
            const trigger = {
                type: TriggerType.TIMESTAMP,
                timestamp: triggerTimestamp,
                repeatFrequency: RepeatFrequency.DAILY, // Repeat daily at the same time
                // alarmManager: { // More precise timing but needs SCHEDULE_EXACT_ALARM permission on Android 12+
                //    allowWhileIdle: true,
                // },
            };
            console.log("Calculated trigger timestamp:", triggerTimestamp, new Date(triggerTimestamp));

            // Define the notification details
            const notificationDetails = {
                // Use a consistent ID, possibly user-specific if needed
                id: 'daily-mood-reminder-' + (user?.uid || 'default'),
                title: 'Mood Check-in! ✨',
                body: `Time to log how you're feeling today. (${formatTime(reminderTime)})`,
                android: {
                    channelId: channelId,
                    pressAction: { id: 'default' }, // Opens the app on press
                    importance: AndroidImportance.DEFAULT,
                    // smallIcon: 'ic_notification', // Optional: specify custom small icon name (in android/app/src/main/res/drawable)
                },
                ios: {
                    sound: 'default',
                    // Specify category for actions if needed later
                }
            };

            // Schedule the notification
            console.log("Creating trigger notification...");
            const newReminderId = await notifee.createTriggerNotification(notificationDetails, trigger);
            console.log("Successfully created trigger notification with ID:", newReminderId);

            // Store reminder info persistently
            const timeString = `${reminderTime.getHours()}:${String(reminderTime.getMinutes()).padStart(2, '0')}`;
            await AsyncStorage.setItem(REMINDER_TIME_KEY, timeString);
            await AsyncStorage.setItem(REMINDER_ID_KEY, newReminderId);

            // Update State
            setScheduledReminderId(newReminderId);
            setIsReminderSet(true);

            Alert.alert("Reminder Set", `Your daily mood check-in reminder is set for ${formatTime(reminderTime)}.`);

        } catch (error) {
            console.error('Error setting reminder:', error);
            Alert.alert("Reminder Error", "Could not schedule the reminder. Please try again.");
             // Clean up state and storage on error if a previous ID existed
            if (scheduledReminderId) {
                await AsyncStorage.removeItem(REMINDER_ID_KEY);
                setScheduledReminderId(null);
                setIsReminderSet(false);
            }
        } finally {
            setReminderLoading(false);
        }
    }, [reminderTime, scheduledReminderId, requestNotificationPermission, calculateNextTimestamp, formatTime, user]);

    // Cancel reminder
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
                await AsyncStorage.removeItem(REMINDER_TIME_KEY); // Also clear the time

                // Update state
                setScheduledReminderId(null);
                setIsReminderSet(false);

                Alert.alert("Reminder Cancelled", "Your daily reminder has been turned off.");

            } catch (error) {
                console.error('Error cancelling reminder:', error);
                // Inform user, maybe the ID was invalid or already cancelled
                Alert.alert("Cancellation Error", "Could not cancel the reminder. It might have already been removed or an error occurred.");
            } finally {
                setReminderLoading(false);
            }
        } else {
            console.log("No scheduled reminder ID found to cancel.");
             // Ensure state and storage are clean even if no ID was in state
            if(isReminderSet) setIsReminderSet(false);
            await AsyncStorage.removeItem(REMINDER_ID_KEY);
            await AsyncStorage.removeItem(REMINDER_TIME_KEY);
            setReminderLoading(false);
            // Optional: Alert user that no reminder was active
            // Alert.alert("No Reminder", "There was no active reminder to cancel.");
        }
    }, [scheduledReminderId, isReminderSet]);

    // Time picker change handler
    const onTimeChange = useCallback((event, selectedDate) => {
        if (Platform.OS === 'android') {
            setShowTimePicker(false); // Hide picker after selection/cancellation on Android
        }
        if (event.type === 'set' && selectedDate) { // Check event type for confirmation
            console.log("Time selected:", selectedDate);
            setReminderTime(new Date(selectedDate)); // Update state with the new Date object
             // For iOS with spinner, user presses "Done" button separately handled below
        } else {
            console.log("Time picker cancelled or dismissed.");
             // For iOS with spinner, simply closing doesn't confirm, hide if needed
            // if (Platform.OS === 'ios') {
            //    setShowTimePicker(false);
            // }
        }
    }, []);


    // --- Memoized Chart Data Calculation (Using new COLORS) ---
    const chartData = useMemo(() => {
        console.log(`[DEBUG] Recalculating chart data for time range: ${timeRange}, Demo Mode: ${USE_DEMO_DATA}`);
        const currentMoodHistory = USE_DEMO_DATA ? demoMoodHistory : moodHistory;

        if (!currentMoodHistory || currentMoodHistory.length === 0) {
            console.log("Chart Data: No mood history available.");
            return { lineChartData: null, pieChartData: [] };
        }

        // Determine Date Range
        let startDate;
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999); // End of today

        switch (timeRange) {
            case 'Daily':
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0); // Start of today
                break;
            case 'Weekly':
                startDate = getDateNDaysAgo(6); // Today + 6 previous days
                break;
            case 'Monthly':
            default:
                startDate = getDateNDaysAgo(29); // Today + 29 previous days (30 days total)
                break;
        }
        console.log(`Chart Data: Filtering history between ${formatDateISO(startDate)} and ${formatDateISO(endDate)} (Range: ${timeRange})`);

        // Filter History for the selected time range
        const filteredHistory = currentMoodHistory.filter(item =>
            item.timestamp instanceof Date &&
            item.timestamp >= startDate &&
            item.timestamp <= endDate
        );
        console.log(`[DEBUG] Chart Data: Found ${filteredHistory.length} entries in the selected range (${timeRange}).`);

        // Initialize chart data variables
        let lineChartData = null;
        let pieChartData = [];

        // Calculate Line Chart Data
        if (filteredHistory.length > 0) {
            if (timeRange === 'Daily') {
                // Refined 'Daily' Line Chart Logic: Show individual entries sorted by time
                const dailyEntries = filteredHistory.sort((a, b) => a.timestamp - b.timestamp); // Already filtered for today
                console.log(`[DEBUG] Daily Chart: Found ${dailyEntries.length} entries for today.`);

                if (dailyEntries.length > 0) {
                    let labels = [];
                    let dataPoints = [];
                    if (dailyEntries.length === 1) {
                        // Show the single point clearly
                        labels = ['Start', formatTime(dailyEntries[0].timestamp), 'End']; // Pad labels
                        dataPoints = [0, getMoodValue(dailyEntries[0].mood), 0]; // Pad data
                        console.log(`[DEBUG] Daily Chart: Single entry logic. Labels: ${JSON.stringify(labels)}, Data: ${JSON.stringify(dataPoints)}`);
                    } else {
                        // Show multiple entries by time
                        labels = dailyEntries.map(entry => formatTime(entry.timestamp));
                        dataPoints = dailyEntries.map(entry => getMoodValue(entry.mood));
                        console.log(`[DEBUG] Daily Chart: Multiple entries logic. Labels: ${JSON.stringify(labels)}, Data: ${JSON.stringify(dataPoints)}`);
                    }
                     // Use primary color for the line
                    lineChartData = { labels, datasets: [{ data: dataPoints, color: (opacity = 1) => COLORS.primary, strokeWidth: 2 }] };
                } else {
                    console.log(`[DEBUG] Daily Chart: No entries found for today. lineChartData will be null.`);
                    lineChartData = null; // Explicitly set to null
                }

            } else { // Weekly or Monthly - Calculate Daily Averages
                const dailyAverages = {};
                filteredHistory.forEach(item => {
                    const dateStr = formatDateISO(item.timestamp);
                    const moodValue = getMoodValue(item.mood);
                    if (!dailyAverages[dateStr]) { dailyAverages[dateStr] = { totalValue: 0, count: 0 }; }
                    dailyAverages[dateStr].totalValue += moodValue;
                    dailyAverages[dateStr].count += 1;
                });

                const labels = [];
                const dataPoints = [];
                const tempDate = new Date(startDate);
                const rangeEndDate = new Date(endDate); // Use current end date
                let loopDayIndex = 0;
                // Determine number of days for loops based on range
                const daysInLoop = timeRange === 'Weekly' ? 7 : 30;

                while (tempDate <= rangeEndDate && loopDayIndex < daysInLoop) {
                    const dateStr = formatDateISO(tempDate);
                    const dayData = dailyAverages[dateStr];
                    let label = '';
                    // Use average value, default to 0 if no data for the day
                    const avgValue = dayData ? parseFloat((dayData.totalValue / dayData.count).toFixed(1)) : 0;

                    // Generate labels based on time range
                    if (timeRange === 'Weekly') {
                        label = tempDate.toLocaleDateString('en-US', { weekday: 'short' }); // e.g., 'Mon'
                        labels.push(label);
                        dataPoints.push(avgValue);
                    } else { // Monthly
                         // Calculate total days dynamically for Monthly labeling interval
                         const totalDaysInRange = Math.round((rangeEndDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
                        // Show fewer labels for Monthly view (e.g., every 5 days + start/end)
                        const labelInterval = Math.max(1, Math.floor(totalDaysInRange / 6)); // Aim for ~7 labels
                        if (loopDayIndex === 0 || (loopDayIndex === daysInLoop - 1) || loopDayIndex % labelInterval === 0) {
                             label = tempDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }); // e.g., '4/19'
                        } else {
                            label = ''; // Empty label for intermediate points
                        }
                        labels.push(label);
                        dataPoints.push(avgValue);
                    }
                    tempDate.setDate(tempDate.getDate() + 1);
                    loopDayIndex++;
                }

                if (labels.length > 0) {
                    lineChartData = { labels, datasets: [{ data: dataPoints, color: (opacity = 1) => COLORS.primary, strokeWidth: 2 }] };
                } else { lineChartData = null; }
                console.log(`[DEBUG] ${timeRange} Chart: Labels: ${labels.length}, DataPoints: ${dataPoints.length}`);
            }
        } else {
             console.log(`[DEBUG] ${timeRange} Chart: No entries found in the filtered range. lineChartData will be null.`);
             lineChartData = null; // No data in range
        }


        // Calculate Pie Chart Data (Using filteredHistory for the current time range)
        const moodCountsFiltered = filteredHistory.reduce((acc, item) => {
            if (item.mood) { acc[item.mood] = (acc[item.mood] || 0) + 1; }
            return acc;
        }, {});
        pieChartData = Object.entries(moodCountsFiltered)
            .map(([mood, count]) => ({
                name: mood,
                population: count,
                color: getMoodColor(mood), // Use updated getMoodColor
                legendFontColor: COLORS.text, // Use main text color for legend
                legendFontSize: 13
            }))
            .sort((a, b) => b.population - a.population); // Sort slices by count desc
        console.log(`[DEBUG] Final Pie Chart Data (${timeRange}):`, pieChartData.length > 0 ? `${pieChartData.length} slices` : 'No data in range');

        console.log(`[DEBUG] chartData useMemo finished. lineChartData: ${lineChartData ? 'Exists' : 'null'}, pieChartData items: ${pieChartData.length}`);
        return { lineChartData, pieChartData };

    }, [moodHistory, timeRange, USE_DEMO_DATA, demoMoodHistory, formatTime]); // formatTime is now dependency


    // --- Memoized Marked Dates for Calendar (Using new COLORS) ---
    const markedDates = useMemo(() => {
        console.log("Recalculating marked dates for calendar...");
        const currentMoodHistory = USE_DEMO_DATA ? demoMoodHistory : moodHistory;
        const markings = {};
        currentMoodHistory.forEach(item => {
            if (!(item.timestamp instanceof Date) || isNaN(item.timestamp)) return;
            const dateString = formatDateISO(item.timestamp);
            const existingMarking = markings[dateString];
            const newColor = getMoodColor(item.mood); // Use updated function
            const newMoodValue = getMoodValue(item.mood);

            // Logic to determine the dot color for the day:
            // Use the color of the mood with the highest value logged on that day.
            if (!existingMarking || (existingMarking.moodValue !== undefined && newMoodValue > existingMarking.moodValue)) {
                markings[dateString] = {
                    dotColor: newColor,
                    marked: true,
                    moodValue: newMoodValue // Store highest mood value found so far for comparison
                };
            }
        });
        console.log(`Marked dates calculated: ${Object.keys(markings).length} days marked.`);
        return markings;
    }, [moodHistory, USE_DEMO_DATA, demoMoodHistory]);


    // --- Memoized Timeline Data (Recent Days with Data) (Using new COLORS) ---
    const timelineData = useMemo(() => {
        console.log("Recalculating timeline data...");
        const currentMoodHistory = USE_DEMO_DATA ? demoMoodHistory : moodHistory;
        const currentActivityHistory = USE_DEMO_DATA ? demoActivityHistory : activityHistory;

        // Combine and sort all entries by timestamp
        const combinedHistory = [...currentMoodHistory, ...currentActivityHistory]
            .filter(item => item.timestamp instanceof Date && !isNaN(item.timestamp))
            .sort((a, b) => a.timestamp - b.timestamp); // Sort ascending for processing

        const days = {}; // Object to hold data grouped by date string 'YYYY-MM-DD'

        // Group entries by day
        combinedHistory.forEach(item => {
            const dateStr = formatDateISO(item.timestamp);
            if (!days[dateStr]) {
                days[dateStr] = { moods: [], activities: [] };
            }
            if (item.mood) { // It's a mood entry
                days[dateStr].moods.push(item);
            } else if (item.type) { // It's an activity entry
                let activityEntry = null;
                // Map activity types to icons and new COLORS
                switch (item.type.toLowerCase()) {
                    case 'sleep':
                        activityEntry = { type: 'Sleep', icon: 'bed-outline', color: COLORS.sleepColor, data: item };
                        break;
                    case 'exercise':
                        activityEntry = { type: 'Exercise', icon: 'barbell-outline', color: COLORS.exerciseColor, data: item };
                        break;
                    case 'social':
                        activityEntry = { type: 'Social', icon: 'people-outline', color: COLORS.socialColor, data: item };
                        break;
                    default:
                        console.warn("Unknown activity type for timeline:", item.type);
                        break;
                }
                if (activityEntry) {
                    days[dateStr].activities.push(activityEntry);
                }
            }
        });

        // Process each day: find predominant mood and unique activities
        Object.keys(days).forEach(dateStr => {
            // Determine predominant mood for the day (most frequent, tie-break with higher mood value)
            if (days[dateStr].moods.length > 0) {
                const moodCounts = days[dateStr].moods.reduce((acc, item) => { acc[item.mood] = (acc[item.mood] || 0) + 1; return acc; }, {});
                days[dateStr].predominantMood = Object.entries(moodCounts)
                    .sort(([mA, cA], [mB, cB]) => {
                        if (cB !== cA) { return cB - cA; } // Sort by count descending
                        return getMoodValue(mB) - getMoodValue(mA); // Tie-break by mood value descending
                    })[0]?.[0]; // Get the mood label of the top entry
            } else {
                days[dateStr].predominantMood = null; // No mood logged for the day
            }

            // Filter unique activity types for display (show one icon per type per day)
            days[dateStr].activities = days[dateStr].activities.filter((act, idx, self) =>
                idx === self.findIndex((a) => (a.type === act.type)) // Keep only the first occurrence of each type
            );
        });

        // Get the date strings for the last 7 days that HAVE data
        const sortedDaysWithData = Object.keys(days).sort((a, b) => new Date(b) - new Date(a)); // Sort dates descending ('YYYY-MM-DD' strings sort correctly)
        const last7DaysWithData = sortedDaysWithData.slice(0, 7); // Take the most recent 7 date strings with entries

        // Format for rendering, reversing to show oldest first in the timeline view
        const finalTimeline = last7DaysWithData.map(dateStr => ({ date: dateStr, ...days[dateStr] })).reverse();
        console.log(`Timeline data calculated: ${finalTimeline.length} days shown.`);
        return finalTimeline;

    }, [moodHistory, activityHistory, USE_DEMO_DATA, demoMoodHistory, demoActivityHistory]);


    // --- Calendar Day Press Handler ---
    const onDayPress = useCallback((day) => {
        console.log("Calendar day pressed:", day.dateString);
        const currentMoodHistory = USE_DEMO_DATA ? demoMoodHistory : moodHistory;
        const dateString = day.dateString;

        // Filter mood entries for the selected day and sort them by time
        const entriesForDay = currentMoodHistory
            .filter(item => item.timestamp instanceof Date && formatDateISO(item.timestamp) === dateString)
            .sort((a, b) => a.timestamp - b.timestamp); // Sort ascending by time

        if (entriesForDay.length > 0) {
            console.log(`Found ${entriesForDay.length} entries for ${dateString}.`);
            setSelectedDateData({ date: dateString, entries: entriesForDay });
            setIsModalVisible(true); // Show the modal
        } else {
            console.log(`No entries found for ${dateString}.`);
            setSelectedDateData(null); // Clear any previous data
            // Optionally show modal with "No entries" message if a marked day without data is pressed
            // setIsModalVisible(true);
            // setSelectedDateData({ date: dateString, entries: [] });
        }
    }, [moodHistory, USE_DEMO_DATA, demoMoodHistory, formatTime]); // formatTime added as dependency


    // --- Chart Configuration & Calendar Theme (Memoized, using new COLORS) ---
    const chartConfig = useMemo(() => ({
        backgroundGradientFrom: COLORS.cardBackground, // Use card background for chart area
        backgroundGradientTo: COLORS.cardBackground,
        decimalPlaces: 1, // Show one decimal place for averages
        color: (opacity = 1) => COLORS.primary, // Primary color for lines/text
        labelColor: (opacity = 1) => COLORS.textSecondary, // Secondary text for labels
        style: { borderRadius: 16 }, // Match card radius
        propsForDots: {
            r: "4", // Dot radius
            strokeWidth: "1",
            stroke: COLORS.primaryLight // Lighter primary for dot stroke
        },
        propsForLabels: {
            fontSize: 10 // Smaller font size for chart labels
        },
        propsForBackgroundLines: {
            stroke: COLORS.border, // Use border color for grid lines
            strokeDasharray: '' // Solid lines
        },
    }), []);

    const calendarTheme = useMemo(() => ({
        backgroundColor: COLORS.cardBackground, // Calendar container background
        calendarBackground: COLORS.cardBackground, // Inner calendar background
        textSectionTitleColor: COLORS.textSecondary, // Color for 'Mon', 'Tue', etc.
        selectedDayBackgroundColor: COLORS.primary, // Background of selected date
        selectedDayTextColor: COLORS.white, // Text color of selected date
        todayTextColor: COLORS.primary, // Color of today's date number
        dayTextColor: COLORS.text, // Default text color for date numbers
        textDisabledColor: COLORS.disabled, // Color for dates outside the month
        dotColor: COLORS.primary, // Default color for marking dots (overridden by markedDates)
        selectedDotColor: COLORS.white, // Color of the dot on a selected date
        arrowColor: COLORS.primary, // Color of month navigation arrows
        monthTextColor: COLORS.text, // Color of the month/year title
        indicatorColor: COLORS.primary, // Loading indicator color (if applicable)
        textDayFontWeight: '300',
        textMonthFontWeight: 'bold',
        textDayHeaderFontWeight: '300',
        textDayFontSize: 14,
        textMonthFontSize: 16,
        textDayHeaderFontSize: 14,
        // Fix for potential layout issue with weekday headers
        'stylesheet.calendar.header': {
            week: {
                marginTop: 5,
                flexDirection: 'row',
                justifyContent: 'space-around'
            }
        }
    }), []);


    // --- Render Loading/Error/Content (Using new COLORS) ---
    const renderContent = () => {
        const isLoading = loading || loadingActivities || reminderLoading;
        const currentMoodHistory = USE_DEMO_DATA ? demoMoodHistory : moodHistory;
        const currentActivityHistory = USE_DEMO_DATA ? demoActivityHistory : activityHistory;

        // Loading State
        if (isLoading) { return <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />; }
        // Error State (Only show if not using demo data)
        if (error && !USE_DEMO_DATA) { return <Text style={styles.errorText}>{error}</Text>; }
        // Empty State (Only show if not using demo data and no data exists)
        if (currentMoodHistory.length === 0 && currentActivityHistory.length === 0 && !USE_DEMO_DATA && !error) {
            return (
                <View style={styles.emptyStateContainer}>
                    <Icon name="cloud-offline-outline" size={60} color={COLORS.textSecondary} />
                    <Text style={styles.infoText}>No data yet!</Text>
                    <Text style={styles.infoText}>Start tracking your mood and activities to see your journey unfold here.</Text>
                </View>
            );
        }

        // Content Rendering
        return (
            <>
                {/* Mood Analytics Section */}
                {currentMoodHistory.length > 0 ? (
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Mood Analytics</Text>
                        {/* Time Range Selector */}
                        <View style={styles.timeRangeSelector}>
                            {['Daily', 'Weekly', 'Monthly'].map(range => (
                                <TouchableOpacity
                                    key={range}
                                    style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]}
                                    onPress={() => setTimeRange(range)} >
                                    <Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>{range}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {/* Line Chart */}
                        {chartData?.lineChartData ? (
                            <>
                                <Text style={styles.chartTitle}>Mood Trend ({timeRange})</Text>
                                <LineChart
                                    key={`line-${timeRange}-${JSON.stringify(chartData.lineChartData.datasets[0].data)}`} // Dynamic key for re-render
                                    data={chartData.lineChartData}
                                    width={chartWidth} // <-- UPDATED: Use calculated responsive width
                                    height={220}
                                    chartConfig={chartConfig}
                                    bezier // Use bezier curves for a smoother look
                                    style={styles.chartStyle}
                                    fromZero // Start y-axis at 0
                                    // yLabelsOffset={5} // <-- REMOVED: Let library handle offset
                                    // Adjust segments based on data, avoid too many lines
                                    segments={Math.min(5, chartData.lineChartData.labels.length > 1 ? 4 : 1)}
                                />
                            </>
                        ) : (
                            <Text style={styles.infoText}>No mood data logged for the {timeRange.toLowerCase()} period to display a trend.</Text>
                        )}
                        {/* Pie Chart */}
                        <Text style={styles.chartTitle}>Mood Distribution ({timeRange})</Text>
                        {chartData?.pieChartData && chartData.pieChartData.length > 0 ? (
                            <PieChart
                                key={`pie-${timeRange}-${JSON.stringify(chartData.pieChartData)}`} // Dynamic key
                                data={chartData.pieChartData}
                                width={chartWidth} // <-- UPDATED: Use calculated responsive width
                                height={180}
                                chartConfig={chartConfig}
                                accessor={"population"} // Accessor for data value
                                backgroundColor={COLORS.transparent} // Transparent background
                                // paddingLeft={"15"} // <-- REMOVED: Let library handle internal padding/legend placement
                                style={styles.chartStyle}
                                // center={[10, 0]} // Keep commented out unless specific centering needed
                                // absolute // Uncomment to show absolute values instead of percentages
                            />
                        ) : (
                            <Text style={styles.infoText}>No mood data logged for the {timeRange.toLowerCase()} period.</Text>
                        )}
                    </View>
                ) : ( // Show placeholder if no mood history
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Mood Analytics</Text>
                        <Icon name="bar-chart-outline" size={24} color={COLORS.primary} style={styles.sectionIcon} />
                        <Text style={styles.infoText}>Log your mood entries to see analytics and trends here.</Text>
                    </View>
                )}

                {/* AI Insights Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Insights & Tips (Last 7 Days)</Text>
                     {/* Using secondary accent color for icon */}
                    <Icon name="sparkles-outline" size={24} color={COLORS.secondary} style={styles.sectionIcon} />
                    {isFetchingInsight ? (
                        <ActivityIndicator size="small" color={COLORS.primary} style={styles.insightLoader} />
                    ) : insightError ? (
                        <Text style={styles.insightErrorText}>{insightError}</Text>
                    ) : (
                        <Text style={styles.insightText}>{aiInsight || "Insights based on your recent mood logs will appear here."}</Text>
                    )}
                    {/* Refresh Button - Show only if not loading and there's data */}
                    {!isFetchingInsight && currentMoodHistory.length > 0 && (
                        <TouchableOpacity
                            onPress={() => {
                                console.log("Manual insight refresh triggered.");
                                // No need to setInsightFetched(false) here, fetchAiInsight handles its states
                                fetchAiInsight(currentMoodHistory); // Pass current history
                            }}
                            style={styles.refreshButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} // Larger tap area
                        >
                            <Icon name="refresh-outline" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Timeline Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Timeline (Recent Days)</Text>
                    {/* Using accent color for icon */}
                    <Icon name="git-compare-outline" size={24} color={COLORS.accent} style={styles.sectionIcon} />
                    {timelineData && Array.isArray(timelineData) && timelineData.length > 0 ? (
                        <View style={styles.timelineContainer}>
                            {timelineData.map((dayData) => (
                                <View key={dayData.date} style={styles.timelineItem}>
                                    {/* Format date clearly */}
                                    <Text style={styles.timelineDate}>
                                        {new Date(dayData.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    </Text>
                                    <View style={styles.timelineContent}>
                                        {/* Mood Dot representing predominant mood */}
                                        <View style={[
                                            styles.timelineMoodDot,
                                            { backgroundColor: getMoodColor(dayData.predominantMood) } // Use color from getMoodColor
                                        ]} />
                                        {/* Activity Icons */}
                                        <View style={styles.timelineActivities}>
                                            {dayData.activities.map((activity, index) => (
                                                <TouchableOpacity
                                                    key={index}
                                                    style={styles.activityIconTouchable}
                                                    onPress={() => Alert.alert(
                                                        activity.type,
                                                        `${USE_DEMO_DATA ? 'Demo' : 'Logged'} ${activity.type} on ${new Date(dayData.date + 'T00:00:00').toLocaleDateString()}.` +
                                                        (activity.data?.duration ? ` Duration: ${activity.data.duration} hrs.` : '')
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
                            <Text style={styles.correlationText}>See how your activities and mood align over time.</Text>
                        </View>
                    ) : (
                        <Text style={styles.infoText}>Log your moods and activities to build your timeline.</Text>
                    )}
                </View>

                {/* Calendar Section */}
                {(currentMoodHistory.length > 0 || USE_DEMO_DATA) ? ( // Show calendar even with demo data
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Mood Calendar</Text>
                        {/* Using accent color for icon */}
                        <Icon name="calendar-outline" size={24} color={COLORS.accent} style={styles.sectionIcon} />
                        <Calendar
                            // Add key based on current date to ensure it updates if the app is open across midnight
                            key={formatDateISO(new Date())}
                            current={formatDateISO(new Date())} // Set current month to today
                            onDayPress={onDayPress}
                            markedDates={markedDates} // Use calculated marked dates
                            markingType={'dot'} // Use dot marking
                            monthFormat={'yyyy MMMM'} // Format for month title
                            theme={calendarTheme} // Apply custom theme
                            style={styles.calendarStyle}
                            // Optional: Add min/max date if needed
                            // minDate={'2024-01-01'}
                            // maxDate={'2025-12-31'}
                        />
                        <Text style={styles.infoText}>Tap a day with a dot to see logged entries.</Text>
                    </View>
                ) : ( // Show placeholder if no mood history and not using demo data
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Mood Calendar</Text>
                        <Icon name="calendar-outline" size={24} color={COLORS.accent} style={styles.sectionIcon} />
                        <Text style={styles.infoText}>Log your mood to see entries marked on the calendar.</Text>
                    </View>
                )}

                {/* Progress Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Tracking Progress</Text>
                     {/* Using primary color for icon */}
                    <Icon name="trending-up-outline" size={24} color={COLORS.primary} style={styles.sectionIcon} />
                    <Text style={styles.placeholderText}>
                        {currentMoodHistory.length > 0
                            ? `You've logged your mood ${currentMoodHistory.length} time${currentMoodHistory.length > 1 ? 's' : ''}! Keep it up! ✨`
                            : "Start logging your mood to track progress."}
                    </Text>
                    <Text style={styles.placeholderText}>
                        {currentActivityHistory.length > 0
                            ? `You've logged ${currentActivityHistory.length} activit${currentActivityHistory.length > 1 ? 'ies' : 'y'}.`
                            : "Log activities like sleep or exercise too!"}
                    </Text>
                </View>

                {/* Reminders Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Daily Reminder</Text>
                    {/* Using primary color for icon */}
                    <Icon name="alarm-outline" size={24} color={COLORS.primary} style={styles.sectionIcon} />
                    <Text style={styles.reminderInfoText}>Set a time for a daily notification to check in with your mood.</Text>

                    {/* Time Picker Button */}
                    <TouchableOpacity
                        style={styles.timePickerButton}
                        onPress={() => setShowTimePicker(true)}
                        disabled={reminderLoading} // Disable while processing
                    >
                        <Text style={styles.timePickerButtonText}>Selected Time: {formatTime(reminderTime)}</Text>
                        <Icon name="time-outline" size={18} color={COLORS.primary} style={{ marginLeft: 8 }} />
                    </TouchableOpacity>

                    {/* Time Picker */}
                    {showTimePicker && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={reminderTime} // Current selected time
                            mode="time" // Show time picker
                            is24Hour={false} // Use AM/PM
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'} // Spinner for iOS, default for Android
                            onChange={onTimeChange} // Handler for time change
                        />
                    )}
                    {/* iOS Done Button (for spinner display) */}
                    {showTimePicker && Platform.OS === 'ios' && (
                         <TouchableOpacity style={styles.iosPickerDoneButton} onPress={() => setShowTimePicker(false)} >
                            <Text style={styles.iosPickerDoneButtonText}>Done</Text>
                         </TouchableOpacity>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.reminderButtonsContainer}>
                        <TouchableOpacity
                            style={[styles.reminderActionButton, styles.setButton]}
                            onPress={handleSetReminder}
                            disabled={reminderLoading}
                        >
                            <Text style={styles.reminderActionButtonText}>{isReminderSet ? 'Update Time' : 'Set Reminder'}</Text>
                        </TouchableOpacity>
                        {/* Show Cancel button only if a reminder is set */}
                        {isReminderSet && (
                            <TouchableOpacity
                                style={[styles.reminderActionButton, styles.cancelButton]}
                                onPress={handleCancelReminder}
                                disabled={reminderLoading}
                            >
                                <Text style={styles.reminderActionButtonText}>Cancel Reminder</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Loading Indicator */}
                    {reminderLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 10 }} />}

                    {/* Status Text */}
                    {!reminderLoading && ( // Only show status when not loading
                        <Text style={styles.reminderSetText}>
                            {isReminderSet ? `Reminder is active for ${formatTime(reminderTime)} daily.` : "Reminder is currently off."}
                        </Text>
                    )}
                </View>
            </>
        );
    };

    // Debug Logging Effect (Optional: Can be removed in final production)
    useEffect(() => {
        console.log("[DEBUG] State Update: moodHistory length:", moodHistory.length);
        console.log("[DEBUG] State Update: chartData line:", chartData?.lineChartData ? 'Exists' : 'null', "pie:", chartData?.pieChartData?.length);
        console.log("[DEBUG] State Update: AI Insight State:", {aiInsight, insightError, isFetchingInsight, insightFetched});
    }, [moodHistory, chartData, aiInsight, insightError, isFetchingInsight, insightFetched]);


    // --- Final Render of the Screen ---
    return (
        // Use background and cardBackground for a subtle gradient effect
        <LinearGradient colors={[COLORS.background, COLORS.cardBackground]} style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false} // Hide scrollbar
            >
                <Text style={styles.screenTitle}>Your Mood Journey</Text>
                {renderContent()}
            </ScrollView>

             {/* Calendar Day Details Modal */}
             <Modal
                animationType="fade" // Use fade animation
                transparent={true} // Make modal background transparent
                visible={isModalVisible} // Control visibility with state
                onRequestClose={() => setIsModalVisible(false)} // Handle hardware back button on Android
            >
                {/* Overlay to allow closing modal by tapping outside */}
                <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
                     {/* Prevent closing when tapping inside the modal content */}
                    <Pressable style={styles.modalContent} onPress={() => { /* Prevent closing on content press */ }}>
                        <Text style={styles.modalTitle}>
                            Entries for {selectedDateData?.date
                                ? new Date(selectedDateData.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                : 'Selected Day'}
                        </Text>
                        <ScrollView style={styles.modalScroll}>
                            {selectedDateData?.entries.map((entry, index) => (
                                <View key={entry.id || index} style={styles.modalEntry}>
                                    <View style={styles.modalMoodHeader}>
                                        <View style={styles.modalMoodInfo}>
                                             {/* Mood color dot */}
                                            <View style={[styles.moodDot, { backgroundColor: getMoodColor(entry.mood)}]} />
                                             {/* Mood label */}
                                            <Text style={styles.modalMoodText} numberOfLines={1} ellipsizeMode='tail'>
                                                {entry.mood || 'Unknown Mood'}
                                            </Text>
                                        </View>
                                         {/* Timestamp */}
                                        <Text style={styles.modalTimestampText}>
                                            ({entry.timestamp instanceof Date ? formatTime(entry.timestamp) : 'Invalid time'})
                                        </Text>
                                    </View>
                                     {/* Optional Note */}
                                    {entry.note ? (
                                        <Text style={styles.modalNoteText}>{entry.note}</Text>
                                    ) : (
                                        <Text style={styles.modalNoteTextMuted}>No note added for this entry.</Text>
                                    )}
                                </View>
                            ))}
                             {/* Message if no entries */}
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

// --- Styles (Using new COLORS object) ---
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
        color: COLORS.text, // Use main text color
        marginBottom: 25,
        textAlign: 'center',
    },
    loader: {
        marginTop: '50%', // Center vertically roughly
        marginBottom: 20,
        alignSelf: 'center',
    },
    errorText: {
        color: COLORS.error, // Use error color
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
        color: COLORS.textSecondary, // Use secondary text color
        textAlign: 'center',
        marginTop: 15,
        marginBottom: 15,
        fontSize: 14,
        lineHeight: 20, // Improved readability
        paddingHorizontal: 10,
    },
    sectionCard: {
        backgroundColor: COLORS.cardBackground, // Use card background color
        borderRadius: 16,
        padding: 15, // Padding inside the card
        marginBottom: 20,
        // Subtle shadow for depth
        borderWidth: Platform.OS === 'android' ? 0 : 1, // Border for iOS fallback if shadow weak
        borderColor: COLORS.border, // Use border color
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.10,
        shadowRadius: 2.22,
        elevation: 3, // Android shadow
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600', // Semi-bold
        color: COLORS.text, // Use main text color
        marginBottom: 15,
    },
    sectionIcon: {
        position: 'absolute',
        top: 15,
        right: 15,
        opacity: 0.7, // Make icon slightly subtle
        // Color is set inline where used (COLORS.primary, COLORS.accent, etc.)
    },
    placeholderText: {
        fontSize: 14,
        color: COLORS.textSecondary, // Use secondary text color
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
        color: COLORS.error, // Use error color
        lineHeight: 20,
        fontStyle: 'italic',
        textAlign:'center',
        paddingHorizontal: 10,
    },
    insightText: {
        fontSize: 14,
        color: COLORS.text, // Use main text color
        lineHeight: 21, // Good spacing for readability
        paddingRight: 30, // Space for refresh icon
        textAlign: 'left', // Align text naturally
        minHeight: 40, // Ensure space even when text is short
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
        color: COLORS.text, // Use main text color
        marginBottom: 5,
        // marginLeft: 5, // Removed to let chart centering work better
        textAlign: 'left', // Explicitly align left
        marginTop: 10,
        
    },
    chartStyle: {
        marginVertical: 8,
        borderRadius: 16, // Match card radius
        // Removed paddingLeft from PieChart props, adjust margin if needed here
        // marginRight: 10, // Example: Add right margin if legend still feels cramped
        paddingRight: 10, // Space for legend if needed
    },
    timeRangeSelector: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        marginBottom: 15,
        backgroundColor: COLORS.primaryLight, // Use lighter primary
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
        backgroundColor: COLORS.primary, // Highlight active button with primary color
    },
    timeRangeText: {
        fontSize: 13,
        color: COLORS.textSecondary, // Use secondary text
        fontWeight: '500',
    },
    timeRangeTextActive: {
        color: COLORS.white, // White text on active button
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
        borderBottomColor: COLORS.border, // Use border color
    },
    timelineDate: {
        fontSize: 12,
        color: COLORS.textSecondary, // Use secondary text
        fontWeight: '500',
        width: 85, // Adjusted width for potentially longer dates
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
        borderColor: COLORS.border, // Subtle border using border color
        // Background color set dynamically
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
        // Icon color set dynamically
    },
    noActivityText: {
        fontSize: 14,
        color: COLORS.lightText, // Very subtle text using light text color
        marginLeft: 8,
        fontStyle: 'italic',
    },
    correlationText: {
        fontSize: 13,
        color: COLORS.textSecondary, // Use secondary text color
        fontStyle: 'italic',
        marginTop: 15,
        textAlign: 'center',
        lineHeight: 18,
    },
    // --- Calendar Styles ---
    calendarStyle: {
        borderWidth: 1,
        borderColor: COLORS.border, // Use border color
        borderRadius: 8,
        // Add padding if needed inside the calendar border
        // paddingBottom: 10,
    },
    // --- Reminder Styles ---
    reminderInfoText: {
        fontSize: 14,
        color: COLORS.textSecondary, // Use secondary text
        marginBottom: 15,
        lineHeight: 20,
    },
    timePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primaryLight, // Use lighter primary
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border, // Use border color
        marginBottom: 20,
        justifyContent: 'space-between', // Push text and icon apart
    },
    timePickerButtonText: {
        fontSize: 15,
        color: COLORS.text, // Use main text color
    },
     iosPickerDoneButton: {
         alignSelf: 'flex-end', // Position to the right
         paddingVertical: 8,
         paddingHorizontal: 15,
         marginTop: -10, // Adjust position relative to the picker (might need tweaking)
         marginBottom: 10,
     },
     iosPickerDoneButtonText: {
         color: COLORS.primary, // Use theme color for "Done"
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
        backgroundColor: COLORS.primary, // Use primary color
        marginRight: 5, // Space between buttons
        marginLeft: 5,
    },
    cancelButton: {
        backgroundColor: COLORS.error, // Use error color for cancel
        marginRight: 5,
        marginLeft: 5,
    },
    reminderActionButtonText: {
        color: COLORS.white, // White text on buttons
        fontWeight: '600',
        fontSize: 14,
    },
    reminderSetText: {
        fontSize: 13,
        color: COLORS.textSecondary, // Use secondary text color
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
        backgroundColor: COLORS.cardBackground, // Use card background
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
        elevation: 5, // Android shadow
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: COLORS.text, // Use main text color
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
        borderBottomColor: COLORS.border, // Use border color
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
    moodDot: { // Used in Modal
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
        // Background color set dynamically
    },
    modalMoodText: {
        fontSize: 15,
        fontWeight: '500',
        color: COLORS.text, // Use main text color
        flexShrink: 1, // Allow text to shrink and wrap/ellipsize
    },
    modalTimestampText: {
        fontSize: 12,
        color: COLORS.textSecondary, // Use secondary text color
        textAlign: 'right', // Align time to the right
        marginLeft: 'auto', // Push to the far right
        flexShrink: 0, // Prevent timestamp from shrinking
    },
    modalNoteText: {
        fontSize: 14,
        color: COLORS.textSecondary, // Use secondary text color
        marginTop: 4,
        paddingLeft: 18, // Indent note under the mood dot
        width: '100%', // Ensure text wraps correctly
        lineHeight: 19,
    },
    modalNoteTextMuted: {
        fontSize: 14,
        color: COLORS.lightText, // Lighter color for placeholder
        fontStyle: 'italic',
        marginTop: 4,
        paddingLeft: 18, // Indent note under the mood dot
        width: '100%',
    },
    closeButton: {
        backgroundColor: COLORS.primary, // Use primary color for button
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 20,
        marginTop: 10, // Space above the button
    },
    closeButtonText: {
        color: COLORS.white, // White text
        fontWeight: '600',
        fontSize: 15,
    },
});

export default MoodTrackerScreen;