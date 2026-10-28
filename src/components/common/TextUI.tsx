import React from 'react';
import { Text, Platform, StyleSheet, TextStyle, StyleProp, I18nManager } from 'react-native';
import { TOKENS } from '../../constants/tokens';

export type TextUIVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'bodyLarge'
  | 'body'
  | 'bodyMedium'
  | 'bodyBold'
  | 'caption'
  | 'captionBold'
  | 'badge'
  | 'quranVerse'
  | 'quranHeader';

interface TextUIProps {
  children?: React.ReactNode;
  variant?: TextUIVariant;
  style?: StyleProp<TextStyle>;
  weight?: 'regular' | 'medium' | 'bold';
  size?: number;
  color?: string;
  align?: 'left' | 'right' | 'center' | 'justify';
  quran?: boolean;
  cairo?: boolean;
  font?: 'tajawal' | 'amiri' | 'cairo';
  numberOfLines?: number;
  onPress?: (event?: any) => void;
  fontsLoaded?: boolean;
  isRTL?: boolean;
}

export const TextUI: React.FC<TextUIProps> = ({
  children,
  variant,
  style,
  weight,
  size,
  color,
  align,
  quran,
  cairo,
  font,
  numberOfLines,
  onPress,
  fontsLoaded = true,
  isRTL = true
}) => {
  const variantToken = variant ? TOKENS.typography[variant] : null;
  const resolvedSize = size ?? variantToken?.fontSize ?? 14;
  const resolvedWeight = weight ?? variantToken?.weight ?? 'regular';
  const isCairo = cairo || font === 'cairo';
  const isQuran = quran || font === 'amiri' || (variantToken as any)?.quran;

  let fontFamily: string | undefined = undefined;
  let fontWeight: any = resolvedWeight === 'bold' ? '700' : resolvedWeight === 'medium' ? '500' : '400';

  if (Platform.OS === 'web') {
    if (isCairo) {
      fontFamily = resolvedWeight === 'bold'
        ? 'Cairo_700Bold, Cairo, sans-serif'
        : resolvedWeight === 'medium'
        ? 'Cairo_600SemiBold, Cairo, sans-serif'
        : 'Cairo_400Regular, Cairo, sans-serif';
    } else if (isQuran) {
      fontFamily = resolvedWeight === 'bold' ? 'Amiri_700Bold, Amiri, serif' : 'Amiri_400Regular, Amiri, serif';
    } else {
      fontFamily = resolvedWeight === 'bold'
        ? 'Tajawal_700Bold, Tajawal, "Noto Sans Arabic", -apple-system, sans-serif'
        : resolvedWeight === 'medium'
        ? 'Tajawal_500Medium, Tajawal, "Noto Sans Arabic", -apple-system, sans-serif'
        : 'Tajawal_400Regular, Tajawal, "Noto Sans Arabic", -apple-system, sans-serif';
    }
  } else if (fontsLoaded) {
    if (isCairo) {
      fontFamily = resolvedWeight === 'bold' ? 'Cairo_700Bold' : resolvedWeight === 'medium' ? 'Cairo_600SemiBold' : 'Cairo_400Regular';
    } else if (isQuran) {
      fontFamily = resolvedWeight === 'bold' ? 'Amiri_700Bold' : 'Amiri_400Regular';
    } else {
      fontFamily = resolvedWeight === 'bold' ? 'Tajawal_700Bold' : resolvedWeight === 'medium' ? 'Tajawal_500Medium' : 'Tajawal_400Regular';
    }
    // On native iOS/Android, specifying font file already encapsulates weight
    fontWeight = undefined;
  }

  const flatStyle = StyleSheet.flatten(style) || {};
  const explicitAlign = align || flatStyle.textAlign;
  const targetAlign = explicitAlign || (isRTL ? 'right' : 'left');

  let resolvedAlign: any = targetAlign;
  if (Platform.OS === 'ios' && (I18nManager.isRTL || isRTL)) {
    if (targetAlign === 'right') resolvedAlign = 'left';
    else if (targetAlign === 'left') resolvedAlign = 'right';
  }

  const resolvedLineHeight = flatStyle.lineHeight ?? variantToken?.lineHeight;
  const { textAlign: _ignored, lineHeight: _ignoredLineHeight, ...restStyle } = flatStyle;

  return (
    <Text
      numberOfLines={numberOfLines}
      onPress={onPress}
      style={[
        restStyle,
        {
          fontSize: resolvedSize,
          ...(resolvedLineHeight ? { lineHeight: resolvedLineHeight } : {}),
          color: color || flatStyle.color || '#2D1E16',
          textAlign: resolvedAlign,
          fontFamily,
          fontWeight,
          writingDirection: isRTL ? 'rtl' : 'ltr',
          ...(Platform.OS === 'web' && isRTL ? { direction: 'rtl' as any } : {})
        }
      ]}
    >
      {children}
    </Text>
  );
};

