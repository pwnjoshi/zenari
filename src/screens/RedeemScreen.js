/**
 * RedeemScreen.js
 * FINAL VERSION - UI ENHANCED - June 8, 2025
 * - FIXED: Resolved race condition in referral code generation by passing data directly.
 * - Maintained all previous UI enhancements and logic.
 */
import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Alert, Share, SafeAreaView, StatusBar, Platform
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    getFirestore, collection, onSnapshot, query, orderBy, limit,
    writeBatch, serverTimestamp, increment, doc, updateDoc
} from '@react-native-firebase/firestore';
import { AuthContext } from './AuthProvider';

// --- Initialize Firestore & Constants ---
const db = getFirestore();
const BASE_REFERRAL_URL = 'https://www.zenari.com/';

const COLORS = {
    backgroundStart: '#F4F8F7',
    backgroundEnd: '#E6F4F1',
    primary: '#1A4D2E',
    primaryLight: '#4F6F52',
    textPrimary: '#FFFFFF',
    textDark: '#333333',
    textSecondary: '#6c757d',
    accent: '#E8C872',
    border: '#E9EEF2',
    white: '#FFFFFF',
    error: '#D32F2F',
    cardBackground: 'rgba(255, 255, 255, 0.9)',
    pointsCardStart: '#4F6F52',
    pointsCardEnd: '#1A4D2E',
    claimedBackground: '#E8F5E9',
    claimedText: '#388E3C',
    positive: '#4CAF50',
    negative: '#D32F2F',
};

const sampleRewardsData = [
    { id: 'reward_premium_7d', title: '7 Days Premium Access', points: 500 },
    { id: 'reward_meditation_track', title: 'Exclusive Guided Meditation', points: 250 },
    { id: 'reward_breathing_guide', title: 'Personalized Breathing Plan', points: 1000 },
];

const Card = ({ title, children }) => (
    <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        {children}
    </View>
);

