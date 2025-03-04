type ThemeColors = {
  // Base
  background: string;
  surface: string;
  surfaceVariant: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;

  // Brand Colors
  primary: string;
  primaryLight: string;
  primaryDark: string;

  // Assignment Colors
  partnerA: string;
  partnerB: string;
  shared: string;

  // UI Elements
  border: string;
  input: {
    background: string;
    border: string;
    text: string;
    placeholder: string;
  };
  
  // States
  success: string;
  error: string;
  disabled: string;
};

type Theme = {
  colors: ThemeColors;
  fonts: {
    regular: string;
    medium: string;
    bold: string;
  };
  fontSizes: {
    small: number;
    regular: number;
    large: number;
    xlarge: number;
  };
};

const baseTheme = {
  fonts: {
    regular: 'Mali-Regular',
    medium: 'Mali-Medium',
    bold: 'Mali-Bold',
  },
  fontSizes: {
    small: 12,
    regular: 16,
    large: 20,
    xlarge: 24,
  },
};

export const lightTheme: Theme = {
  ...baseTheme,
  colors: {
    // Base
    background: '#ecfdf5',
    surface: '#ffffff',
    surfaceVariant: '#d1fae5',

    // Text
    textPrimary: '#064e3b',
    textSecondary: '#065f46',
    textTertiary: '#047857',

    // Brand
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',

    // Assignment Colors
    partnerA: '#0891b2', // Darker teal blue - more distinct
    partnerB: '#7c3aed', // Purple - completely different color family
    shared: '#f97316',   // Orange - provides contrast while still harmonizing

    // UI Elements
    border: '#d1fae5',
    input: {
      background: '#ffffff',
      border: '#d1fae5',
      text: '#064e3b',
      placeholder: '#047857',
    },

    // States
    success: '#059669',
    error: '#dc2626',
    disabled: '#a7f3d0',
  },
};

export const darkTheme: Theme = {
  ...baseTheme,
  colors: {
    // Base
    background: '#022c22',
    surface: '#064e3b',
    surfaceVariant: '#065f46',

    // Text
    textPrimary: '#ecfdf5',
    textSecondary: '#d1fae5',
    textTertiary: '#a7f3d0',

    // Brand
    primary: '#10b981',
    primaryLight: '#34d399',
    primaryDark: '#059669',

    // Assignment Colors
    partnerA: '#0e7490', // Darker teal blue for dark theme
    partnerB: '#8b5cf6', // Lighter purple for dark theme
    shared: '#fb923c',   // Lighter orange for dark theme

    // UI Elements
    border: '#065f46',
    input: {
      background: '#064e3b',
      border: '#065f46',
      text: '#ecfdf5',
      placeholder: '#a7f3d0',
    },

    // States
    success: '#34d399',
    error: '#ef4444',
    disabled: '#047857',
  },
};

export const theme = lightTheme; // Default theme

// Type helper
export type AppTheme = typeof theme; 