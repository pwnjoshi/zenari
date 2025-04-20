import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    Platform,
    Dimensions,
    Alert,
    ActivityIndicator
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';

// --- Firebase Imports ---
import auth from '@react-native-firebase/auth';
// Import modular Firestore functions
import {
    getFirestore,
    doc,
    getDoc,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    // Add updateDoc if/when implementing favorite persistence
    // updateDoc
} from '@react-native-firebase/firestore'; // Use modular import


// --- ENHANCED Bright & Catchy Color Scheme ---
const COLORS = {
    background: '#F9FFFE',      // Slightly brighter, very light green tint
    primary: '#6ECDAF',         // Richer Seafoam Green (Vibrant but calming)
    primaryLight: '#B6EAE0',    // Lighter, soft Seafoam
    secondary: '#FFB967',       // Warmer, slightly richer Peach/Gold (Catchy accent)
    secondaryLight: '#FFE9CA',  // Very Light Peach/Gold
    accent: '#8A88E0',          // Slightly deeper Periwinkle/Lavender (Stronger accent)
    accentLight: '#D3D2F6',     // Very Light Periwinkle

    text: '#1A4D45',            // Darker Teal/Green (Excellent contrast)
    textSecondary: '#5A8179',   // Medium Teal/Green Grey (Softer secondary text)
    lightText: '#A2BDB9',       // Light Teal/Green Grey (Placeholders, subtle info)
    white: '#FFFFFF',
    cardBackground: '#FFFFFF',  // Pure white for clean cards
    border: '#E0F0EC',          // Very Light Green-Grey Border (Subtle)
    error: '#E57373',           // Softer, less alarming Coral Red
    disabled: '#B0C4C0',        // Muted, desaturated Green-Grey

    // Mood Specific Colors (Aligned with new palette)
    happy: '#FFB967',           // Match Secondary Peach/Gold
    sad: '#95BBE4',             // Soft Sky Blue
    calm: '#6ECDAF',            // Match Primary Seafoam
    neutral: '#B0C4C0',         // Match Disabled Grey
    anxious: '#FFA070',         // Muted Orange/Apricot
    stressed: '#8A88E0',        // Match Accent Periwinkle
    grateful: '#FFAC58',        // Slightly deeper/warmer Gold

    // UI Element Backgrounds/Specifics
    tagBackground: '#DDF3EE',     // Very Light Seafoam/Teal bg for tags/pills
    suggestionBackground: '#FFE9CA', // Match Secondary Light bg
    recommendationCardBg: '#F0FAF8', // Very subtle green tint for recommendation card

    recording: '#E57373',       // Match Error Red
    playButton: '#6ECDAF',        // Match Primary Green
    deleteButton: '#B0C4C0',      // Match Disabled Grey (Subtle)
    loadingIndicator: '#6ECDAF',  // Match Primary Green

    // New for View Mode / Mood Selector
    viewModeButtonActiveBg: '#6ECDAF', // Primary color for active view mode
    viewModeButtonInactiveBg: '#E0F0EC', // Border color for inactive view mode
    viewModeButtonActiveText: '#FFFFFF', // White text for active
    viewModeButtonInactiveText: '#5A8179', // Secondary text for inactive
    moodButtonBg: '#FFE9CA', // SecondaryLight for mood buttons
    moodButtonText: '#A06D3E', // Darker Peach/Brown for mood button text
};
// --- END of Color Scheme ---


const { width } = Dimensions.get('window');

