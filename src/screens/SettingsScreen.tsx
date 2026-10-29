import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp, ThemePreference } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { PrayerSettingsSheets, PrayerSheet, prayerSettingValues } from '../components/prayer/PrayerSettingsSheets';
import { NotificationService } from '../services/notificationService';
import { toArabicNumber } from '../services/prayerCalculation';
import { getFullDateInfo, HIJRI_ADJUST_LIMIT } from '../services/hijriDate';
import { cityNow } from '../services/cityTime';
import { ScreenHeader } from '../ui/ScreenHeader';
import { SettingsList } from '../ui/SettingsList';
import { Stepper } from '../ui/Stepper';
import { usePalette } from '../theme/palette';

const THEMES: { id: ThemePreference; labelAr: string }[] = [
  { id: 'auto', labelAr: 'تلقائي حسب الجهاز' },
  { id: 'light', labelAr: 'أندلسي نهاري' },
  { id: 'dark', labelAr: 'أندلسي ليلي' }
];

const LANGS: { id: 'ar' | 'en'; labelAr: string }[] = [
  { id: 'ar', labelAr: 'العربية' },
  { id: 'en', labelAr: 'English' }
];

// Same bounds the Quran reader accepts for pinch zoom.
const FONT_MIN = 17;
const FONT_MAX = 48;
const FONT_STEP = 2;

// Only sources that can be confirmed from the app's own code and packages.
const SOURCES: { title: string; detail: string }[] = [
  { title: 'المدن ومناطقها الزمنية', detail: 'GeoNames (geonames.org) · رخصة CC BY 4.0' },
  { title: 'حساب مواقيت الصلاة', detail: 'مكتبة adhan مفتوحة المصدر · رخصة MIT' },
  { title: 'التاريخ الهجري', detail: 'تقويم أم القرى من نظام الجهاز' },
  { title: 'الخطوط', detail: 'Amiri و Tajawal و Cairo · رخصة SIL Open Font License 1.1' }
];

type ChoiceSheet = 'theme' | 'lang';

/** "بدون" / "زيادة يوم" / "إنقاص يومين" (words, since +/− signs reorder in RTL text) */
function hijriAdjustAr(days: number): string {
  if (!days) return 'بدون';
  const n = Math.abs(days);
  return `${days > 0 ? 'زيادة' : 'إنقاص'} ${n === 1 ? 'يوم' : n === 2 ? 'يومين' : `${toArabicNumber(n)} أيام`}`;
}

