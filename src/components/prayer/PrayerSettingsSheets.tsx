import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, TextInput, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { TextUI } from '../common/TextUI';
import { searchCities } from '../../constants/cities';
import { countOffsets, toArabicNumber, PrayerOffsets, PrayerTimeValues, PRAYER_OFFSET_LIMIT } from '../../services/prayerCalculation';
import { PrayerBellsConfig } from '../../services/notificationService';
import { Stepper } from '../../ui/Stepper';
import { usePalette } from '../../theme/palette';
import { getUiLanguage, tr } from '../../i18n/language';

export type PrayerSheet = 'city' | 'calc' | 'asr' | 'offsets';

export const CALC_METHODS = [
  { id: 'umm_al_qura' as const, titleAr: 'أم القرى (المملكة العربية السعودية)', titleEn: 'Umm al-Qura (Saudi Arabia)', shortAr: 'أم القرى', shortEn: 'Umm al-Qura', note: 'الفجر 18.5° • العشاء 90 دقيقة بعد المغرب', noteEn: 'Fajr 18.5° • Isha 90 minutes after Maghrib' },
  { id: 'egypt' as const, titleAr: 'الهيئة المصرية العامة للمساحة', titleEn: 'Egyptian General Authority of Survey', shortAr: 'الهيئة المصرية', shortEn: 'Egyptian Authority', note: 'الفجر 19.5° • العشاء 17.5°', noteEn: 'Fajr 19.5° • Isha 17.5°' },
  { id: 'mwl' as const, titleAr: 'رابطة العالم الإسلامي (مكة المكرمة)', titleEn: 'Muslim World League (Makkah)', shortAr: 'رابطة العالم الإسلامي', shortEn: 'Muslim World League', note: 'الفجر 18° • العشاء 17°', noteEn: 'Fajr 18° • Isha 17°' },
  { id: 'isna' as const, titleAr: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)', titleEn: 'Islamic Society of North America (ISNA)', shortAr: 'ISNA', shortEn: 'ISNA', note: 'الفجر 15° • العشاء 15°', noteEn: 'Fajr 15° • Isha 15°' }
];

export const ASR_METHODS = [
  { id: 'standard' as const, titleAr: 'جمهور الفقهاء (الشافعي والمالكي وأحمد)', titleEn: "Majority (Shafi'i, Maliki, Hanbali)", shortAr: 'الجمهور', shortEn: 'Majority' },
  { id: 'hanafi' as const, titleAr: 'المذهب الحنفي (مصير الظل مثليه)', titleEn: "Hanafi (shadow twice the object's length)", shortAr: 'الحنفي', shortEn: 'Hanafi' }
];

const OFFSET_ROWS: { key: keyof PrayerTimeValues; nameAr: string; nameEn: string }[] = [
  { key: 'fajr', nameAr: 'الفجر', nameEn: 'Fajr' },
  { key: 'sunrise', nameAr: 'الشروق', nameEn: 'Sunrise' },
  { key: 'dhuhr', nameAr: 'الظهر', nameEn: 'Dhuhr' },
  { key: 'asr', nameAr: 'العصر', nameEn: 'Asr' },
  { key: 'maghrib', nameAr: 'المغرب', nameEn: 'Maghrib' },
  { key: 'isha', nameAr: 'العشاء', nameEn: 'Isha' }
];

