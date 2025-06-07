import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Platform,
    ActivityIndicator,
    RefreshControl // Keep this import
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // Using MCI for moon, calendar, info
import Ionicons from 'react-native-vector-icons/Ionicons'; // For back arrow
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// --- Colors ---
const colors = {
    primary: '#8E97FD', // Using a purple/blue shade often associated with sleep
    primaryDark: '#5E69CC',
    background: '#F4F7FA',
    cardBackground: '#FFFFFF',
    textDark: '#263238',
    textHeader: '#333333',
    textSecondary: '#546E7A',
    iconGrey: '#607D8B',
    tabInactiveBackground: '#E9EEF2',
    tabInactiveText: '#607D8B',
    tabActiveText: '#FFFFFF',
    lightBorder: '#CFD8DC',
    dateSeparator: '#ECEFF1',
    sleepScoreBarColor: '#FFD54F', // Yellowish for sleep score bars
    sleepStageBarColor: '#E0E0E0', // Light grey for placeholder bars
    axisColor: '#B0BEC5',
};

// --- Demo Data (Already defined and used) ---
const DEMO_SLEEP_DATA = {
    'Day': { totalSleep: '--', dailyGoal: '8hr', sleepDebt: '--', deep: '--', light: '--', awake: '--', rem: '--', score: [75, 25] /* Example: 75% fill */ },
    'Week': { totalSleep: '7h 15m', dailyGoal: '8hr', sleepDebt: '3h 45m', deep: '1h 30m', light: '4h 0m', awake: '45m', rem: '1h 0m', score: [80, 20] },
    'Month': { totalSleep: '7h 5m', dailyGoal: '8hr', sleepDebt: '28h 10m', deep: '1h 20m', light: '3h 55m', awake: '55m', rem: '55m', score: [78, 22] },
};

const SLEEP_GOAL_DISPLAY = '8hr'; // Goal displayed is fixed for now

