import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, TextInput, FlatList, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { searchCities } from '../constants/cities';
import { calculateAccuratePrayerTimes, computeNightTimes, toArabicNumber, PrayerTimeValues } from '../services/prayerCalculation';
import { getFullDateInfo } from '../services/hijriDate';
import { cityNow } from '../services/cityTime';
import { useNextPrayer } from '../hooks/useNextPrayer';
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

const CALC_METHODS = [
  { id: 'umm_al_qura' as const, titleAr: 'أم القرى (المملكة العربية السعودية)', shortAr: 'أم القرى', note: 'الفجر 18.5° • العشاء 90 دقيقة بعد المغرب' },
  { id: 'egypt' as const, titleAr: 'الهيئة المصرية العامة للمساحة', shortAr: 'الهيئة المصرية', note: 'الفجر 19.5° • العشاء 17.5°' },
  { id: 'mwl' as const, titleAr: 'رابطة العالم الإسلامي (مكة المكرمة)', shortAr: 'رابطة العالم الإسلامي', note: 'الفجر 18° • العشاء 17°' },
  { id: 'isna' as const, titleAr: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)', shortAr: 'ISNA', note: 'الفجر 15° • العشاء 15°' }
];

const ASR_METHODS = [
  { id: 'standard' as const, titleAr: 'جمهور الفقهاء (الشافعي والمالكي وأحمد)', shortAr: 'الجمهور' },
  { id: 'hanafi' as const, titleAr: 'المذهب الحنفي (مصير الظل مثليه)', shortAr: 'الحنفي' }
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
    setCurrentCity,
    prayerTimes,
    prayerBells,
    togglePrayerBell,
    calculationMethod,
    setCalculationMethod,
    asrMethod,
    setAsrMethod,
    refreshLocation,
    triggerHaptic
  } = useApp();

  const [cityModalVisible, setCityModalVisible] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [calcModalVisible, setCalcModalVisible] = useState(false);
  const [asrModalVisible, setAsrModalVisible] = useState(false);
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
    () => (isToday ? prayerTimes : calculateAccuratePrayerTimes(currentCity.lat, currentCity.lng, day, calculationMethod, asrMethod, timeZone)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isToday, prayerTimes, currentCity.lat, currentCity.lng, dayKey, calculationMethod, asrMethod, timeZone]
  );
  const night = useMemo(
    () => computeNightTimes(currentCity.lat, currentCity.lng, day, calculationMethod, asrMethod, timeZone),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentCity.lat, currentCity.lng, dayKey, calculationMethod, asrMethod, timeZone]
  );

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

  const bellCount = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).filter((k) => prayerBells[k]).length;
  const filteredCities = searchCities(citySearch, currentCity.countryCode);

  const settingsRows = [
    { key: 'city', label: 'المدينة', value: `${currentCity.nameAr} · ${currentCity.countryAr}`, onPress: () => setCityModalVisible(true) },
    { key: 'calc', label: 'طريقة الحساب', value: CALC_METHODS.find((m) => m.id === calculationMethod)?.shortAr || '', onPress: () => setCalcModalVisible(true) },
    { key: 'asr', label: 'حساب العصر', value: ASR_METHODS.find((m) => m.id === asrMethod)?.shortAr || '', onPress: () => setAsrModalVisible(true) },
    { key: 'alerts', label: 'الأذان والإقامة', value: `${toArabicNumber(bellCount)} من ٥`, onPress: () => navigate('adhan_settings') },
    { key: 'month', label: 'مواقيت الشهر', value: '', onPress: () => navigate('prayer_month') }
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
        <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          {settingsRows.map((row, i) => (
            <TouchableOpacity
              key={row.key}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={row.value ? `${row.label}: ${row.value}` : row.label}
              onPress={() => { triggerHaptic('light'); row.onPress(); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: p.border }}
            >
              <TextUI size={15} color={p.ink} style={{ flex: 1 }}>{row.label}</TextUI>
              {row.value ? <TextUI size={14} color={p.muted} numberOfLines={1} style={{ flexShrink: 1, maxWidth: '60%' }}>{row.value}</TextUI> : null}
              <Feather name="chevron-left" size={16} color={p.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* City Selector Modal */}
      <Modal visible={cityModalVisible} animationType="slide" transparent onRequestClose={() => setCityModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View
            style={{
              height: '75%',
              backgroundColor: p.bg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <TextUI size={18} weight="bold" color={p.ink}>
                {t('اختر المدينة', 'Select City')}
              </TextUI>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setCityModalVisible(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={22} color={p.ink} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              onPress={() => {
                triggerHaptic('light');
                refreshLocation();
                setCityModalVisible(false);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 14, borderRadius: 12, marginBottom: 12, backgroundColor: p.soft }}
            >
              <Feather name="navigation" size={16} color={p.primary} />
              <TextUI size={15} weight="medium" color={p.primaryInk}>{t('استخدم موقعي الحالي', 'Use my location')}</TextUI>
            </TouchableOpacity>

            <TextInput
              placeholder={t('ابحث عن دولة أو مدينة...', 'Search city or country...')}
              placeholderTextColor={p.muted}
              value={citySearch}
              onChangeText={setCitySearch}
              style={{
                backgroundColor: p.surface,
                borderRadius: 12,
                padding: 12,
                color: p.ink,
                borderWidth: 1,
                borderColor: p.border,
                marginBottom: 14,
                textAlign: 'right'
              }}
            />

            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <TextUI size={13} color={p.muted} align="center" style={{ paddingVertical: 24, lineHeight: 22 }}>
                  {t('لا توجد مدينة بهذا الاسم. جرّب اسمًا آخر أو استخدم موقعك الحالي.', 'No city found. Try another name or use your location.')}
                </TextUI>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    triggerHaptic('light');
                    setCurrentCity(item);
                    setCityModalVisible(false);
                  }}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingVertical: 14,
                    borderBottomWidth: 1,
                    borderColor: p.border
                  }}
                >
                  <View>
                    <TextUI size={15} weight="bold" color={p.ink}>
                      {item.nameAr}
                    </TextUI>
                    <TextUI size={12} color={p.muted}>
                      {item.country}
                    </TextUI>
                  </View>
                  {item.id === currentCity.id && (
                    <Feather name="check" size={18} color={p.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Calculation Method Modal */}
      <Modal visible={calcModalVisible} animationType="fade" transparent onRequestClose={() => setCalcModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: p.bg, borderRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TextUI size={18} weight="bold" color={p.ink}>
                {t('طريقة الحساب الفلكي', 'Calculation Method')}
              </TextUI>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setCalcModalVisible(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={20} color={p.ink} />
              </TouchableOpacity>
            </View>

            {CALC_METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic('light');
                  setCalculationMethod(m.id);
                  setCalcModalVisible(false);
                }}
                style={{
                  paddingVertical: 14,
                  borderBottomWidth: 1,
                  borderColor: p.border
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <TextUI size={14} weight="bold" color={m.id === calculationMethod ? p.primary : p.ink}>
                      {m.titleAr}
                    </TextUI>
                    <TextUI size={12} color={p.muted} style={{ marginTop: 2 }}>
                      {m.note}
                    </TextUI>
                  </View>
                  {m.id === calculationMethod && (
                    <Feather name="check" size={18} color={p.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Asr Method Modal */}
      <Modal visible={asrModalVisible} animationType="fade" transparent onRequestClose={() => setAsrModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: p.bg, borderRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <TextUI size={18} weight="bold" color={p.ink}>
                {t('مذهب حساب صلاة العصر', 'Asr Juristic Method')}
              </TextUI>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setAsrModalVisible(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={20} color={p.ink} />
              </TouchableOpacity>
            </View>

            {ASR_METHODS.map((m, i) => (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: m.id === asrMethod }}
                onPress={() => {
                  triggerHaptic('light');
                  setAsrMethod(m.id);
                  setAsrModalVisible(false);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: p.border }}
              >
                <TextUI size={14} weight="bold" color={m.id === asrMethod ? p.primary : p.ink} style={{ flex: 1 }}>
                  {m.titleAr}
                </TextUI>
                {m.id === asrMethod && <Feather name="check" size={18} color={p.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
};