// --- Default/Fallback Data ---
const DEFAULT_USER_DATA = { fullName: 'User', progress: { completed: 0, goal: 10 } };
const DEFAULT_RECOMMENDATION = { id: 'samavritti', name: 'Samavritti', englishName: 'Box Breathing', tagline: 'Find your center', icon: 'square', duration: '4–7 min', level: 'Beginner', category: ['Calm', 'Focus'], isFavorite: false };
// Categories now include mood outcomes used for filtering
const MOCK_CATEGORIES = ['All', 'Calm', 'Focus', 'Energy', 'Sleep', 'Balance'];
// Mood outcomes for the Moods view selector
const MOOD_OUTCOMES = ['Calm', 'Focus', 'Energy', 'Sleep', 'Balance'];
const MOCK_EXERCISES = [
    { id: 'ujjayi', name: 'Ujjayi', englishName: 'Ocean Breath', duration: '5–8 min', level: 'Beginner', icon: 'wind', category: ['Focus', 'Calm', 'Energy'], isFavorite: false },
    { id: 'bhramari', name: 'Bhramari', englishName: 'Humming Bee', duration: '3–5 min', level: 'Beginner', icon: 'volume-1', category: ['Calm', 'Sleep'], isFavorite: true },
    { id: 'nadi_shodhana', name: 'Nadi Shodhana', englishName: 'Alternate Nostril', duration: '5–10 min', level: 'Beginner', icon: 'shuffle', category: ['Calm', 'Focus', 'Balance'], isFavorite: false },
    { id: 'samavritti', name: 'Samavritti', englishName: 'Box Breathing', duration: '4–7 min', level: 'Beginner', icon: 'square', category: ['Calm', 'Focus'], isFavorite: false },
    { id: 'surya_bhedana', name: 'Surya Bhedana', englishName: 'Right Nostril', duration: '3–5 min', level: 'Intermediate', icon: 'sunrise', category: ['Energy'], isFavorite: false },
    { id: 'chandra_bhedana', name: 'Chandra Bhedana', englishName: 'Left Nostril', duration: '3–5 min', level: 'Intermediate', icon: 'moon', category: ['Sleep', 'Calm'], isFavorite: false },
];

// --- Helper Functions ---
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: 'sunrise' };
    if (hour < 18) return { text: 'Good afternoon', icon: 'sun' };
    return { text: 'Good evening', icon: 'moon' };
};

