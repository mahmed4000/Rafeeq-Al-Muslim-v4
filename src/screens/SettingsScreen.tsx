import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp, ThemePreference } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { PrayerSettingsSheets, PrayerSheet, prayerSettingValues } from '../components/prayer/PrayerSettingsSheets';
import { NotificationService, AzkarRemindersConfig, AZKAR_REMINDER_MINUTES } from '../services/notificationService';
import { toArabicNumber } from '../services/prayerCalculation';
import { getFullDateInfo, hijriDayShift, HIJRI_ADJUST_LIMIT } from '../services/hijriDate';
import { cityNow } from '../services/cityTime';
import { ScreenHeader } from '../ui/ScreenHeader';
import { SettingsList } from '../ui/SettingsList';
import { Stepper } from '../ui/Stepper';
import { usePalette } from '../theme/palette';
import { tr, getUiLanguage } from '../i18n/language';

const THEMES: { id: ThemePreference; labelAr: string; labelEn: string }[] = [
  { id: 'auto', labelAr: 'تلقائي حسب الجهاز', labelEn: 'Automatic (device)' },
  { id: 'light', labelAr: 'أندلسي نهاري', labelEn: 'Andalusian Light' },
  { id: 'dark', labelAr: 'أندلسي ليلي', labelEn: 'Andalusian Dark' }
];

// Each language keeps its own name in either interface language.
const LANGS: { id: 'ar' | 'en'; labelAr: string; labelEn: string }[] = [
  { id: 'ar', labelAr: 'العربية', labelEn: 'العربية' },
  { id: 'en', labelAr: 'English', labelEn: 'English' }
];

// Same bounds the Quran reader accepts for pinch zoom.
const FONT_MIN = 17;
const FONT_MAX = 48;
const FONT_STEP = 2;

// Only sources that can be confirmed from the app's own code and packages.
const SOURCES: { title: string; titleEn: string; detail: string; detailEn: string }[] = [
  { title: 'المدن ومناطقها الزمنية', titleEn: 'Cities and their time zones', detail: 'GeoNames (geonames.org) · رخصة CC BY 4.0', detailEn: 'GeoNames (geonames.org) · CC BY 4.0 license' },
  { title: 'حساب مواقيت الصلاة', titleEn: 'Prayer time calculation', detail: 'مكتبة adhan مفتوحة المصدر · رخصة MIT', detailEn: 'Open-source adhan library · MIT license' },
  { title: 'التاريخ الهجري', titleEn: 'Hijri date', detail: 'تقويم أم القرى من نظام الجهاز', detailEn: "Umm al-Qura calendar from the device's system" },
  { title: 'الخطوط', titleEn: 'Fonts', detail: 'Amiri و Tajawal و Cairo · رخصة SIL Open Font License 1.1', detailEn: 'Amiri, Tajawal and Cairo · SIL Open Font License 1.1' }
];

type ChoiceSheet = 'theme' | 'lang';