const RedeemScreen = ({ navigation }) => {
    const { user } = useContext(AuthContext);
    const userId = user?.uid;

    const [userReferralCode, setUserReferralCode] = useState(null);
    const [userPoints, setUserPoints] = useState(0);
    const [rewards, setRewards] = useState([]);
    const [claimedRewardIds, setClaimedRewardIds] = useState(new Set());
    const [pointHistory, setPointHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claimingRewardId, setClaimingRewardId] = useState(null);
    const [error, setError] = useState(null);

    // ✅ FIXED: Function now accepts the name directly to avoid race conditions.
    const generateAndSaveReferralCode = useCallback(async (name) => {
        if (!userId || !name) {
            console.log("Cannot generate code: missing user ID or name.");
            return;
        }
        
        const namePart = name.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 5);
        const uidPart = userId.substring(0, 4).toUpperCase();
        const newCode = `${namePart}${uidPart}`;

        console.log(`Generating new referral code for user ${userId}: ${newCode}`);
        
        try {
            const userDocRef = doc(db, 'users', userId);
            await updateDoc(userDocRef, { referralCode: newCode });
            console.log("Successfully saved new referral code to Firestore.");
        } catch (e) {
            console.error("Failed to save new referral code:", e);
        }
    }, [userId]);

    useEffect(() => {
        if (!userId) {
            setError('Please log in to view rewards.');
            setLoading(false);
            return;
        }

        const listeners = [
            onSnapshot(doc(db, 'users', userId), (docSnap) => {
                if (docSnap.exists) {
                    const userData = docSnap.data();
                    if (userData.referralCode) {
                        setUserReferralCode(userData.referralCode);
                    } else {
                        // ✅ FIXED: Pass the name from the just-fetched document.
                        const nameToUse = userData.fullName || user?.displayName;
                        if (nameToUse) {
                            generateAndSaveReferralCode(nameToUse);
                        } else {
                            console.log("Could not generate referral code: Name not found.");
                        }
                    }
                } else {
                     console.log("User document does not exist yet.");
                }
            }, (err) => console.error("Error fetching user profile:", err)),

            // Other listeners remain unchanged...
            onSnapshot(doc(db, 'users', userId, 'gamification', 'summary'), (docSnap) => {
                setUserPoints(docSnap.exists ? docSnap.data().points || 0 : 0);
            }, (err) => console.error("Error fetching points:", err)),

            onSnapshot(collection(db, 'users', userId, 'claimedRewards'), (snap) => {
                setClaimedRewardIds(new Set(snap.docs.map(d => d.data().rewardId)));
            }, (err) => console.error("Error fetching claimed rewards:", err)),

            onSnapshot(query(collection(db, 'users', userId, 'pointHistory'), orderBy('timestamp', 'desc'), limit(15)), (snap) => {
                const history = snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().timestamp?.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) || 'N/A' }));
                setPointHistory(history);
            }, (err) => console.error("Error fetching history:", err)),
        ];
        
        setRewards(sampleRewardsData);
        setLoading(false);

        return () => listeners.forEach(unsubscribe => unsubscribe());
    }, [userId, user, generateAndSaveReferralCode]);


    // --- (The rest of the component's logic and JSX remains the same as it was correct) ---

    const handleShareReferral = useCallback(async () => {
        const referralLink = userReferralCode ? `${BASE_REFERRAL_URL}referral/${userReferralCode}` : null;
        if (!referralLink) { Alert.alert("No Referral Code", "Your referral code is not available yet."); return; }
        try { await Share.share({ message: `Join me on Zenari, a place for wellness! Use my referral link: ${referralLink}`, url: referralLink });
        } catch (shareError) { Alert.alert('Error', 'Could not share your referral code.'); }
    }, [userReferralCode]);

    const handleClaimReward = useCallback(async (reward) => {
        if (!userId || claimingRewardId) return;
        if (userPoints < reward.points) { Alert.alert("Not Enough Points", `You need ${reward.points} points to claim this.`); return; }
        
        Alert.alert("Confirm Claim", `Spend ${reward.points} points to claim "${reward.title}"?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Claim", onPress: async () => {
                setClaimingRewardId(reward.id);
                try {
                    const batch = writeBatch(db);
                    batch.update(doc(db, 'users', userId, 'gamification', 'summary'), { points: increment(-reward.points) });
                    batch.set(doc(collection(db, 'users', userId, 'pointHistory')), { description: `Claimed: ${reward.title}`, points: -reward.points, timestamp: serverTimestamp() });
                    batch.set(doc(collection(db, 'users', userId, 'claimedRewards')), { rewardId: reward.id, rewardTitle: reward.title, pointsSpent: reward.points, timestamp: serverTimestamp() });
                    await batch.commit();
                    Alert.alert("Success", `You have claimed "${reward.title}"!`);
                } catch (err) {
                    console.error("Error claiming reward:", err);
                    Alert.alert("Claim Failed", "Could not process your claim. Please try again.");
                } finally {
                    setClaimingRewardId(null);
                }
            }}
        ]);
    }, [userId, userPoints, claimingRewardId]);

    const renderContent = () => {
        if (loading) return <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />;
        if (error) return <Text style={styles.errorText}>{error}</Text>;
        return (
            <>
                <Card title="Invite Friends, Earn Points">
                    <View style={styles.referralContent}>
                        <Text style={styles.referralCodeText}>{userReferralCode || 'Loading code...'}</Text>
                        <TouchableOpacity style={styles.shareButtton} onPress={handleShareReferral} disabled={!userReferralCode}>
                            <Text style={styles.shareButtonText}>Share Code</Text>
                            <Icon name="share-social" size={20} color={COLORS.white} />
                        </TouchableOpacity>
                    </View>
                </Card>
                <Card title="Available Rewards">
                    {rewards.map((reward) => {
                        const isClaimed = claimedRewardIds.has(reward.id);
                        const canAfford = userPoints >= reward.points;
                        const isBeingClaimed = claimingRewardId === reward.id;
                        return (
                            <View key={reward.id} style={styles.listItem}>
                                <View style={styles.itemIconContainer}><Icon name="gift" size={24} color={COLORS.primary} /></View>
                                <View style={styles.itemTextContainer}><Text style={styles.itemTitle}>{reward.title}</Text><Text style={styles.itemSubtitle}>{reward.points.toLocaleString()} Points</Text></View>
                                {isClaimed ? (
                                    <View style={styles.claimedContainer}><Icon name="checkmark-circle" size={20} color={COLORS.claimedText} /><Text style={styles.claimedText}>Claimed</Text></View>
                                ) : (
                                    <TouchableOpacity style={[styles.claimButton, (!canAfford || isBeingClaimed) && styles.claimButtonDisabled]} onPress={() => handleClaimReward(reward)} disabled={!canAfford || isBeingClaimed}>
                                        {isBeingClaimed ? <ActivityIndicator size="small" color={COLORS.white} /> : <Text style={styles.claimButtonText}>Claim</Text>}
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </Card>
                <Card title="Point History">
                    {pointHistory.length === 0 ? <Text style={styles.emptyText}>No point history yet.</Text> : pointHistory.map((item) => (
                        <View key={item.id} style={styles.listItem}>
                            <View style={[styles.itemIconContainer, {backgroundColor: item.points > 0 ? COLORS.claimedBackground : '#FFEBEE'}]}><Icon name={item.points > 0 ? "arrow-up" : "arrow-down"} size={22} color={item.points > 0 ? COLORS.positive : COLORS.negative} /></View>
                            <View style={styles.itemTextContainer}><Text style={styles.itemTitle}>{item.description}</Text><Text style={styles.itemSubtitle}>{item.date}</Text></View>
                            <Text style={[styles.historyPoints, item.points > 0 ? styles.pointsPositive : styles.pointsNegative]}>{item.points > 0 ? '+' : ''}{item.points}</Text>
                        </View>
                    ))}
                </Card>
            </>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" />
            <LinearGradient colors={[COLORS.backgroundStart, COLORS.backgroundEnd]} style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Icon name="arrow-back" size={26} color={COLORS.textDark} /></TouchableOpacity>
                    <Text style={styles.headerTitle}>Rewards</Text>
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <LinearGradient colors={[COLORS.pointsCardStart, COLORS.pointsCardEnd]} style={styles.pointsCard}>
                        <View>
                            <Text style={styles.pointsLabel}>Your Balance</Text>
                            <Text style={styles.pointsText}>{userPoints.toLocaleString()} Points</Text>
                        </View>
                        <Icon name="diamond-outline" size={40} color="rgba(255,255,255,0.5)" />
                    </LinearGradient>
                    {renderContent()}
                </ScrollView>
            </LinearGradient>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.backgroundStart },
    container: { flex: 1 },
    scrollContent: { paddingBottom: 50, },
    header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 20 : 30, paddingBottom: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
    backButton: { position: 'absolute', top: Platform.OS === 'ios' ? 20 : 30, left: 20, padding: 5, zIndex: 10 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark },
    pointsCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 25, borderRadius: 20, marginHorizontal: 20, marginVertical: 20, elevation: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, },
    pointsLabel: { fontSize: 16, color: COLORS.white, opacity: 0.8, marginBottom: 4 },
    pointsText: { fontSize: 36, fontWeight: 'bold', color: COLORS.white },
    card: { backgroundColor: COLORS.cardBackground, borderRadius: 16, marginHorizontal: 20, marginBottom: 20, padding: 20, elevation: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5 },
    cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.textDark, marginBottom: 15 },
    referralContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.background, padding: 12, borderRadius: 10 },
    referralCodeText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '500', flex: 1 },
    shareButtton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20 },
    shareButtonText: { fontSize: 14, color: COLORS.white, fontWeight: 'bold', marginRight: 8 },
    listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
    lastListItem: { borderBottomWidth: 0 },
    itemIconContainer: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background, marginRight: 15 },
    itemTextContainer: { flex: 1 },
    itemTitle: { fontSize: 15, color: COLORS.textDark, fontWeight: '500' },
    itemSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
    claimButton: { backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, minWidth: 75, height: 36, alignItems: 'center', justifyContent: 'center' },
    claimButtonDisabled: { backgroundColor: '#BDBDBD' },
    claimButtonText: { color: COLORS.white, fontSize: 14, fontWeight: 'bold' },
    claimedContainer: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, height: 36, borderRadius: 20, backgroundColor: COLORS.claimedBackground },
    claimedText: { color: COLORS.claimedText, fontSize: 14, fontWeight: 'bold', marginLeft: 5 },
    historyPoints: { fontSize: 15, fontWeight: 'bold', minWidth: 50, textAlign: 'right' },
    pointsPositive: { color: COLORS.positive },
    pointsNegative: { color: COLORS.error },
    emptyText: { textAlign: 'center', color: COLORS.textSecondary, paddingVertical: 20 },
    errorText: { color: COLORS.error, textAlign: 'center', margin: 20, padding: 10, backgroundColor: '#FFEBEE', borderRadius: 8 },
});

export default RedeemScreen;