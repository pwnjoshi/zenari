import React, { useState, useMemo, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    SafeAreaView,
    FlatList,
    Platform,
    Dimensions,
    Alert // Placeholder for filter modal
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather'; // Using Feather Icons

// --- Calming Color Scheme (Ensure this is defined or imported globally) ---
const COLORS = {
    background: '#F4F8F7', // Very light, slightly cool grey
    primary: '#6AB7A8',    // Muted Teal/Turquoise
    primaryLight: '#A8D8CF', // Lighter Teal
    secondary: '#F7D9AE',  // Soft Peach/Orange Accent
    secondaryLight: '#FBEFDD', // Very Light Peach
    accent: '#A8A6CE',    // Muted Lavender (Used for prompts/accents)
    accentLight: '#DCDAF8', // Very Light Lavender
    text: '#3A506B',       // Dark Slate Blue (Good contrast)
    textSecondary: '#6B819E', // Medium Slate Blue
    lightText: '#A3B1C6',   // Light Slate Blue (Placeholders)
    white: '#FFFFFF',
    cardBackground: '#FFFFFF',
    border: '#D8E2EB',       // Light Grey-Blue Border
    error: '#E57373',       // Soft Red
    disabled: '#B0BEC5',     // Blue Grey (Standard disabled)
    happy: '#FFD166', sad: '#90BDE1', calm: '#6AB7A8', neutral: '#B0BEC5',
    anxious: '#F7A072', stressed: '#A8A6CE', grateful: '#FFC46B',
    tagBackground: '#E6F4F1', suggestionBackground: '#FBEFDD',
    recording: '#E57373', playButton: '#6AB7A8', deleteButton: '#B0BEC5',
};

const { width } = Dimensions.get('window');

// --- Mock Data (Replace with actual data fetching/state management) ---
const MOCK_USER = { name: 'Pawan', progress: { completed: 3, goal: 12 } };
const MOCK_RECOMMENDATION = { id: 'nadi_shodhana', name: 'Nadi Shodhana', tagline: 'Balance your energy', icon: 'wind', isFavorite: false };
const MOCK_CATEGORIES = ['All', 'Calm', 'Focus', 'Energy', 'Sleep'];
const MOCK_EXERCISES = [
    { id: 'ujjayi', name: 'Ujjayi', englishName: 'Ocean Breath', duration: '5–8 min', level: 'Beginner', icon: 'waves', category: ['Focus', 'Calm', 'Energy'], isFavorite: false },
    { id: 'bhramari', name: 'Bhramari', englishName: 'Humming Bee', duration: '3–5 min', level: 'Beginner', icon: 'volume-1', category: ['Calm', 'Sleep'], isFavorite: true },
    { id: 'nadi_shodhana', name: 'Nadi Shodhana', englishName: 'Alternate Nostril', duration: '5–10 min', level: 'Beginner', icon: 'shuffle', category: ['Calm', 'Focus', 'Balance'], isFavorite: false },
    { id: 'samavritti', name: 'Samavritti', englishName: 'Box Breathing', duration: '4–7 min', level: 'Beginner', icon: 'square', category: ['Calm', 'Focus'], isFavorite: false },
    { id: 'surya_bhedana', name: 'Surya Bhedana', englishName: 'Right Nostril', duration: '3–5 min', level: 'Intermediate', icon: 'sunrise', category: ['Energy'], isFavorite: false },
    { id: 'chandra_bhedana', name: 'Chandra Bhedana', englishName: 'Left Nostril', duration: '3–5 min', level: 'Intermediate', icon: 'moon', category: ['Sleep', 'Calm'], isFavorite: false },
    // Add more exercises...
];

// --- Helper Function ---
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Good morning', icon: 'sun' };
    if (hour < 18) return { text: 'Good afternoon', icon: 'sun' };
    return { text: 'Good evening', icon: 'moon' };
};

