import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextUI } from './TextUI';
import { TOKENS } from '../../constants/tokens';
import { usePalette } from '../../theme/palette';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  isRTL?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  rightAction,
  isRTL = true
}) => {
  const p = usePalette();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingTop: Platform.OS === 'ios' ? 56 : (Platform.OS === 'web' ? 42 : 14),
        paddingBottom: 12,
        backgroundColor: p.bg,
        borderBottomWidth: 1,
        borderColor: p.border
      }}
    >
      {/* Back Button with text and icon for high visibility */}
      <View style={{ minWidth: 70, alignItems: 'flex-start', justifyContent: 'center' }}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: TOKENS.radius.pill,
              backgroundColor: p.surface,
              borderWidth: 1,
              borderColor: p.border
            }}
          >
            <Feather name={isRTL ? "arrow-right" : "arrow-left"} size={15} color={p.primary} />
            <TextUI variant="captionBold" color={p.primary}>
              رجوع
            </TextUI>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 70 }} />
        )}
      </View>

      {/* Center: Title & Subtitle */}
      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 8 }}>
        <TextUI variant="h3" color={p.ink} numberOfLines={1}>
          {title}
        </TextUI>
        {subtitle ? (
          <TextUI variant="caption" color={p.muted} style={{ marginTop: 2 }} numberOfLines={1}>
            {subtitle}
          </TextUI>
        ) : null}
      </View>

      {/* Left Edge: Optional rightAction or matching placeholder for symmetry */}
      <View style={{ minWidth: 70, alignItems: 'flex-end', justifyContent: 'center' }}>
        {rightAction || <View style={{ width: 70 }} />}
      </View>
    </View>
  );
};
