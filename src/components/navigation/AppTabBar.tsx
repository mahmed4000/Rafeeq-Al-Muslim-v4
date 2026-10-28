import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { TextUI } from '../common/TextUI';
import { makeShadow } from '../../constants/tokens';
import { usePalette } from '../../theme/palette';

// Route names in src/app/(tabs), in display order.
const TAB_ITEMS: Record<string, { labelAr: string; labelEn: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  index: { labelAr: 'الرئيسية', labelEn: 'Home', icon: 'home' },
  quran: { labelAr: 'المصحف', labelEn: 'Quran', icon: 'book-open' },
  azkar: { labelAr: 'الأذكار', labelEn: 'Azkar', icon: 'heart' },
  haramain: { labelAr: 'الحرمين', labelEn: 'Haramain', icon: 'mic' },
  settings: { labelAr: 'الإعدادات', labelEn: 'Settings', icon: 'settings' }
};

/** Bottom tab bar, same look as the previous hand-made navigator. */
export const AppTabBar: React.FC<any> = ({ state, navigation }) => {
  const { triggerHaptic, t } = useApp();
  const p = usePalette();

  return (
    <View
      style={{
        height: Platform.OS === 'ios' ? 80 : 62,
        paddingBottom: Platform.OS === 'ios' ? 16 : 4,
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
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 5,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: isActive ? p.soft : 'transparent'
            }}
          >
            <Feather name={item.icon} size={18} color={isActive ? p.primary : p.muted} />
            <TextUI
              variant="badge"
              weight={isActive ? 'bold' : 'medium'}
              color={isActive ? p.primaryInk : p.muted}
              style={{ marginTop: 2 }}
            >
              {label}
            </TextUI>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
