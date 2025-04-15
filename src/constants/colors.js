// ../constants/colors.js

// REFINED COLOR PALETTE (Based on Zenari Logo theme, adjusted for clarity)
export const colors = {
    // Background Gradient - Kept the same soft theme
    backgroundTop: '#F0E4F8',       // Light Pink/Lavender top gradient
    backgroundBottom: '#C2F0F0',   // Cyan/Teal Blue bottom gradient

    // Primary Accent Colors - Offering options
    primary: '#A3A8F0',           // Original: Mid Blue/Purple accent (Softer)
    primaryAccent: '#4DD0E1',     // Existing: Brighter Cyan/Teal (Use this for primary buttons/actions if '#A3A8F0' lacks punch)
    primaryLight: '#D0D3FA',       // Lighter shade of primary

    // Text Colors - Adjusted for better contrast
    textDark: '#2c3e50',           // Dark Blue-Gray (Good contrast - Use for main text)
    textSecondary: '#7886A3',      // Mid Blue-Gray (Slightly darkened for better contrast than #8A95B5)
    textLight: '#90A4AE',          // Muted Blue-Gray (Slightly darkened for better contrast than #AEB8D5 - Use sparingly)
    textOnPrimaryAccent: '#FFFFFF',// White text usually works well on the primaryAccent color
    textOnPrimary: '#FFFFFF',      // White text should also work on the softer primary color

    // General UI Colors
    cardBackground: '#FFFFFF',     // White card background
    lightBorder: '#DDE2EE',       // Subtle light blue-gray border (Slightly adjusted)
    white: '#FFFFFF',
    errorRed: '#E74C3C',           // Standard error color
    neutralGrey: '#B0BEC5',       // Neutral fallback grey

    // Mood Colors (Ensure good contrast if text is placed on them)
    veryHappy: '#FFDA63',         // Bright Yellow (Good contrast with dark text)
    excitedOrange: '#FFAC81',      // Softer Coral/Orange (Use dark text)
    calmGreen: '#A5D6A7',          // Soft Green (Use dark text)
    sadBlue: '#90CAF9',            // Muted Blue (Use dark text)
    worriedPurple: '#C3A9F4',      // Lighter Purple/Lavender (Use dark text)

    // Activity Colors
    sleepColor: '#A3A8F0',         // Primary Blue/Purple
    exerciseColor: '#FFAC81',      // Coral/Orange
    socialColor: '#4DD0E1',        // Cyan/Teal (Also suggested as primaryAccent)

    // Feature Icon Colors
    featureGreen: '#26A69A',       // Teal shade
    featureBlue: '#5C6BC0',        // Indigo shade

    // Chart/Calendar Specific
    transparent: 'transparent',    // Fully transparent
};

/*
Usage Suggestions:
- Use `backgroundTop` and `backgroundBottom` for screen background gradients.
- Use `primary` ('#A3A8F0') for general theme elements, OR use `primaryAccent` ('#4DD0E1') for main call-to-action buttons/highlights if you want more vibrancy. Ensure text placed on them is high contrast (e.g., `textOnPrimaryAccent`, `textOnPrimary`, or `textDark`).
- Use `textDark` for primary text content on light/white backgrounds.
- Use `textSecondary` for less important text. Use `textLight` sparingly.
- Use `cardBackground` with `lightBorder` for cards/containers.
- Apply `mood` colors as backgrounds or icons, ensuring text placed on them is readable (likely `textDark`).
*/
