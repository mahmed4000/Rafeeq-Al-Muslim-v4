import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { PrayerSettingsSheets, PrayerSheet, prayerSettingValues } from '../components/prayer/PrayerSettingsSheets';
import { calculateAccuratePrayerTimes, computeNightTimes, countOffsets, toArabicNumber, PrayerTimeValues } from '../services/prayerCalculation';
import { getFullDateInfo } from '../services/hijriDate';
import { cityNow } from '../services/cityTime';
import { useNextPrayer } from '../hooks/useNextPrayer';
import { SettingsList } from '../ui/SettingsList';
import { usePalette } from '../theme/palette';

type RowKey = keyof PrayerTimeValues;

const ROWS: { key: RowKey; nameAr: string }[] = [
  { key: 'fajr', nameAr: 'الفجر' },
  { key: 'sunrise', nameAr: 'الشروق' },
  { key: 'dhuhr', nameAr: 'الظهر' },
  { key: 'asr', nameAr: 'العصر' },
  { key: 'maghrib', nameAr: 'المغرب' },
  { key: 'isha', nameAr: 'العشاء' }
];

/** "بعد ٣١ دقيقة" / "بعد ٢ س ١٠ د" */
function inAr(secs: number): string {
  const mins = Math.max(1, Math.ceil(secs / 60));
  if (mins < 60) return `بعد ${toArabicNumber(mins)} دقيقة`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `بعد ${toArabicNumber(h)} س ${toArabicNumber(m)} د` : `بعد ${toArabicNumber(h)} س`;
}

