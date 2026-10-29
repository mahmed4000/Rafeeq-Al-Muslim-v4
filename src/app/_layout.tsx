import React, { useEffect } from 'react';
import { View, StatusBar, Platform, I18nManager, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { setAudioModeAsync } from 'expo-audio';
import {
  useFonts,
  Tajawal_400Regular,
  Tajawal_500Medium,
  Tajawal_700Bold
} from '@expo-google-fonts/tajawal';
import {
  Amiri_400Regular,
  Amiri_700Bold
} from '@expo-google-fonts/amiri';
import {
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold
} from '@expo-google-fonts/cairo';

import { AppProvider, useApp } from '../context/AppContext';
import { SafeErrorBoundary } from '../components/common/SafeErrorBoundary';
import { TextUI } from '../components/common/TextUI';

// RTL & Audio Background Config
try {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} catch (e) {}

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.setAttribute('dir', 'rtl');
  document.documentElement.setAttribute('lang', 'ar');
  if (document.body) {
    document.body.setAttribute('dir', 'rtl');
    document.body.style.direction = 'rtl';
  }
}

if (Platform.OS !== 'web') {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        priority: Notifications.AndroidNotificationPriority.HIGH
      }),
    });
  } catch (e) {}

  try {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
    }).catch(() => {});
  } catch (e) {}
}

const ThemedStack: React.FC = () => {
  const { themeMode } = useApp();
  const router = useRouter();
  const bg = themeMode === 'light' ? '#FAF6F0' : '#1C1511';

  // Tapping a prayer alert opens the prayer times screen; an adhkar reminder opens its session.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.prayer) router.push('/prayer-times');
      else if (typeof data?.azkar === 'string') router.push({ pathname: '/azkar-session', params: { categoryId: data.azkar } });
    });
    return () => sub.remove();
  }, [router]);

  return (
    <View style={{ flex: 1, backgroundColor: bg, direction: 'rtl' }}>
      <StatusBar
        barStyle={themeMode === 'light' ? 'dark-content' : 'light-content'}
        backgroundColor={bg}
      />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bg } }} />
    </View>
  );
};

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Tajawal_400Regular,
    Tajawal_500Medium,
    Tajawal_700Bold,
    Amiri_400Regular,
    Amiri_700Bold,
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
  });

  if (!fontsLoaded && Platform.OS !== 'web') {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#FAF6F0',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      >
        <ActivityIndicator size="large" color="#8C5E3C" />
        <TextUI size={16} weight="bold" color="#5D3A22" style={{ marginTop: 14 }}>
          رفيق المسلم 🕌
        </TextUI>
      </View>
    );
  }

  return (
    <SafeErrorBoundary>
      <AppProvider>
        <ThemedStack />
      </AppProvider>
    </SafeErrorBoundary>
  );
}
