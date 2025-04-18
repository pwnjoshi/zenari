import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';

// Use Namespaced Imports
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// --- Colors --- (Using example colors, adjust to your theme)
const colors = {
    background: '#F7F9FC',
    cardBackground: '#FFFFFF',
    textPrimary: '#34495E',
    textSecondary: '#8A95B5',
    primary: '#A3A8F0',
    border: '#E0E5F1',
    readIndicator: '#D0D3FA', // Color for read notifications
    unreadIndicator: '#A3A8F0', // Color for unread notifications
    iconColor: '#8A95B5',
};

// Helper to format Firestore Timestamps
const formatTimestamp = (timestamp) => {
    if (!timestamp || !timestamp.toDate) {
        return 'No date';
    }
    try {
        const date = timestamp.toDate();
        // Simple date formatting (customize as needed)
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
               date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
        console.warn("Error formatting timestamp:", e);
        return 'Invalid date';
    }
};


const NotificationScreen = ({ navigation }) => {
    const [notifications, setNotifications] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const currentUserId = auth().currentUser?.uid;

    // Fetch notifications from Firestore
    const fetchNotifications = useCallback(async () => {
        if (!currentUserId) {
            console.log("[NotificationScreen] No user ID found.");
            setError("Please log in to see notifications.");
            setIsLoading(false);
            setNotifications([]); // Clear notifications if user logs out
            return;
        }

        console.log(`[NotificationScreen] Fetching notifications for user: ${currentUserId}`);
        setError(null); // Clear previous errors

        try {
            const notificationsRef = firestore()
                .collection('users')
                .doc(currentUserId)
                .collection('notifications')
                .orderBy('receivedAt', 'desc') // Show newest first
                .limit(50); // Limit the number of notifications fetched

            const snapshot = await notificationsRef.get();

            if (snapshot.empty) {
                console.log("[NotificationScreen] No notifications found.");
                setNotifications([]);
            } else {
                const fetchedNotifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                console.log(`[NotificationScreen] Fetched ${fetchedNotifications.length} notifications.`);
                setNotifications(fetchedNotifications);
            }
        } catch (err) {
            console.error("[NotificationScreen] Error fetching notifications:", err);
            setError("Could not load notifications. Please try again.");
             // Check for specific Firestore error codes
             if (err.code === 'permission-denied') {
                setError("Permission denied fetching notifications. Check Firestore rules.");
             } else if (err.code === 'unauthenticated') {
                 setError("Authentication error. Please log in again.");
             }
        } finally {
            setIsLoading(false);
        }
    }, [currentUserId]);

    // Fetch data when the screen comes into focus
    useFocusEffect(
        useCallback(() => {
            setIsLoading(true); // Show loading indicator on focus
            fetchNotifications();
        }, [fetchNotifications])
    );

    // Handler for pull-to-refresh
    const onRefresh = useCallback(async () => {
        console.log("[NotificationScreen] Refreshing notifications...");
        setIsRefreshing(true);
        await fetchNotifications();
        setIsRefreshing(false);
        console.log("[NotificationScreen] Refresh complete.");
    }, [fetchNotifications]);

    // Handler to mark a notification as read (Optional)
    const handleMarkAsRead = useCallback(async (notificationId) => {
        if (!currentUserId || !notificationId) return;

        console.log(`[NotificationScreen] Marking notification ${notificationId} as read.`);
        try {
            const notificationRef = firestore()
                .collection('users')
                .doc(currentUserId)
                .collection('notifications')
                .doc(notificationId);

            await notificationRef.update({ read: true });

            // Optimistically update the UI state
            setNotifications(prevNotifications =>
                prevNotifications.map(notif =>
                    notif.id === notificationId ? { ...notif, read: true } : notif
                )
            );
        } catch (err) {
            console.error(`[NotificationScreen] Error marking notification ${notificationId} as read:`, err);
            // Optionally show a toast or message
        }
    }, [currentUserId]);

    // Render item for FlatList
    const renderNotificationItem = ({ item }) => (
        <TouchableOpacity
            style={styles.notificationItem}
            onPress={() => handleMarkAsRead(item.id)} // Mark as read on press
            activeOpacity={0.7}
        >
            {/* Indicator Dot */}
            <View style={[styles.indicatorDot, { backgroundColor: item.read ? colors.readIndicator : colors.unreadIndicator }]} />

            <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                     <Icon name={item.read ? "email-open-outline" : "email-outline"} size={18} color={colors.iconColor} style={styles.notificationIcon} />
                    <Text style={[styles.notificationTitle, item.read && styles.notificationRead]}>
                        {item.title || 'Notification'}
                    </Text>
                </View>
                <Text style={[styles.notificationBody, item.read && styles.notificationRead]}>
                    {item.body || 'No content.'}
                </Text>
                <Text style={styles.notificationTimestamp}>
                    {formatTimestamp(item.receivedAt)}
                </Text>
            </View>
        </TouchableOpacity>
    );

    // Render loading/error/empty states
    const renderContent = () => {
        if (isLoading && notifications.length === 0) { // Show loading only initially
            return <ActivityIndicator size="large" color={colors.primary} style={styles.centered} />;
        }
        if (error) {
            return <Text style={[styles.centeredText, styles.errorText]}>{error}</Text>;
        }
        if (notifications.length === 0) {
            return <Text style={styles.centeredText}>You have no notifications.</Text>;
        }
        return (
            <FlatList
                data={notifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={onRefresh}
                        tintColor={colors.primary}
                    />
                }
            />
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <View style={styles.headerBar}>
                 <Text style={styles.headerTitle}>Notifications</Text>
            </View>
            {renderContent()}
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: colors.background,
    },
    headerBar: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.cardBackground, // Give header a background
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    listContainer: {
        paddingVertical: 10,
    },
    notificationItem: {
        backgroundColor: colors.cardBackground,
        paddingVertical: 15,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    indicatorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 15,
        alignSelf: 'flex-start', // Align dot to the top
        marginTop: 5, // Add some top margin
    },
    notificationContent: {
        flex: 1,
    },
    notificationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    notificationIcon: {
         marginRight: 8,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        flexShrink: 1, // Allow title to shrink if long
    },
    notificationBody: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
        marginBottom: 6,
    },
    notificationTimestamp: {
        fontSize: 12,
        color: colors.textSecondary,
        opacity: 0.8,
    },
    notificationRead: {
        // Styles for read notifications (e.g., less emphasis)
        // color: colors.textSecondary,
        // fontWeight: 'normal', // Example: make title normal weight
        opacity: 0.7,
    },
    separator: {
        height: 1,
        backgroundColor: colors.border,
        marginLeft: 45, // Indent separator past the dot area
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50, // Add some margin
    },
    centeredText: {
        flex: 1,
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: colors.textSecondary,
    },
    errorText: {
        color: colors.error,
    }
});

export default NotificationScreen;
