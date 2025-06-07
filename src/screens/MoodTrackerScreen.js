/**
 * MoodTrackerScreen.js
 * REBUILT & FINALIZED - June 8, 2025
 * - UPGRADED: Logic and UI now support the expanded 5-mood system (Great, Good, Okay, Sad, Awful).
 * - ENHANCED: Demo data generation now uses all 5 moods for a richer, more realistic showcase.
 * - ADDED: New colors to the theme for more descriptive mood visualization in charts and calendars.
 * - Maintained the robust, component-based architecture for performance and readability.
 */
import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity,
    ActivityIndicator, Modal, Pressable, Platform, Animated, Alert
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Calendar } from 'react-native-calendars';
import { getFirestore, collection, orderBy, onSnapshot, query } from '@react-native-firebase/firestore';
import { AuthContext } from './AuthProvider';
import notifee, { TriggerType, RepeatFrequency } from '@notifee/react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GEMINI_API_KEY } from '@env';

// --- Global Constants & Configuration ---
const db = getFirestore();
const { width: screenWidth } = Dimensions.get('window');
const REMINDER_TIME_KEY = '@MoodTracker_ReminderTime';
const REMINDER_ID_KEY = '@MoodTracker_ReminderId';

// ✅ --- DEMO MODE TOGGLE ---
const USE_DEMO_DATA = true;

// --- ✅ Refined & Expanded Color Scheme ---
const COLORS = {
    background: '#F7F9FC', primary: '#4A90E2', primaryLight: '#D4E4F7', secondary: '#50E3C2',
    accent: '#F5A623', text: '#333A45', textSecondary: '#7A8C99', white: '#FFFFFF',
    cardBackground: '#FFFFFF', border: '#E8EDF2', error: '#D0021B', disabled: '#CED4DA',
    // Mood Specific Colors
    greatColor: '#4CAF50',  // Bright Green
    goodColor: '#81C784',   // Lighter Green
    okayColor: '#FFC107',   // Amber/Yellow
    sadColor: '#64B5F6',    // Lighter Blue
    awfulColor: '#F5A623',  // Orange
    neutral: '#B0BEC5',
    // Activity Colors
    sleepColor: '#4A90E2', exerciseColor: '#F5A623', socialColor: '#50E3C2',
    skeletonBase: '#E8EDF2', skeletonHighlight: '#F7F9FC',
};

// --- ✅ UPGRADED Helper Functions for 5 Moods ---
const getMoodValue = (mood) => ({ 'Great': 5, 'Good': 4, 'Okay': 3, 'Sad': 2, 'Awful': 1 }[mood] || 0);
const getMoodColor = (mood) => ({
    'Great': COLORS.greatColor,
    'Good': COLORS.goodColor,
    'Okay': COLORS.okayColor,
    'Sad': COLORS.sadColor,
    'Awful': COLORS.awfulColor
}[mood] || COLORS.neutral);

const formatDateISO = (date) => (date instanceof Date && !isNaN(date)) ? date.toISOString().split('T')[0] : '';
const formatTime = (date) => (date instanceof Date && !isNaN(date)) ? date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }) : "Invalid Time";
const getDateNDaysAgo = (days) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(0, 0, 0, 0); return d; };

// --- ✅ ENHANCED DEMO DATA Creation ---
const createDemoData = () => {
    const moods = [];
    const activities = [];
    const baseDate = new Date();
    const moodLabels = ['Great', 'Good', 'Okay', 'Sad', 'Awful'];

    for (let i = 0; i < 30; i++) {
        const date = new Date(baseDate);
        date.setDate(baseDate.getDate() - i);
        if (Math.random() > 0.3) {
            for (let j = 0; j < Math.ceil(Math.random() * 2); j++) {
                const mood = moodLabels[Math.floor(Math.random() * moodLabels.length)];
                const hour = 9 + Math.floor(Math.random() * 12);
                date.setHours(hour, Math.floor(Math.random() * 60));
                moods.push({ id: `m${i}-${j}`, mood, timestamp: new Date(date), note: `Sample note for a ${mood.toLowerCase()} day.` });
            }
        }
        if (Math.random() > 0.5) activities.push({ id: `a${i}-sleep`, type: 'Sleep', timestamp: new Date(date), duration: 6 + Math.random() * 3 });
        if (Math.random() > 0.6) activities.push({ id: `a${i}-exercise`, type: 'Exercise', timestamp: new Date(date), duration: 0.5 + Math.random() });
    }
    return { demoMoodHistory: moods, demoActivityHistory: activities };
};


