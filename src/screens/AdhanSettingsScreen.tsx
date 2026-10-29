import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Switch, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { ScreenHeader } from '../ui/ScreenHeader';
import { usePalette, Palette } from '../theme/palette';
import { toArabicNumber } from '../services/prayerCalculation';
import {
  NotificationService,
  PRAYER_KEYS,
  PRAYER_NAMES_AR,
  PrayerAlertSetting,
  PrayerKey
} from '../services/notificationService';
import { tr } from '../i18n/language';

const MINUTE_STEPS = [5, 10, 15, 20, 25, 30, 45, 60];

const nextStep = (value: number, dir: 1 | -1) => {
  const idx = MINUTE_STEPS.indexOf(value);
  const base = idx === -1 ? MINUTE_STEPS.findIndex((m) => m >= value) : idx;
  return MINUTE_STEPS[Math.max(0, Math.min(MINUTE_STEPS.length - 1, base + dir))];
};

const PRAYER_NAMES_EN: Record<PrayerKey, string> = { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' };

const summary = (s: PrayerAlertSetting) => {
  const parts: string[] = [];
  if (s.before) parts.push(tr(`قبل الأذان ${toArabicNumber(s.beforeMinutes)} د`, `${toArabicNumber(s.beforeMinutes)} min before adhan`));
  if (s.adhan) parts.push(tr('الأذان', 'Adhan'));
  if (s.iqama) parts.push(tr(`الإقامة بعد ${toArabicNumber(s.iqamaMinutes)} د`, `Iqamah after ${toArabicNumber(s.iqamaMinutes)} min`));
  return parts.length ? parts.join(' · ') : tr('متوقف', 'Off');
};

const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void; label: string; p: Palette }> = ({ value, onChange, label, p }) => (
  <Switch
    value={value}
    onValueChange={onChange}
    accessibilityLabel={label}
    trackColor={{ false: p.track, true: p.primary }}
    thumbColor={Platform.OS === 'android' ? p.surface : undefined}
    {...(Platform.OS === 'web' ? ({ activeThumbColor: p.surface } as any) : {})}
  />
);

