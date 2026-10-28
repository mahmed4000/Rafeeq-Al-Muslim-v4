import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { calculateAccuratePrayerTimes, toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';

export const ImsakiahScreen: React.FC = () => {
  const { goBack, theme, themeMode, t, currentCity, calculationMethod } = useApp();
  const c = theme;

  // Generate 30 days of Ramadan / Hijri calendar
  const today = new Date();
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const times = calculateAccuratePrayerTimes(currentCity.lat, currentCity.lng, d, calculationMethod);
    return {
      dayNum: i + 1,
      dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
      fajr: times.fajr.timeStr.split(' ')[0],
      sunrise: times.sunrise.timeStr.split(' ')[0],
      dhuhr: times.dhuhr.timeStr.split(' ')[0],
      asr: times.asr.timeStr.split(' ')[0],
      maghrib: times.maghrib.timeStr.split(' ')[0],
      isha: times.isha.timeStr.split(' ')[0]
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('إمساكية رمضان المبارك', 'Ramadan Imsakiah')}
        subtitle={`${currentCity.nameAr} • ٣٠ يوماً`}
        onBack={goBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Table Header */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: TOKENS.colors.primaryDark,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 8,
            marginBottom: 8
          }}
        >
          <TextUI variant="captionBold" color="#FFFFFF" style={{ width: 44, textAlign: 'center' }}>اليوم</TextUI>
          <TextUI variant="captionBold" color="#FFFFFF" style={{ flex: 1, textAlign: 'center' }}>الإمساك</TextUI>
          <TextUI variant="captionBold" color="#FFFFFF" style={{ flex: 1, textAlign: 'center' }}>الفجر</TextUI>
          <TextUI variant="captionBold" color="#FFFFFF" style={{ flex: 1, textAlign: 'center' }}>الشروق</TextUI>
          <TextUI variant="captionBold" color="#FFFFFF" style={{ flex: 1, textAlign: 'center' }}>المغرب</TextUI>
          <TextUI variant="captionBold" color="#FFFFFF" style={{ flex: 1, textAlign: 'center' }}>العشاء</TextUI>
        </View>

        {/* Days Rows */}
        {days.map((d, index) => {
          const isToday = index === 0;
          return (
            <View
              key={d.dayNum}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isToday ? (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20') : c.surface,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 8,
                marginBottom: 6,
                borderWidth: 1,
                borderColor: isToday ? TOKENS.colors.primary : c.border
              }}
            >
              <TextUI variant="captionBold" color={isToday ? TOKENS.colors.primaryDark : c.textPrimary} style={{ width: 44, textAlign: 'center' }}>
                {toArabicNumber(d.dayNum)}
              </TextUI>
              <TextUI variant="caption" color={c.textSecondary} style={{ flex: 1, textAlign: 'center' }}>
                {d.fajr}
              </TextUI>
              <TextUI variant="caption" weight={isToday ? 'bold' : 'regular'} color={c.textPrimary} style={{ flex: 1, textAlign: 'center' }}>
                {d.fajr}
              </TextUI>
              <TextUI variant="caption" color={c.textSecondary} style={{ flex: 1, textAlign: 'center' }}>
                {d.sunrise}
              </TextUI>
              <TextUI variant="captionBold" color={TOKENS.colors.primary} style={{ flex: 1, textAlign: 'center' }}>
                {d.maghrib}
              </TextUI>
              <TextUI variant="caption" color={c.textSecondary} style={{ flex: 1, textAlign: 'center' }}>
                {d.isha}
              </TextUI>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
