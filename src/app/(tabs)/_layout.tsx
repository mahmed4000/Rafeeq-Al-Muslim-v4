import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import { AppTabBar } from '../../components/navigation/AppTabBar';
import { useApp } from '../../context/AppContext';

export default function TabsLayout() {
  const { prefsLoaded, onboarded } = useApp();
  // First launch on a new install: set up location and alerts first.
  if (prefsLoaded && !onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="prayer-times" />
      <Tabs.Screen name="quran" />
      <Tabs.Screen name="azkar" />
      <Tabs.Screen name="haramain" />
    </Tabs>
  );
}
