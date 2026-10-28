import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextUI } from '../components/common/TextUI';
import { usePalette } from '../theme/palette';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

/** Identity 2.0 header: back arrow, title and subtitle at the start, optional action at the end. */
export const ScreenHeader: React.FC<ScreenHeaderProps> = ({ title, subtitle, onBack, right }) => {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingTop: Platform.OS === 'ios' ? 52 : (Platform.OS === 'web' ? 16 : 12),
        paddingBottom: 8
      }}
    >
      {onBack ? (
        <TouchableOpacity
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Feather name="arrow-right" size={22} color={p.primary} />
        </TouchableOpacity>
      ) : null}
      <View style={{ flex: 1 }}>
        <TextUI size={19} weight="bold" color={p.ink} numberOfLines={1}>{title}</TextUI>
        {subtitle ? <TextUI size={13} color={p.muted} numberOfLines={1}>{subtitle}</TextUI> : null}
      </View>
      {right}
    </View>
  );
};
