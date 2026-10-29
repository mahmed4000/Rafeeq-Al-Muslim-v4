import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { usePalette, Palette } from '../theme/palette';
import { City, METHOD_NAMES_AR, searchCities, suggestMethodForCountry } from '../constants/cities';
import { NotificationService } from '../services/notificationService';

type Step = 'welcome' | 'location' | 'city' | 'alerts';
const STEPS: Step[] = ['welcome', 'location', 'city', 'alerts'];

/** Arch window used as the illustration on every step (the app's signature shape). */
const ArchIcon: React.FC<{ p: Palette; icon: React.ComponentProps<typeof Feather>['name']; tone?: 'plain' | 'success' }> = ({ p, icon, tone = 'plain' }) => (
  <View
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    style={{ alignSelf: 'center', width: 132, height: 160, borderRadius: 66, borderBottomLeftRadius: 12, borderBottomRightRadius: 12, borderWidth: 2, borderColor: p.accent, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }}
  >
    {tone === 'success' ? (
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: p.success, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name="check" size={30} color={p.surface} />
      </View>
    ) : (
      <Feather name={icon} size={44} color={p.primary} />
    )}
  </View>
);

export const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const {
    currentCity, setCurrentCity, refreshLocation, setCalculationMethod, calculationMethod,
    asrMethod, setAsrMethod, completeOnboarding, refreshNotifications, triggerHaptic
  } = useApp();
  const p = usePalette();

  const [step, setStep] = useState<Step>('welcome');
  const [locating, setLocating] = useState(false);
  const [locationFailed, setLocationFailed] = useState(false);
  const [showList, setShowList] = useState(false);
  const [cityQuery, setCityQuery] = useState('');

  const stepIndex = STEPS.indexOf(step);

  const chooseCity = (city: City) => {
    setCurrentCity(city);
    setCalculationMethod(suggestMethodForCountry(city.countryCode));
    setShowList(false);
    setStep('city');
  };

  const useMyLocation = async () => {
    setLocating(true);
    setLocationFailed(false);
    const city = await refreshLocation();
    setLocating(false);
    if (city) {
      setCalculationMethod(suggestMethodForCountry(city.countryCode));
      setStep('city');
    } else {
      // Denied or unavailable: go straight to the offline list.
      setLocationFailed(true);
      setShowList(true);
    }
  };

  const finish = () => {
    completeOnboarding();
    router.replace('/');
  };

  const allowAlerts = async () => {
    triggerHaptic('success');
    const granted = await NotificationService.requestPermissions();
    if (granted) refreshNotifications();
    finish();
  };

  const primaryButton = (label: string, onPress: () => void, icon?: React.ComponentProps<typeof Feather>['name']) => (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={{ minHeight: 52, borderRadius: 14, backgroundColor: p.primary, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}
    >
      {icon ? <Feather name={icon} size={18} color={p.onPrimary} /> : null}
      <TextUI size={16} weight="bold" color={p.onPrimary}>{label}</TextUI>
    </TouchableOpacity>
  );

  const secondaryButton = (label: string, onPress: () => void) => (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: p.primary, alignItems: 'center', justifyContent: 'center' }}
    >
      <TextUI size={16} weight="bold" color={p.primary}>{label}</TextUI>
    </TouchableOpacity>
  );

  const title = (text: string, sub: string) => (
    <View style={{ gap: 6, alignItems: 'center' }}>
      <TextUI font="amiri" size={30} weight="bold" color={p.primaryInk} align="center">{text}</TextUI>
      <TextUI size={16} color={p.muted} align="center" style={{ lineHeight: 26 }}>{sub}</TextUI>
    </View>
  );

  // Rendered inside the step's ScrollView, so cap the rows; typing narrows them.
  const cityResults = searchCities(cityQuery).slice(0, 30);
  const cityList = (
    <View style={{ gap: 10 }}>
      <TextInput
        value={cityQuery}
        onChangeText={setCityQuery}
        placeholder="ابحث عن مدينتك أو دولتك"
        placeholderTextColor={p.muted}
        accessibilityLabel="البحث عن مدينة"
        style={{ minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, color: p.ink, paddingHorizontal: 14, fontSize: 15, textAlign: 'right' }}
      />
      {cityResults.length === 0 ? (
        <TextUI size={14} color={p.muted} align="center" style={{ paddingVertical: 12 }}>لا توجد مدينة بهذا الاسم. جرّب اسمًا آخر.</TextUI>
      ) : (
        <View style={{ borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, overflow: 'hidden' }}>
          {cityResults.map((city) => (
            <TouchableOpacity
              key={city.id}
              onPress={() => chooseCity(city)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, borderBottomWidth: 1, borderColor: p.divider }}
            >
              <View style={{ flex: 1 }}>
                <TextUI size={16} weight="bold" color={p.ink}>{city.nameAr}</TextUI>
                <TextUI size={13} color={p.muted}>{city.countryAr}</TextUI>
              </View>
              <Feather name="chevron-left" size={18} color={p.muted} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  const renderStep = () => {
    switch (step) {
      case 'welcome':
        return (
          <>
            <ArchIcon p={p} icon="moon" />
            {title('رفيق المسلم', 'رفيقك اليومي للصلاة والقرآن والأذكار.\nبلا إعلانات، ويعمل دون إنترنت.')}
            <View style={{ flex: 1 }} />
            {primaryButton('ابدأ', () => setStep('location'))}
          </>
        );
      case 'location':
        return (
          <>
            <ArchIcon p={p} icon="map-pin" />
            {title('أين تُصلّي؟', 'نحسب مواقيت الصلاة واتجاه القبلة من موقعك.\nيبقى موقعك على جهازك، ولا يُرسل إلى أي خادم.')}
            {locationFailed ? (
              <TextUI size={14} color="#9C3A36" align="center">تعذّر تحديد الموقع. اختر مدينتك من القائمة.</TextUI>
            ) : null}
            {showList ? cityList : <View style={{ flex: 1 }} />}
            {locating ? <ActivityIndicator color={p.primary} /> : null}
            {primaryButton('استخدم موقعي الحالي', useMyLocation, 'navigation')}
            {!showList ? secondaryButton('اختر مدينة يدويًا', () => setShowList(true)) : null}
          </>
        );
      case 'city':
        return (
          <>
            <ArchIcon p={p} icon="check" tone="success" />
            {title('تم تحديد موقعك', 'تأكد من المدينة قبل حساب المواقيت')}
            <View style={{ borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderBottomWidth: 1, borderColor: p.divider }}>
                <Feather name="map-pin" size={20} color={p.primary} />
                <View style={{ flex: 1 }}>
                  <TextUI size={18} weight="bold" color={p.ink}>{currentCity.nameAr}</TextUI>
                  <TextUI size={13} color={p.muted}>{currentCity.countryAr}</TextUI>
                </View>
              </View>
              <View style={{ padding: 14, gap: 2, borderBottomWidth: 1, borderColor: p.divider }}>
                <TextUI size={13} color={p.muted}>طريقة الحساب · مقترحة لبلدك (يمكن تغييرها من «الصلاة»)</TextUI>
                <TextUI size={15} weight="bold" color={p.ink}>{METHOD_NAMES_AR[calculationMethod]}</TextUI>
              </View>
              <View style={{ padding: 14, gap: 8 }}>
                <TextUI size={13} color={p.muted}>حساب وقت العصر</TextUI>
                <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', borderRadius: 999, padding: 4, backgroundColor: p.bgAlt }}>
                  {(['standard', 'hanafi'] as const).map((m) => {
                    const active = asrMethod === m;
                    return (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setAsrMethod(m)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        style={{ flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: active ? p.surface : 'transparent' }}
                      >
                        <TextUI size={14} weight={active ? 'bold' : 'regular'} color={active ? p.primaryInk : p.muted}>{m === 'standard' ? 'الجمهور' : 'الحنفي'}</TextUI>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
            <View style={{ flex: 1 }} />
            {primaryButton('الموقع صحيح، متابعة', () => setStep('alerts'))}
            <TouchableOpacity onPress={() => { setShowList(true); setStep('location'); }} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <TextUI size={15} color={p.primary}>ليست مدينتي؟ اختر من القائمة</TextUI>
            </TouchableOpacity>
          </>
        );
      case 'alerts':
      default:
        return (
          <>
            <ArchIcon p={p} icon="bell" />
            {title('تنبيهات هادئة في وقتها', 'لا نرسل إلا ما تختاره. يمكنك تغيير ذلك لاحقًا من الإعدادات.')}
            <View style={{ borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, overflow: 'hidden' }}>
              {[
                { label: 'أذان الصلوات الخمس', on: true },
                { label: 'تنبيه قبل الأذان والإقامة', on: false },
                { label: 'تذكير الأذكار والورد', on: false }
              ].map((item, i) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 50, borderTopWidth: i ? 1 : 0, borderColor: p.divider }}>
                  <Feather name={item.on ? 'check-circle' : 'circle'} size={20} color={item.on ? p.success : p.muted} />
                  <TextUI size={15} color={p.ink} style={{ flex: 1 }}>{item.label}</TextUI>
                  <TextUI size={13} color={p.muted}>{item.on ? 'مفعّل' : 'اختياري من الإعدادات'}</TextUI>
                </View>
              ))}
            </View>
            {Platform.OS === 'android' ? (
              <View style={{ borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, backgroundColor: p.soft }}>
                <Feather name="info" size={18} color={p.primary} />
                <TextUI size={13} color={p.primaryInk} style={{ flex: 1, lineHeight: 21 }}>
                  لدقة الأذان على أندرويد اسمح لاحقًا بالمنبّهات الدقيقة، واستثنِ التطبيق من توفير البطارية.
                </TextUI>
              </View>
            ) : null}
            <View style={{ flex: 1 }} />
            {primaryButton('السماح بالتنبيهات', allowAlerts)}
            <TouchableOpacity onPress={finish} accessibilityRole="button" style={{ minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <TextUI size={15} color={p.muted}>ليس الآن</TextUI>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 56 : 20, minHeight: 44 }}>
        <View accessibilityLabel={`الخطوة ${stepIndex + 1} من ${STEPS.length}`} style={{ flexDirection: 'row', gap: 6 }}>
          {STEPS.map((s, i) => (
            <View key={s} style={{ width: 20, height: 6, borderRadius: 3, backgroundColor: i < stepIndex ? p.accent : i === stepIndex ? p.primary : p.track }} />
          ))}
        </View>
        {stepIndex > 0 ? (
          <TouchableOpacity onPress={() => setStep(STEPS[stepIndex - 1])} accessibilityRole="button" accessibilityLabel="رجوع" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="arrow-left" size={20} color={p.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, padding: 24, paddingTop: 16, gap: 18 }}>
        {renderStep()}
      </ScrollView>
    </View>
  );
};