const getScreenNameForExercise = (exerciseId) => {
    if (!exerciseId) return null;
    const screenName = exerciseId
        .split(/[-_]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
    return `${screenName}Screen`;
}

// --- Recommendation Logic Helper ---
const getDynamicRecommendation = (moodHistory, allExercises) => {
    // ... (logic remains the same)
     console.log("Calculating recommendation based on history:", moodHistory);
    if (!moodHistory || moodHistory.length === 0) {
        console.log("No mood history found, returning default recommendation.");
        return DEFAULT_RECOMMENDATION;
    }
    const moodCounts = moodHistory.reduce((acc, log) => {
        acc[log.mood] = (acc[log.mood] || 0) + 1;
        return acc;
    }, {});
    let maxCount = 0;
    let dominantMoods = [];
    for (const mood in moodCounts) {
        if (moodCounts[mood] > maxCount) {
            maxCount = moodCounts[mood];
            dominantMoods = [mood];
        } else if (moodCounts[mood] === maxCount) {
            dominantMoods.push(mood);
        }
    }
    console.log("Dominant mood(s):", dominantMoods);
    const targetCategories = new Set();
    dominantMoods.forEach(mood => {
        switch (mood.toLowerCase()) {
            case 'sad': case 'anxious': case 'stressed':
                targetCategories.add('Calm'); targetCategories.add('Balance'); break;
            case 'happy': case 'grateful':
                targetCategories.add('Energy'); targetCategories.add('Focus'); break;
            case 'neutral': case 'calm': // Calm maps to Focus/Balance as well
                 targetCategories.add('Focus'); targetCategories.add('Balance'); break;
            default: targetCategories.add('Calm'); // Fallback
        }
    });
    console.log("Target categories:", Array.from(targetCategories));
    const potentialRecommendations = allExercises
        .map(ex => ({
            ...ex,
            matchScore: ex.category.filter(cat => targetCategories.has(cat)).length
        }))
        .filter(ex => ex.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore);
    console.log("Potential recommendations (sorted):", potentialRecommendations.map(ex => `${ex.name} (Score: ${ex.matchScore})`));
    if (potentialRecommendations.length > 0) {
        const chosen = potentialRecommendations[0];
        console.log("Chosen recommendation:", chosen.name);
        return { ...chosen, tagline: `Based on your recent mood: ${dominantMoods.join(', ')}` };
    } else {
        console.log("No exercises match target categories, returning default.");
        return DEFAULT_RECOMMENDATION;
    }
};

// --- Main Component ---
const MindfulBreathWelcome = ({ navigation }) => {
    const [user, setUser] = useState(null);
    const [greeting, setGreeting] = useState(getGreeting());
    const [recommendation, setRecommendation] = useState(null);
    const [categories, setCategories] = useState(MOCK_CATEGORIES);
    const [exercises, setExercises] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All'); // Used for BOTH technique category and mood outcome filtering
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [favorites, setFavorites] = useState({});
    const [viewMode, setViewMode] = useState('techniques'); // 'techniques' or 'moods'
    const db = getFirestore();

    useEffect(() => {
        const fetchData = async () => {
            // ... (fetchData logic remains largely the same)
            setIsLoading(true);
            const currentUser = auth().currentUser;
            console.log("Current User:", currentUser);
            const allExercises = MOCK_EXERCISES;
            let initialFavs = {};
            allExercises.forEach(ex => { if (ex.isFavorite) initialFavs[ex.id] = true; });
            if (DEFAULT_RECOMMENDATION?.isFavorite) { initialFavs[DEFAULT_RECOMMENDATION.id] = true; }

            if (!currentUser) {
                console.warn("No user logged in. Using default data and mock exercises.");
                setUser(DEFAULT_USER_DATA);
                setRecommendation(DEFAULT_RECOMMENDATION);
                setExercises(allExercises);
                setFavorites(initialFavs);
                setIsLoading(false);
                return;
            }
            try {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userSnap = await getDoc(userDocRef);
                let fetchedUserData = null;
                let fetchedFavorites = {};
                if (userSnap.exists) {
                    fetchedUserData = userSnap.data();
                    console.log("User data found:", fetchedUserData);
                    setUser({ id: currentUser.uid, fullName: fetchedUserData.fullName || DEFAULT_USER_DATA.fullName, progress: fetchedUserData.progress || DEFAULT_USER_DATA.progress });
                    // fetchedFavorites = fetchedUserData.favorites || {}; // Uncomment when ready
                } else {
                    console.warn("User document not found for UID:", currentUser.uid);
                    setUser({ ...DEFAULT_USER_DATA, id: currentUser.uid, fullName: currentUser.displayName || DEFAULT_USER_DATA.fullName });
                }
                const moodHistoryCollectionRef = collection(db, 'users', currentUser.uid, 'moodHistory');
                const moodQuery = query(moodHistoryCollectionRef, orderBy('timestamp', 'desc'), limit(5));
                const moodSnaps = await getDocs(moodQuery);
                const moodHistory = moodSnaps.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() }));
                setExercises(allExercises); // Using mocks for now
                const dynamicRec = getDynamicRecommendation(moodHistory, allExercises);
                setRecommendation(dynamicRec);
                initialFavs = { ...initialFavs, ...fetchedFavorites };
                if (dynamicRec && dynamicRec.isFavorite && initialFavs[dynamicRec.id] === undefined) { /* initialFavs[dynamicRec.id] = true; */ }
                setFavorites(initialFavs);
            } catch (error) {
                console.error("Error fetching data from Firebase:", error);
                if (error.code === 'firestore/permission-denied') { Alert.alert("Permission Error", "Could not load data."); }
                else { Alert.alert("Error", `Could not load data: ${error.message}`); }
                setUser(DEFAULT_USER_DATA); setRecommendation(DEFAULT_RECOMMENDATION);
                setExercises(allExercises); setFavorites(initialFavs);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [db]);

    // --- Memoized Filtering Logic ---
    // This now filters based on selectedCategory, which can be a technique category OR a mood outcome
    const filteredExercises = useMemo(() => {
        let result = exercises;
        if (selectedCategory !== 'All') {
            // Filter exercises where their category array includes the selectedCategory (which might be a mood outcome)
            result = result.filter(ex => ex.category.includes(selectedCategory));
        }
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(ex =>
                ex.name.toLowerCase().includes(lowerQuery) ||
                (ex.englishName && ex.englishName.toLowerCase().includes(lowerQuery)) ||
                ex.category.some(cat => cat.toLowerCase().includes(lowerQuery))
            );
        }
        return result;
    }, [exercises, selectedCategory, searchQuery]);

    // --- Handlers ---
    const handleSelectCategory = (category) => {
        // This handler is used by both category pills and mood buttons
        console.log(`Setting selected category/mood to: ${category}`);
        setSelectedCategory(category);
        // Optionally switch back to techniques view if a mood button was pressed?
        // Or keep the view mode and let the list filter within the current view?
        // Let's keep the view mode for now.
    };
    const handleSearchChange = (query) => {
        setSearchQuery(query);
        // If user starts searching, maybe switch to techniques view? (Optional UX decision)
        // if (query.trim() && viewMode !== 'techniques') {
        //     setViewMode('techniques');
        // }
    };
    const handleNavigateToExercise = (exercise) => {
        // ... (navigation logic remains the same)
         if (!exercise || !exercise.id) { console.warn("Invalid exercise data:", exercise); Alert.alert("Navigation Error", "Cannot open this exercise."); return; }
         const screenName = getScreenNameForExercise(exercise.id);
         if (screenName) { console.log(`Navigating to ${screenName}`); navigation.navigate(screenName, { exerciseData: { ...exercise, isFavorite: !!favorites[exercise.id] } }); }
         else { console.warn(`No screen mapping for ID: ${exercise.id}`); Alert.alert("Navigation Error", `Could not find screen for ${exercise.id}.`); }
    };
    const handleNavigateToCustom = () => {
        console.log("Navigating to Custom Mindful Breath screen...");
        navigation.navigate('MindfulBreathCustom');
    };
    const handleStartRecommendation = () => {
        // ... (logic remains the same)
         const recToStart = recommendation || DEFAULT_RECOMMENDATION;
         if (recToStart) { console.log("Starting Recommended Exercise:", recToStart.id); handleNavigateToExercise(recToStart); }
         else { console.warn("No recommendation available."); Alert.alert("Unavailable", "Recommendation not loaded."); }
    };
    const handleToggleFavorite = useCallback((exerciseId) => {
        // ... (logic remains the same, persistence still commented out)
         if (!exerciseId) return;
         setFavorites(prev => {
             const newState = !prev[exerciseId]; const newFavorites = { ...prev };
             if (newState) { newFavorites[exerciseId] = true; } else { delete newFavorites[exerciseId]; }
             console.log(`Toggled favorite for ${exerciseId} to ${newState}.`);
             // TODO: Persist favorite state to Firestore
             return newFavorites;
         });
     }, []);

    // --- Render Functions ---
    const renderHeader = () => (

<View style={styles.headerContainer}>
             <View style={styles.greetingContainer}>
                 <Text style={styles.greetingText} numberOfLines={1} ellipsizeMode="tail">
                     {isLoading && !user ? "Loading..." : `${greeting.text}, ${user ? user.fullName.split(' ')[0] : 'Explorer'}!`}
                 </Text>
                 <Icon name={greeting.icon} size={24} color={COLORS.secondary} style={styles.greetingIcon}/>
             </View>
             <Text style={styles.progressText}>
                 {isLoading && !user ? " " : "Ready for your next moment of calm?"}
             </Text>
         </View>
    );

    const renderSearchBar = () => (

            <View style={styles.searchFilterContainer}>
             <View style={styles.searchBar}>
                 <Icon name="search" size={20} color={COLORS.lightText} style={styles.searchIcon} />
                 <TextInput
                     style={styles.searchInput}
                     placeholder="Search techniques or moods..."
                     placeholderTextColor={COLORS.lightText}
                     value={searchQuery}
                     onChangeText={handleSearchChange}
                     returnKeyType="search"
                     clearButtonMode="while-editing"
                     autoCapitalize="none"
                     autoCorrect={false}
                 />
             </View>
         </View>
    );

    // --- NEW: View Mode Selector ---
    const renderViewModeSelector = () => (
        <View style={styles.viewModeContainer}>
            <TouchableOpacity
                style={[styles.viewModeButton, viewMode === 'techniques' && styles.viewModeButtonActive]}
                onPress={() => { setViewMode('techniques'); setSelectedCategory('All'); /* Reset category */ }}
                activeOpacity={0.8}
            >
                <Icon name="list" size={18} color={viewMode === 'techniques' ? COLORS.viewModeButtonActiveText : COLORS.viewModeButtonInactiveText} style={styles.viewModeIcon} />
                <Text style={[styles.viewModeText, viewMode === 'techniques' && styles.viewModeTextActive]}>Techniques</Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.viewModeButton, viewMode === 'moods' && styles.viewModeButtonActive]}
                onPress={() => { setViewMode('moods'); setSelectedCategory('All'); /* Reset category */ }}
                activeOpacity={0.8}
            >
                 <Icon name="smile" size={18} color={viewMode === 'moods' ? COLORS.viewModeButtonActiveText : COLORS.viewModeButtonInactiveText} style={styles.viewModeIcon} />
                <Text style={[styles.viewModeText, viewMode === 'moods' && styles.viewModeTextActive]}>Moods</Text>
            </TouchableOpacity>
        </View>
    );

    const renderRecommendationCard = () => {
        // ... (recommendation card rendering remains the same)
         const displayRec = recommendation || DEFAULT_RECOMMENDATION;
         const isRecFavorite = displayRec ? !!favorites[displayRec.id] : false;
         return (
             <View style={styles.recommendationSection}>
                 <Text style={styles.sectionHeader}>Recommended for you</Text>
                 <TouchableOpacity
                     style={[styles.recommendationCard, isLoading && !recommendation && styles.loadingCardBase]}
                     onPress={handleStartRecommendation} activeOpacity={0.75} disabled={(isLoading && !recommendation) || !displayRec?.id}
                 >
                     {isLoading && !recommendation ? ( /* Loading state */ <> <ActivityIndicator size="small" color={COLORS.loadingIndicator} /> <Text style={styles.loadingText}>Finding recommendation...</Text> </>
                     ) : !displayRec?.id ? ( /* Error/Default state */ <> <Icon name="alert-circle" size={30} color={COLORS.textSecondary} /> <Text style={styles.loadingText}>Recommendation unavailable.</Text> </>
                     ) : ( /* Success state */
                         <>
                             <View style={styles.recContent}>
                                 <View style={styles.recIconContainer}><Icon name={displayRec.icon || "wind"} size={30} color={COLORS.accent} /></View>
                                 <View style={styles.recTextContainer}><Text style={styles.recTitle} numberOfLines={1}>{displayRec.name}</Text><Text style={styles.recTagline} numberOfLines={2}>{displayRec.tagline || 'Try this technique'}</Text></View>
                             </View>
                             <View style={styles.recActions}>
                                 <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleToggleFavorite(displayRec.id); }} style={styles.recBookmarkButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 5 }} disabled={!displayRec?.id} >
                                     <Icon name="heart" size={22} color={isRecFavorite ? COLORS.error : COLORS.lightText} />
                                 </TouchableOpacity>
                                 <Icon name="chevron-right" size={22} color={COLORS.primary} />
                             </View>
                         </>
                        )}
                 </TouchableOpacity>
             </View>
         );
    };

    const renderCustomSessionCard = () => (
        // ... (custom session card rendering remains the same)
         <View style={styles.customSection}>
             <Text style={styles.sectionHeader}>Create Your Own</Text>
             <TouchableOpacity style={styles.customCard} onPress={handleNavigateToCustom} activeOpacity={0.75} >
                 <View style={styles.customCardContent}>
                      <View style={styles.customIconContainer}><Icon name="sliders" size={30} color={COLORS.secondary} /></View>
                      <View style={styles.customTextContainer}><Text style={styles.customTitle}>Custom Practice</Text><Text style={styles.customTagline}>Tailor timings, pace, and focus.</Text></View>
                 </View>
                  <Icon name="chevron-right" size={22} color={COLORS.secondary} />
             </TouchableOpacity>
         </View>
    );

    const renderCategoryPills = () => (
        // ... (category pills rendering remains the same)
         <View style={styles.categorySection}>
             <Text style={styles.sectionHeader}>Explore Techniques</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
                 {categories.map((category) => {
                     const isActive = selectedCategory === category;
                     return ( <TouchableOpacity key={category} style={[styles.pillButton, isActive && styles.pillButtonActive]} onPress={() => handleSelectCategory(category)} activeOpacity={0.7} >
                             <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{category}</Text>
                         </TouchableOpacity> );
                 })}
             </ScrollView>
         </View>
    );

    // --- NEW: Mood Selector ---
    const renderMoodSelector = () => (
         <View style={styles.moodSelectorSection}>
             <Text style={styles.sectionHeader}>How do you want to feel?</Text>
             <View style={styles.moodButtonContainer}>
                 {MOOD_OUTCOMES.map((mood) => {
                     const isActive = selectedCategory === mood; // Reuse selectedCategory state
                     return (
                         <TouchableOpacity
                             key={mood}
                             style={[styles.moodButton, isActive && styles.moodButtonActive]}
                             onPress={() => handleSelectCategory(mood)} // Use the same handler
                             activeOpacity={0.7}
                         >
                             {/* Optional: Add icons to mood buttons later */}
                             <Text style={[styles.moodButtonText, isActive && styles.moodButtonTextActive]}>{mood}</Text>
                         </TouchableOpacity>
                     );
                 })}
             </View>
         </View>
     );

    const renderExerciseCard = ({ item }) => {
        // ... (exercise card rendering remains the same)
         const isFavorite = !!favorites[item.id];
         return ( <TouchableOpacity style={styles.cardContainer} onPress={() => handleNavigateToExercise(item)} activeOpacity={0.8} >
                 <View style={styles.cardHeaderRow}>
                     <View style={styles.cardIconContainer}><Icon name={item.icon || "activity"} size={22} color={COLORS.primary} /></View>
                      <TouchableOpacity onPress={(e) => { e.stopPropagation(); handleToggleFavorite(item.id); }} style={styles.cardBookmarkButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} >
                          <Icon name="heart" size={20} color={isFavorite ? COLORS.error : COLORS.lightText} />
                      </TouchableOpacity>
                  </View>
                 <View style={styles.cardTextContainer}><Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text><Text style={styles.cardSubtitle} numberOfLines={1}>{item.englishName}</Text></View>
                 <View style={styles.cardFooterRow}><Text style={styles.cardInfo} numberOfLines={1}>{item.duration} • {item.level}</Text><Icon name="chevron-right" size={18} color={COLORS.primary} /></View>
             </TouchableOpacity> );
    }

    const renderExerciseList = () => (
        // Renders the filtered list based on selectedCategory (which could be a technique category or a mood outcome)
        <>
            {/* Conditionally render a header if a specific mood/category is selected */}
            {selectedCategory !== 'All' && (
                 <Text style={[styles.sectionHeader, styles.exerciseListHeader]}>
                     {viewMode === 'moods' ? `Practices for ${selectedCategory}` : `Techniques for ${selectedCategory}`}
                 </Text>
            )}
            {isLoading && exercises.length === 0 ? (
                 <ActivityIndicator size="large" color={COLORS.loadingIndicator} style={styles.listLoadingIndicator}/>
             ) : (
                <View style={styles.exerciseListContainerForScroll}>
                    {filteredExercises.length > 0 ? (
                        filteredExercises.map((item) => (
                            <View key={item.id} style={styles.cardWrapperForScroll}>
                                {renderExerciseCard({ item })}
                            </View>
                        ))
                    ) : (
                         !isLoading && (
                            <View style={styles.emptyListContainer}>
                                <Icon name="info" size={30} color={COLORS.textSecondary} />
                                <Text style={styles.emptyListText}>
                                    {searchQuery ? `No techniques match "${searchQuery}".` : `No techniques found for "${selectedCategory}".`}
                                </Text>
                            </View>
                         )
                    )}
                </View>
             )}
        </>
    );


    const renderDisclaimer = () => (
        // ... (disclaimer rendering remains the same)
         <Text style={styles.disclaimerText}> Practices are for general well-being and do not replace medical advice. Consult your doctor for health concerns. </Text>
    );

    // --- Main Return ---
    return (
        <SafeAreaView style={styles.safeArea}>
             {renderHeader()}
             {renderSearchBar()}
             {renderViewModeSelector()} {/* Add the view mode selector */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContentContainer}
                keyboardShouldPersistTaps="handled"
            >
                {/* Conditional Rendering based on viewMode */}
                {viewMode === 'techniques' && (
                    <>
                        {renderCategoryPills()}
                        {renderExerciseList()}
                        {renderCustomSessionCard()} {/* Keep custom card in techniques view */}
                    </>
                )}

                {viewMode === 'moods' && (
                    <>
                        {renderRecommendationCard()} {/* Show recommendation in moods view */}
                        {renderMoodSelector()}
                        {renderExerciseList()}
                    </>
                )}

                {renderDisclaimer()}
            </ScrollView>
        </SafeAreaView>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: COLORS.background },
    headerContainer: {
        paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 20 : 10,
        paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    },
    greetingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    greetingText: { fontSize: 22, fontWeight: 'bold', color: COLORS.text, flexShrink: 1, marginRight: 8 },
    greetingIcon: { /* Size set inline */ },
    progressText: { fontSize: 15, color: COLORS.textSecondary, minHeight: 18 },
    searchFilterContainer: { paddingHorizontal: 20, paddingVertical: 12, backgroundColor: COLORS.background, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBackground, borderRadius: 20, paddingHorizontal: 15, height: 44, borderWidth: 1, borderColor: COLORS.border },
    searchIcon: { marginRight: 10 /* Size set inline */ },
    searchInput: { flex: 1, fontSize: 15, color: COLORS.text, height: '100%' },
    // --- View Mode Selector Styles ---
    viewModeContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: COLORS.background, // Or slightly different bg if needed
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    viewModeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: COLORS.viewModeButtonInactiveBg,
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    viewModeButtonActive: {
        backgroundColor: COLORS.viewModeButtonActiveBg,
        borderColor: COLORS.viewModeButtonActiveBg,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    viewModeIcon: {
        marginRight: 8,
    },
    viewModeText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.viewModeButtonInactiveText,
    },
    viewModeTextActive: {
        color: COLORS.viewModeButtonActiveText,
    },
    // --- End View Mode ---
    scrollContentContainer: { paddingBottom: 40 },
    recommendationSection: { paddingHorizontal: 20, marginTop: 20, marginBottom: 15 },
    sectionHeader: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: 14 , marginLeft: 20},
    recommendationCard: { backgroundColor: COLORS.recommendationCardBg, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, minHeight: 95 },
    loadingCardBase: { justifyContent: 'center', alignItems: 'center', minHeight: 95, flexDirection: 'column', paddingVertical: 15 },
    loadingText: { marginTop: 10, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
    recContent: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    recIconContainer: { marginRight: 14, padding: 10, backgroundColor: COLORS.accentLight + '80', borderRadius: 18, alignItems: 'center', justifyContent: 'center', width: 50, height: 50 },
    recTextContainer: { flex: 1 },
    recTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text, marginBottom: 3 },
    recTagline: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 18 },
    recActions: { flexDirection: 'row', alignItems: 'center' },
    recBookmarkButton: { padding: 6, marginRight: -4 },
    customSection: { paddingHorizontal: 20, marginTop: 15, marginBottom: 15 },
    customCard: { backgroundColor: COLORS.cardBackground, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border, shadowColor: COLORS.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 95 },
    customCardContent: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    customIconContainer: { marginRight: 14, padding: 10, backgroundColor: COLORS.secondaryLight + '80', borderRadius: 18, alignItems: 'center', justifyContent: 'center', width: 50, height: 50 },
    customTextContainer: { flex: 1 },
    customTitle: { fontSize: 17, fontWeight: 'bold', color: COLORS.text, marginBottom: 3 },
    customTagline: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 18 },
    categorySection: { marginTop: 20, marginBottom: 8 },
    pillsContainer: { paddingHorizontal: 20, paddingVertical: 8, paddingBottom: 12 },
    pillButton: { backgroundColor: COLORS.tagBackground, paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
    pillButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
    pillText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
    pillTextActive: { color: COLORS.white },
    // --- Mood Selector Styles ---
    moodSelectorSection: {
        paddingHorizontal: 20,
        marginTop: 20, // Add spacing
        marginBottom: 15,
    },
    moodButtonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap', // Allow buttons to wrap
        justifyContent: 'flex-start', // Align buttons to the start
        // Remove negative margin if not needed: marginLeft: -5, marginRight: -5,
    },
    moodButton: {
        backgroundColor: COLORS.moodButtonBg,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 18,
        margin: 5, // Add margin around each button
        borderWidth: 1,
        borderColor: COLORS.secondaryLight, // Use light secondary for border
    },
    moodButtonActive: {
        backgroundColor: COLORS.secondary, // Use secondary color for active mood
        borderColor: COLORS.secondary,
        shadowColor: COLORS.secondary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
    },
    moodButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.moodButtonText, // Specific text color for mood buttons
    },
    moodButtonTextActive: {
        color: COLORS.white, // White text for active mood button
    },
    // --- End Mood Selector ---
    listLoadingIndicator: { marginTop: 40, marginBottom: 25 },
    exerciseListContainerForScroll: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, marginTop: 15, justifyContent: 'space-between' },
    exerciseListHeader: { // Style for the header above the exercise list when filtered
        paddingHorizontal: 20, // Match section padding
        marginBottom: 0, // Reduce margin as list follows directly
        marginTop: 10, // Add some top margin
    },
    cardWrapperForScroll: { width: (width - 2 * 12 - 12) / 2, marginBottom: 16 },
    cardContainer: { width: '100%', backgroundColor: COLORS.cardBackground, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: COLORS.border, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 3, minHeight: 165, justifyContent: 'space-between', flexDirection: 'column' },
    cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    cardIconContainer: { padding: 7, backgroundColor: COLORS.primary + '25', borderRadius: 12, alignSelf: 'flex-start' },
    cardTextContainer: { flexGrow: 1, marginBottom: 8, paddingRight: 5 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: COLORS.text, marginBottom: 3, lineHeight: 21 },
    cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 5 },
    cardFooterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 4 },
    cardInfo: { fontSize: 12, color: COLORS.lightText, flexShrink: 1, marginRight: 6 },
    cardBookmarkButton: { padding: 4, alignSelf: 'flex-start' },
    emptyListContainer: { width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 30, marginBottom: 25, paddingHorizontal: 30 },
    emptyListText: { textAlign: 'center', marginTop: 12, fontSize: 15, color: COLORS.textSecondary, lineHeight: 20 },
    disclaimerText: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', paddingHorizontal: 35, marginTop: 25, marginBottom: 15, lineHeight: 16 },
});

export default MindfulBreathWelcome;
