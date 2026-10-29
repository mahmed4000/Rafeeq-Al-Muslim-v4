import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { calculateAccuratePrayerTimes, formatPrayerTime, toArabicNumber } from '../services/prayerCalculation';
import { usePalette } from '../theme/palette';
import { cityNow } from '../services/cityTime';

// Imsak is a precautionary margin before Fajr, not a separate prayer time.
// 10 minutes is the common convention in published imsakiyat; adjustable here.
const IMSAK_MINUTES_BEFORE_FAJR = 10;

export const ImsakiahScreen: React.FC = () => {
  const { goBack, t, lang, currentCity, calculationMethod, asrMethod, prayerOffsets } = useApp();
  const p = usePalette();

  // Generate 30 days of Ramadan / Hijri calendar
  const today = cityNow(currentCity.timeZone);
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i, 12);
    const times = calculateAccuratePrayerTimes(currentCity.lat, currentCity.lng, d, calculationMethod, asrMethod, currentCity.timeZone, prayerOffsets);
    const imsakTotal = (times.fajr.hours * 60 + times.fajr.minutes - IMSAK_MINUTES_BEFORE_FAJR + 1440) % 1440;
    return {
      dayNum: i + 1,
      dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
      imsak: formatPrayerTime(Math.floor(imsakTotal / 60), imsakTotal % 60).split(' ')[0],
      fajr: times.fajr.timeStr.split(' ')[0],
      sunrise: times.sunrise.timeStr.split(' ')[0],
      dhuhr: times.dhuhr.timeStr.split(' ')[0],
      asr: times.asr.timeStr.split(' ')[0],
      maghrib: times.maghrib.timeStr.split(' ')[0],
      isha: times.isha.timeStr.split(' ')[0]
    };
  });

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Header
        title={t('إمساكية رمضان المبارك', 'Ramadan Imsakiah')}
        subtitle={lang === 'en' ? `${currentCity.nameEn} • 30 days` : `${currentCity.nameAr} • ٣٠ يوماً`}
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
            backgroundColor: p.hero,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 8,
            marginBottom: 8
          }}
        >
          <TextUI variant="captionBold" color={p.onHero} style={{ width: 44, textAlign: 'center' }}>{t('اليوم', 'Day')}</TextUI>
          <TextUI variant="captionBold" color={p.onHero} style={{ flex: 1, textAlign: 'center' }}>{t('الإمساك', 'Imsak')}</TextUI>
          <TextUI variant="captionBold" color={p.onHero} style={{ flex: 1, textAlign: 'center' }}>{t('الفجر', 'Fajr')}</TextUI>
          <TextUI variant="captionBold" color={p.onHero} style={{ flex: 1, textAlign: 'center' }}>{t('الشروق', 'Sunrise')}</TextUI>
          <TextUI variant="captionBold" color={p.onHero} style={{ flex: 1, textAlign: 'center' }}>{t('المغرب', 'Maghrib')}</TextUI>
          <TextUI variant="captionBold" color={p.onHero} style={{ flex: 1, textAlign: 'center' }}>{t('العشاء', 'Isha')}</TextUI>
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
                backgroundColor: isToday ? p.soft : p.surface,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 8,
                marginBottom: 6,
                borderWidth: 1,
                borderColor: isToday ? p.primary : p.border
              }}
            >
              <TextUI variant="captionBold" color={isToday ? p.primaryInk : p.ink} style={{ width: 44, textAlign: 'center' }}>
                {toArabicNumber(d.dayNum)}
              </TextUI>
              <TextUI variant="caption" color={p.muted} style={{ flex: 1, textAlign: 'center' }}>
                {d.imsak}
              </TextUI>
              <TextUI variant="caption" weight={isToday ? 'bold' : 'regular'} color={p.ink} style={{ flex: 1, textAlign: 'center' }}>
                {d.fajr}
              </TextUI>
              <TextUI variant="caption" color={p.muted} style={{ flex: 1, textAlign: 'center' }}>
                {d.sunrise}
              </TextUI>
              <TextUI variant="captionBold" color={p.primary} style={{ flex: 1, textAlign: 'center' }}>
                {d.maghrib}
              </TextUI>
              <TextUI variant="caption" color={p.muted} style={{ flex: 1, textAlign: 'center' }}>
                {d.isha}
              </TextUI>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