// --- Custom Hooks (useMoodData, useAiInsight, useReminder) ---
// No changes needed in the hooks themselves, they adapt to the data.
const useMoodData = (user) => {
    const [moodHistory, setMoodHistory] = useState([]);
    const [activityHistory, setActivityHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (USE_DEMO_DATA) {
            console.log("DEMO MODE: Using local sample data.");
            const { demoMoodHistory, demoActivityHistory } = createDemoData();
            setMoodHistory(demoMoodHistory);
            setActivityHistory(demoActivityHistory);
            setLoading(false);
            return;
        }

        if (!user) {
            setLoading(false);
            setError("Please log in to view your journey.");
            return;
        }

        const moodQuery = query(collection(db, 'users', user.uid, 'moodHistory'), orderBy('timestamp', 'desc'));
        const activityQuery = query(collection(db, 'users', user.uid, 'activityHistory'), orderBy('timestamp', 'desc'));

        const unsubMood = onSnapshot(moodQuery, (snap) => {
            const history = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() })).filter(item => item.timestamp);
            setMoodHistory(history);
            if (loading) setLoading(false);
        }, (err) => {
            console.error("Firestore mood error:", err);
            setError("Could not load mood data.");
            setLoading(false);
        });

        const unsubActivity = onSnapshot(activityQuery, (snap) => {
             const history = snap.docs.map(doc => ({ id: doc.id, ...doc.data(), timestamp: doc.data().timestamp?.toDate() })).filter(item => item.timestamp);
             setActivityHistory(history);
        }, (err) => console.error("Firestore activity error:", err));


        return () => {
            unsubMood();
            unsubActivity();
        };
    }, [user, loading]);

    return { moodHistory, activityHistory, loading, error };
};

const useAiInsight = (moodHistory) => {
    const [insight, setInsight] = useState('');
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState(null);

    const fetchInsight = useCallback(async () => {
        if (!GEMINI_API_KEY || GEMINI_API_KEY.length < 10) {
            setError("AI feature not configured.");
            return;
        }
        const sevenDaysAgo = getDateNDaysAgo(6);
        const recentHistory = moodHistory.filter(item => item.timestamp >= sevenDaysAgo);

        if (recentHistory.length < 3) {
            setInsight("Log your mood for a few more days to unlock personalized insights.");
            return;
        }

        setIsFetching(true);
        setError(null);
        try {
            const prompt = `You are a gentle wellness companion. Based on this 7-day mood data (${JSON.stringify(recentHistory.map(m => m.mood))}), provide one *very short* (1-2 sentences MAX), positive, and encouraging insight. Be concise and warm.`;
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });
            if (!response.ok) throw new Error('Failed to get a response from the AI service.');
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!text) throw new Error('Received an invalid response format.');
            setInsight(text.trim());
        } catch (err) {
            console.error("AI Insight Error:", err);
            setError("Could not generate an insight at this time.");
        } finally {
            setIsFetching(false);
        }
    }, [moodHistory]);

    useEffect(() => {
        const timer = setTimeout(() => {
             if (moodHistory.length > 0) {
                fetchInsight();
             }
        }, 1000);
        return () => clearTimeout(timer);
    }, [moodHistory, fetchInsight]);

    return { insight, isFetching, error, refreshInsight: fetchInsight };
};