export const SettingsScreen: React.FC = () => {
  const {
    goBack,
    navigate,
    themePreference,
    setThemeMode,
    lang,
    setLang,
    currentCity,
    calculationMethod,
    asrMethod,
    prayerOffsets,
    prayerBells,
    quranFontSize,
    setQuranFontSize,
    hijriAdjust,
    setHijriAdjust,
    triggerHaptic
  } = useApp();
  const p = usePalette();

  const [prayerSheet, setPrayerSheet] = useState<PrayerSheet | null>(null);
  const [choice, setChoice] = useState<ChoiceSheet | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [hijriOpen, setHijriOpen] = useState(false);
  const todayInfo = getFullDateInfo(cityNow(currentCity.timeZone), hijriAdjust);

  const values = prayerSettingValues(calculationMethod, asrMethod, prayerOffsets, prayerBells);
  const open = (s: PrayerSheet) => { triggerHaptic('light'); setPrayerSheet(s); };
  const openChoice = (c: ChoiceSheet) => { triggerHaptic('light'); setChoice(c); };
  const changeFont = (delta: number) => {
    triggerHaptic('light');
    setQuranFontSize((s) => Math.max(FONT_MIN, Math.min(FONT_MAX, s + delta)));
  };

  const choiceOptions = choice === 'theme'
    ? THEMES.map((o) => ({ id: o.id, label: o.labelAr, selected: o.id === themePreference, pick: () => setThemeMode(o.id) }))
    : LANGS.map((o) => ({ id: o.id, label: o.labelAr, selected: o.id === lang, pick: () => setLang(o.id) }));

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader title="الإعدادات" onBack={goBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsList
          title="المواقيت"
          rows={[
            { key: 'calc', label: 'طريقة الحساب', value: values.calc, onPress: () => open('calc') },
            { key: 'asr', label: 'حساب العصر', value: values.asr, onPress: () => open('asr') },
            { key: 'offsets', label: 'تعديل يدوي للأوقات', value: values.offsets, onPress: () => open('offsets') },
            { key: 'hijri', label: 'تصحيح التاريخ الهجري', value: hijriAdjustAr(hijriAdjust), onPress: () => { triggerHaptic('light'); setHijriOpen(true); } }
          ]}
        />

        <SettingsList
          title="الموقع"
          rows={[{ key: 'city', label: 'المدينة', value: `${currentCity.nameAr} · ${currentCity.countryAr}`, onPress: () => open('city') }]}
        />

        <SettingsList
          title="التنبيهات"
          rows={[
            { key: 'alerts', label: 'الأذان والإقامة', value: values.alerts, onPress: () => navigate('adhan_settings') },
            {
              key: 'test',
              label: 'إرسال تنبيه أذان تجريبي',
              onPress: async () => {
                triggerHaptic('medium');
                await NotificationService.sendTestNotification(currentCity.nameAr);
              }
            }
          ]}
        />

        <SettingsList
          title="القراءة والمظهر"
          rows={[
            { key: 'theme', label: 'المظهر', value: THEMES.find((o) => o.id === themePreference)?.labelAr, onPress: () => openChoice('theme') },
            { key: 'lang', label: 'اللغة', value: LANGS.find((o) => o.id === lang)?.labelAr, onPress: () => openChoice('lang') }
          ]}
        >
          <View style={{ borderTopWidth: 1, borderColor: p.border }}>
            <Stepper
              label="حجم خط القرآن"
              sub="يمكن تغييره أيضًا بإصبعين داخل المصحف"
              valueLabel={toArabicNumber(quranFontSize)}
              onDecrement={() => changeFont(-FONT_STEP)}
              onIncrement={() => changeFont(FONT_STEP)}
              canDecrement={quranFontSize > FONT_MIN}
              canIncrement={quranFontSize < FONT_MAX}
            />
          </View>
        </SettingsList>

        <View style={{ gap: 10 }}>
          <SettingsList
            title="البيانات"
            rows={[{ key: 'downloads', label: 'التنزيلات', value: 'الدروس المحمّلة والمساحة', onPress: () => navigate('downloads') }]}
          />

          <SettingsList
            rows={[{ key: 'sources', label: 'المصادر والتراخيص', expanded: sourcesOpen, onPress: () => setSourcesOpen((v) => !v) }]}
          >
            {sourcesOpen ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderColor: p.border, paddingTop: 12 }}>
                {SOURCES.map((s) => (
                  <View key={s.title}>
                    <TextUI size={14} weight="bold" color={p.ink}>{s.title}</TextUI>
                    <TextUI size={13} color={p.muted}>{s.detail}</TextUI>
                  </View>
                ))}
                <TextUI size={13} color={p.muted}>مصادر المحتوى الديني (نص المصحف، التلاوات، الأذكار، الدروس) قيد التوثيق.</TextUI>
              </View>
            ) : null}
          </SettingsList>

          <SettingsList
            rows={[{ key: 'about', label: 'عن رفيق المسلم', value: 'الإصدار ٢.١.٠', expanded: aboutOpen, onPress: () => setAboutOpen((v) => !v) }]}
          >
            {aboutOpen ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 12, gap: 6, alignItems: 'center', borderTopWidth: 1, borderColor: p.border }}>
                <TextUI size={16} weight="bold" color={p.primaryInk}>رفيق المسلم | Almosala Pro</TextUI>
                <TextUI size={13} color={p.muted} style={{ textAlign: 'center', lineHeight: 21 }}>
                  تطبيق إسلامي شامل وقف لله تعالى، خالٍ من الإعلانات تماماً وبأعلى معايير الخصوصية والجودة التقنية.
                </TextUI>
                <TextUI size={12} color={p.accentInk}>الإصدار ٢٠٢٦ • الإصدار ٢.١.٠ المعماري</TextUI>
              </View>
            ) : null}
          </SettingsList>
        </View>
      </ScrollView>

      <PrayerSettingsSheets open={prayerSheet} onClose={() => setPrayerSheet(null)} />

      {/* Hijri date correction */}
      <Modal visible={hijriOpen} animationType="fade" transparent onRequestClose={() => setHijriOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: p.bg, borderRadius: 20, paddingVertical: 16, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
              <View style={{ flex: 1 }}>
                <TextUI size={18} weight="bold" color={p.ink}>تصحيح التاريخ الهجري</TextUI>
                <TextUI size={12.5} color={p.muted}>لمطابقة بداية الشهر المعتمدة في بلدك. لا يغيّر التاريخ الميلادي ولا المواقيت.</TextUI>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setHijriOpen(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={20} color={p.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 8, borderTopWidth: 1, borderColor: p.divider }}>
              <Stepper
                label="اليوم"
                sub={todayInfo.hijriFormatted}
                valueLabel={hijriAdjustAr(hijriAdjust)}
                onDecrement={() => { triggerHaptic('light'); setHijriAdjust(hijriAdjust - 1); }}
                onIncrement={() => { triggerHaptic('light'); setHijriAdjust(hijriAdjust + 1); }}
                canDecrement={hijriAdjust > -HIJRI_ADJUST_LIMIT}
                canIncrement={hijriAdjust < HIJRI_ADJUST_LIMIT}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Theme / language picker */}
      <Modal visible={choice !== null} animationType="fade" transparent onRequestClose={() => setChoice(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: p.bg, borderRadius: 20, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <TextUI size={18} weight="bold" color={p.ink}>{choice === 'theme' ? 'المظهر' : 'اللغة'}</TextUI>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setChoice(null)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={20} color={p.ink} />
              </TouchableOpacity>
            </View>
            {choiceOptions.map((o, i) => (
              <TouchableOpacity
                key={o.id}
                activeOpacity={0.8}
                accessibilityRole="radio"
                accessibilityState={{ checked: o.selected }}
                onPress={() => {
                  triggerHaptic('light');
                  o.pick();
                  setChoice(null);
                }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: p.border }}
              >
                <TextUI size={15} weight="bold" color={o.selected ? p.primary : p.ink} style={{ flex: 1 }}>{o.label}</TextUI>
                {o.selected ? <Feather name="check" size={18} color={p.primary} /> : null}
              </TouchableOpacity>
            ))}
            {choice === 'lang' ? (
              <TextUI size={12.5} color={p.muted} style={{ marginTop: 8 }}>الترجمة الإنجليزية جزئية حاليًا.</TextUI>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
};