export const AdhanSettingsScreen: React.FC = () => {
  const { goBack, alertsConfig, setAlertsConfig, refreshNotifications, triggerHaptic, t } = useApp();
  const p = usePalette();
  const [open, setOpen] = useState<PrayerKey | null>('fajr');
  const [permission, setPermission] = useState<boolean | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      NotificationService.hasPermission().then((granted) => { if (alive) setPermission(granted); });
      return () => { alive = false; };
    }, [])
  );

  const askPermission = async () => {
    const granted = await NotificationService.requestPermissions();
    setPermission(granted);
    if (granted) refreshNotifications();
    else NotificationService.openSystemSettings();
  };

  const updatePrayer = (key: PrayerKey, patch: Partial<PrayerAlertSetting>) => {
    triggerHaptic('light');
    const prayers = { ...alertsConfig.prayers };
    const targets = alertsConfig.sameForAll ? PRAYER_KEYS : [key];
    targets.forEach((k) => {
      // Iqama gaps differ per prayer, so "same for all" never copies them.
      const { iqamaMinutes, ...shared } = patch;
      prayers[k] = { ...prayers[k], ...(k === key ? patch : shared) };
    });
    setAlertsConfig({ ...alertsConfig, prayers });
  };

  const card = { borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, overflow: 'hidden' as const };

  const minutesControl = (value: number, onChange: (v: number) => void, label: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: p.border, overflow: 'hidden' }}>
      <TouchableOpacity onPress={() => onChange(nextStep(value, -1))} accessibilityLabel={t(`إنقاص ${label}`, `Decrease ${label}`)} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bgAlt }}>
        <TextUI size={18} weight="bold" color={p.primaryInk}>−</TextUI>
      </TouchableOpacity>
      <TextUI size={14} weight="bold" color={p.ink} style={{ minWidth: 50, textAlign: 'center' }}>{t(`${toArabicNumber(value)} د`, `${toArabicNumber(value)} min`)}</TextUI>
      <TouchableOpacity onPress={() => onChange(nextStep(value, 1))} accessibilityLabel={t(`زيادة ${label}`, `Increase ${label}`)} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bgAlt }}>
        <TextUI size={18} weight="bold" color={p.primaryInk}>+</TextUI>
      </TouchableOpacity>
    </View>
  );

  const row = (label: string, sub: string, value: boolean, onToggle: (v: boolean) => void, minutes?: React.ReactNode) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, minHeight: 60, borderTopWidth: 1, borderColor: p.divider }}>
      <View style={{ flex: 1 }}>
        <TextUI size={15} color={p.ink}>{label}</TextUI>
        <TextUI size={12.5} color={p.muted}>{sub}</TextUI>
      </View>
      {minutes}
      <Toggle value={value} onChange={onToggle} label={label} p={p} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader title={t('الأذان والإقامة', 'Adhan & Iqama')} onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 12 }}>
        {permission === false && Platform.OS !== 'web' ? (
          <View accessibilityRole="alert" style={{ borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F7E3DF' }}>
            <Feather name="alert-triangle" size={18} color="#7A2E2B" />
            <TextUI size={13} color="#7A2E2B" style={{ flex: 1, lineHeight: 20 }}>{t('التنبيهات غير مسموحة لرفيق المسلم، فلن يصل الأذان.', "Notifications aren't allowed for Rafeeq Al-Muslim, so the adhan won't arrive.")}</TextUI>
            <TouchableOpacity onPress={askPermission} accessibilityRole="button" style={{ minHeight: 36, paddingHorizontal: 12, borderRadius: 10, justifyContent: 'center', backgroundColor: '#FFFDF9' }}>
              <TextUI size={13} weight="bold" color="#7A2E2B">{t('السماح', 'Allow')}</TextUI>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 60 }}>
            <View style={{ flex: 1 }}>
              <TextUI size={16} weight="bold" color={p.ink}>{t('تنبيهات الصلاة', 'Prayer alerts')}</TextUI>
              <TextUI size={13} color={p.muted}>{t('أوقف كل التنبيهات بلمسة واحدة', 'Turn off all alerts with one tap')}</TextUI>
            </View>
            <Toggle value={alertsConfig.enabled} onChange={(v) => { triggerHaptic('light'); setAlertsConfig({ ...alertsConfig, enabled: v }); }} label={t('تنبيهات الصلاة', 'Prayer alerts')} p={p} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 60, borderTopWidth: 1, borderColor: p.divider }}>
            <View style={{ flex: 1 }}>
              <TextUI size={16} weight="bold" color={p.ink}>{t('نفس الإعدادات لكل الصلوات', 'Same settings for all prayers')}</TextUI>
              <TextUI size={13} color={p.muted}>{t('عدّل صلاة واحدة وتُطبّق على الباقي', 'Edit one prayer and it applies to the rest')}</TextUI>
            </View>
            <Toggle value={alertsConfig.sameForAll} onChange={(v) => setAlertsConfig({ ...alertsConfig, sameForAll: v })} label={t('نفس الإعدادات لكل الصلوات', 'Same settings for all prayers')} p={p} />
          </View>
        </View>

        <View style={{ gap: 10, opacity: alertsConfig.enabled ? 1 : 0.5 }} pointerEvents={alertsConfig.enabled ? 'auto' : 'none'}>
          {PRAYER_KEYS.map((key) => {
            const s = alertsConfig.prayers[key];
            const isOpen = open === key;
            return (
              <View key={key} style={{ ...card, borderColor: isOpen ? p.accent : p.border }}>
                <TouchableOpacity
                  onPress={() => setOpen(isOpen ? null : key)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 60 }}
                >
                  <View style={{ flex: 1 }}>
                    <TextUI size={17} weight="bold" color={p.ink}>{t(PRAYER_NAMES_AR[key], PRAYER_NAMES_EN[key])}</TextUI>
                    <TextUI size={13} color={p.muted}>{summary(s)}</TextUI>
                  </View>
                  <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={20} color={p.primary} />
                </TouchableOpacity>
                {isOpen ? (
                  <View>
                    {row(t('تنبيه قبل الأذان', 'Alert before adhan'), t('قبل دخول الوقت', 'Before the time begins'), s.before, (v) => updatePrayer(key, { before: v }),
                      minutesControl(s.beforeMinutes, (m) => updatePrayer(key, { beforeMinutes: m }), t('دقائق التنبيه قبل الأذان', 'minutes before adhan')))}
                    {row(t('الأذان', 'Adhan'), t('عند دخول الوقت', 'When the time begins'), s.adhan, (v) => updatePrayer(key, { adhan: v }))}
                    {row(t('تنبيه الإقامة', 'Iqamah alert'), t('بعد الأذان', 'After the adhan'), s.iqama, (v) => updatePrayer(key, { iqama: v }),
                      minutesControl(s.iqamaMinutes, (m) => updatePrayer(key, { iqamaMinutes: m }), t('دقائق الإقامة', 'iqamah minutes')))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        {Platform.OS === 'android' ? (
          <View style={{ borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, backgroundColor: p.soft }}>
            <Feather name="info" size={18} color={p.primary} />
            <View style={{ flex: 1, gap: 6 }}>
              <TextUI size={13} color={p.primaryInk} style={{ lineHeight: 21 }}>
                {t('إن تأخر الأذان على جهازك: اسمح بالمنبّهات الدقيقة، واستثنِ رفيق المسلم من توفير البطارية.', 'If the adhan arrives late on your device: allow exact alarms and exclude Rafeeq Al-Muslim from battery saving.')}
              </TextUI>
              <TouchableOpacity onPress={NotificationService.openSystemSettings} accessibilityRole="button" style={{ alignSelf: 'flex-start', minHeight: 36, justifyContent: 'center' }}>
                <TextUI size={13} weight="bold" color={p.primary}>{t('فتح إعدادات التطبيق', 'Open app settings')}</TextUI>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};
