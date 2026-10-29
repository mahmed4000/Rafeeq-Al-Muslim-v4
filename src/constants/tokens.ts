import { Platform } from 'react-native';

export const makeShadow = (
  webShadow: string,
  nativeColor: string = '#000',
  nativeOpacity: number = 0.08,
  nativeRadius: number = 4,
  nativeOffset: { width: number; height: number } = { width: 0, height: 2 },
  nativeElevation: number = 3
) => {
  if (Platform.OS === 'web') {
    return { boxShadow: webShadow };
  }
  return {
    shadowColor: nativeColor,
    shadowOffset: nativeOffset,
    shadowOpacity: nativeOpacity,
    shadowRadius: nativeRadius,
    elevation: nativeElevation
  };
};

// Kaaba Coordinates (Makkah al-Mukarramah)


// Colors live in src/theme/palette.ts (usePalette); these are layout and type scales.
export const TOKENS = {
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    pill: 999
  },
  typography: {
    h1: { fontSize: 22, lineHeight: 28, weight: 'bold' as const },
    h2: { fontSize: 18, lineHeight: 24, weight: 'bold' as const },
    h3: { fontSize: 16, lineHeight: 22, weight: 'bold' as const },
    h4: { fontSize: 15, lineHeight: 21, weight: 'bold' as const },
    bodyLarge: { fontSize: 14, lineHeight: 20, weight: 'medium' as const },
    body: { fontSize: 13, lineHeight: 19, weight: 'regular' as const },
    bodyMedium: { fontSize: 13, lineHeight: 19, weight: 'medium' as const },
    bodyBold: { fontSize: 13, lineHeight: 19, weight: 'bold' as const },
    caption: { fontSize: 11.5, lineHeight: 16, weight: 'regular' as const },
    captionBold: { fontSize: 11.5, lineHeight: 16, weight: 'bold' as const },
    badge: { fontSize: 10, lineHeight: 14, weight: 'bold' as const },
    quranVerse: { fontSize: 21, lineHeight: 38, weight: 'regular' as const, quran: true },
    quranHeader: { fontSize: 17, lineHeight: 25, weight: 'bold' as const, quran: true }
  }
};