const useReminder = () => {
    const [time, setTime] = useState(new Date());
    const [isSet, setIsSet] = useState(false);
    const [loading, setLoading] = useState(true);
    useEffect(() => { const loadSettings = async () => { const timeStr = await AsyncStorage.getItem(REMINDER_TIME_KEY); const storedId = await AsyncStorage.getItem(REMINDER_ID_KEY); if(storedId) setIsSet(true); const newTime = new Date(); if (timeStr) { const [h, m] = timeStr.split(':').map(Number); newTime.setHours(h,m,0,0); } else { newTime.setHours(9,0,0,0); } setTime(newTime); setLoading(false); }; loadSettings(); }, []);
    const getNextTriggerTimestamp = (reminderTime) => { const now = new Date(); const triggerDate = new Date(reminderTime.getTime()); triggerDate.setFullYear(now.getFullYear(), now.getMonth(), now.getDate()); if (triggerDate.getTime() <= now.getTime()) { triggerDate.setDate(triggerDate.getDate() + 1); } return triggerDate.getTime(); };
    const scheduleReminder = useCallback(async (selectedTime) => { try { const existingId = await AsyncStorage.getItem(REMINDER_ID_KEY); if (existingId) await notifee.cancelNotification(existingId); await notifee.requestPermission(); const channelId = await notifee.createChannel({ id: 'mood-reminders', name: 'Mood Reminders', importance: 4 }); const triggerTimestamp = getNextTriggerTimestamp(selectedTime); const trigger = { type: TriggerType.TIMESTAMP, timestamp: triggerTimestamp, repeatFrequency: RepeatFrequency.DAILY }; const reminderId = await notifee.createTriggerNotification({ title: 'Your Daily Check-in', body: 'How are you feeling today? Take a moment to log your mood.', android: { channelId, pressAction: { id: 'default' } } }, trigger); await AsyncStorage.setItem(REMINDER_TIME_KEY, `<span class="math-inline">\{selectedTime\.getHours\(\)\}\:</span>{selectedTime.getMinutes()}`); await AsyncStorage.setItem(REMINDER_ID_KEY, reminderId); setIsSet(true); Alert.alert('Reminder Set', `You'll be reminded daily at ${formatTime(selectedTime)}.`); } catch (e) { console.error("Failed to set reminder:", e); Alert.alert('Error', 'Could not set the reminder.'); } }, []);
    const cancelReminder = useCallback(async () => { const reminderId = await AsyncStorage.getItem(REMINDER_ID_KEY); if(reminderId) await notifee.cancelNotification(reminderId); await AsyncStorage.removeItem(REMINDER_ID_KEY); await AsyncStorage.removeItem(REMINDER_TIME_KEY); setIsSet(false); Alert.alert('Reminder Canceled', 'You will no longer receive daily reminders.'); }, []);
    return { time, setTime, isSet, loading, scheduleReminder, cancelReminder };
};

// --- Reusable UI Components ---
const Card = ({ children, title, iconName, iconColor, style }) => ( <View style={[styles.card, style]}>{title && (<View style={styles.cardHeader}><Icon name={iconName} size={20} color={iconColor || COLORS.textSecondary} style={styles.cardIcon} /><Text style={styles.cardTitle}>{title}</Text></View>)}<View style={styles.cardContent}>{children}</View></View> );
const SkeletonLoader = ({ height = 150 }) => { const shimmer = useRef(new Animated.Value(0)).current; useEffect(() => { Animated.loop(Animated.timing(shimmer, { toValue: 1, duration: 1000, useNativeDriver: true })).start(); }, [shimmer]); const translateX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-screenWidth, screenWidth] }); return ( <View style={[styles.skeletonContainer, { height }]}><Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}><LinearGradient colors={[COLORS.skeletonBase, COLORS.skeletonHighlight, COLORS.skeletonBase]} style={{ flex: 1 }} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} /></Animated.View></View> ); };
const EmptyState = ({ icon, message }) => ( <View style={styles.emptyStateContainer}><Icon name={icon} size={32} color={COLORS.disabled} /><Text style={styles.emptyStateText}>{message}</Text></View> );