export const PrayerTimesScreen: React.FC = () => {
  const {
    navigate,
    t,
    currentCity,
    prayerTimes,
    prayerBells,
    togglePrayerBell,
    calculationMethod,
    asrMethod,
    prayerOffsets,
    triggerHaptic
  } = useApp();

  const [sheet, setSheet] = useState<PrayerSheet | null>(null);
  // Days from the city's today; back to today whenever the tab is opened again.
  const [dayOffset, setDayOffset] = useState(0);
  useFocusEffect(useCallback(() => setDayOffset(0), []));

  const p = usePalette();
  const timeZone = currentCity.timeZone;
  const next = useNextPrayer(prayerTimes, timeZone);
  const today = cityNow(timeZone);
  const isToday = dayOffset === 0;
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset, 12);
  const dayKey = day.toDateString();

  const times = useMemo(
    () => (isToday ? prayerTimes : calculateAccuratePrayerTimes(currentCity.lat, currentCity.lng, day, calculationMethod, asrMethod, timeZone, prayerOffsets)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isToday, prayerTimes, currentCity.lat, currentCity.lng, dayKey, calculationMethod, asrMethod, timeZone, prayerOffsets]
  );
  const night = useMemo(
    () => computeNightTimes(currentCity.lat, currentCity.lng, day, calculationMethod, asrMethod, timeZone, prayerOffsets),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentCity.lat, currentCity.lng, dayKey, calculationMethod, asrMethod, timeZone, prayerOffsets]
  );
  const adjustedCount = countOffsets(prayerOffsets);

  const dateInfo = getFullDateInfo(day);
  const dayLabel = dayOffset === 0 ? 'اليوم' : dayOffset === 1 ? 'غدًا' : dayOffset === -1 ? 'أمس' : '';
  const dayTitle = dayLabel ? `${dayLabel} · ${dateInfo.gregorianDayName}` : dateInfo.gregorianDayName;

  // Status on today's list: the prayer whose time is running and the next one.
  const nowMins = today.getHours() * 60 + today.getMinutes();
  const minsOf = (k: RowKey) => times[k].hours * 60 + times[k].minutes;
  const nextKey = isToday && !next.isTomorrow ? (next.id as RowKey) : null;
  const currentKey: RowKey | null = (() => {
    if (!isToday || nowMins < minsOf('fajr')) return null;
    if (nowMins < minsOf('sunrise')) return 'fajr';
    if (nowMins < minsOf('dhuhr')) return null;
    if (nowMins < minsOf('asr')) return 'dhuhr';
    if (nowMins < minsOf('maghrib')) return 'asr';
    if (nowMins < minsOf('isha')) return 'maghrib';
    return 'isha';
  })();
  const noteFor = (k: RowKey): string => {
    if (k === 'sunrise') return 'ليس وقت صلاة';
    if (!isToday) return '';
    if (k === nextKey) return inAr(next.diffSeconds);
    if (k === currentKey) return 'الوقت الحالي';
    if (nowMins >= minsOf(k)) return 'انتهى';
    return '';
  };

  const values = prayerSettingValues(calculationMethod, asrMethod, prayerOffsets, prayerBells);
  const openSheet = (s: PrayerSheet) => { triggerHaptic('light'); setSheet(s); };
  const settingsRows = [
    { key: 'city', label: 'المدينة', value: `${currentCity.nameAr} · ${currentCity.countryAr}`, onPress: () => openSheet('city') },
    { key: 'calc', label: 'طريقة الحساب', value: values.calc, onPress: () => openSheet('calc') },
    { key: 'asr', label: 'حساب العصر', value: values.asr, onPress: () => openSheet('asr') },
    { key: 'offsets', label: 'تعديل يدوي للأوقات', value: values.offsets, onPress: () => openSheet('offsets') },
    { key: 'alerts', label: 'الأذان والإقامة', value: values.alerts, onPress: () => navigate('adhan_settings') },
    { key: 'month', label: 'مواقيت الشهر', onPress: () => navigate('prayer_month') }
  ];

  const shiftDay = (delta: number) => {
    triggerHaptic('light');
    setDayOffset((d) => d + delta);
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 24 : 16, paddingBottom: 104, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title and Qibla */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TextUI size={26} weight="bold" color={p.ink}>{t('الصلاة', 'Prayer')}</TextUI>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            onPress={() => navigate('qibla')}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
          >
            <Feather name="compass" size={16} color={p.primary} />
            <TextUI size={14} weight="medium" color={p.ink}>{t('القبلة', 'Qibla')}</TextUI>
          </TouchableOpacity>
        </View>

        {/* Day picker */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 16, padding: 4, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="اليوم السابق" onPress={() => shiftDay(-1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-right" size={20} color={p.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isToday ? `${dayTitle}، ${dateInfo.hijriFormatted}` : `${dayTitle}، ${dateInfo.hijriFormatted}. اضغط للعودة إلى اليوم`}
            disabled={isToday}
            onPress={() => shiftDay(-dayOffset)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}
          >
            <TextUI size={15} weight="bold" color={p.ink}>{dayTitle}</TextUI>
            <TextUI size={13} color={p.muted} numberOfLines={1}>{`${dateInfo.hijriFormatted} · ${dateInfo.gregorianDate}`}</TextUI>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="اليوم التالي" onPress={() => shiftDay(1)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="chevron-left" size={20} color={p.primary} />
          </TouchableOpacity>
        </View>

        {/* The day's six times */}
        <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          {ROWS.map((row, i) => {
            const isNext = row.key === nextKey;
            const isCurrent = row.key === currentKey;
            const note = noteFor(row.key);
            const bellKey = row.key === 'sunrise' ? null : row.key;
            const bellOn = bellKey ? prayerBells[bellKey] : false;
            return (
              <View
                key={row.key}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, minHeight: 56, backgroundColor: isNext ? p.soft : 'transparent', borderTopWidth: i ? 1 : 0, borderColor: p.border }}
              >
                <View style={{ width: 6, height: 28, borderRadius: 3, backgroundColor: isNext ? p.accent : isCurrent ? p.success : 'transparent' }} />
                <View style={{ flex: 1 }}>
                  <TextUI size={17} weight={isNext ? 'bold' : 'medium'} color={row.key === 'sunrise' ? p.muted : p.ink}>{row.nameAr}</TextUI>
                  {note ? <TextUI size={12.5} color={p.muted}>{note}</TextUI> : null}
                </View>
                <TextUI size={18} weight="bold" color={p.ink}>{times[row.key].timeStr}</TextUI>
                {bellKey ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: bellOn }}
                    accessibilityLabel={`تنبيه ${row.nameAr}`}
                    onPress={() => togglePrayerBell(bellKey)}
                    style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Feather name={bellOn ? 'bell' : 'bell-off'} size={18} color={bellOn ? p.primary : p.muted} />
                  </TouchableOpacity>
                ) : (
                  <View style={{ width: 44 }} />
                )}
              </View>
            );
          })}
        </View>
        {adjustedCount ? (
          <TouchableOpacity accessibilityRole="button" onPress={() => openSheet('offsets')} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 32, marginTop: -4 }}>
            <Feather name="sliders" size={13} color={p.muted} />
            <TextUI size={12.5} color={p.muted}>بعض الأوقات معدّلة يدويًا</TextUI>
          </TouchableOpacity>
        ) : null}

        {/* Night times (Maghrib → next Fajr) */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { label: t('منتصف الليل', 'Midnight'), value: night.midnight },
            { label: t('الثلث الأخير', 'Last third'), value: night.lastThird }
          ].map((item) => (
            <View key={item.label} style={{ flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, gap: 2, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
              <TextUI size={13} color={p.muted}>{item.label}</TextUI>
              <TextUI size={18} weight="bold" color={p.ink}>{item.value}</TextUI>
            </View>
          ))}
        </View>

        {/* Calculation and alert settings */}
        <SettingsList rows={settingsRows} />
      </ScrollView>

      <PrayerSettingsSheets open={sheet} onClose={() => setSheet(null)} />
    </View>
  );
};