const SleepScreen = () => {
    const navigation = useNavigation();
    const [selectedPeriod, setSelectedPeriod] = useState('Day'); // 'Day', 'Week', 'Month'
    const [currentDate, setCurrentDate] = useState(new Date());
    // Initialize state with demo data for the default period ('Day')
    const [sleepData, setSleepData] = useState(DEMO_SLEEP_DATA[selectedPeriod]);
    const [isLoading, setIsLoading] = useState(false);

    // This function currently loads demo data based on the selected period
    const fetchDataForPeriod = useCallback((period, date) => {
        console.log(`Workspaceing sleep data for: ${period}, Date: ${date.toDateString()}`);
        setIsLoading(true);
        // TODO: Replace this block with actual data fetching logic when ready
        //------- Start Demo Data Logic --------
        setSleepData(DEMO_SLEEP_DATA[period]);
        setTimeout(() => setIsLoading(false), 300); // Simulate loading delay
        //-------- End Demo Data Logic ---------
    }, []);

    // Effect to fetch data when period or date changes
    useEffect(() => {
        fetchDataForPeriod(selectedPeriod, currentDate);
    }, [selectedPeriod, currentDate, fetchDataForPeriod]);

     // Handlers for date navigation
    const handlePreviousDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 1);
        // Prevent going past today
        if (!isSameDay(newDate, new Date()) && newDate > new Date()) return;
        setCurrentDate(newDate);
    };

    // Format date for display
    const formatDateDisplay = (date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (isSameDay(date, today)) return 'Today';
        if (isSameDay(date, yesterday)) return 'Yesterday';
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Helper for isSameDay comparison
    const isSameDay = (d1, d2) => {
        if (!d1 || !d2) return false; // Add null check
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const handleSelectPeriod = (period) => {
        setSelectedPeriod(period);
    };


    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={colors.textHeader} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                     <Icon name="moon-waning-crescent" size={24} color={colors.textHeader} style={styles.headerIcon} />
                     <Text style={styles.headerTitle}>Sleep</Text>
                </View>
                <TouchableOpacity style={styles.headerRightIcon}>
                     <Icon name="calendar-month-outline" size={26} color={colors.iconGrey} />
                 </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl // Use the imported component
                        refreshing={isLoading}
                        onRefresh={() => fetchDataForPeriod(selectedPeriod, currentDate)}
                        tintColor={colors.primary} // iOS spinner color
                        colors={[colors.primary]} // Android spinner color(s)
                    />
                 }
            >
                 {/* Date Navigation */}
                 <View style={styles.dateNavContainer}>
                     <TouchableOpacity onPress={handlePreviousDay} style={styles.dateArrow}>
                        <Ionicons name="chevron-back" size={28} color={colors.iconGrey} />
                    </TouchableOpacity>
                    <Text style={styles.dateText}>{formatDateDisplay(currentDate)}</Text>
                    <TouchableOpacity onPress={handleNextDay} style={styles.dateArrow} disabled={isSameDay(currentDate, new Date())}>
                        <Ionicons name="chevron-forward" size={28} color={isSameDay(currentDate, new Date()) ? colors.lightBorder : colors.iconGrey} />
                    </TouchableOpacity>
                </View>

                {/* Day/Week/Month Tabs */}
                <View style={styles.tabContainer}>
                    {['Day', 'Week', 'Month'].map((period) => (
                        <TouchableOpacity
                            key={period}
                            style={[ styles.tabButton, selectedPeriod === period && styles.tabButtonActive ]}
                            onPress={() => handleSelectPeriod(period)}
                            disabled={isLoading}
                        >
                            <Text style={[ styles.tabText, selectedPeriod === period && styles.tabTextActive ]}>
                                {period}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Sleep Data Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{isLoading ? <ActivityIndicator size="small" color={colors.primary}/> : sleepData.totalSleep}</Text>
                        <Text style={styles.summaryLabel}>Total Sleep</Text>
                    </View>
                     {/* Fixed Goal Display */}
                    <View style={[styles.summaryItem, styles.summaryItemGoal]}>
                        <Text style={[styles.summaryValue, styles.summaryValueGoal]}>{SLEEP_GOAL_DISPLAY}</Text>
                        <Text style={styles.summaryLabel}>Daily Goal</Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{isLoading ? <ActivityIndicator size="small" color={colors.primary}/> : sleepData.sleepDebt}</Text>
                        <View style={styles.labelWithIcon}>
                            <Text style={styles.summaryLabel}>Sleep Debt</Text>
                            <Icon name="information-outline" size={14} color={colors.iconGrey} style={{marginLeft: 3}}/>
                         </View>
                    </View>
                </View>

                {/* Chart Placeholder */}
                <View style={styles.chartPlaceholder}>
                    <Text style={styles.noDataText}>No data available</Text>
                     {/* Horizontal Axis - Simplified */}
                    <View style={styles.axisContainer}>
                        {[12, 1, 2, 3, 4, 5].map((hour) => (
                            <View key={hour} style={styles.axisTick}>
                                <View style={styles.tickLine} />
                                <Text style={styles.tickLabel}>{hour}</Text>
                            </View>
                        ))}
                         <View style={styles.axisLine} />
                    </View>
                    {/* TODO: Replace this with your actual sleep chart component */}
                </View>

                 {/* Sleep Stages & Score Placeholder */}
                 <View style={styles.detailsContainer}>
                    <View style={styles.stagesContainer}>
                         <View style={styles.stageItem}>
                             <View style={[styles.stageBar, {backgroundColor: '#4DB6AC'}]}></View>
                             <Text style={styles.stageValue}>{isLoading ? '--' : sleepData.deep}</Text>
                             <Text style={styles.stageLabel}>Deep</Text>
                         </View>
                         <View style={styles.stageItem}>
                             <View style={[styles.stageBar, {backgroundColor: '#81C784'}]}></View>
                             <Text style={styles.stageValue}>{isLoading ? '--' : sleepData.light}</Text>
                             <Text style={styles.stageLabel}>Light</Text>
                         </View>
                         <View style={styles.stageItem}>
                              <View style={[styles.stageBar, {backgroundColor: '#FFB74D'}]}></View>
                             <Text style={styles.stageValue}>{isLoading ? '--' : sleepData.awake}</Text>
                             <Text style={styles.stageLabel}>Awake</Text>
                         </View>
                         <View style={styles.stageItem}>
                              <View style={[styles.stageBar, {backgroundColor: '#BA68C8'}]}></View>
                             <Text style={styles.stageValue}>{isLoading ? '--' : sleepData.rem}</Text>
                             <Text style={styles.stageLabel}>REM</Text>
                         </View>
                    </View>
                    <View style={styles.scoreContainer}>
                         <View style={styles.scoreBars}>
                              {/* Simple representation */}
                              <View style={[styles.scoreBar, {backgroundColor: colors.sleepScoreBarColor, flex: sleepData.score ? sleepData.score[0] : 0}]}></View>
                              <View style={[styles.scoreBar, {backgroundColor: colors.lightBorder, flex: sleepData.score ? sleepData.score[1] : 1}]}></View>
                         </View>
                         <View style={styles.labelWithIcon}>
                             <Text style={styles.scoreLabel}>Sleep Score</Text>
                             <Icon name="information-outline" size={14} color={colors.iconGrey} style={{marginLeft: 3}}/>
                         </View>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15, paddingHorizontal: 15,
        backgroundColor: colors.cardBackground, borderBottomWidth: 1, borderBottomColor: colors.lightBorder,
    },
    backButton: { padding: 5 },
    headerTitleContainer: { flexDirection: 'row', alignItems: 'center', position: 'absolute', left: 0, right: 0, justifyContent: 'center', paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 15, zIndex: -1, },
    headerIcon: { marginRight: 8 },
    headerTitle: { fontSize: 20, fontWeight: '600', color: colors.textHeader },
    headerRightIcon: { padding: 5 },
    scrollContainer: { paddingTop: 20, paddingHorizontal: 15, paddingBottom: 40 },
    dateNavContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 25, },
    dateArrow: { padding: 10 },
    dateText: { fontSize: 18, fontWeight: '600', color: colors.textDark, marginHorizontal: 20 },
    tabContainer: { flexDirection: 'row', backgroundColor: colors.tabInactiveBackground, borderRadius: 25, padding: 4, marginBottom: 30, overflow: 'hidden', },
    tabButton: { flex: 1, paddingVertical: 10, borderRadius: 21, alignItems: 'center', justifyContent: 'center', },
    tabButtonActive: { backgroundColor: colors.primary, shadowColor: "#000", shadowOffset: { width: 0, height: 1, }, shadowOpacity: 0.15, shadowRadius: 2, elevation: 0, },
    tabText: { fontSize: 14, fontWeight: '600', color: colors.tabInactiveText },
    tabTextActive: { color: colors.tabActiveText },
    summaryContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 35, paddingHorizontal: 10 },
    summaryItem: { alignItems: 'center', flex: 1, paddingHorizontal: 5 },
    summaryItemGoal: { /* Optional: Special styling for goal */ },
    summaryValue: { fontSize: 24, fontWeight: 'bold', color: colors.textDark, marginBottom: 6 },
    summaryValueGoal: { color: colors.primaryDark }, // Different color for goal
    summaryLabel: { fontSize: 13, color: colors.textSecondary, textAlign: 'center' },
    labelWithIcon: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    chartPlaceholder: { height: 180, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.cardBackground, borderRadius: 15, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: colors.lightBorder, position: 'relative', },
    noDataText: { fontSize: 16, color: colors.textSecondary },
    axisContainer: { position: 'absolute', bottom: 10, left: 20, right: 20, height: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 10, },
    axisLine: { position: 'absolute', bottom: 15, left: 0, right: 0, height: 1, backgroundColor: colors.axisColor, zIndex: -1, },
    axisTick: { alignItems: 'center', },
    tickLine: { width: 1, height: 6, backgroundColor: colors.axisColor, marginBottom: 2, },
    tickLabel: { fontSize: 10, color: colors.textSecondary },
    detailsContainer: { marginTop: 10, backgroundColor: colors.cardBackground, borderRadius: 15, padding: 20, borderWidth: 1, borderColor: colors.lightBorder },
    stagesContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 25, },
    stageItem: { alignItems: 'center', flex: 1, },
    stageBar: { width: '60%', height: 8, borderRadius: 4, backgroundColor: colors.sleepStageBarColor, marginBottom: 8, },
    stageValue: { fontSize: 13, fontWeight: '600', color: colors.textDark, marginBottom: 2, },
    stageLabel: { fontSize: 11, color: colors.textSecondary, },
    scoreContainer: { alignItems: 'center', },
    scoreBars: { flexDirection: 'row', height: 10, width: '80%', borderRadius: 5, overflow: 'hidden', backgroundColor: colors.lightBorder, marginBottom: 8, },
    scoreBar: { height: '100%', },
    scoreLabel: { fontSize: 13, color: colors.textSecondary, },
});

export default SleepScreen;