import React from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { TOKENS, makeShadow } from '../constants/tokens';

import { HomeScreen } from '../screens/HomeScreen';
import { PrayerTimesScreen } from '../screens/PrayerTimesScreen';
import { ImsakiahScreen } from '../screens/ImsakiahScreen';
import { QiblaScreen } from '../screens/QiblaScreen';
import { QuranIndexScreen } from '../screens/QuranIndexScreen';
import { QuranReaderScreen } from '../screens/QuranReaderScreen';
import { AzkarCategoriesScreen } from '../screens/AzkarCategoriesScreen';
import { AzkarSessionScreen } from '../screens/AzkarSessionScreen';
import { HaramainLessonsScreen } from '../screens/HaramainLessonsScreen';
import { HaramainBookScreen } from '../screens/HaramainBookScreen';
import { HaramainLessonScreen } from '../screens/HaramainLessonScreen';
import { Hadith40Screen } from '../screens/Hadith40Screen';
import { AllahNamesScreen } from '../screens/AllahNamesScreen';
import { RuqyahScreen } from '../screens/RuqyahScreen';
import { ZakatScreen } from '../screens/ZakatScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { DownloadsScreen } from '../screens/DownloadsScreen';

export const MainNavigator: React.FC = () => {
  const { screen, navigate, theme, themeMode, triggerHaptic } = useApp();
  const c = theme;

  const renderCurrentScreen = () => {
    switch (screen) {
      case 'prayer_times':
        return <PrayerTimesScreen />;
      case 'imsakiah':
        return <ImsakiahScreen />;
      case 'qibla':
        return <QiblaScreen />;
      case 'quran_index':
        return <QuranIndexScreen />;
      case 'quran_reader':
        return <QuranReaderScreen />;
      case 'azkar_categories':
        return <AzkarCategoriesScreen />;
      case 'azkar_session':
        return <AzkarSessionScreen />;
      case 'haramain_lessons':
        return <HaramainLessonsScreen />;
      case 'haramain_book':
        return <HaramainBookScreen />;
      case 'haramain_lesson':
        return <HaramainLessonScreen />;
      case 'hadith_40':
        return <Hadith40Screen />;
      case 'allah_names':
        return <AllahNamesScreen />;
      case 'ruqyah':
        return <RuqyahScreen />;
      case 'zakat_calculator':
        return <ZakatScreen />;
      case 'downloads':
        return <DownloadsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'home':
      default:
        return <HomeScreen />;
    }
  };

  const navItems = [
    { key: 'home', labelAr: 'الرئيسية', icon: 'home' as const },
    { key: 'quran_index', labelAr: 'المصحف', icon: 'book-open' as const },
    { key: 'azkar_categories', labelAr: 'الأذكار', icon: 'heart' as const },
    { key: 'haramain_lessons', labelAr: 'الحرمين', icon: 'mic' as const },
    { key: 'settings', labelAr: 'الإعدادات', icon: 'settings' as const }
  ];
  const isImmersiveScreen = screen === 'quran_reader' || screen === 'haramain_book' || screen === 'haramain_lesson';

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      {/* Screen Render with reserved space for fixed bottom navigation */}
      <View style={{ flex: 1, paddingBottom: isImmersiveScreen ? 0 : Platform.OS === 'ios' ? 80 : 62 }}>
        {renderCurrentScreen()}
      </View>

      {/* Global Bottom Navigation Bar */}
      {!isImmersiveScreen ? <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: Platform.OS === 'ios' ? 80 : 62,
          paddingBottom: Platform.OS === 'ios' ? 16 : 4,
          backgroundColor: c.surfaceElevated,
          borderTopWidth: 1,
          borderColor: c.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-around',
          paddingHorizontal: 8,
          ...makeShadow('0 -2px 10px rgba(0,0,0,0.04)', '#000', 0.04, 4)
        }}
      >
        {navItems.map((item) => {
          const isActive =
            screen === item.key ||
            (item.key === 'quran_index' && screen === 'quran_reader') ||
            (item.key === 'azkar_categories' && screen === 'azkar_session');

          return (
            <TouchableOpacity
              key={item.key}
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                navigate(item.key);
              }}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 5,
                paddingHorizontal: 14,
                borderRadius: 14,
                backgroundColor: isActive ? (themeMode === 'dark' ? '#332720' : '#F5ECE1') : 'transparent'
              }}
            >
              <Feather
                name={item.icon}
                size={18}
                color={isActive ? TOKENS.colors.primary : c.textSecondary}
              />
              <TextUI
                variant="badge"
                weight={isActive ? 'bold' : 'medium'}
                color={isActive ? (themeMode === 'dark' ? '#E8DFD5' : TOKENS.colors.primaryDark) : c.textSecondary}
                style={{ marginTop: 2 }}
              >
                {item.labelAr}
              </TextUI>
            </TouchableOpacity>
          );
        })}
      </View> : null}
    </View>
  );
};