// --- Feature Card Components ---
const AnalyticsCard = React.memo(({ moodHistory }) => {
    const [timeRange, setTimeRange] = useState('Weekly');
    const chartConfig = useMemo(() => ({ backgroundGradientFrom: COLORS.cardBackground, backgroundGradientTo: COLORS.cardBackground, decimalPlaces: 1, color: (opacity = 1) => `rgba(74, 144, 226, ${opacity})`, labelColor: (opacity = 1) => `rgba(122, 140, 153, ${opacity})`, propsForDots: { r: "4", strokeWidth: "2", stroke: COLORS.primaryLight }, propsForBackgroundLines: { stroke: COLORS.border } }), []);
    const { lineChartData, pieChartData } = useMemo(() => { if (!moodHistory.length) return { lineChartData: null, pieChartData: [] }; const days = timeRange === 'Daily' ? 1 : (timeRange === 'Weekly' ? 7 : 30); const startDate = getDateNDaysAgo(days - 1); const filtered = moodHistory.filter(item => item.timestamp >= startDate); const pieData = Object.entries(filtered.reduce((acc, { mood }) => { acc[mood] = (acc[mood] || 0) + 1; return acc; }, {})).map(([mood, count]) => ({ name: mood, population: count, color: getMoodColor(mood), legendFontColor: COLORS.text, legendFontSize: 13 })); let lineData = { labels: [], datasets: [{ data: [], strokeWidth: 2 }] }; if (timeRange === 'Daily') { const dailyEntries = filtered.filter(item => formatDateISO(item.timestamp) === formatDateISO(new Date())).sort((a,b) => a.timestamp - b.timestamp); lineData.labels = dailyEntries.map(e => formatTime(e.timestamp)); lineData.datasets[0].data = dailyEntries.map(e => getMoodValue(e.mood)); } else { const dailyAverages = filtered.reduce((acc, item) => { const dStr = formatDateISO(item.timestamp); if (!acc[dStr]) acc[dStr] = { total: 0, count: 0 }; acc[dStr].total += getMoodValue(item.mood); acc[dStr].count++; return acc; }, {}); for (let i = 0; i < days; i++) { const tempDate = new Date(startDate); tempDate.setDate(startDate.getDate() + i); const dStr = formatDateISO(tempDate); const labelFormat = days === 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' }; if (days === 7 || i % 5 === 0 || i === days - 1) lineData.labels.push(tempDate.toLocaleDateString('en-US', labelFormat)); else lineData.labels.push(''); lineData.datasets[0].data.push(dailyAverages[dStr] ? dailyAverages[dStr].total / dailyAverages[dStr].count : 0); } } return { lineChartData: lineData.datasets[0].data.length > 0 ? lineData : null, pieChartData: pieData }; }, [moodHistory, timeRange]);
    if (!moodHistory.length && !USE_DEMO_DATA) return <Card title="Mood Analytics" iconName="bar-chart-outline" iconColor={COLORS.primary}><EmptyState icon="analytics-outline" message="Log your moods to see your trends." /></Card>;
    return ( <Card title="Mood Analytics" iconName="bar-chart-outline" iconColor={COLORS.primary}><View style={styles.timeRangeSelector}>{['Daily', 'Weekly', 'Monthly'].map(range => (<TouchableOpacity key={range} style={[styles.timeRangeButton, timeRange === range && styles.timeRangeButtonActive]} onPress={() => setTimeRange(range)}><Text style={[styles.timeRangeText, timeRange === range && styles.timeRangeTextActive]}>{range}</Text></TouchableOpacity>))}</View><Text style={styles.chartTitle}>Mood Trend</Text>{lineChartData ? (<LineChart key={`line-${timeRange}`} data={lineChartData} width={screenWidth - 80} height={220} chartConfig={chartConfig} bezier style={styles.chartStyle} fromZero yAxisMin={1} yAxisMax={5} />) : <Text style={styles.infoText}>No mood data for this period.</Text>}<Text style={styles.chartTitle}>Mood Distribution</Text>{pieChartData.length > 0 ? (<PieChart key={`pie-${timeRange}`} data={pieChartData} width={screenWidth - 40} height={180} chartConfig={chartConfig} accessor={"population"} backgroundColor={"transparent"} paddingLeft={"15"} center={[10, 0]} absolute />) : <Text style={styles.infoText}>No distribution data.</Text>}</Card> );
});

const InsightCard = React.memo(({ moodHistory }) => {
    const { insight, isFetching, error, refreshInsight } = useAiInsight(moodHistory);
    return ( <Card title="Insights & Tips" iconName="sparkles-outline" iconColor={COLORS.accent}><View style={styles.insightContent}>{isFetching ? <ActivityIndicator color={COLORS.primary} /> : error ? <Text style={styles.errorText}>{error}</Text> : <Text style={styles.insightText}>{insight}</Text>}<TouchableOpacity onPress={refreshInsight} disabled={isFetching} style={styles.refreshButton}><Icon name="refresh-outline" size={20} color={isFetching ? COLORS.disabled : COLORS.primary} /></TouchableOpacity></View></Card> );
});

const TimelineCard = React.memo(({ moodHistory, activityHistory }) => {
    const timelineData = useMemo(() => { if (!moodHistory.length && !activityHistory.length) return []; const combined = [...moodHistory, ...activityHistory].filter(i => i.timestamp).sort((a, b) => b.timestamp - a.timestamp); const days = {}; combined.forEach(item => { const dStr = formatDateISO(item.timestamp); if (!days[dStr]) days[dStr] = { dateObj: item.timestamp, moods: [], activities: [] }; if (item.mood) days[dStr].moods.push(item); else if (item.type) days[dStr].activities.push(item); }); Object.keys(days).forEach(dStr => { if (days[dStr].moods.length > 0) { const moodCounts = days[dStr].moods.reduce((acc, { mood }) => { acc[mood] = (acc[mood] || 0) + 1; return acc; }, {}); days[dStr].predominantMood = Object.keys(moodCounts).sort((a, b) => moodCounts[b] - moodCounts[a])[0]; } }); return Object.keys(days).sort((a, b) => days[b].dateObj - days[a].dateObj).slice(0, 7).map(dStr => ({ date: dStr, ...days[dStr] })); }, [moodHistory, activityHistory]);
    if (timelineData.length === 0 && !USE_DEMO_DATA) return <Card title="Recent Timeline" iconName="time-outline" iconColor={COLORS.secondary}><EmptyState icon="leaf-outline" message="Your recent history will appear here." /></Card>;
    return ( <Card title="Recent Timeline" iconName="time-outline" iconColor={COLORS.secondary}>{timelineData.map((day, index) => (<View key={day.date} style={styles.timelineItem}><View style={styles.timelineDecorator}><View style={[styles.timelineDot, { backgroundColor: getMoodColor(day.predominantMood) || COLORS.neutral }]} />{index < timelineData.length - 1 && <View style={styles.timelineLine} />}</View><View style={styles.timelineContent}><Text style={styles.timelineDate}>{new Date(day.date + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long' })}</Text><Text style={styles.timelineSubText}>{day.predominantMood ? `Overall mood: ${day.predominantMood}` : "No mood logged"}</Text></View></View>))}</Card> );
});

const CalendarCard = React.memo(({ moodHistory, onDayPress }) => {
    const markedDates = useMemo(() => moodHistory.reduce((acc, item) => { const dateString = formatDateISO(item.timestamp); if(dateString) acc[dateString] = { marked: true, dotColor: getMoodColor(item.mood) }; return acc; }, {}), [moodHistory]);
    return ( <Card title="Mood Calendar" iconName="calendar-outline" iconColor={COLORS.accent}><Calendar onDayPress={onDayPress} markedDates={markedDates} theme={{ calendarBackground: COLORS.cardBackground, dayTextColor: COLORS.text, textDisabledColor: COLORS.disabled, monthTextColor: COLORS.primary, arrowColor: COLORS.primary, todayTextColor: COLORS.accent, selectedDayBackgroundColor: COLORS.primary, selectedDayTextColor: COLORS.white }} /></Card> );
});

const ReminderCard = () => {
    const { time, setTime, isSet, loading, scheduleReminder, cancelReminder } = useReminder();
    const [showPicker, setShowPicker] = useState(false);
    const onTimeChange = useCallback((event, selectedDate) => { setShowPicker(Platform.OS === 'ios'); if (selectedDate) setTime(selectedDate); }, [setTime]);
    return ( <Card title="Daily Reminder" iconName="alarm-outline" iconColor={COLORS.primary}>{loading ? <ActivityIndicator color={COLORS.primary}/> : ( <> <Text style={styles.infoText}>Set a time for your daily mood check-in.</Text><TouchableOpacity style={styles.timePickerButton} onPress={() => setShowPicker(true)}><Text style={styles.timePickerButtonText}>Check-in at: {formatTime(time)}</Text><Icon name="time-outline" size={18} color={COLORS.primary} /></TouchableOpacity>{showPicker && <DateTimePicker value={time} mode="time" display="spinner" onChange={onTimeChange} />}<View style={styles.reminderButtonsContainer}><TouchableOpacity style={styles.setButton} onPress={() => scheduleReminder(time)}><Text style={styles.reminderActionButtonText}>{isSet ? 'Update' : 'Set'}</Text></TouchableOpacity>{isSet && <TouchableOpacity style={styles.cancelButton} onPress={cancelReminder}><Text style={styles.reminderActionButtonText}>Cancel</Text></TouchableOpacity>}</View></> )}</Card> );
};

// --- Main Screen Component ---
const MoodTrackerScreen = () => {
    const { user } = useContext(AuthContext);
    const { moodHistory, activityHistory, loading, error } = useMoodData(user);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedDateData, setSelectedDateData] = useState(null);
    const onDayPress = useCallback((day) => { const entries = moodHistory.filter(item => formatDateISO(item.timestamp) === day.dateString).sort((a,b) => a.timestamp - b.timestamp); if (entries.length > 0) { setSelectedDateData({ date: day.dateString, entries }); setIsModalVisible(true); } else { Alert.alert("No Entries", "No mood was logged on this day."); } }, [moodHistory]);

    const renderContent = () => {
        if (loading && !USE_DEMO_DATA) return <><Card title="Insights & Tips"><SkeletonLoader height={80} /></Card><Card title="Mood Analytics"><SkeletonLoader height={400} /></Card><Card title="Recent Timeline"><SkeletonLoader height={200} /></Card><Card title="Mood Calendar"><SkeletonLoader height={350} /></Card></>;
        if (error) return <Card title="Error"><Text style={styles.errorText}>{error}</Text></Card>;
        return (
            <>
                <InsightCard moodHistory={moodHistory} />
                <AnalyticsCard moodHistory={moodHistory} />
                <TimelineCard moodHistory={moodHistory} activityHistory={activityHistory} />
                <CalendarCard moodHistory={moodHistory} onDayPress={onDayPress} />
                <ReminderCard />
            </>
        );
    };

    return (
        <LinearGradient colors={[COLORS.background, COLORS.primaryLight]} style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <Text style={styles.screenTitle}>Your Mood Journey</Text>
                {renderContent()}
            </ScrollView>
            <Modal animationType="fade" transparent={true} visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setIsModalVisible(false)}>
                    <Pressable style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Entries for {selectedDateData?.date}</Text>
                        <ScrollView style={styles.modalScroll}>{selectedDateData?.entries.map((entry) => (<View key={entry.id} style={styles.modalEntry}><View style={styles.modalMoodHeader}><View style={[styles.moodDot, { backgroundColor: getMoodColor(entry.mood)}]} /><Text style={styles.modalMoodText}>{entry.mood}</Text><Text style={styles.modalTimestampText}>{formatTime(entry.timestamp)}</Text></View>{entry.note && <Text style={styles.modalNoteText}>{entry.note}</Text>}</View>))}</ScrollView>
                        <TouchableOpacity style={styles.closeButton} onPress={() => setIsModalVisible(false)}><Text style={styles.closeButtonText}>Close</Text></TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </LinearGradient>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContainer: { paddingHorizontal: 15, paddingTop: 20, paddingBottom: 50 },
    screenTitle: { fontSize: 28, fontWeight: 'bold', color: COLORS.text, marginBottom: 20, textAlign: 'center' },
    card: { backgroundColor: COLORS.cardBackground, borderRadius: 20, marginBottom: 20, shadowColor: "#999", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 5 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    cardIcon: { marginRight: 12 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text },
    cardContent: { paddingHorizontal: 20, paddingVertical: 15 },
    errorText: { color: COLORS.error, textAlign: 'center', fontSize: 16, padding: 20 },
    infoText: { color: COLORS.textSecondary, textAlign: 'center', marginVertical: 20, fontSize: 14 },
    skeletonContainer: { backgroundColor: COLORS.skeletonBase, borderRadius: 8, overflow: 'hidden', margin: 20 },
    emptyStateContainer: { justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
    emptyStateText: { marginTop: 10, fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
    insightContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
    insightText: { flex: 1, fontSize: 15, color: COLORS.text, lineHeight: 22 },
    refreshButton: { padding: 8, marginLeft: 10 },
    timeRangeSelector: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20, backgroundColor: COLORS.background, borderRadius: 20, padding: 4 },
    timeRangeButton: { paddingVertical: 8, paddingHorizontal: 18, borderRadius: 16 },
    timeRangeButtonActive: { backgroundColor: COLORS.primary, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
    timeRangeText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
    timeRangeTextActive: { color: COLORS.white },
    chartTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 10, textAlign: 'center', marginTop: 10 },
    chartStyle: { alignSelf: 'center', marginTop: 10 },
    timelineItem: { flexDirection: 'row' },
    timelineDecorator: { alignItems: 'center', marginRight: 15 },
    timelineDot: { width: 14, height: 14, borderRadius: 7, zIndex: 1, borderWidth: 2, borderColor: COLORS.cardBackground },
    timelineLine: { flex: 1, width: 2, backgroundColor: COLORS.border },
    timelineContent: { flex: 1, paddingBottom: 25 },
    timelineDate: { fontSize: 14, fontWeight: 'bold', color: COLORS.text, marginBottom: 4 },
    timelineSubText: { fontSize: 14, color: COLORS.textSecondary },
    reminderButtonsContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 15 },
    setButton: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20, marginRight: 10 },
    cancelButton: { backgroundColor: COLORS.textSecondary, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20 },
    reminderActionButtonText: { color: COLORS.white, fontWeight: 'bold' },
    timePickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
    timePickerButtonText: { fontSize: 16, color: COLORS.primary, fontWeight: '600' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
    modalContent: { backgroundColor: COLORS.cardBackground, borderRadius: 16, padding: 20, width: '90%', maxHeight: '70%', alignItems: 'center' },
    modalTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 15 },
    modalScroll: { width: '100%', marginBottom: 15 },
    modalEntry: { borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: 12, width: '100%' },
    modalMoodHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    moodDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    modalMoodText: { fontSize: 16, fontWeight: '500', color: COLORS.text },
    modalTimestampText: { fontSize: 12, color: COLORS.textSecondary },
    modalNoteText: { fontSize: 14, color: COLORS.textSecondary, marginTop: 5, paddingLeft: 18 },
    closeButton: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20, marginTop: 10 },
    closeButtonText: { color: COLORS.white, fontWeight: '600' },
});

export default MoodTrackerScreen;