/** "بدون" / "زيادة يوم" / "إنقاص يومين" (words, since +/− signs reorder in RTL text) */
function hijriAdjustAr(days: number): string {
  if (!days) return tr('بدون', 'None');
  const n = Math.abs(days);
  if (getUiLanguage() === 'en') return `${days > 0 ? 'Add' : 'Subtract'} ${n} ${n === 1 ? 'day' : 'days'}`;
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
    prayerTimes,
    azkarReminders,
    setAzkarReminders,
    triggerHaptic,
    t
  } = useApp();
  const p = usePalette();
  const themeLabel = (o: { labelAr: string; labelEn: string }) => t(o.labelAr, o.labelEn);

  const [prayerSheet, setPrayerSheet] = useState<PrayerSheet | null>(null);
  const [choice, setChoice] = useState<ChoiceSheet | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [hijriOpen, setHijriOpen] = useState(false);
  const [remindersOpen, setRemindersOpen] = useState(false);
  const remindersSummary = [
    azkarReminders.morning.enabled ? t('بعد الفجر', 'After Fajr') : '',
    azkarReminders.evening.enabled ? t('بعد العصر', 'After Asr') : ''
  ].filter(Boolean).join(' · ') || t('متوقف', 'Off');
  const reminderRows: { key: 'morning' | 'evening'; title: string; after: string }[] = [
    { key: 'morning', title: t('أذكار الصباح', 'Morning adhkar'), after: t('بعد الفجر', 'After Fajr') },
    { key: 'evening', title: t('أذكار المساء', 'Evening adhkar'), after: t('بعد العصر', 'After Asr') }
  ];
  const updateReminder = (key: 'morning' | 'evening', patch: Partial<AzkarRemindersConfig['morning']>) => {
    triggerHaptic('light');
    setAzkarReminders({ ...azkarReminders, [key]: { ...azkarReminders[key], ...patch } });
  };
  // Today's Hijri date moves to the next day at maghrib.
  const cityToday = cityNow(currentCity.timeZone);
  const todayInfo = getFullDateInfo(cityToday, hijriAdjust + hijriDayShift(prayerTimes.maghrib, cityToday));

  const values = prayerSettingValues(calculationMethod, asrMethod, prayerOffsets, prayerBells);
  const open = (s: PrayerSheet) => { triggerHaptic('light'); setPrayerSheet(s); };
  const openChoice = (c: ChoiceSheet) => { triggerHaptic('light'); setChoice(c); };
  const changeFont = (delta: number) => {
    triggerHaptic('light');
    setQuranFontSize((s) => Math.max(FONT_MIN, Math.min(FONT_MAX, s + delta)));
  };

  const choiceOptions = choice === 'theme'
    ? THEMES.map((o) => ({ id: o.id, label: themeLabel(o), selected: o.id === themePreference, pick: () => setThemeMode(o.id) }))
    : LANGS.map((o) => ({ id: o.id, label: themeLabel(o), selected: o.id === lang, pick: () => setLang(o.id) }));
  const themeOption = THEMES.find((o) => o.id === themePreference);
  const langOption = LANGS.find((o) => o.id === lang);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader title={t('الإعدادات', 'Settings')} onBack={goBack} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 18 }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsList
          title={t('المواقيت', 'Prayer times')}
          rows={[
            { key: 'calc', label: t('طريقة الحساب', 'Calculation method'), value: values.calc, onPress: () => open('calc') },
            { key: 'asr', label: t('حساب العصر', 'Asr calculation'), value: values.asr, onPress: () => open('asr') },
            { key: 'offsets', label: t('تعديل يدوي للأوقات', 'Manual time adjustments'), value: values.offsets, onPress: () => open('offsets') },
            { key: 'hijri', label: t('تصحيح التاريخ الهجري', 'Hijri date correction'), value: hijriAdjustAr(hijriAdjust), onPress: () => { triggerHaptic('light'); setHijriOpen(true); } }
          ]}
        />

        <SettingsList
          title={t('الموقع', 'Location')}
          rows={[{ key: 'city', label: t('المدينة', 'City'), value: t(`${currentCity.nameAr} · ${currentCity.countryAr}`, `${currentCity.nameEn} · ${currentCity.countryEn}`), onPress: () => open('city') }]}
        />

        <SettingsList
          title={t('التنبيهات', 'Notifications')}
          rows={[
            { key: 'alerts', label: t('الأذان والإقامة', 'Adhan and iqama'), value: values.alerts, onPress: () => navigate('adhan_settings') },
            { key: 'azkarReminders', label: t('تذكير الأذكار', 'Adhkar reminders'), value: remindersSummary, onPress: () => { triggerHaptic('light'); setRemindersOpen(true); } },
            {
              key: 'test',
              label: t('إرسال تنبيه أذان تجريبي', 'Send a test adhan alert'),
              onPress: async () => {
                triggerHaptic('medium');
                await NotificationService.sendTestNotification(t(currentCity.nameAr, currentCity.nameEn));
              }
            }
          ]}
        />

        <SettingsList
          title={t('القراءة والمظهر', 'Reading and appearance')}
          rows={[
            { key: 'theme', label: t('المظهر', 'Theme'), value: themeOption ? themeLabel(themeOption) : undefined, onPress: () => openChoice('theme') },
            { key: 'lang', label: t('اللغة', 'Language'), value: langOption ? themeLabel(langOption) : undefined, onPress: () => openChoice('lang') }
          ]}
        >
          <View style={{ borderTopWidth: 1, borderColor: p.border }}>
            <Stepper
              label={t('حجم خط القرآن', 'Quran font size')}
              sub={t('يمكن تغييره أيضًا بإصبعين داخل المصحف', 'You can also pinch with two fingers inside the Mushaf')}
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
            title={t('البيانات', 'Data')}
            rows={[{ key: 'downloads', label: t('التنزيلات', 'Downloads'), value: t('الدروس المحمّلة والمساحة', 'Downloaded lessons and storage'), onPress: () => navigate('downloads') }]}
          />

          <SettingsList
            rows={[{ key: 'sources', label: t('المصادر والتراخيص', 'Sources and licenses'), expanded: sourcesOpen, onPress: () => setSourcesOpen((v) => !v) }]}
          >
            {sourcesOpen ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10, borderTopWidth: 1, borderColor: p.border, paddingTop: 12 }}>
                {SOURCES.map((s) => (
                  <View key={s.title}>
                    <TextUI size={14} weight="bold" color={p.ink}>{t(s.title, s.titleEn)}</TextUI>
                    <TextUI size={13} color={p.muted}>{t(s.detail, s.detailEn)}</TextUI>
                  </View>
                ))}
                <TextUI size={13} color={p.muted}>{t('مصادر المحتوى الديني (نص المصحف، التلاوات، الأذكار، الدروس) قيد التوثيق.', 'Sources for the religious content (Mushaf text, recitations, adhkar, lessons) are still being documented.')}</TextUI>
              </View>
            ) : null}
          </SettingsList>

          <SettingsList
            rows={[{ key: 'about', label: t('عن رفيق المسلم', 'About Muslim Companion'), value: t('الإصدار ٢.١.٠', 'Version 2.1.0'), expanded: aboutOpen, onPress: () => setAboutOpen((v) => !v) }]}
          >
            {aboutOpen ? (
              <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 12, gap: 6, alignItems: 'center', borderTopWidth: 1, borderColor: p.border }}>
                <TextUI size={16} weight="bold" color={p.primaryInk}>{t('رفيق المسلم', 'Muslim Companion')}</TextUI>
                <TextUI size={13} color={p.muted} style={{ textAlign: 'center', lineHeight: 21 }}>
                  {t('تطبيق إسلامي شامل وقف لله تعالى، خالٍ من الإعلانات تماماً وبأعلى معايير الخصوصية والجودة التقنية.', 'A comprehensive Islamic app, an endowment (waqf) for the sake of Allah, completely ad-free and built to the highest standards of privacy and technical quality.')}
                </TextUI>
                <TextUI size={12} color={p.accentInk}>{t('الإصدار ٢٠٢٦ • الإصدار ٢.١.٠ المعماري', '2026 edition • Architectural release 2.1.0')}</TextUI>
              </View>
            ) : null}
          </SettingsList>
        </View>
      </ScrollView>

      <PrayerSettingsSheets open={prayerSheet} onClose={() => setPrayerSheet(null)} />

      {/* Adhkar reminders */}
      <Modal visible={remindersOpen} animationType="fade" transparent onRequestClose={() => setRemindersOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: p.bg, borderRadius: 20, paddingVertical: 16, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
              <View style={{ flex: 1 }}>
                <TextUI size={18} weight="bold" color={p.ink}>{t('تذكير الأذكار', 'Adhkar reminders')}</TextUI>
                <TextUI size={12.5} color={p.muted}>{t('تنبيه يومي بعد الصلاة بعدد الدقائق الذي تختاره.', 'A daily alert after the prayer, by the number of minutes you choose.')}</TextUI>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={() => setRemindersOpen(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={20} color={p.ink} />
              </TouchableOpacity>
            </View>
            {reminderRows.map((row) => {
              const setting = azkarReminders[row.key];
              return (
                <View key={row.key} style={{ marginTop: 8, borderTopWidth: 1, borderColor: p.divider }}>
                  <TouchableOpacity
                    accessibilityRole="switch"
                    accessibilityState={{ checked: setting.enabled }}
                    onPress={() => updateReminder(row.key, { enabled: !setting.enabled })}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 14 }}
                  >
                    <TextUI size={15} weight="bold" color={p.ink} style={{ flex: 1 }}>{row.title}</TextUI>
                    <View style={{ minWidth: 64, minHeight: 32, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: setting.enabled ? p.successBg : p.bgAlt, borderWidth: 1, borderColor: setting.enabled ? p.success : p.border }}>
                      <TextUI size={13} weight="bold" color={setting.enabled ? p.successInk : p.muted}>{setting.enabled ? t('مفعّل', 'On') : t('متوقف', 'Off')}</TextUI>
                    </View>
                  </TouchableOpacity>
                  {setting.enabled ? (
                    <Stepper
                      label={row.after}
                      valueLabel={t(`${toArabicNumber(setting.minutesAfter)} د`, `${toArabicNumber(setting.minutesAfter)} min`)}
                      onDecrement={() => updateReminder(row.key, { minutesAfter: setting.minutesAfter - AZKAR_REMINDER_MINUTES.step })}
                      onIncrement={() => updateReminder(row.key, { minutesAfter: setting.minutesAfter + AZKAR_REMINDER_MINUTES.step })}
                      canDecrement={setting.minutesAfter > AZKAR_REMINDER_MINUTES.min}
                      canIncrement={setting.minutesAfter < AZKAR_REMINDER_MINUTES.max}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Hijri date correction */}
      <Modal visible={hijriOpen} animationType="fade" transparent onRequestClose={() => setHijriOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: p.bg, borderRadius: 20, paddingVertical: 16, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 }}>
              <View style={{ flex: 1 }}>
                <TextUI size={18} weight="bold" color={p.ink}>{t('تصحيح التاريخ الهجري', 'Hijri date correction')}</TextUI>
                <TextUI size={12.5} color={p.muted}>{t('لمطابقة بداية الشهر المعتمدة في بلدك. لا يغيّر التاريخ الميلادي ولا المواقيت.', "To match the month start adopted in your country. It doesn't change the Gregorian date or the prayer times.")}</TextUI>
              </View>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={() => setHijriOpen(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={20} color={p.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ marginTop: 8, borderTopWidth: 1, borderColor: p.divider }}>
              <Stepper
                label={t('اليوم', 'Today')}
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
              <TextUI size={18} weight="bold" color={p.ink}>{choice === 'theme' ? t('المظهر', 'Theme') : t('اللغة', 'Language')}</TextUI>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={() => setChoice(null)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
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
          </View>
        </View>
      </Modal>
    </View>
  );
};
