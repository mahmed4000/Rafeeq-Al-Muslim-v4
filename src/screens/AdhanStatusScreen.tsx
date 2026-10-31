import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { ProgressRing } from '../components/ui/ProgressRing';
import { usePalette } from '../theme/palette';
import { NotificationService } from '../services/notificationService';
import { getFullDateInfo, weekdayName } from '../services/hijriDate';
import { toArabicNumber } from '../services/prayerCalculation';

type Check = {
  key: string;
  state: 'ok' | 'fix' | 'manual';
  title: string;
  text: string;
  action?: { label: string; run: () => void };
};

/**
 * «حالة الأذان»: what decides whether the adhan sounds, in plain words. Only what the app can
 * verify is marked as passed; the rest (battery saving, focus modes) is guidance to check by hand.
 */
export const AdhanStatusScreen: React.FC = () => {
  const { goBack, t, isRTL, triggerHaptic, navigate, currentCity, refreshNotifications } = useApp();
  const p = usePalette();
  const [status, setStatus] = useState<Awaited<ReturnType<typeof NotificationService.getAlertStatus>>>(null);
  const [loaded, setLoaded] = useState(false);
  const [tested, setTested] = useState(false);

  const load = useCallback(() => {
    NotificationService.getAlertStatus().then((s) => { setStatus(s); setLoaded(true); });
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const askPermission = async () => {
    triggerHaptic('light');
    const granted = await NotificationService.requestPermissions();
    if (granted) {
      refreshNotifications();
      setTimeout(load, 1500);
    } else {
      NotificationService.openSystemSettings();
    }
  };
  const openBattery = () => {
    triggerHaptic('light');
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS').catch(() => Linking.openSettings());
    } else {
      Linking.openSettings();
    }
  };
  const sendTest = async () => {
    triggerHaptic('medium');
    await NotificationService.sendTestNotification(t(currentCity.nameAr, currentCity.nameEn));
    setTested(true);
  };

  const untilText = status?.scheduledUntil
    ? `${weekdayName(status.scheduledUntil.getDay())} ${getFullDateInfo(status.scheduledUntil, 0).gregorianDate.replace(/\s*\S+$/, '')}`
    : '';

  const checks: Check[] = Platform.OS === 'web' ? [] : [
    status?.permission
      ? { key: 'perm', state: 'ok', title: t('الإشعارات مسموحة', 'Notifications allowed'), text: t('يستطيع التطبيق إظهار تنبيه الأذان.', 'The app can show the adhan alert.') }
      : { key: 'perm', state: 'fix', title: t('الإشعارات غير مسموحة', 'Notifications not allowed'), text: t('بدونها لا يصلك أي أذان.', 'Without them no adhan reaches you.'), action: { label: t('اسمح بالتنبيهات', 'Allow alerts'), run: askPermission } },
    status?.scheduledUntil
      ? { key: 'window', state: 'ok', title: t('التنبيهات مجدولة', 'Alerts scheduled'), text: t(`حتى ${untilText}، وتتجدد كل مرة تفتح فيها التطبيق.`, `Until ${untilText}; renewed each time you open the app.`) }
      : { key: 'window', state: 'fix', title: t('لا تنبيهات مجدولة', 'No alerts scheduled'), text: t('فعّل الأذان لصلاة واحدة على الأقل من إعدادات الأذان.', 'Turn on the adhan for at least one prayer in the adhan settings.'), action: { label: t('إعدادات الأذان', 'Adhan settings'), run: () => navigate('adhan_settings') } },
    Platform.OS === 'android'
      ? { key: 'battery', state: 'manual', title: t('توفير البطارية', 'Battery saving'), text: t('في هواتف شاومي وسامسونج وغيرها قد يوقف توفير البطارية التطبيق فيضيع أذان الفجر. استثنِ «رفيق المسلم» من توفير البطارية، وفي شاومي فعّل «التشغيل التلقائي».', 'On Xiaomi, Samsung and other phones battery saving can stop the app and the Fajr adhan is missed. Exclude Muslim Companion from battery saving; on Xiaomi also turn on Autostart.'), action: { label: t('افتح إعداد البطارية', 'Open battery settings'), run: openBattery } }
      : { key: 'focus', state: 'manual', title: t('التركيز وعدم الإزعاج', 'Focus and Do Not Disturb'), text: t('إن استخدمت وضع التركيز فأضف «رفيق المسلم» إلى التطبيقات المسموح لها حتى لا يُخفى الأذان.', 'If you use a Focus mode, add Muslim Companion to its allowed apps so the adhan is not hidden.'), action: { label: t('افتح الإعدادات', 'Open Settings'), run: () => Linking.openSettings() } }
  ];
  const verifiable = checks.filter((c) => c.state !== 'manual');
  const passed = verifiable.filter((c) => c.state === 'ok').length;
  const allGood = verifiable.length > 0 && passed === verifiable.length;

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingTop: Platform.OS === 'ios' ? 54 : Platform.OS === 'web' ? 16 : 12, paddingBottom: 4 }}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('رجوع', 'Back')} onPress={goBack} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={22} color={p.primary} />
        </TouchableOpacity>
        <TextUI size={19} weight="bold" color={p.ink}>{t('حالة الأذان', 'Adhan status')}</TextUI>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 40, gap: 14 }} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={{ borderRadius: 24, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: p.hero }}>
          {Platform.OS === 'web' ? (
            <Feather name="smartphone" size={40} color="#E2B276" />
          ) : (
            <ProgressRing size={92} stroke={9} progress={verifiable.length ? passed / verifiable.length : 0} color="#E2B276" track="rgba(255,246,234,0.15)">
              <TextUI size={22} weight="bold" color="#FFFFFF">{loaded ? t(`${toArabicNumber(passed)}/${toArabicNumber(verifiable.length)}`, `${passed}/${verifiable.length}`) : '…'}</TextUI>
            </ProgressRing>
          )}
          <View style={{ flex: 1, gap: 4 }}>
            <TextUI size={18} weight="bold" color={p.onHero}>
              {Platform.OS === 'web'
                ? t('الأذان يعمل على الهاتف فقط', 'The adhan works on the phone only')
                : !loaded ? t('جارٍ الفحص…', 'Checking…')
                : allGood ? t('الأذان جاهز', 'The adhan is ready') : t('خطوة تمنع ضياع الأذان', 'One step keeps the adhan from being missed')}
            </TextUI>
            <TextUI size={13.5} color={p.onHeroMuted} style={{ lineHeight: 22 }}>
              {Platform.OS === 'web'
                ? t('افتح التطبيق على هاتفك لفحص التنبيهات.', 'Open the app on your phone to check the alerts.')
                : t('ما يستطيع التطبيق فحصه مُعلَّم، والباقي إرشاد تتأكد منه بنفسك.', 'What the app can check is marked; the rest is guidance to check yourself.')}
            </TextUI>
          </View>
        </View>

        {/* Checks */}
        {checks.length ? (
          <View style={{ borderRadius: 22, overflow: 'hidden', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
            {checks.map((c, i) => (
              <View key={c.key} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 16, borderTopWidth: i ? 1 : 0, borderColor: p.border, backgroundColor: c.state === 'fix' ? p.dangerBg : 'transparent' }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: c.state === 'ok' ? p.success : c.state === 'fix' ? '#B8701E' : p.soft }}>
                  <Feather name={c.state === 'ok' ? 'check' : c.state === 'fix' ? 'alert-circle' : 'info'} size={15} color={c.state === 'manual' ? p.primary : '#FFFFFF'} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <TextUI size={15.5} weight="bold" color={p.ink}>{c.title}</TextUI>
                  <TextUI size={13.5} color={p.muted} style={{ lineHeight: 22 }}>{c.text}</TextUI>
                  {c.action ? (
                    <TouchableOpacity accessibilityRole="button" onPress={c.action.run} style={{ alignSelf: 'flex-start', marginTop: 8, minHeight: 42, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', backgroundColor: c.state === 'manual' ? 'transparent' : p.primary, borderWidth: c.state === 'manual' ? 1.5 : 0, borderColor: p.primary }}>
                      <TextUI size={14.5} weight="bold" color={c.state === 'manual' ? p.primary : p.onPrimary}>{c.action.label}</TextUI>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* Try it */}
        {Platform.OS !== 'web' ? (
          <View style={{ borderRadius: 22, padding: 16, gap: 10, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
            <TextUI size={15.5} weight="bold" color={p.ink}>{t('جرّب التنبيه', 'Try the alert')}</TextUI>
            <TextUI size={13.5} color={p.muted} style={{ lineHeight: 22 }}>
              {tested ? t('أُرسل تنبيه تجريبي الآن. إن لم يظهر فراجع الخطوات أعلاه.', 'A test alert was sent. If it did not appear, check the steps above.') : t('يرسل تنبيهًا تجريبيًا فورًا لتتأكد أنه يصلك.', 'Sends a test alert right away so you can see it arrives.')}
            </TextUI>
            <TouchableOpacity accessibilityRole="button" onPress={sendTest} style={{ minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: p.primary, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="bell" size={17} color={p.primary} />
              <TextUI size={15} weight="bold" color={p.primary}>{t('أرسل تنبيهًا تجريبيًا', 'Send a test alert')}</TextUI>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity accessibilityRole="button" onPress={() => navigate('adhan_settings')} style={{ minHeight: 52, borderRadius: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <TextUI size={15} color={p.ink}>{t('إعدادات الأذان والإقامة', 'Adhan and iqama settings')}</TextUI>
          <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={18} color={p.muted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
