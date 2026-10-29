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

export type PrayerSheet = 'city' | 'calc' | 'asr' | 'offsets';

export const CALC_METHODS = [
  { id: 'umm_al_qura' as const, titleAr: 'أم القرى (المملكة العربية السعودية)', shortAr: 'أم القرى', note: 'الفجر 18.5° • العشاء 90 دقيقة بعد المغرب' },
  { id: 'egypt' as const, titleAr: 'الهيئة المصرية العامة للمساحة', shortAr: 'الهيئة المصرية', note: 'الفجر 19.5° • العشاء 17.5°' },
  { id: 'mwl' as const, titleAr: 'رابطة العالم الإسلامي (مكة المكرمة)', shortAr: 'رابطة العالم الإسلامي', note: 'الفجر 18° • العشاء 17°' },
  { id: 'isna' as const, titleAr: 'الجمعية الإسلامية لأمريكا الشمالية (ISNA)', shortAr: 'ISNA', note: 'الفجر 15° • العشاء 15°' }
];

export const ASR_METHODS = [
  { id: 'standard' as const, titleAr: 'جمهور الفقهاء (الشافعي والمالكي وأحمد)', shortAr: 'الجمهور' },
  { id: 'hanafi' as const, titleAr: 'المذهب الحنفي (مصير الظل مثليه)', shortAr: 'الحنفي' }
];

const OFFSET_ROWS: { key: keyof PrayerTimeValues; nameAr: string }[] = [
  { key: 'fajr', nameAr: 'الفجر' },
  { key: 'sunrise', nameAr: 'الشروق' },
  { key: 'dhuhr', nameAr: 'الظهر' },
  { key: 'asr', nameAr: 'العصر' },
  { key: 'maghrib', nameAr: 'المغرب' },
  { key: 'isha', nameAr: 'العشاء' }
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
  return {
    calc: CALC_METHODS.find((m) => m.id === calculationMethod)?.shortAr || '',
    asr: ASR_METHODS.find((m) => m.id === asrMethod)?.shortAr || '',
    offsets: adjusted ? `${toArabicNumber(adjusted)} معدّلة` : 'بدون',
    alerts: `${toArabicNumber(bellCount)} من ٥`
  };
}

/** "تأخير ٢ د" / "تقديم ٣ د" / "٠" (words, since +/− signs reorder in RTL text) */
function offsetAr(mins: number): string {
  if (!mins) return '٠';
  return `${mins > 0 ? 'تأخير' : 'تقديم'} ${toArabicNumber(Math.abs(mins))} د`;
}

/** City, calculation method, Asr method and manual adjustment sheets, shared by the prayer and settings screens. */
export const PrayerSettingsSheets: React.FC<{ open: PrayerSheet | null; onClose: () => void }> = ({ open, onClose }) => {
  const {
    t,
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
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق" onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
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

      {/* Manual adjustments sheet */}
      <Modal visible={open === 'offsets'} animationType="slide" transparent onRequestClose={onClose}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingBottom: 24 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
              <View style={{ flex: 1 }}>
                <TextUI size={18} weight="bold" color={p.ink}>تعديل يدوي للأوقات</TextUI>
                <TextUI size={12.5} color={p.muted}>{`تقديم أو تأخير حتى ${toArabicNumber(PRAYER_OFFSET_LIMIT)} دقيقة. يشمل التنبيهات والجدول الشهري.`}</TextUI>
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
                    label={row.nameAr}
                    sub={`اليوم ${prayerTimes[row.key].timeStr}`}
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
              <TextUI size={14} weight="medium" color={p.primaryInk}>إعادة الكل إلى صفر</TextUI>
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
                  {m.titleAr}
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