// --- Main Component ---
const MindfulBreathWelcome = ({ navigation }) => { // Assuming navigation prop is passed
    const [user, setUser] = useState(MOCK_USER); // Replace with context/redux
    const [greeting, setGreeting] = useState(getGreeting());
    const [recommendation, setRecommendation] = useState(MOCK_RECOMMENDATION);
    const [categories, setCategories] = useState(MOCK_CATEGORIES);
    const [exercises, setExercises] = useState(MOCK_EXERCISES);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [favorites, setFavorites] = useState(() => { // Initialize favorites state
        const favs = {};
        MOCK_EXERCISES.forEach(ex => { if (ex.isFavorite) favs[ex.id] = true; });
        return favs;
    });

    // --- Memoized Filtering Logic ---
    const filteredExercises = useMemo(() => {
        let result = exercises;

        // Filter by Category
        if (selectedCategory !== 'All') {
            result = result.filter(ex => ex.category.includes(selectedCategory));
        }

        // Filter by Search Query (simple name/englishName check)
        if (searchQuery.trim()) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(ex =>
                ex.name.toLowerCase().includes(lowerQuery) ||
                (ex.englishName && ex.englishName.toLowerCase().includes(lowerQuery))
            );
        }

        // ** TODO: Add filtering logic based on Difficulty & Duration from a filter modal **

        return result;
    }, [exercises, selectedCategory, searchQuery]);

    // --- Handlers ---
    const handleSelectCategory = (category) => {
        setSelectedCategory(category);
    };

    const handleSearchChange = (query) => {
        setSearchQuery(query);
    };

    const handleOpenFilters = () => {
        // ** TODO: Implement Filter Modal (e.g., using react-native-bottom-sheet) **
        Alert.alert("Filter Action", "Filter modal would open here.");
    };

    const handleNavigateToDetail = (exercise) => {
        console.log("Navigating to Exercise Detail:", exercise.id);
        // navigation.navigate('ExerciseDetail', {
        //   id: exercise.id,
        //   title: exercise.name,
        //   // Pass other needed props
        // });
        Alert.alert("Navigate", `Would navigate to details for ${exercise.name}.`);
    };

    const handleStartRecommendation = () => {
        console.log("Starting Recommended Exercise:", recommendation.id);
        handleNavigateToDetail(recommendation);
    };

    const handleToggleFavorite = useCallback((exerciseId) => {
        setFavorites(prev => ({
            ...prev,
            [exerciseId]: !prev[exerciseId]
        }));
        // ** TODO: Persist favorite state (e.g., using AsyncStorage, Context, or API call) **
        console.log(`Toggled favorite for ${exerciseId}`);
    }, []);


    // --- Render Functions ---

    const renderHeader = () => (
        <View style={styles.headerContainer}>
            {/* Optional Back Button - uncomment if needed */}
            {/* <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Icon name="arrow-left" size={24} color={COLORS.text} />
            </TouchableOpacity> */}
            <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>{greeting.text}, {user.name}!</Text>
                <Icon name={greeting.icon} size={28} color={COLORS.primary} style={styles.greetingIcon}/>
                {/* Placeholder for Progress Ring - Replace with actual implementation */}
            </View>
            <Text style={styles.progressText}>
                Keep up the momentum—your next breath session awaits!
                {/* You’ve completed {user.progress.completed} of {user.progress.goal} breathing sessions this week! */}
            </Text>
        </View>
    );

    const renderSearchBar = () => (
        <View style={styles.searchFilterContainer}>
            <View style={styles.searchBar}>
                <Icon name="search" size={20} color={COLORS.lightText} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search techniques…"
                    placeholderTextColor={COLORS.lightText}
                    value={searchQuery}
                    onChangeText={handleSearchChange}
                />
            </View>
            <TouchableOpacity onPress={handleOpenFilters} style={styles.filterButton}>
                <Icon name="filter" size={22} color={COLORS.primary} />
            </TouchableOpacity>
        </View>
    );

    const renderRecommendationCard = () => (
        <View style={styles.recommendationSection}>
            <Text style={styles.sectionHeader}>◉ Recommended for you</Text>
            <View style={styles.recommendationCard}>
                <View style={styles.recContent}>
                    {/* Replace Icon with LottieView */}
                    <View style={styles.recIconContainer}>
                      <Icon name={recommendation.icon || "wind"} size={40} color={COLORS.accent} />
                      {/* <LottieView source={require('./path/to/animation.json')} autoPlay loop style={styles.recLottie} /> */}
                    </View>
                    <View style={styles.recTextContainer}>
                        <Text style={styles.recTitle}>{recommendation.name}</Text>
                        <Text style={styles.recTagline}>{recommendation.tagline}</Text>
                    </View>
                </View>
                <View style={styles.recActions}>
                     <TouchableOpacity onPress={() => handleToggleFavorite(recommendation.id)} style={styles.recBookmarkButton}>
                        <Icon name="heart" size={24} color={favorites[recommendation.id] ? COLORS.error : COLORS.lightText} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleStartRecommendation} style={styles.recStartButton}>
                        <Text style={styles.recStartButtonText}>Start Now</Text>
                        <Icon name="play" size={16} color={COLORS.white} style={{marginLeft: 5}}/>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderCategoryPills = () => (
        <View style={styles.categorySection}>
            <Text style={styles.sectionHeader}>• Categories</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsContainer}>
                {categories.map((category) => {
                    const isActive = selectedCategory === category;
                    return (
                        <TouchableOpacity
                            key={category}
                            style={[styles.pillButton, isActive && styles.pillButtonActive]}
                            onPress={() => handleSelectCategory(category)}
                        >
                            <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{category}</Text>
                            {/* Optional Count Badge Here */}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );

    const renderExerciseCard = ({ item }) => (
        <TouchableOpacity style={styles.cardContainer} onPress={() => handleNavigateToDetail(item)}>
             <View style={styles.cardIconContainer}>
               {/* Replace with Lottie or specific image */}
               <Icon name={item.icon || "activity"} size={28} color={COLORS.primaryLight} />
             </View>
             <View style={styles.cardTextContainer}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cardSubtitle} numberOfLines={1}>{item.englishName}</Text>
                <Text style={styles.cardInfo} numberOfLines={1}>{item.duration} • {item.level}</Text>
             </View>
             <View style={styles.cardActions}>
                <TouchableOpacity onPress={() => handleToggleFavorite(item.id)} style={styles.cardBookmarkButton}>
                    <Icon name="heart" size={20} color={favorites[item.id] ? COLORS.error : COLORS.lightText} />
                </TouchableOpacity>
                 <TouchableOpacity onPress={() => handleNavigateToDetail(item)} style={styles.cardStartButton}>
                     <Icon name="play" size={18} color={COLORS.primary} />
                 </TouchableOpacity>
             </View>
        </TouchableOpacity>
    );


    const renderExerciseList = () => (
        <View style={styles.listSection}>
             <FlatList
                data={filteredExercises}
                renderItem={renderExerciseCard}
                keyExtractor={(item) => item.id}
                numColumns={2} // For grid layout
                columnWrapperStyle={styles.listColumnWrapper}
                showsVerticalScrollIndicator={false}
                // Optimization props
                initialNumToRender={6}
                maxToRenderPerBatch={4}
                windowSize={11}
                getItemLayout={(data, index) => (
                    // Adjust height based on your final card height + margin
                    { length: 160, offset: 160 * Math.floor(index / 2), index }
                )}
                ListEmptyComponent={<Text style={styles.emptyListText}>No techniques match your criteria.</Text>}
                // Add pull-to-refresh if needed
             />
        </View>
    );

     const renderDisclaimer = () => (
        <Text style={styles.disclaimerText}>
            Practices are for general well‑being and do not replace medical advice. Consult your doctor for health concerns.
        </Text>
     );

    // --- Main Return ---
    return (
        <SafeAreaView style={styles.safeArea}>
             {renderHeader()}
             {renderSearchBar()}

             {/* Use ScrollView for content below search/filter if FlatList isn't the main scroll */}
             {/* If using FlatList below, wrap Rec & Pills in ListHeaderComponent */}
             <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContentContainer}
             >
                 {renderRecommendationCard()}
                 {renderCategoryPills()}

                 {/* Render the list - adjusted to be part of ScrollView */}
                 <View style={styles.exerciseListContainerForScroll}>
                     {filteredExercises.length > 0 ? (
                         filteredExercises.map((item, index) => (
                            // Basic grid simulation within ScrollView - FlatList is better for performance
                             <View key={item.id} style={[styles.cardWrapperForScroll, index % 2 !== 0 && { marginLeft: 10 }]}>
                                {renderExerciseCard({ item })}
                             </View>
                         ))
                     ) : (
                         <Text style={styles.emptyListText}>No techniques match your criteria.</Text>
                     )}
                 </View>

                 {renderDisclaimer()}
             </ScrollView>

             {/* Alternative using FlatList as main scroll body: */}
             {/* <FlatList
                ListHeaderComponent={(
                    <>
                        {renderRecommendationCard()}
                        {renderCategoryPills()}
                        <View style={{height: 10}}/> // Spacer before list items start
                    </>
                )}
                data={filteredExercises}
                renderItem={renderExerciseCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                columnWrapperStyle={styles.listColumnWrapper}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.flatListContentContainer} // Add padding etc.
                // Optimization props...
                ListEmptyComponent={<Text style={styles.emptyListText}>No techniques match criteria.</Text>}
                ListFooterComponent={renderDisclaimer}
            /> */}
        </SafeAreaView>
    );
};