/** Values shown on the settings rows that open these sheets. */
export function prayerSettingValues(
  calculationMethod: string,
  asrMethod: string,
  offsets: PrayerOffsets,
  bells: PrayerBellsConfig
) {
  const adjusted = countOffsets(offsets);
  const bellCount = (['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).filter((k) => bells[k]).length;
  const calc = CALC_METHODS.find((m) => m.id === calculationMethod);
  const asr = ASR_METHODS.find((m) => m.id === asrMethod);
  return {
    calc: calc ? tr(calc.shortAr, calc.shortEn) : '',
    asr: asr ? tr(asr.shortAr, asr.shortEn) : '',
    offsets: adjusted ? tr(`${toArabicNumber(adjusted)} معدّلة`, `${toArabicNumber(adjusted)} adjusted`) : tr('بدون', 'None'),
    alerts: tr(`${toArabicNumber(bellCount)} من ٥`, `${toArabicNumber(bellCount)} of 5`)
  };
}

/** "تأخير ٢ د" / "تقديم ٣ د" / "٠" (words, since +/− signs reorder in RTL text) */
function offsetAr(mins: number): string {
  if (getUiLanguage() === 'en') {
    if (!mins) return '0';
    return `${mins > 0 ? 'Later' : 'Earlier'} ${Math.abs(mins)} min`;
  }
  if (!mins) return '٠';
  return `${mins > 0 ? 'تأخير' : 'تقديم'} ${toArabicNumber(Math.abs(mins))} د`;
}

/** City, calculation method, Asr method and manual adjustment sheets, shared by the prayer and settings screens. */
export const PrayerSettingsSheets: React.FC<{ open: PrayerSheet | null; onClose: () => void }> = ({ open, onClose }) => {
  const {
    t,
    isRTL,
    lang,
    currentCity,
    setCurrentCity,
    prayerTimes,
    calculationMethod,
    setCalculationMethod,
    asrMethod,
    setAsrMethod,
    prayerOffsets,
    setPrayerOffsets,
    refreshLocation,
    triggerHaptic
  } = useApp();
  const p = usePalette();
  const [citySearch, setCitySearch] = useState('');
  const filteredCities = searchCities(citySearch, currentCity.countryCode);
  const adjustedCount = countOffsets(prayerOffsets);

  const closeButton = (size = 20) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name="x" size={size} color={p.ink} />
    </TouchableOpacity>
  );

  return (
    <>
      {/* City Selector Modal */}
      <Modal visible={open === 'city'} animationType="slide" transparent onRequestClose={onClose}>
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
              {closeButton(22)}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              onPress={() => {
                triggerHaptic('light');
                refreshLocation();
                onClose();
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
                textAlign: isRTL ? 'right' : 'left'
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
                    onClose();
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
                      {lang === 'en' ? item.nameEn : item.nameAr}
                    </TextUI>
                    <TextUI size={12} color={p.muted}>
                      {lang === 'en' ? item.countryEn : item.country}
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
      <Modal visible={open === 'calc'} animationType="fade" transparent onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: p.bg, borderRadius: 20, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <TextUI size={18} weight="bold" color={p.ink}>
                {t('طريقة الحساب الفلكي', 'Calculation Method')}
              </TextUI>
              {closeButton()}
            </View>

            {CALC_METHODS.map((m) => (
              <TouchableOpacity
                key={m.id}
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic('light');
                  setCalculationMethod(m.id);
                  onClose();
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
                      {t(m.titleAr, m.titleEn)}
                    </TextUI>
                    <TextUI size={12} color={p.muted} style={{ marginTop: 2 }}>
                      {t(m.note, m.noteEn)}
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

      {/* Manual adjustments sheet */}
      <Modal visible={open === 'offsets'} animationType="slide" transparent onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
              <View style={{ flex: 1 }}>
                <TextUI size={18} weight="bold" color={p.ink}>{t('تعديل يدوي للأوقات', 'Manual time adjustments')}</TextUI>
                <TextUI size={12.5} color={p.muted}>{t(`تقديم أو تأخير حتى ${toArabicNumber(PRAYER_OFFSET_LIMIT)} دقيقة. يشمل التنبيهات والجدول الشهري.`, `Move earlier or later by up to ${toArabicNumber(PRAYER_OFFSET_LIMIT)} minutes. Applies to alerts and the monthly timetable.`)}</TextUI>
              </View>
              {closeButton(22)}
            </View>
            <View style={{ marginTop: 8, borderTopWidth: 1, borderColor: p.divider }}>
              {OFFSET_ROWS.map((row) => {
                const mins = prayerOffsets[row.key] || 0;
                const change = (delta: number) => {
                  triggerHaptic('light');
                  setPrayerOffsets({ ...prayerOffsets, [row.key]: mins + delta });
                };
                return (
                  <Stepper
                    key={row.key}
                    label={t(row.nameAr, row.nameEn)}
                    sub={t(`اليوم ${prayerTimes[row.key].timeStr}`, `Today ${prayerTimes[row.key].timeStr}`)}
                    valueLabel={offsetAr(mins)}
                    onDecrement={() => change(-1)}
                    onIncrement={() => change(1)}
                    canDecrement={mins > -PRAYER_OFFSET_LIMIT}
                    canIncrement={mins < PRAYER_OFFSET_LIMIT}
                  />
                );
              })}
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              accessibilityRole="button"
              disabled={!adjustedCount}
              onPress={() => { triggerHaptic('light'); setPrayerOffsets({}); }}
              style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center', paddingHorizontal: 18, marginTop: 12, borderRadius: 999, borderWidth: 1, borderColor: p.border, opacity: adjustedCount ? 1 : 0.45 }}
            >
              <TextUI size={14} weight="medium" color={p.primaryInk}>{t('إعادة الكل إلى صفر', 'Reset all to zero')}</TextUI>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Asr Method Modal */}
      <Modal visible={open === 'asr'} animationType="fade" transparent onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: p.bg, borderRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <TextUI size={18} weight="bold" color={p.ink}>
                {t('مذهب حساب صلاة العصر', 'Asr Juristic Method')}
              </TextUI>
              {closeButton()}
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
                  onClose();
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: p.border }}
              >
                <TextUI size={14} weight="bold" color={m.id === asrMethod ? p.primary : p.ink} style={{ flex: 1 }}>
                  {t(m.titleAr, m.titleEn)}
                </TextUI>
                {m.id === asrMethod && <Feather name="check" size={18} color={p.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </>
  );
};
