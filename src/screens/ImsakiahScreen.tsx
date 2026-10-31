import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { calculateAccuratePrayerTimes, formatPrayerTime, toArabicNumber } from '../services/prayerCalculation';
import { usePalette } from '../theme/palette';
import { cityNow } from '../services/cityTime';
import { findRamadan } from '../services/ramadan';
import { gregorianMonthName } from '../services/hijriDate';

// Imsak is a precautionary margin before Fajr, not a separate prayer time.
// 10 minutes is the common convention in published imsakiyat; adjustable here.
const IMSAK_MINUTES_BEFORE_FAJR = 10;

/**
 * Ramadan imsakiyah: the days of the current Ramadan, or of the coming one, from the Umm al-Qura
 * calendar with the user's Hijri correction (it used to list the next 30 days from today).
 */
export const ImsakiahScreen: React.FC = () => {
  const { goBack, t, lang, currentCity, calculationMethod, asrMethod, prayerOffsets, hijriAdjust } = useApp();
  const p = usePalette();
  const today = cityNow(currentCity.timeZone);
  const todayKey = today.toDateString();

  const ramadan = useMemo(() => findRamadan(today, hijriAdjust), [todayKey, hijriAdjust]); // eslint-disable-line react-hooks/exhaustive-deps
  const days = useMemo(() => (ramadan?.days || []).map((d, i) => {
    const times = calculateAccuratePrayerTimes(currentCity.lat, currentCity.lng, d, calculationMethod, asrMethod, currentCity.timeZone, prayerOffsets);
    const imsakTotal = (times.fajr.hours * 60 + times.fajr.minutes - IMSAK_MINUTES_BEFORE_FAJR + 1440) % 1440;
    return {
      dayNum: i + 1,
      key: d.toDateString(),
      dateStr: lang === 'en' ? `${d.getDate()}/${d.getMonth() + 1}` : `${toArabicNumber(d.getDate())} ${gregorianMonthName(d.getMonth())}`,
      imsak: formatPrayerTime(Math.floor(imsakTotal / 60), imsakTotal % 60).split(' ')[0],
      fajr: times.fajr.timeStr.split(' ')[0],
      maghrib: times.maghrib.timeStr.split(' ')[0],
      isha: times.isha.timeStr.split(' ')[0]
    };
  }), [ramadan, currentCity.lat, currentCity.lng, currentCity.timeZone, calculationMethod, asrMethod, prayerOffsets, lang]);

  const yearLabel = ramadan ? toArabicNumber(ramadan.year) : '';
  const first = ramadan?.days[0];
  const startsLabel = first && first.getTime() > today.getTime()
    ? t(`يبدأ ${toArabicNumber(first.getDate())} ${gregorianMonthName(first.getMonth())} تقديرًا بتقويم أم القرى`, `Expected to begin ${first.getDate()}/${first.getMonth() + 1} (Umm al-Qura)`)
    : '';

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <Header
        title={t(`إمساكية رمضان ${yearLabel}`, `Ramadan ${ramadan?.year || ''} imsakiah`)}
        subtitle={lang === 'en' ? currentCity.nameEn : currentCity.nameAr}
        onBack={goBack}
      />

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 6 }} showsVerticalScrollIndicator={false}>
        {startsLabel ? (
          <TextUI size={13} color={p.muted} align="center" style={{ marginBottom: 6 }}>{startsLabel}</TextUI>
        ) : null}
        <TextUI size={12.5} color={p.muted} align="center" style={{ marginBottom: 8, lineHeight: 20 }}>
          {t(`الإمساك قبل الفجر بـ ${toArabicNumber(IMSAK_MINUTES_BEFORE_FAJR)} دقائق احتياطًا. أول رمضان وآخره بحسب إعلان الرؤية في بلدك.`, `Imsak is ${IMSAK_MINUTES_BEFORE_FAJR} minutes before Fajr as a precaution. The first and last days follow your country's moon sighting.`)}
        </TextUI>

        <View style={{ flexDirection: 'row', backgroundColor: p.hero, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8 }}>
          <TextUI variant="captionBold" color={p.onHero} style={{ width: 70, textAlign: 'center' }}>{t('اليوم', 'Day')}</TextUI>
          <TextUI variant="captionBold" color={p.onHero} style={{ flex: 1, textAlign: 'center' }}>{t('الإمساك', 'Imsak')}</TextUI>
          <TextUI variant="captionBold" color={p.onHero} style={{ flex: 1, textAlign: 'center' }}>{t('الفجر', 'Fajr')}</TextUI>
          <TextUI variant="captionBold" color={p.onHero} style={{ flex: 1, textAlign: 'center' }}>{t('الإفطار', 'Iftar')}</TextUI>
          <TextUI variant="captionBold" color={p.onHero} style={{ flex: 1, textAlign: 'center' }}>{t('العشاء', 'Isha')}</TextUI>
        </View>

        {days.map((d) => {
          const isToday = d.key === todayKey;
          return (
            <View
              key={d.key}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isToday ? p.soft : p.surface, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 8, borderWidth: 1, borderColor: isToday ? p.primary : p.border }}
            >
              <View style={{ width: 70, alignItems: 'center' }}>
                <TextUI variant="captionBold" color={isToday ? p.primaryInk : p.ink}>{toArabicNumber(d.dayNum)}</TextUI>
                <TextUI size={10.5} color={p.muted}>{d.dateStr}</TextUI>
              </View>
              <TextUI variant="caption" color={p.ink} style={{ flex: 1, textAlign: 'center' }}>{d.imsak}</TextUI>
              <TextUI variant="caption" weight={isToday ? 'bold' : 'regular'} color={p.ink} style={{ flex: 1, textAlign: 'center' }}>{d.fajr}</TextUI>
              <TextUI variant="captionBold" color={p.primary} style={{ flex: 1, textAlign: 'center' }}>{d.maghrib}</TextUI>
              <TextUI variant="caption" color={p.muted} style={{ flex: 1, textAlign: 'center' }}>{d.isha}</TextUI>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