// --- Styles ---
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background, // Use solid background or apply gradient library
    },
    // --- Header ---
    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'android' ? 20 : 10, // Adjust for status bar
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 25 : 15,
        left: 15,
        padding: 5,
        zIndex: 1,
    },
    greetingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
        // justifyContent: 'center', // If no back button
    },
    greetingText: {
        fontSize: 28, // Slightly smaller than plan for typical mobile
        fontWeight: 'bold',
        color: COLORS.text,
        flexShrink: 1, // Allow text to shrink if name is long
    },
    greetingIcon: {
        marginLeft: 10,
        // Style for progress ring would wrap this
    },
    progressText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        // textAlign: 'center', // If header is centered
    },
    // --- Search & Filter ---
    searchFilterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 15,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white, // Or a very light grey
        borderRadius: 15, // Rounded
        paddingHorizontal: 15,
        height: 48,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 15,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        height: '100%',
    },
    filterButton: {
        padding: 10,
        backgroundColor: COLORS.primaryLight + '40', // Light background
        borderRadius: 15,
    },
    // --- ScrollView / FlatList Container ---
    scrollContentContainer: {
       paddingBottom: 40, // Ensure space below disclaimer
    },
    flatListContentContainer: {
        paddingHorizontal: 15, // Add horizontal padding for list content
        paddingBottom: 40,
    },
    // --- Recommendation ---
    recommendationSection: {
        paddingHorizontal: 20,
        marginTop: 20,
        marginBottom: 15,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: '600', // Semi-Bold
        color: COLORS.text,
        marginBottom: 15,
    },
    recommendationCard: {
        backgroundColor: COLORS.cardBackground,
        borderRadius: 24, // 2xl
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: COLORS.border,
        // Shadow
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
     recContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1, // Take available space
        marginRight: 10,
    },
    recIconContainer: {
      // Style for Lottie/Icon background if needed
      marginRight: 15,
      padding: 10,
      backgroundColor: COLORS.accentLight + '50',
      borderRadius: 18,
    },
    recLottie: {
        width: 50,
        height: 50,
    },
    recTextContainer: {
      flex: 1, // Allow text to take space and wrap if needed
    },
    recTitle: {
        fontSize: 18,
        fontWeight: '600', // Medium
        color: COLORS.text,
    },
    recTagline: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 3,
    },
     recActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
     recBookmarkButton: {
      padding: 8,
      marginRight: 8,
    },
    recStartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 24, // 2xl
    },
    recStartButtonText: {
        color: COLORS.white,
        fontSize: 15,
        fontWeight: '600', // Medium
    },
    // --- Category Pills ---
    categorySection: {
        marginTop: 20,
        marginBottom: 5, // Less margin before list starts
    },
    pillsContainer: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    pillButton: {
        backgroundColor: COLORS.secondaryLight,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24, // 2xl
        marginRight: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    pillButtonActive: {
        backgroundColor: COLORS.accent, // Use accent for active pill
        borderColor: COLORS.accent,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    pillText: {
        fontSize: 15,
        fontWeight: '600', // Medium
        color: COLORS.textSecondary,
    },
    pillTextActive: {
        color: COLORS.white,
    },
    // --- Exercise List & Cards (Grid) ---
    listSection: { // Used if FlatList is main scroll body
        flex: 1, // Take remaining space
        marginTop: 15,
    },
    exerciseListContainerForScroll: { // Used if inside ScrollView
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 15, // Matches FlatList padding
        marginTop: 15,
    },
    cardWrapperForScroll: { // Used if inside ScrollView
        width: (width - 50) / 2, // Width calculation: (Screen width - total horizontal padding - gap between columns) / numColumns
        marginBottom: 15,
    },
    listColumnWrapper: { // Used with FlatList numColumns={2}
        justifyContent: 'space-between', // Space out items in the row
        marginBottom: 15,
    },
    cardContainer: {
        width: '100%', // Take full width of the column/wrapper
        backgroundColor: COLORS.cardBackground,
        borderRadius: 24, // 2xl
        padding: 12, // Card padding
        borderWidth: 1,
        borderColor: COLORS.border,
        // Softer Shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
        minHeight: 145, // Ensure consistent height
        justifyContent: 'space-between', // Distribute content vertically
    },
    cardIconContainer: {
      alignSelf: 'flex-start', // Keep icon to the left
      marginBottom: 8,
      padding: 6,
      backgroundColor: COLORS.primary + '15',
      borderRadius: 12,
    },
    cardTextContainer:{
      flexGrow: 1, // Allow text to take up space
      marginBottom: 8,
    },
    cardTitle: {
        fontSize: 17, // Slightly smaller than plan for card size
        fontWeight: '600', // Medium
        color: COLORS.text,
    },
     cardSubtitle: {
        fontSize: 13,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
     cardInfo: {
        fontSize: 13,
        color: COLORS.lightText,
        marginTop: 4,
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 5,
    },
    cardStartButton: {
      padding: 6,
      backgroundColor: COLORS.primary + '20',
      borderRadius: 10,
    },
    cardBookmarkButton: {
       padding: 6,
    },
    emptyListText: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: COLORS.textSecondary,
        paddingHorizontal: 30,
    },
    // --- Disclaimer ---
    disclaimerText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 30,
        marginTop: 25, // Space above disclaimer
        lineHeight: 18,
    },
});

export default MindfulBreathWelcome;