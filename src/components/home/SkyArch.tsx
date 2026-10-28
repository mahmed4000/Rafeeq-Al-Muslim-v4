import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { PrayerTimeValues } from '../../services/prayerCalculation';

type Phase = 'night' | 'dawn' | 'day' | 'afternoon' | 'dusk';

// Sky colors (top -> bottom), disk color and disk height for each part of the day.
const SKY: Record<Phase, { colors: [string, string]; disk: string; diskTop: number; ground: string }> = {
  night: { colors: ['#2A2230', '#4A3A40'], disk: '#F3E6CC', diskTop: 22, ground: '#3A2C24' },
  dawn: { colors: ['#5A4A5E', '#E3B08A'], disk: '#FBE3C2', diskTop: 62, ground: '#7A5A40' },
  day: { colors: ['#F4DDB2', '#E3B377'], disk: '#FFF6E2', diskTop: 22, ground: '#B98A57' },
  afternoon: { colors: ['#F0C995', '#D9935E'], disk: '#FFF0D6', diskTop: 44, ground: '#A87A4C' },
  dusk: { colors: ['#6B4A55', '#C77E5A'], disk: '#F6C79A', diskTop: 70, ground: '#5A4232' }
};

const toMin = (t: { hours: number; minutes: number }) => t.hours * 60 + t.minutes;

export function skyPhase(times: PrayerTimeValues, now: Date): Phase {
  const m = now.getHours() * 60 + now.getMinutes();
  if (m < toMin(times.fajr) || m >= toMin(times.isha)) return 'night';
  if (m < toMin(times.sunrise)) return 'dawn';
  if (m < toMin(times.asr)) return 'day';
  if (m < toMin(times.maghrib)) return 'afternoon';
  return 'dusk';
}

/** Decorative arch window showing the sky for the current time of day. */
export const SkyArch: React.FC<{ phase: Phase }> = ({ phase }) => {
  const sky = SKY[phase];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 92, minHeight: 132, borderTopLeftRadius: 46, borderTopRightRadius: 46, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, borderWidth: 1.5, borderColor: '#C69255', overflow: 'hidden' }}
    >
      <LinearGradient colors={sky.colors} style={{ flex: 1 }}>
        <View style={{ position: 'absolute', top: sky.diskTop, alignSelf: 'center', width: 32, height: 32, borderRadius: 16, backgroundColor: sky.disk }} />
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 22, backgroundColor: sky.ground }} />
      </LinearGradient>
    </View>
  );
};
