import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { TextUI } from '../common/TextUI';
import { makeShadow } from '../../constants/tokens';
import { usePalette } from '../../theme/palette';

// Route names in src/app/(tabs), in display order.
const TAB_ITEMS: Record<string, { labelAr: string; labelEn: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  index: { labelAr: 'اليوم', labelEn: 'Today', icon: 'sun' },
  'prayer-times': { labelAr: 'الصلاة', labelEn: 'Prayer', icon: 'clock' },
  quran: { labelAr: 'القرآن', labelEn: 'Quran', icon: 'book-open' },
  azkar: { labelAr: 'الأذكار', labelEn: 'Azkar', icon: 'heart' },
  haramain: { labelAr: 'الحرمين', labelEn: 'Haramain', icon: 'headphones' }
};

/** Bottom tab bar from the approved design (TabBar artboard). */
export const AppTabBar: React.FC<any> = ({ state, navigation }) => {
  const { triggerHaptic, t } = useApp();
  const p = usePalette();

  return (
    <View
      style={{
        height: Platform.OS === 'ios' ? 84 : 66,
        paddingTop: 8,
        paddingBottom: Platform.OS === 'ios' ? 20 : 6,
        backgroundColor: p.surface,
        borderTopWidth: 1,
        borderColor: p.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 8,
        ...makeShadow('0 -2px 10px rgba(0,0,0,0.04)', '#000', 0.04, 4)
      }}
    >
      {state.routes.map((route: any, index: number) => {
        const item = TAB_ITEMS[route.name];
        if (!item) return null;
        const isActive = state.index === index;
        const label = t(item.labelAr, item.labelEn);

        return (
          <TouchableOpacity
            key={route.key}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={label}
            onPress={() => {
              triggerHaptic('light');
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!isActive && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={{
              minWidth: 64,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              paddingHorizontal: 8,
              borderRadius: 14,
              backgroundColor: isActive ? p.soft : 'transparent'
            }}
          >
            <Feather name={item.icon} size={22} color={isActive ? p.primaryInk : p.muted} />
            <TextUI
              size={12}
              weight={isActive ? 'bold' : 'medium'}
              color={isActive ? p.primaryInk : p.muted}
            >
              {label}
            </TextUI>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
