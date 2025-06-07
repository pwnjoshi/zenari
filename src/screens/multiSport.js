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
    RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'; // For fitness icons, calendar
import Ionicons from 'react-native-vector-icons/Ionicons'; // For back arrow
import { useNavigation, useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// --- Colors ---
const colors = {
    primary: '#FFA726', // Using the orange color from screenshot summary
    primaryDark: '#F57C00',
    background: '#F4F7FA',
    cardBackground: '#FFFFFF',
    textDark: '#263238', // Darker text for better contrast
    textHeader: '#333333',
    textSecondary: '#546E7A',
    textLight: '#FFFFFF',
    iconGrey: '#607D8B',
    tabInactiveBackground: '#E9EEF2',
    tabInactiveText: '#607D8B',
    tabActiveText: '#FFFFFF', // White text on active tab
    lightBorder: '#CFD8DC',
    dateSeparator: '#ECEFF1',
    activityIconBg: '#FFF3E0', // Light orange background for activity icons
};

// --- Demo Data ---
// Structure based on the screenshot
const DEMO_SUMMARY_DATA = {
    All: { activities: 29, calories: '4.9K', steps: '39.1K', distance: '22.0', activeTime: '19h 50m', since: '8 Jun, 2023' },
    'This Week': { activities: 5, calories: '1.2K', steps: '8.5K', distance: '5.1', activeTime: '2h 15m', since: 'This Week' },
    'This Month': { activities: 18, calories: '3.5K', steps: '25.3K', distance: '15.8', activeTime: '10h 5m', since: 'This Month' },
};

const DEMO_TIMELINE_DATA = {
    All: [
        {
            date: '16Sep', activitiesCount: 1, totalDuration: '20 min',
            activities: [ { type: 'walk', name: 'Night Outdoor Walk', time: '20:12 - 20:33', icon: 'walk' } ]
        },
        {
            date: '06Aug', activitiesCount: 1, totalDuration: '15 min',
            activities: [ { type: 'walk', name: 'Night Indoor Walk', time: '19:42 - 19:58', icon: 'walk' } ]
        },
        {
            date: '28Jun', activitiesCount: 2, totalDuration: '33 min',
            activities: [
                { type: 'walk', name: 'Evening Indoor Walk', time: '18:05 - 18:26', icon: 'walk' },
                { type: 'elliptical', name: 'Evening Elliptical', time: '17:52 - 18:04', icon: 'elliptical' } // Assuming 'elliptical' icon
            ]
        },
        {
            date: '27Jun', activitiesCount: 2, totalDuration: '25 min',
            activities: [
                { type: 'walk', name: 'Evening Indoor Walk', time: '18:11 - 18:27', icon: 'walk' },
                { type: 'cycling', name: 'Evening Indoor Cycling', time: '17:40 - 17:55', icon: 'bike' } // Assuming 'bike' icon and time
            ]
        },
         // Add more demo data as needed
    ],
    'This Week': [ // Example filtered data
         {
            date: '21Apr', activitiesCount: 1, totalDuration: '30 min',
            activities: [ { type: 'walk', name: 'Morning Walk', time: '07:00 - 07:30', icon: 'walk' } ]
        },
         {
            date: '20Apr', activitiesCount: 1, totalDuration: '45 min',
            activities: [ { type: 'run', name: 'Afternoon Run', time: '16:15 - 17:00', icon: 'run' } ] // Assuming 'run' icon
        },
    ],
    'This Month': [ // Example filtered data
        // Include 'This Week' data plus more from the month
         {
            date: '16Apr', activitiesCount: 1, totalDuration: '20 min',
            activities: [ { type: 'walk', name: 'Night Outdoor Walk', time: '20:12 - 20:33', icon: 'walk' } ]
        },
         {
            date: '06Apr', activitiesCount: 1, totalDuration: '15 min',
            activities: [ { type: 'walk', name: 'Night Indoor Walk', time: '19:42 - 19:58', icon: 'walk' } ]
        },
        // ... add more month data
    ]
};

const MultiSportScreen = () => {
    const navigation = useNavigation();
    const [selectedPeriod, setSelectedPeriod] = useState('All'); // 'All', 'This Week', 'This Month'
    const [summaryData, setSummaryData] = useState(DEMO_SUMMARY_DATA[selectedPeriod]);
    const [timelineData, setTimelineData] = useState(DEMO_TIMELINE_DATA[selectedPeriod]);
    const [isLoading, setIsLoading] = useState(false);

    // TODO: Implement actual data fetching based on selectedPeriod
    const fetchData = useCallback((period) => {
        console.log(`Fetching data for: ${period}`);
        setIsLoading(true);
        // Replace with actual data fetching logic (e.g., from Health Connect or Firestore)
        // This would involve querying records based on the selected time range (All, Week, Month)
        // and then processing/grouping the results.
        setSummaryData(DEMO_SUMMARY_DATA[period]);
        setTimelineData(DEMO_TIMELINE_DATA[period]);
        setTimeout(() => setIsLoading(false), 300); // Simulate loading
    }, []);

    // Fetch data when the component mounts or the selected period changes
    useEffect(() => {
        fetchData(selectedPeriod);
    }, [selectedPeriod, fetchData]);

    // Fetch data when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchData(selectedPeriod);
            // Optional: Add any other refresh logic needed on focus
        }, [selectedPeriod, fetchData])
    );

    const handleSelectPeriod = (period) => {
        setSelectedPeriod(period);
    };

    // Helper to render individual activity item
    const renderActivityItem = (activity, index) => (
        <View key={`${activity.name}-${index}`} style={styles.activityItem}>
            <View style={styles.activityIconContainer}>
                 <Icon name={activity.icon} size={20} color={colors.primaryDark} />
            </View>
            <View style={styles.activityDetails}>
                <Text style={styles.activityName}>{activity.name}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
            </View>
        </View>
    );

    // Helper to render a group of activities for a specific date
    const renderDateGroup = (group, index) => (
        <View key={`${group.date}-${index}`} style={styles.dateGroupContainer}>
            <View style={styles.dateHeader}>
                <Text style={styles.dateHeaderText}>{group.date}</Text>
                <View style={styles.dateSummary}>
                     <Text style={styles.dateActivityCount}>{group.activitiesCount} Activit{group.activitiesCount > 1 ? 'ies' : 'y'}</Text>
                     <View style={styles.dateDurationChip}>
                         <Text style={styles.dateDurationText}>{group.totalDuration}</Text>
                     </View>
                 </View>
            </View>
            {group.activities.map(renderActivityItem)}
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={colors.textHeader} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                     {/* Using 'run' icon as placeholder for multi-sport */}
                     <Icon name="run" size={24} color={colors.textHeader} style={styles.headerIcon} />
                     <Text style={styles.headerTitle}>Multi Sport</Text>
                </View>
                 {/* Optional: Calendar Icon for date picking */}
                 <TouchableOpacity style={styles.headerRightIcon}>
                     <Icon name="calendar-month-outline" size={26} color={colors.iconGrey} />
                 </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={ <RefreshControl refreshing={isLoading} onRefresh={() => fetchData(selectedPeriod)} tintColor={colors.primary} /> }
            >
                 {/* Timeline Title & Filter Tabs */}
                 <View style={styles.timelineHeader}>
                     <Text style={styles.timelineTitle}>Timeline</Text>
                     {/* Optional: Calendar Icon could also go here */}
                 </View>
                 <View style={styles.tabContainer}>
                    {['All', 'This Week', 'This Month'].map((period) => (
                        <TouchableOpacity
                            key={period}
                            style={[ styles.tabButton, selectedPeriod === period && styles.tabButtonActive ]}
                            onPress={() => handleSelectPeriod(period)}
                            disabled={isLoading} // Disable while loading
                        >
                            <Text style={[ styles.tabText, selectedPeriod === period && styles.tabTextActive ]}>
                                {period}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                 {/* Summary Stats */}
                 <View style={styles.summaryCard}>
                     <View style={styles.summaryStatsRow}>
                         <View style={styles.summaryStatItem}>
                             <Text style={styles.summaryStatValue}>{isLoading ? '--' : summaryData.activities}</Text>
                             <Text style={styles.summaryStatLabel}>Activities</Text>
                         </View>
                          <View style={styles.summaryStatItem}>
                             <Text style={styles.summaryStatValue}>{isLoading ? '--' : summaryData.calories}</Text>
                             <Text style={styles.summaryStatLabel}>Calories</Text>
                         </View>
                          <View style={styles.summaryStatItem}>
                             <Text style={styles.summaryStatValue}>{isLoading ? '--' : summaryData.steps}</Text>
                             <Text style={styles.summaryStatLabel}>Steps</Text>
                         </View>
                          <View style={styles.summaryStatItem}>
                             <Text style={styles.summaryStatValue}>{isLoading ? '--' : summaryData.distance}</Text>
                             <Text style={styles.summaryStatLabel}>km</Text>
                         </View>
                          <View style={styles.summaryStatItem}>
                             <Text style={styles.summaryStatValue}>{isLoading ? '--' : summaryData.activeTime}</Text>
                             <Text style={styles.summaryStatLabel}>Active Time</Text>
                         </View>
                     </View>
                     <Text style={styles.summarySinceText}>Since {summaryData.since}</Text>
                 </View>

                 {/* Activity Timeline List */}
                 {isLoading ? (
                     <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                 ) : timelineData && timelineData.length > 0 ? (
                     timelineData.map(renderDateGroup)
                 ) : (
                     <View style={styles.noActivityContainer}>
                         <Text style={styles.noActivityText}>No activities recorded for this period.</Text>
                     </View>
                 )}

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
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 15,
        paddingHorizontal: 15,
        backgroundColor: colors.cardBackground,
        borderBottomWidth: 1,
        borderBottomColor: colors.lightBorder,
    },
    backButton: {
        padding: 5,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        // Ensure title is centered if back button width is accounted for
        position: 'absolute', // Position absolutely to center easily
        left: 0,
        right: 0,
        justifyContent: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 20, // Match header paddingTop
        paddingBottom: 15,
        zIndex: -1, // Behind buttons
    },
    headerIcon: {
        marginRight: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textHeader,
    },
    headerRightIcon: {
         padding: 5,
    },
    scrollContainer: {
        paddingTop: 20,
        paddingHorizontal: 15,
        paddingBottom: 40,
    },
    timelineHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    timelineTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.tabInactiveBackground,
        borderRadius: 8, // Less rounded tabs
        padding: 5,
        marginBottom: 25,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        borderRadius: 6, // Match container less padding
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabButtonActive: {
        backgroundColor: colors.primary, // Use primary color for active tab
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.tabInactiveText,
    },
    tabTextActive: {
        color: colors.tabActiveText,
    },
    summaryCard: {
        backgroundColor: colors.cardBackground,
        borderRadius: 15,
        paddingVertical: 15,
        paddingHorizontal: 10,
        marginBottom: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1, },
        shadowOpacity: 0.08,
        shadowRadius: 3,
        elevation: 0,
    },
    summaryStatsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between', // Space out items
        alignItems: 'center',
        marginBottom: 10,
    },
    summaryStatItem: {
        alignItems: 'center',
        flex: 1, // Allow items to take space but constrain
        paddingHorizontal: 2, // Small space between items
    },
    summaryStatValue: {
        fontSize: 18, // Slightly smaller value
        fontWeight: 'bold',
        color: colors.textDark,
        marginBottom: 4,
        textAlign: 'center',
    },
    summaryStatLabel: {
        fontSize: 11, // Smaller label
        color: colors.textSecondary,
        textAlign: 'center',
    },
    summarySinceText: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        marginTop: 5,
    },
    dateGroupContainer: {
        marginBottom: 25,
    },
    dateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 10,
        marginBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.dateSeparator,
    },
    dateHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textDark,
    },
    dateSummary: {
        alignItems: 'flex-end',
    },
    dateActivityCount: {
        fontSize: 12,
        color: colors.textSecondary,
        marginBottom: 4,
    },
    dateDurationChip: {
        backgroundColor: colors.primary, // Use primary color for chip
        borderRadius: 10,
        paddingVertical: 3,
        paddingHorizontal: 8,
    },
    dateDurationText: {
        fontSize: 11,
        color: colors.white,
        fontWeight: '600',
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        paddingLeft: 5, // Indent activities slightly
    },
    activityIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.activityIconBg, // Light background for icon
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activityDetails: {
        flex: 1,
    },
    activityName: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textDark,
        marginBottom: 3,
    },
    activityTime: {
        fontSize: 13,
        color: colors.textSecondary,
    },
     noActivityContainer: {
         flex: 1,
         justifyContent: 'center',
         alignItems: 'center',
         minHeight: 150, // Ensure it takes some space
     },
     noActivityText: {
         fontSize: 16,
         color: colors.textSecondary,
     },
});

export default MultiSportScreen;