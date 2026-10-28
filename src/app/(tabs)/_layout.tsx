import React from 'react';
import { Tabs } from 'expo-router';
import { AppTabBar } from '../../components/navigation/AppTabBar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <AppTabBar {...props} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="quran" />
      <Tabs.Screen name="azkar" />
      <Tabs.Screen name="haramain" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
