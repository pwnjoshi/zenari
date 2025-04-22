/**
 * MoodTrackerScreen.js
 * FINAL VERSION - Updated Apr 22, 2025
 * - ***FIXED: Removed duplicate color definition in LineChart dataset causing crash.***
 * - ***FIXED: Aligned getMoodValue, getMoodColor, createDemoData, and fetchAiInsight prompt with simplified "Good"/"Rough" moods.***
 * - ***FIXED: Added isFetchingInsight dependency to fetchAiInsight useCallback hook.***
 * - ***FIXED: Removed moodHistory.length from main useEffect dependency array to prevent loading loops.***
 * - ***UPDATED: Firestore calls to use modular syntax (resolves deprecation warnings).***
 * - Integrated NEW Calming Color Scheme.
 * - Updated chartConfig, calendarTheme, and StyleSheet to use new COLORS.
 * - Mapped timeline activity icons to new COLORS.
 * - Uses GEMINI_API_KEY from @env with validation.
 * - Pie Chart reflects selected time range.
 * - Includes detailed logging (commented out by default).
 * - Corrected startDate calculation for 'Daily' chart view.
 * - Refined 'Daily' Line Chart to show individual entries.
 * - Added dynamic keys to charts for forced re-renders.
 * - Added 'No Data' message for Pie Chart.
 * - Set USE_DEMO_DATA to false to use Firestore.
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
    Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Calendar, LocaleConfig } from 'react-native-calendars';
// *** UPDATED Firestore Import for Modular SDK ***
import { getFirestore, collection, doc, orderBy, onSnapshot, query } from '@react-native-firebase/firestore';
import { AuthContext } from './AuthProvider';

// --- Notification & Reminder Imports ---
import notifee, { TriggerType, RepeatFrequency, AndroidImportance, AuthorizationStatus } from '@notifee/react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- API Key Import ---
import { GEMINI_API_KEY } from '@env';
// --------------------

// Initialize Firestore using modular syntax
const db = getFirestore();

// --- NEW COLOR SCHEME ---
const COLORS = {
    background: '#F4F8F7', primary: '#6AB7A8', primaryLight: '#A8D8CF', secondary: '#F7D9AE', secondaryLight: '#FBEFDD', accent: '#A8A6CE', accentLight: '#DCDAF8', text: '#3A506B', textSecondary: '#6B819E', lightText: '#A3B1C6', white: '#FFFFFF', cardBackground: '#FFFFFF', border: '#D8E2EB', error: '#E57373', disabled: '#B0BEC5',
    goodColor: '#FFD166', roughColor: '#90BDE1', neutral: '#B0BEC5',
    sleepColor: '#95BBE4', exerciseColor: '#6ECDAF', socialColor: '#FFB967',
    tagBackground: '#E6F4F1', suggestionBackground: '#FBEFDD', recording: '#E57373', playButton: '#6AB7A8', deleteButton: '#B0BEC5', loadingIndicator: '#6AB7A8', transparent: 'transparent',
};
// -----------------------

const { width: screenWidth } = Dimensions.get('window');
const chartWidth = screenWidth - 70;

// --- Mood Scoring Map ---
const moodScores = { 'Good': 5, 'Rough': 1 };
// -----------------------

// --- Helper Functions ---
const getMoodValue = (moodLabel) => {
    // Assigns a numerical value based on simplified moods
    switch (moodLabel?.toLowerCase()) {
        case 'good': return 5;
        case 'rough': return 1;
        default: return 0; // Default for unknown/null moods
    }
};

const getMoodColor = (moodLabel) => {
    // Assigns a specific color based on simplified moods
    switch (moodLabel?.toLowerCase()) {
        case 'good': return COLORS.goodColor; // Use defined goodColor
        case 'rough': return COLORS.roughColor; // Use defined roughColor
        default: return COLORS.neutral; // Neutral Grey for unknown/null moods
    }
};

const formatDateISO = (date) => { if (!(date instanceof Date) || isNaN(date)) { const now = new Date(); return now.toISOString().split('T')[0]; } const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
const getDateNDaysAgo = (days) => { const date = new Date(); date.setDate(date.getDate() - days); date.setHours(0, 0, 0, 0); return date; };
// -----------------------

// --- DEMO DATA Creation ---
const createDemoData = () => {
    const baseDate = new Date();
    // Demo Moods using only 'Good' or 'Rough'
    const demoMoods = [ { id: 'm1', mood: 'Good', timestamp: new Date(new Date(baseDate).setHours(9, 15, 0, 0)), note: 'Feeling okay.' }, { id: 'm11', mood: 'Good', timestamp: new Date(new Date(baseDate).setHours(14, 30, 0, 0)), note: 'Good lunch!' }, { id: 'm2', mood: 'Good', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)), note: 'Great day!' }, { id: 'm12', mood: 'Good', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)) }, { id: 'm3', mood: 'Rough', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 2)), note: 'Stressful.' }, { id: 'm4', mood: 'Good', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 3)) }, { id: 'm5', mood: 'Rough', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 4)), note: 'Missing friends.' }, { id: 'm6', mood: 'Good', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 5)), note: 'Weekend plans!' }, { id: 'm7', mood: 'Good', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 6)) }, { id: 'm8', mood: 'Good', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 7)), note: 'Productive.' }, { id: 'm9', mood: 'Rough', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 10)) }, { id: 'm10', mood: 'Good', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 15)) }, ];
    // Demo Activities (unchanged)
    const demoActivities = [ { id: 'a1', type: 'Sleep', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)), duration: 7.5 }, { id: 'a2', type: 'Exercise', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 1)), duration: 1 }, { id: 'a3', type: 'Social', timestamp: new Date(new Date(baseDate).setHours(18, 0, 0, 0)), duration: 2 }, { id: 'a4', type: 'Sleep', timestamp: new Date(new Date(baseDate).setHours(7, 0, 0, 0)), duration: 8 }, { id: 'a5', type: 'Exercise', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 2)), duration: 0.75 }, { id: 'a6', type: 'Sleep', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 2)), duration: 6 }, { id: 'a7', type: 'Social', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 4)), duration: 3 }, { id: 'a8', type: 'Sleep', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 4)), duration: 7 }, { id: 'a9', type: 'Exercise', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 6)), duration: 1.5 }, { id: 'a10', type: 'Sleep', timestamp: new Date(new Date(baseDate).setDate(baseDate.getDate() - 6)), duration: 8.5 } ];
    return { demoMoodHistory: demoMoods, demoActivityHistory: demoActivities };
};
// -------------------------

// --- AsyncStorage Keys ---
const REMINDER_TIME_KEY = '@MoodTracker_ReminderTime';
const REMINDER_ID_KEY = '@MoodTracker_ReminderId';
// -----------------------

// --- Main Screen Component ---
const MoodTrackerScreen = ({ navigation }) => {
    const { user } = useContext(AuthContext);
    const [moodHistory, setMoodHistory] = useState([]);
    const [activityHistory, setActivityHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingActivities, setLoadingActivities] = useState(true);
    const [error, setError] = useState(null);
    const [timeRange, setTimeRange] = useState('Weekly');
    const [selectedDateData, setSelectedDateData] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [aiInsight, setAiInsight] = useState('');
    const [isFetchingInsight, setIsFetchingInsight] = useState(false);
    const [insightError, setInsightError] = useState(null);
    const [insightFetched, setInsightFetched] = useState(false);
    const [reminderTime, setReminderTime] = useState(new Date());
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isReminderSet, setIsReminderSet] = useState(false);
    const [scheduledReminderId, setScheduledReminderId] = useState(null);
    const [reminderLoading, setReminderLoading] = useState(true);

    const USE_DEMO_DATA = false;

    const formatTime = useCallback((date) => { if (!(date instanceof Date) || isNaN(date)) return "Invalid Time"; return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }); }, []);
    const { demoMoodHistory, demoActivityHistory } = useMemo(() => { return USE_DEMO_DATA ? createDemoData() : { demoMoodHistory: [], demoActivityHistory: [] }; }, [USE_DEMO_DATA]);

    // Load Reminder Settings
    useEffect(() => { const loadSettings = async () => { setReminderLoading(true); try { const timeStr = await AsyncStorage.getItem(REMINDER_TIME_KEY); const storedId = await AsyncStorage.getItem(REMINDER_ID_KEY); if (storedId) { setScheduledReminderId(storedId); setIsReminderSet(true); } else { setIsReminderSet(false); } const defaultTime = new Date(); defaultTime.setHours(9, 0, 0, 0); if (timeStr) { const [h, m] = timeStr.split(':').map(Number); if (!isNaN(h) && !isNaN(m)) { const loaded = new Date(); loaded.setHours(h, m, 0, 0); setReminderTime(loaded); } else { setReminderTime(defaultTime); } } else { setReminderTime(defaultTime); } } catch (e) { console.error("Failed load reminder:", e); const defaultTime = new Date(); defaultTime.setHours(9, 0, 0, 0); setReminderTime(defaultTime); setIsReminderSet(false); setScheduledReminderId(null); } finally { setReminderLoading(false); } }; loadSettings(); }, []);

    // Fetch AI Insight
    const fetchAiInsight = useCallback(async (fullHistory) => {
        const API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
        if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_REAL_GEMINI_API_KEY_HERE' || GEMINI_API_KEY.length < 10) {
            setAiInsight("AI insights require setup.");
            setInsightError("API Key missing or invalid.");
            setInsightFetched(true);
            if (isFetchingInsight) setIsFetchingInsight(false);
            return;
        }
        if (isFetchingInsight) return;

        const sevenDaysAgo = getDateNDaysAgo(6);
        const last7DaysHistory = fullHistory.filter(item => item.timestamp instanceof Date && item.timestamp >= sevenDaysAgo);
        if (!last7DaysHistory || last7DaysHistory.length === 0) {
            setAiInsight("Log mood daily for 7-day insights!");
            setInsightError(null);
            setInsightFetched(true);
            return;
        }

        console.log(`Generating AI insight (7-day)...`);
        setIsFetchingInsight(true);
        setInsightError(null);
        setAiInsight('');

        try {
            const moodCountsLast7Days = last7DaysHistory.reduce((acc, item) => { acc[item.mood] = (acc[item.mood] || 0) + 1; return acc; }, {});
            const frequentMoodLast7Days = Object.entries(moodCountsLast7Days).sort(([, a], [, b]) => b - a)[0]?.[0] || 'varied';
            const prompt = `You are a gentle wellness companion. Analyze the user's mood data from the past 7 days. Mood counts: ${JSON.stringify(moodCountsLast7Days)}. The most frequent mood seems to be: ${frequentMoodLast7Days}. Based ONLY on this 7-day data ('Good' is positive, 'Rough' indicates difficulty), provide one *very short* (1-2 sentences MAX), sweet, positive, and encouraging insight or suggestion. Focus on encouragement or a small actionable tip related to the recent pattern. Be concise and warm.`;
            const requestBody = { contents: [{ parts: [{ text: prompt }] }] };
            const response = await fetch(`${API_URL_BASE}?key=${GEMINI_API_KEY}`, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify(requestBody)
             });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = `AI Error: ${response.status} ${response.statusText}. ${errorData?.error?.message || 'Could not fetch insight.'}`;
                console.error("AI Fetch Error Details:", errorData);
                throw new Error(errorMsg);
             }

            const data = await response.json();
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const insightText = data.candidates[0].content.parts[0].text.trim();
                setAiInsight(insightText);
                console.log("AI Insight Received:", insightText);
            } else {
                 console.warn("AI Response format unexpected:", data);
                 if (data.promptFeedback?.blockReason) {
                   throw new Error(`Insight generation blocked: ${data.promptFeedback.blockReason}`);
                 }
                 throw new Error('Invalid response format from AI service.');
             }
        } catch (err) {
             console.error("Error fetching AI insight: ", err);
             setInsightError(err.message || "Insight service error.");
             setAiInsight("Couldn't generate insight at this time.");
         }
        finally { setIsFetchingInsight(false); setInsightFetched(true); }
    }, [isFetchingInsight]);

    // Fetch Mood/Activity Data (Using Modular Firestore)
    useEffect(() => {
        setLoading(true);
        setLoadingActivities(true);
        setError(null);
        setInsightFetched(false);

        if (USE_DEMO_DATA) {
             console.log("Using DEMO data.");
             const { demoMoodHistory, demoActivityHistory } = createDemoData();
             setMoodHistory(demoMoodHistory);
             setActivityHistory(demoActivityHistory);
             setLoading(false);
             setLoadingActivities(false);
             setError(null);
             if (demoMoodHistory.length > 0 && !insightFetched) {
                  fetchAiInsight(demoMoodHistory);
             } else if (demoMoodHistory.length === 0) {
                 setAiInsight("Demo mode: No mood data to analyze.");
                 setInsightFetched(true);
             }
             return;
         }
        if (!user) {
             console.log("No user logged in.");
             setLoading(false);
             setLoadingActivities(false);
             setError("Please log in to see your mood history.");
             setMoodHistory([]);
             setActivityHistory([]);
             setAiInsight('');
             setInsightError(null);
             setInsightFetched(true);
             return;
         }

        console.log("Setting up Firestore listener for user:", user.uid);
        let isMounted = true;
        let initialFetchDone = false;

        // *** Use Modular Firestore Syntax ***
        const userMoodHistoryRef = collection(db, 'users', user.uid, 'moodHistory');
        const moodQuery = query(userMoodHistoryRef, orderBy('timestamp', 'desc'));

        const unsubscribeMood = onSnapshot(moodQuery, // Use the query object
            (querySnapshot) => {
                if (!isMounted) return;
                console.log("Firestore mood data received.");
                const history = [];
                querySnapshot.forEach(docSnapshot => { // Iterate over docSnapshot
                    const data = docSnapshot.data();
                    if (data.timestamp?.toDate) {
                        history.push({ id: docSnapshot.id, ...data, timestamp: data.timestamp.toDate() });
                    } else {
                        console.warn("Invalid mood document data (missing or invalid timestamp):", docSnapshot.id);
                    }
                });

                const dataChanged = !initialFetchDone || history.length !== moodHistory.length;
                setMoodHistory(history);
                setLoading(false);
                setError(null);

                if (history.length > 0 && dataChanged && !insightFetched) {
                    console.log("Mood data updated, fetching AI insight...");
                    fetchAiInsight(history);
                } else if (history.length === 0) {
                    console.log("No mood history found.");
                    setAiInsight("Track your mood regularly to unlock insights!");
                    setInsightFetched(true);
                }
                initialFetchDone = true;
            },
            (err) => {
                 if (!isMounted) return;
                 console.error("Firestore mood listener error:", err);
                 setError("Failed to load mood history. Please try again later.");
                 setLoading(false);
                 setLoadingActivities(false);
                 setMoodHistory([]);
                 setActivityHistory([]);
                 setAiInsight('');
                 setInsightError("Mood data load failed.");
                 setInsightFetched(true);
             }
        );

        // Mock Activity Fetch
        const fetchActivities = async () => {
              if (!isMounted) return;
              setLoadingActivities(true);
              console.log("Fetching activities (mock)...");
              try {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  if (isMounted) {
                      setActivityHistory([]);
                      console.log("Mock activities 'fetched'.");
                  }
              } catch (err) {
                   if (isMounted) {
                     console.error("Error fetching activities (mock):", err);
                   }
              } finally {
                  if (isMounted) {
                     setLoadingActivities(false);
                  }
              }
          };
        fetchActivities();

        // Cleanup
        return () => {
            console.log("Cleaning up Firestore listener.");
            isMounted = false;
            unsubscribeMood();
        };
    }, [user, USE_DEMO_DATA, fetchAiInsight]); // Add fetchAiInsight back as dependency


    // --- Reminder Functions ---
    const requestNotificationPermission = useCallback(async () => { /* ... implementation ... */ }, []);
    const calculateNextTimestamp = useCallback((selectedTime) => { /* ... implementation ... */ }, []);
    const handleSetReminder = useCallback(async () => { /* ... implementation ... */ }, [reminderTime, scheduledReminderId, requestNotificationPermission, calculateNextTimestamp, formatTime, user]);
    const handleCancelReminder = useCallback(async () => { /* ... implementation ... */ }, [scheduledReminderId, isReminderSet]);
    const onTimeChange = useCallback((event, selectedDate) => { if (Platform.OS === 'android') setShowTimePicker(false); if (event.type === 'set' && selectedDate) { setReminderTime(new Date(selectedDate)); } }, []);


    // --- Memoized Chart Data (FIXED: Removed dataset color) ---
    const chartData = useMemo(() => {
        const currentMoodHistory = moodHistory;
        if (!currentMoodHistory || currentMoodHistory.length === 0) { return { lineChartData: null, pieChartData: [] }; }

        let startDate;
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);

        switch (timeRange) {
            case 'Daily':
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'Weekly':
                startDate = getDateNDaysAgo(6);
                break;
            case 'Monthly':
            default:
                startDate = getDateNDaysAgo(29);
                break;
        }

        const filteredHistory = currentMoodHistory.filter(item => item.timestamp instanceof Date && item.timestamp >= startDate && item.timestamp <= endDate);

        let lineChartData = null;
        if (filteredHistory.length > 0) {
            if (timeRange === 'Daily') {
                const dailyEntries = filteredHistory.sort((a, b) => a.timestamp - b.timestamp);
                if (dailyEntries.length > 0) {
                    let labels = [];
                    let dataPoints = [];
                    if (dailyEntries.length === 1) {
                        labels = ['Start', formatTime(dailyEntries[0].timestamp), 'End'];
                        dataPoints = [0, getMoodValue(dailyEntries[0].mood), 0]; // Keep mood value centered
                    } else {
                        labels = dailyEntries.map(entry => formatTime(entry.timestamp));
                        dataPoints = dailyEntries.map(entry => getMoodValue(entry.mood));
                    }
                    // *** FIX: Remove color from dataset definition ***
                    lineChartData = { labels, datasets: [{ data: dataPoints, strokeWidth: 2 }] };
                }
            } else { // Weekly or Monthly
                const dailyAverages = {};
                filteredHistory.forEach(item => {
                    const dStr = formatDateISO(item.timestamp);
                    const mv = getMoodValue(item.mood);
                    if (!dailyAverages[dStr]) dailyAverages[dStr] = { total: 0, count: 0 };
                    dailyAverages[dStr].total += mv;
                    dailyAverages[dStr].count += 1;
                });

                const labels = [];
                const dataPoints = [];
                const tempDate = new Date(startDate);
                const endLoopDate = new Date(endDate); // Use a copy for loop end condition
                let idx = 0;
                const daysInPeriod = timeRange === 'Weekly' ? 7 : 30;

                while (tempDate <= endLoopDate && idx < daysInPeriod) {
                    const dStr = formatDateISO(tempDate);
                    const dayData = dailyAverages[dStr];
                    let lbl = '';
                    const avgV = dayData ? parseFloat((dayData.total / dayData.count).toFixed(1)) : 0;

                    if (timeRange === 'Weekly') {
                        lbl = tempDate.toLocaleDateString('en-US', { weekday: 'short' });
                    } else { // Monthly
                        const totalDaysInRange = Math.round((endLoopDate.getTime() - startDate.getTime()) / 864e5) + 1;
                        const interval = Math.max(1, Math.floor(totalDaysInRange / 6)); // Show ~7 labels
                        if (idx === 0 || idx === daysInPeriod - 1 || idx % interval === 0) {
                             lbl = tempDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
                        }
                    }
                    labels.push(lbl);
                    dataPoints.push(avgV > 0 ? avgV : 0); // Ensure no negative values if calculation yields tiny negatives
                    tempDate.setDate(tempDate.getDate() + 1);
                    idx++;
                }

                if (labels.length > 0 && dataPoints.length > 0) {
                     // *** FIX: Remove color from dataset definition ***
                    lineChartData = { labels, datasets: [{ data: dataPoints, strokeWidth: 2 }] };
                }
            }
        }

        const moodCountsFiltered = filteredHistory.reduce((acc, item) => {
            if (item.mood) acc[item.mood] = (acc[item.mood] || 0) + 1;
            return acc;
        }, {});

        const pieChartData = Object.entries(moodCountsFiltered)
            .map(([mood, count]) => ({
                name: mood,
                population: count,
                color: getMoodColor(mood),
                legendFontColor: COLORS.text,
                legendFontSize: 13
            }))
            .sort((a, b) => b.population - a.population); // Sort by count descending

        return { lineChartData, pieChartData };
    }, [moodHistory, timeRange, formatTime]); // formatTime dependency needed for Daily chart


    // --- Memoized Marked Dates ---
    const markedDates = useMemo(() => {
        const currentMoodHistory = moodHistory;
        const markings = {};
        currentMoodHistory.forEach(item => {
            if (!(item.timestamp instanceof Date) || isNaN(item.timestamp)) return;
            const dateString = formatDateISO(item.timestamp);
            const newColor = getMoodColor(item.mood);
            // If date already marked, prioritize 'Rough' color, else use current entry's color
            if (markings[dateString]) {
                 if (newColor === COLORS.roughColor) {
                    markings[dateString] = { dotColor: newColor, marked: true };
                 }
                 // Keep existing color if it's already rough, or if the new one isn't rough
            } else {
                 markings[dateString] = { dotColor: newColor, marked: true };
            }
        });
        return markings;
    }, [moodHistory]);


    // --- Memoized Timeline Data ---
    const timelineData = useMemo(() => {
        const currentMoodHistory = moodHistory;
        const currentActivityHistory = activityHistory;
        const combined = [...currentMoodHistory, ...currentActivityHistory]
            .filter(i => i.timestamp instanceof Date && !isNaN(i.timestamp))
            .sort((a, b) => a.timestamp - b.timestamp); // Sort oldest first for processing

        const days = {};
        combined.forEach(item => {
            const dStr = formatDateISO(item.timestamp);
            if (!days[dStr]) days[dStr] = { dateObj: item.timestamp, moods: [], activities: [] };
            if (item.mood) {
                days[dStr].moods.push(item);
            } else if (item.type) {
                let act = null;
                switch (item.type.toLowerCase()) {
                    case 'sleep': act = { type: 'Sleep', icon: 'bed-outline', color: COLORS.sleepColor, data: item }; break;
                    case 'exercise': act = { type: 'Exercise', icon: 'barbell-outline', color: COLORS.exerciseColor, data: item }; break;
                    case 'social': act = { type: 'Social', icon: 'people-outline', color: COLORS.socialColor, data: item }; break;
                }
                if (act) days[dStr].activities.push(act);
            }
        });

        Object.keys(days).forEach(dStr => {
            if (days[dStr].moods.length > 0) {
                const counts = days[dStr].moods.reduce((acc, item) => { acc[item.mood] = (acc[item.mood] || 0) + 1; return acc; }, {});
                // Determine predominant mood (highest count, tie-break with lowest score -> 'Rough')
                days[dStr].predominantMood = Object.entries(counts).sort(([mA, cA], [mB, cB]) => {
                    if (cB !== cA) return cB - cA; // Higher count first
                    return getMoodValue(mA) - getMoodValue(mB); // Lower mood value (Rough) first in case of tie
                })[0]?.[0];
            } else {
                days[dStr].predominantMood = null;
            }
             // Filter unique activity types per day for display
            days[dStr].activities = days[dStr].activities.filter((act, idx, self) =>
                 idx === self.findIndex((a) => (a.type === act.type))
             );
        });

        // Sort by date descending (most recent first) for display, limit to 7 days
        const sortedDays = Object.keys(days).sort((a, b) => days[b].dateObj - days[a].dateObj);
        return sortedDays.slice(0, 7).map(dStr => ({ date: dStr, ...days[dStr] })); // Return most recent 7
    }, [moodHistory, activityHistory]);


    // --- Calendar Day Press Handler ---
    const onDayPress = useCallback((day) => {
         const currentMoodHistory = moodHistory;
         const dateString = day.dateString;
         const entries = currentMoodHistory
             .filter(item => item.timestamp instanceof Date && formatDateISO(item.timestamp) === dateString)
             .sort((a, b) => a.timestamp - b.timestamp); // Sort entries chronologically for the modal

         if (entries.length > 0) {
             setSelectedDateData({ date: dateString, entries: entries });
             setIsModalVisible(true);
         } else {
             setSelectedDateData(null);
             Alert.alert("No Entries", "No mood was logged on this day.");
         }
     }, [moodHistory, formatTime]); // Add formatTime dependency


    // --- Chart Configuration (Color function is defined here and WILL be used) ---
    const chartConfig = useMemo(() => ({
        backgroundGradientFrom: COLORS.cardBackground,
        backgroundGradientTo: COLORS.cardBackground,
        decimalPlaces: 1,
        color: (opacity = 1) => `rgba(${parseInt(COLORS.primary.slice(1, 3), 16)}, ${parseInt(COLORS.primary.slice(3, 5), 16)}, ${parseInt(COLORS.primary.slice(5, 7), 16)}, ${opacity})`, // Use primary color with opacity
        labelColor: (opacity = 1) => `rgba(${parseInt(COLORS.textSecondary.slice(1, 3), 16)}, ${parseInt(COLORS.textSecondary.slice(3, 5), 16)}, ${parseInt(COLORS.textSecondary.slice(5, 7), 16)}, ${opacity})`, // Use textSecondary with opacity
        style: { borderRadius: 16 },
        propsForDots: { r: "4", strokeWidth: "1", stroke: COLORS.primaryLight },
        propsForLabels: { fontSize: 10 },
        propsForBackgroundLines: { stroke: COLORS.border, strokeDasharray: '' } // Solid lines
    }), []); // Keep empty dependency array


    // --- Calendar Theme ---
    const calendarTheme = useMemo(() => ({
         backgroundColor: COLORS.cardBackground,
         calendarBackground: COLORS.cardBackground,
         textSectionTitleColor: COLORS.textSecondary,
         selectedDayBackgroundColor: COLORS.primary,
         selectedDayTextColor: COLORS.white,
         todayTextColor: COLORS.primary,
         dayTextColor: COLORS.text,
         textDisabledColor: COLORS.disabled,
         dotColor: COLORS.primary, // Default dot color (used if not specified in markedDates)
         selectedDotColor: COLORS.white,
         arrowColor: COLORS.primary,
         monthTextColor: COLORS.text,
         indicatorColor: COLORS.primary,
         textDayFontWeight: '300',
         textMonthFontWeight: 'bold',
         textDayHeaderFontWeight: '300',
         textDayFontSize: 14,
         textMonthFontSize: 16,
         textDayHeaderFontSize: 14,
         'stylesheet.calendar.header': {
             week: { marginTop: 5, flexDirection: 'row', justifyContent: 'space-around' }
         }
     }), []);


    // --- Render Loading/Error/Content ---
    const renderContent = () => {
        const isLoadingCombined = loading || loadingActivities || reminderLoading;
        const currentMoodHistory = moodHistory;
        const currentActivityHistory = activityHistory;

        if (isLoadingCombined && !USE_DEMO_DATA) { return <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />; }
        if (error && !USE_DEMO_DATA) { return <Text style={styles.errorText}>{error}</Text>; }
        const noData = currentMoodHistory.length === 0 && currentActivityHistory.length === 0 && !USE_DEMO_DATA && !error && !isLoadingCombined;

        return (
            <>
                {/* Mood Analytics Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Mood Analytics</Text>
                    {/* Show analytics only if there is mood data */}
                    {currentMoodHistory.length > 0 ? (
                        <>
                            <View style={styles.timeRangeSelector}>
                                {['Daily', 'Weekly', 'Monthly'].map(range => ( <TouchableOpacity key={range} style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]} onPress={() => setTimeRange(range)} ><Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>{range}</Text></TouchableOpacity> ))}
                            </View>
                            {/* Line Chart */}
                            {chartData?.lineChartData && chartData.lineChartData.datasets[0].data.length > 0 ? ( // Check if data exists
                                <>
                                    <Text style={styles.chartTitle}>Mood Trend ({timeRange})</Text>
                                    <LineChart
                                        key={`line-${timeRange}-${chartData.lineChartData.datasets[0].data.length}`} // Dynamic key
                                        data={chartData.lineChartData}
                                        width={chartWidth}
                                        height={220}
                                        chartConfig={chartConfig}
                                        bezier
                                        style={styles.chartStyle}
                                        fromZero={false} // Moods don't start at 0
                                        segments={4} // Corresponds to 1, 2, 3, 4, 5 scale
                                        yAxisMin={1} // Explicitly set min/max for mood scale
                                        yAxisMax={5}
                                        yLabelsOffset={5} // Adjust label positioning if needed
                                        paddingRight={20} // Ensure rightmost label/dot visible
                                    />
                                </>
                             ) : (
                                <Text style={styles.infoText}>No mood data for {timeRange.toLowerCase()} trend.</Text>
                             )}
                             {/* Pie Chart */}
                             <Text style={styles.chartTitle}>Mood Distribution ({timeRange})</Text>
                             {chartData?.pieChartData && chartData.pieChartData.length > 0 ? (
                                 <PieChart
                                     key={`pie-${timeRange}-${chartData.pieChartData.length}`} // Dynamic key
                                     data={chartData.pieChartData}
                                     width={chartWidth} // Use adjusted width
                                     height={180}
                                     chartConfig={chartConfig} // Can use the same config
                                     accessor={"population"}
                                     backgroundColor={COLORS.transparent}
                                     paddingLeft={"15"} // Adjust padding if needed
                                     center={[chartWidth / 4, 0]} // Adjust center based on width
                                     absolute // Show absolute values (counts)
                                     style={styles.chartStyle}
                                 />
                              ) : (
                                 <Text style={styles.infoText}>No mood data for {timeRange.toLowerCase()} distribution.</Text>
                              )}
                        </>
                    ) : (
                         // Placeholder shown if no mood history exists, even if activities do
                         <>
                             <Icon name="bar-chart-outline" size={24} color={COLORS.primary} style={styles.sectionIcon} />
                             <Text style={styles.infoText}>Log your moods to see analytics here.</Text>
                         </>
                     )}
                </View>

                {/* AI Insights Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Insights & Tips (Last 7 Days)</Text>
                    <Icon name="sparkles-outline" size={24} color={COLORS.secondary} style={styles.sectionIcon} />
                    {isFetchingInsight ? (
                         <ActivityIndicator size="small" color={COLORS.primary} style={styles.insightLoader} />
                     ) : insightError ? (
                          <Text style={styles.insightErrorText}>{insightError}</Text>
                      ) : (
                         <Text style={styles.insightText}>{aiInsight || "Insights based on your recent mood entries will appear here."}</Text>
                     )}
                    {/* Show refresh button if not fetching, and there's actual mood data */}
                    {!isFetchingInsight && currentMoodHistory.length > 0 && !USE_DEMO_DATA && (
                          <TouchableOpacity
                             onPress={() => fetchAiInsight(moodHistory)} // Pass current mood history
                             style={styles.refreshButton}
                             hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                             disabled={isFetchingInsight}
                          >
                             <Icon name="refresh-outline" size={18} color={isFetchingInsight ? COLORS.disabled : COLORS.primary} />
                         </TouchableOpacity>
                     )}
                </View>

                {/* Timeline Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>Timeline (Recent Days)</Text>
                    <Icon name="git-compare-outline" size={24} color={COLORS.accent} style={styles.sectionIcon} />
                     {/* Show timeline only if there's data */}
                     {timelineData?.length > 0 ? (
                         <View style={styles.timelineContainer}>
                              {timelineData.map((dayData) => (
                                 <View key={dayData.date} style={styles.timelineItem}>
                                     <Text style={styles.timelineDate}>{new Date(dayData.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
                                     <View style={styles.timelineContent}>
                                         <View style={[styles.timelineMoodDot, { backgroundColor: getMoodColor(dayData.predominantMood) || COLORS.neutral }]} />
                                         <View style={styles.timelineActivities}>
                                              {dayData.activities.map((act, idx) => (
                                                  <TouchableOpacity key={idx} style={styles.activityIconTouchable} onPress={() => Alert.alert( act.type, `${USE_DEMO_DATA ? 'Demo' : 'Logged'} ${act.type}.` + (act.data?.duration ? ` Duration: ${act.data.duration} hrs.` : '') )} >
                                                     <Icon name={act.icon} size={18} color={act.color} />
                                                 </TouchableOpacity>
                                              ))}
                                              {dayData.activities.length === 0 && <Text style={styles.noActivityText}>-</Text>}
                                          </View>
                                      </View>
                                  </View>
                             ))}
                             <Text style={styles.correlationText}>See how activities and mood align over time.</Text>
                         </View>
                     ) : (
                          <Text style={styles.infoText}>Log your moods and activities to build your timeline.</Text>
                      )}
                </View>

                {/* Calendar Section */}
                 <View style={styles.sectionCard}>
                     <Text style={styles.sectionTitle}>Mood Calendar</Text>
                     <Icon name="calendar-outline" size={24} color={COLORS.accent} style={styles.sectionIcon} />
                     <Calendar
                          key={Object.keys(markedDates).length} // Force re-render when marked dates change
                          current={formatDateISO(new Date())}
                          onDayPress={onDayPress}
                          markedDates={markedDates}
                          markingType={'dot'}
                          monthFormat={'yyyy MMMM'}
                          theme={calendarTheme}
                          style={styles.calendarStyle}
                      />
                     <Text style={styles.infoText}>Tap a day with a colored dot to see your entries.</Text>
                  </View>

                {/* Reminders Section */}
                 <View style={styles.sectionCard}>
                     <Text style={styles.sectionTitle}>Daily Reminder</Text>
                     <Icon name="alarm-outline" size={24} color={COLORS.primary} style={styles.sectionIcon} />
                     <Text style={styles.reminderInfoText}>Set a time for your daily mood check-in.</Text>
                     <TouchableOpacity style={styles.timePickerButton} onPress={() => setShowTimePicker(true)} disabled={reminderLoading} >
                          <Text style={styles.timePickerButtonText}>Selected Time: {formatTime(reminderTime)}</Text>
                          <Icon name="time-outline" size={18} color={COLORS.primary} style={{ marginLeft: 8 }} />
                      </TouchableOpacity>
                     {showTimePicker && (
                          <DateTimePicker value={reminderTime} mode="time" is24Hour={false} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onTimeChange} />
                      )}
                     {showTimePicker && Platform.OS === 'ios' && (
                          <TouchableOpacity style={styles.iosPickerDoneButton} onPress={() => setShowTimePicker(false)} ><Text style={styles.iosPickerDoneButtonText}>Done</Text></TouchableOpacity>
                      )}
                     <View style={styles.reminderButtonsContainer}>
                          <TouchableOpacity style={[styles.reminderActionButton, styles.setButton]} onPress={handleSetReminder} disabled={reminderLoading} ><Text style={styles.reminderActionButtonText}>{isReminderSet ? 'Update Time' : 'Set Reminder'}</Text></TouchableOpacity>
                          {isReminderSet && ( <TouchableOpacity style={[styles.reminderActionButton, styles.cancelButton]} onPress={handleCancelReminder} disabled={reminderLoading} ><Text style={styles.reminderActionButtonText}>Cancel Reminder</Text></TouchableOpacity> )}
                      </View>
                     {reminderLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 10 }} />}
                     {!reminderLoading && ( <Text style={styles.reminderSetText}> {isReminderSet ? `Reminder is active for ${formatTime(reminderTime)} daily.` : "Reminder is currently off."} </Text> )}
                  </View>
            </>
        );
    };

    // --- Final Render of the Screen ---
    return (
        <LinearGradient colors={[COLORS.background, COLORS.cardBackground]} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={styles.screenTitle}>Your Mood Journey</Text>
                {renderContent()}
            </ScrollView>

             {/* Calendar Day Details Modal */}
            <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)} >
               <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
                   <Pressable style={styles.modalContent} onPress={() => { /* Prevent closing */ }}>
                       <Text style={styles.modalTitle}>
                           Entries for {selectedDateData?.date ? new Date(selectedDateData.date + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                       </Text>
                       <ScrollView style={styles.modalScroll}>
                           {selectedDateData?.entries.map((entry, index) => (
                               <View key={entry.id || index} style={styles.modalEntry}>
                                   <View style={styles.modalMoodHeader}>
                                       <View style={styles.modalMoodInfo}>
                                           <View style={[styles.moodDot, { backgroundColor: getMoodColor(entry.mood)}]} />
                                           <Text style={styles.modalMoodText} numberOfLines={1} ellipsizeMode='tail'> {entry.mood || 'N/A'} </Text>
                                       </View>
                                       <Text style={styles.modalTimestampText}> ({entry.timestamp instanceof Date ? formatTime(entry.timestamp) : 'Invalid time'}) </Text>
                                   </View>
                                   {entry.note ? ( <Text style={styles.modalNoteText}>{entry.note}</Text> ) : ( <Text style={styles.modalNoteTextMuted}>No note added for this entry.</Text> )}
                               </View>
                           ))}
                           {(!selectedDateData || !selectedDateData.entries || selectedDateData.entries.length === 0) && ( <Text style={styles.modalNoteTextMuted}>No mood entries found for this day.</Text> )}
                       </ScrollView>
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
// Make sure all styles used above are defined correctly here
const styles = StyleSheet.create({
    container: { flex: 1, },
    scrollContainer: { padding: 20, paddingBottom: 50, },
    screenTitle: { fontSize: 26, fontWeight: 'bold', color: COLORS.text, marginBottom: 25, textAlign: 'center', },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    errorText: { color: COLORS.error, textAlign: 'center', marginTop: 30, fontSize: 16, paddingHorizontal: 20, },
    infoText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 15, marginBottom: 15, fontSize: 14, lineHeight: 20, paddingHorizontal: 10, },
    sectionCard: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 15, marginBottom: 20, borderWidth: Platform.OS === 'android' ? 0 : 1, borderColor: COLORS.border, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.10, shadowRadius: 2.22, elevation: 3, },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 15, paddingRight: 30 },
    sectionIcon: { position: 'absolute', top: 15, right: 15, opacity: 0.7, },
    insightLoader: { marginVertical: 10, alignSelf: 'center', },
    insightErrorText: { fontSize: 14, color: COLORS.error, lineHeight: 20, fontStyle: 'italic', textAlign:'center', paddingHorizontal: 10, marginVertical: 10, },
    insightText: { fontSize: 14, color: COLORS.text, lineHeight: 21, paddingRight: 30, textAlign: 'left', minHeight: 40, marginVertical: 10, },
    refreshButton: { position: 'absolute', bottom: 10, right: 10, padding: 5, },
    chartTitle: { fontSize: 15, fontWeight: '500', color: COLORS.text, marginBottom: 5, textAlign: 'left', marginTop: 10, },
    chartStyle: { marginVertical: 8, borderRadius: 16, paddingRight: 10, }, // Ensure paddingRight accommodates labels
    timeRangeSelector: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 15, backgroundColor: COLORS.primaryLight, borderRadius: 20, padding: 4, alignSelf: 'center', },
    timeRangeButton: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 16, },
    timeRangeButtonActive: { backgroundColor: COLORS.primary, },
    timeRangeText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', },
    timeRangeTextActive: { color: COLORS.white, },
    timelineContainer: { marginTop: 10, },
    timelineItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border, },
    timelineDate: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500', width: 85, textAlign: 'left', marginRight: 5, },
    timelineContent: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 5, },
    timelineMoodDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10, borderWidth: 1, borderColor: COLORS.border, },
    timelineActivities: { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap', },
    activityIconTouchable: { marginLeft: 8, padding: 2, },
    noActivityText: { fontSize: 14, color: COLORS.lightText, marginLeft: 8, fontStyle: 'italic', },
    correlationText: { fontSize: 13, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 15, textAlign: 'center', lineHeight: 18, },
    calendarStyle: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, },
    reminderInfoText: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 15, lineHeight: 20, },
    timePickerButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20, justifyContent: 'space-between', },
    timePickerButtonText: { fontSize: 15, color: COLORS.text, },
    iosPickerDoneButton: { alignSelf: 'flex-end', paddingVertical: 8, paddingHorizontal: 15, marginTop: -10, marginBottom: 10, },
    iosPickerDoneButtonText: { color: COLORS.primary, fontSize: 16, fontWeight: '600', },
    reminderButtonsContainer: { flexDirection: 'row', justifyContent: 'space-evenly', marginBottom: 10, flexWrap: 'wrap', },
    reminderActionButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', minWidth: 120, marginVertical: 5, },
    setButton: { backgroundColor: COLORS.primary, marginRight: 5, marginLeft: 5, },
    cancelButton: { backgroundColor: COLORS.error, marginRight: 5, marginLeft: 5, },
    reminderActionButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 14, },
    reminderSetText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginTop: 10, fontStyle: 'italic', },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.4)', },
    modalContent: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 20, width: '85%', maxHeight: '70%', alignItems: 'center', shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5, },
    modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 15, textAlign: 'center', },
    modalScroll: { width: '100%', marginBottom: 15, },
    modalEntry: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 12, width: '100%', },
    modalMoodHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, justifyContent: 'space-between', width: '100%', },
    modalMoodInfo: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, marginRight: 10, },
    moodDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8, },
    modalMoodText: { fontSize: 15, fontWeight: '500', color: COLORS.text, flexShrink: 1, },
    modalTimestampText: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'right', marginLeft: 'auto', flexShrink: 0, },
    modalNoteText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4, paddingLeft: 18, width: '100%', lineHeight: 19, },
    modalNoteTextMuted: { fontSize: 14, color: COLORS.lightText, fontStyle: 'italic', marginTop: 4, paddingLeft: 18, width: '100%', },
    closeButton: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20, marginTop: 10, },
    closeButtonText: { color: COLORS.white, fontWeight: '600', fontSize: 15, },
});

export default MoodTrackerScreen;