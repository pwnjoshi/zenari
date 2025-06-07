import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // For calendar, fitness icons
import Ionicons from 'react-native-vector-icons/Ionicons'; // For back arrow
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// --- Colors ---
// Using a subset of colors relevant to this screen
const colors = {
    primary: '#2bedbb', // Active tab background
    primaryDark: '#1AA897',
    background: '#F4F7FA', // Lighter background for the screen
    cardBackground: '#FFFFFF',
    textDark: '#2D5D5E',
    textHeader: '#333333', // Darker text for header
    textSecondary: '#7A8D8E',
    textLight: '#FFFFFF',
    iconGrey: '#607D8B',
    tabInactiveBackground: '#E9EEF2',
    tabInactiveText: '#607D8B',
    attentionBackground: '#FFF9C4', // Light yellow for attention card
    attentionBorder: '#FFEE58', // Darker yellow border
    attentionText: '#5D4037', // Brownish text for attention
    axisColor: '#B0BEC5',
};

// --- Demo Data ---
// Placeholder values as shown in the screenshot
const DEMO_FIT_DATA = {
    steps: '--',
    distance: '--', // You might calculate this from steps later
    calories: '--'
};

const MyFitnessScreen = () => {
    const navigation = useNavigation();
    const [selectedPeriod, setSelectedPeriod] = useState('Day'); // 'Day', 'Week', 'Month'
    const [currentDate, setCurrentDate] = useState(new Date()); // For date navigation

    // Demo data state
    const [fitnessData, setFitnessData] = useState(DEMO_FIT_DATA);
    const [isLoading, setIsLoading] = useState(false); // Use this later for real data fetching

    // TODO: Implement functions to fetch data based on selectedPeriod and currentDate
    const fetchDataForPeriod = useCallback((period, date) => {
        console.log(`Fetching data for: ${period}, Date: ${date.toDateString()}`);
        setIsLoading(true);
        // Replace with actual data fetching (e.g., Health Connect)
        // For now, just reset to demo data or show loading
        setFitnessData(DEMO_FIT_DATA);
        setTimeout(() => setIsLoading(false), 500); // Simulate loading
    }, []);

    // Effect to fetch data when period or date changes
    useEffect(() => {
        fetchDataForPeriod(selectedPeriod, currentDate);
    }, [selectedPeriod, currentDate, fetchDataForPeriod]);

    // Handlers for date navigation (simple day change for now)
    const handlePreviousDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const handleNextDay = () => {
        // Prevent going to future dates? Optional.
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    // Format date for display ("Today", "Yesterday", or "MMM DD")
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
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };


    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={colors.textHeader} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                     <Icon name="calendar-heart" size={24} color={colors.textHeader} style={styles.headerIcon} />
                     <Text style={styles.headerTitle}>My Fitness</Text>
                </View>
                <View style={{width: 40}} /> {/* Spacer to balance header */}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Date Navigation */}
                <View style={styles.dateNavContainer}>
                    <TouchableOpacity onPress={handlePreviousDay} style={styles.dateArrow}>
                        <Ionicons name="chevron-back" size={28} color={colors.iconGrey} />
                    </TouchableOpacity>
                    <Text style={styles.dateText}>{formatDateDisplay(currentDate)}</Text>
                    <TouchableOpacity onPress={handleNextDay} style={styles.dateArrow} disabled={isSameDay(currentDate, new Date())}>
                        {/* Disable next button if it's today */}
                        <Ionicons name="chevron-forward" size={28} color={isSameDay(currentDate, new Date()) ? colors.lightBorder : colors.iconGrey} />
                    </TouchableOpacity>
                    {/* Optional: Calendar Picker Button */}
                    {/* <TouchableOpacity style={styles.calendarIcon}>
                        <Icon name="calendar-month-outline" size={26} color={colors.iconGrey} />
                    </TouchableOpacity> */}
                </View>

                {/* Day/Week/Month Tabs */}
                <View style={styles.tabContainer}>
                    {['Day', 'Week', 'Month'].map((period) => (
                        <TouchableOpacity
                            key={period}
                            style={[
                                styles.tabButton,
                                selectedPeriod === period && styles.tabButtonActive
                            ]}
                            onPress={() => setSelectedPeriod(period)}
                        >
                            <Text style={[
                                styles.tabText,
                                selectedPeriod === period && styles.tabTextActive
                            ]}>
                                {period}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Fitness Data Summary */}
                <View style={styles.summaryContainer}>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{isLoading ? <ActivityIndicator size="small" color={colors.primary}/> : fitnessData.steps}</Text>
                        <View style={styles.summaryLabelContainer}>
                             <Icon name="shoe-print" size={18} color={colors.iconGrey} style={styles.summaryIcon} />
                             <Text style={styles.summaryLabel}>Steps</Text>
                        </View>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{isLoading ? <ActivityIndicator size="small" color={colors.primary}/> : fitnessData.distance}</Text>
                         <View style={styles.summaryLabelContainer}>
                             <Icon name="map-marker-distance" size={18} color={colors.iconGrey} style={styles.summaryIcon} />
                             <Text style={styles.summaryLabel}>Distance</Text>
                         </View>
                    </View>
                    <View style={styles.summaryItem}>
                        <Text style={styles.summaryValue}>{isLoading ? <ActivityIndicator size="small" color={colors.primary}/> : fitnessData.calories}</Text>
                         <View style={styles.summaryLabelContainer}>
                             <Icon name="fire" size={18} color={colors.iconGrey} style={styles.summaryIcon} />
                             <Text style={styles.summaryLabel}>Calories</Text>
                         </View>
                    </View>
                </View>

                {/* Chart Placeholder */}
                <View style={styles.chartPlaceholder}>
                    <Text style={styles.noDataText}>No data available</Text>
                    {/* Horizontal Axis */}
                    <View style={styles.axisContainer}>
                        {[0, 4, 8, 12, 16, 20].map((hour) => (
                            <View key={hour} style={styles.axisTick}>
                                <View style={styles.tickLine} />
                                <Text style={styles.tickLabel}>{hour}</Text>
                            </View>
                        ))}
                         <View style={styles.axisLine} />
                    </View>
                     {/* TODO: Replace this with your actual chart component */}
                </View>

                {/* Attention Card */}
                <View style={styles.attentionCard}>
                    <Text style={styles.attentionTitle}>Attention!</Text>
                    <Text style={styles.attentionText}>
                        The data shown is a close estimation of your activity and metrics tracked, but may not be completely accurate.
                    </Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Space between back, title, spacer
        paddingTop: Platform.OS === 'ios' ? 50 : 20, // Adjust for status bar
        paddingBottom: 15,
        paddingHorizontal: 15,
        backgroundColor: colors.cardBackground, // White header background
        borderBottomWidth: 1,
        borderBottomColor: colors.lightBorder,
    },
    backButton: {
        padding: 5, // Increase tap area
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerIcon: {
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textHeader,
    },
    scrollContainer: {
        paddingVertical: 20,
        paddingHorizontal: 15,
    },
    dateNavContainer: {
        flexDirection: 'row',
        justifyContent: 'center', // Center the date and arrows
        alignItems: 'center',
        marginBottom: 25,
        position: 'relative', // For potential absolute positioning of calendar icon
    },
    dateArrow: {
        padding: 10, // Easier to tap
    },
    dateText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textDark,
        marginHorizontal: 20, // Space around the date text
    },
    calendarIcon: {
        position: 'absolute',
        right: 0, // Position to the right
        padding: 10,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.tabInactiveBackground,
        borderRadius: 25, // Fully rounded ends
        padding: 4,
        marginBottom: 30,
        overflow: 'hidden', // Ensure background respects border radius
    },
    tabButton: {
        flex: 1, // Each tab takes equal space
        paddingVertical: 10,
        borderRadius: 21, // Slightly less than container for inset effect
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabButtonActive: {
        backgroundColor: colors.primary, // Active background color
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1, },
        shadowOpacity: 0.15,
        shadowRadius: 2,
        elevation: 0,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.tabInactiveText,
    },
    tabTextActive: {
        color: colors.white, // Active text color
    },
    summaryContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 40,
        paddingHorizontal: 10,
    },
    summaryItem: {
        alignItems: 'center',
    },
    summaryValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 6,
    },
    summaryLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    summaryIcon: {
        marginRight: 5,
    },
    summaryLabel: {
        fontSize: 13,
        color: colors.textSecondary,
    },
    chartPlaceholder: {
        height: 200, // Adjust height as needed
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.cardBackground, // Optional background
        borderRadius: 15,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: colors.lightBorder,
        position: 'relative', // For axis positioning
    },
    noDataText: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    axisContainer: {
        position: 'absolute',
        bottom: 10, // Position axis at the bottom
        left: 20, // Indent axis slightly
        right: 20,
        height: 30, // Height for ticks and labels
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end', // Align ticks and labels to the bottom
    },
     axisLine: { // The main horizontal line
         position: 'absolute',
         bottom: 15, // Position where labels sit
         left: 0,
         right: 0,
         height: 1,
         backgroundColor: colors.axisColor,
         zIndex: -1, // Behind ticks
     },
    axisTick: {
        alignItems: 'center',
    },
    tickLine: {
        width: 1,
        height: 6, // Height of the tick mark
        backgroundColor: colors.axisColor,
        marginBottom: 2, // Space between tick and label
    },
    tickLabel: {
        fontSize: 10,
        color: colors.textSecondary,
    },
    attentionCard: {
        backgroundColor: colors.attentionBackground,
        borderRadius: 15,
        padding: 15,
        borderWidth: 1,
        borderColor: colors.attentionBorder,
    },
    attentionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.attentionText,
        marginBottom: 8,
    },
    attentionText: {
        fontSize: 13,
        color: colors.attentionText,
        lineHeight: 18,
    },
});

export default MyFitnessScreen;