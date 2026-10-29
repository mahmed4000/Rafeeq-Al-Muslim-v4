import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { CITIES, City, normalizeCity } from '../constants/cities';
import { StorageService } from '../services/storage';
import { cityNow, deviceTimeZone } from '../services/cityTime';
import {
  calculateAccuratePrayerTimes,
  PrayerTimeValues
} from '../services/prayerCalculation';
import {
  NotificationService,
  PrayerBellsConfig,
  PrayerAlertsConfig,
  defaultAlertsConfig,
  bellsFromAlerts
} from '../services/notificationService';
import { useRouter, usePathname } from 'expo-router';
import { SCREEN_PATHS, TAB_SCREENS, screenKeyForPath, serializeParams } from '../navigation/routes';

export interface BookmarkItem {
  surahId: number;
  surahName: string;
  ayah: number;
  juz: number;
  date: string;
}

export interface ReadingBookmark {
  surahId: number;
  surahName: string;
  ayah: number;
  page: number;
  juz: number;
  date: string;
}

type CalculationMethod = 'umm_al_qura' | 'egypt' | 'mwl' | 'isna';
type AsrMethod = 'standard' | 'hanafi';

interface AppContextType {
  screen: string;
  navigate: (screenName: string, params?: any) => void;
  goBack: () => void;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  t: (ar: string, en: string) => string;
  isRTL: boolean;
  currentCity: City;
  setCurrentCity: (city: City) => void;
  prayerTimes: PrayerTimeValues;
  prayerBells: PrayerBellsConfig;
  togglePrayerBell: (prayerKey: keyof PrayerBellsConfig) => void;
  alertsConfig: PrayerAlertsConfig;
  setAlertsConfig: (config: PrayerAlertsConfig) => void;
  /** Re-run scheduling after the user grants notification permission. */
  refreshNotifications: () => void;
  prefsLoaded: boolean;
  onboarded: boolean;
  completeOnboarding: () => void;
  calculationMethod: CalculationMethod;
  setCalculationMethod: (method: CalculationMethod) => void;
  asrMethod: AsrMethod;
  setAsrMethod: (m: AsrMethod) => void;
  bookmarks: BookmarkItem[];
  addBookmark: (b: BookmarkItem) => void;
  removeBookmark: (surahId: number, ayah: number) => void;
  readingBookmark: ReadingBookmark | null;
  setReadingBookmark: (rb: ReadingBookmark | null) => void;
  triggerHaptic: (type?: 'light' | 'medium' | 'heavy' | 'success') => void;
  refreshLocation: () => Promise<City | null>;
  // Quran reader state
  selectedSurah: any;
  setSelectedSurah: (s: any) => void;
  quranFontSize: number;
  setQuranFontSize: (size: number | ((prev: number) => number)) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const todayKey = (timeZone?: string) => cityNow(timeZone).toDateString();
const ALERTS_KEY = 'rafeeq_prayer_alerts_v1';
const ONBOARDED_KEY = 'rafeeq_onboarded_v1';
const NOTIF_MIGRATION_KEY = 'rafeeq_notif_ids_v2';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const screen = screenKeyForPath(pathname);
  const [themeMode, setThemeModeState] = useState<'light' | 'dark'>('light');
  const [lang, setLangState] = useState<'ar' | 'en'>('ar');
  const [currentCity, setCurrentCityState] = useState<City>(CITIES[0]);

  const [calculationMethod, setCalcMethodState] = useState<CalculationMethod>('umm_al_qura');
  const [asrMethod, setAsrMethodState] = useState<AsrMethod>('standard');
  const [alertsConfig, setAlertsConfigState] = useState<PrayerAlertsConfig>(() => defaultAlertsConfig());
  const prayerBells = useMemo(() => bellsFromAlerts(alertsConfig), [alertsConfig]);
  // Existing installs (a saved city) skip onboarding; new installs see it once.
  const [onboarded, setOnboarded] = useState(true);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [readingBookmark, setReadingBookmarkState] = useState<ReadingBookmark | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [quranFontSize, setQuranFontSize] = useState<number>(24);

  // True once saved preferences are applied; gates notification scheduling and saving.
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  // Changes once per calendar day so prayer times roll over at midnight.
  const [dayKey, setDayKey] = useState<string>(() => todayKey());
  // Bumped after the user grants notification permission to reschedule.
  const [notifRev, setNotifRev] = useState(0);

  const isRTL = lang === 'ar';

  const t = (ar: string, en: string) => (lang === 'ar' ? ar : en);

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' = 'light') => {
    try {
      if (Platform.OS !== 'web') {
        if (type === 'light') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        else if (type === 'medium') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === 'heavy') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        else if (type === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {}
  };

  // Navigation handlers: legacy screen keys routed through Expo Router.
  // Screens read their params with useScreenParams().
  const navigate = (nextScreen: string, params: any = {}) => {
    triggerHaptic('light');
    const pathnameFor = SCREEN_PATHS[nextScreen] || '/';
    if (TAB_SCREENS.has(nextScreen)) {
      router.navigate(pathnameFor as any);
    } else {
      router.push({ pathname: pathnameFor as any, params: serializeParams(params) });
    }
  };

  const goBack = () => {
    triggerHaptic('light');
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  // Load preferences from persistent storage on startup
  useEffect(() => {
    (async () => {
      try {
        const savedTheme = await StorageService.getItem('almosala_theme');
        if (savedTheme === 'light' || savedTheme === 'dark') setThemeModeState(savedTheme);

        const savedLang = await StorageService.getItem('almosala_lang');
        if (savedLang === 'ar' || savedLang === 'en') setLangState(savedLang);

        const savedCalc = await StorageService.getItem('almosala_calc_method');
        if (savedCalc === 'umm_al_qura' || savedCalc === 'egypt' || savedCalc === 'mwl' || savedCalc === 'isna') {
          setCalcMethodState(savedCalc);
        }

        const savedAsr = await StorageService.getItem('almosala_asr_method');
        if (savedAsr === 'standard' || savedAsr === 'hanafi') setAsrMethodState(savedAsr);

        // Per-prayer alert settings; older installs only had on/off bells.
        const savedAlerts = await StorageService.getObject<PrayerAlertsConfig | null>(ALERTS_KEY, null);
        if (savedAlerts?.prayers) {
          setAlertsConfigState(savedAlerts);
        } else {
          const legacyBells = await StorageService.getObject<PrayerBellsConfig | null>('almosala_bells', null);
          setAlertsConfigState(defaultAlertsConfig(legacyBells || undefined));
        }

        // Alerts scheduled by older versions had random ids; clear them once so
        // the new scheduler (which only manages its own ids) doesn't duplicate them.
        if (!(await StorageService.getItem(NOTIF_MIGRATION_KEY))) {
          await NotificationService.clearLegacyScheduled();
          await StorageService.setItem(NOTIF_MIGRATION_KEY, '1');
        }

        const onboardedFlag = await StorageService.getItem(ONBOARDED_KEY);
        const hasSavedCity = !!(await StorageService.getItem('almosala_city'));
        setOnboarded(onboardedFlag === '1' || hasSavedCity);

        const savedBookmarks = await StorageService.getObject<BookmarkItem[]>('almosala_bookmarks', []);
        setBookmarks(savedBookmarks);

        const savedReading = await StorageService.getObject<ReadingBookmark | null>('almosala_reading_bookmark', null);
        // Older versions saved "سورة X" as the name, which screens prefix again.
        if (savedReading?.surahName) savedReading.surahName = savedReading.surahName.replace(/^سورة\s+/, '');
        setReadingBookmarkState(savedReading);

        // Older versions stored built-in cities with text coordinates ("30.04° N");
        // normalizeCity repairs those so the saved city is actually used.
        const savedCity = normalizeCity(await StorageService.getObject<any>('almosala_city', null));
        if (savedCity) setCurrentCityState(savedCity);

        const savedFontSize = parseInt((await StorageService.getItem('almosala_quran_font_size')) || '', 10);
        if (savedFontSize >= 17 && savedFontSize <= 48) setQuranFontSize(savedFontSize);
      } catch (e) {
        console.warn('Error loading initial preferences:', e);
      } finally {
        setPrefsLoaded(true);
      }
    })();
  }, []);

  // Roll prayer times over at the city's midnight without re-rendering every second.
  const cityTimeZone = currentCity.timeZone;
  useEffect(() => {
    const check = () => {
      const key = todayKey(cityTimeZone);
      setDayKey((prev) => (prev === key ? prev : key));
    };
    const timer = setInterval(check, 30000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [cityTimeZone]);

  // Keep the scheduled prayer alerts in sync with the current settings.
  // Runs on every start, so alerts keep rolling forward as long as the app is opened weekly.
  useEffect(() => {
    if (!prefsLoaded) return;
    const timer = setTimeout(() => {
      NotificationService.schedulePrayerAlerts(
        currentCity.nameAr,
        currentCity.lat,
        currentCity.lng,
        alertsConfig,
        calculationMethod,
        asrMethod,
        currentCity.timeZone
      );
    }, 800);
    return () => clearTimeout(timer);
  }, [prefsLoaded, currentCity, alertsConfig, calculationMethod, asrMethod, dayKey, notifRev]);

  // Persist the Quran font size after pinch/zoom settles.
  useEffect(() => {
    if (!prefsLoaded) return;
    const timer = setTimeout(() => {
      StorageService.setItem('almosala_quran_font_size', String(quranFontSize));
    }, 600);
    return () => clearTimeout(timer);
  }, [quranFontSize, prefsLoaded]);

  const setThemeMode = (mode: 'light' | 'dark') => {
    setThemeModeState(mode);
    StorageService.setItem('almosala_theme', mode);
  };

  const setLang = (l: 'ar' | 'en') => {
    setLangState(l);
    StorageService.setItem('almosala_lang', l);
  };

  const setCalculationMethod = (method: CalculationMethod) => {
    setCalcMethodState(method);
    StorageService.setItem('almosala_calc_method', method);
  };

  const setAsrMethod = (m: AsrMethod) => {
    setAsrMethodState(m);
    StorageService.setItem('almosala_asr_method', m);
  };

  const setCurrentCity = (city: City) => {
    const normalized = normalizeCity(city);
    if (!normalized) return;
    setCurrentCityState(normalized);
    StorageService.setObject('almosala_city', normalized);
  };

  const setAlertsConfig = (config: PrayerAlertsConfig) => {
    setAlertsConfigState(config);
    StorageService.setObject(ALERTS_KEY, config);
  };

  const refreshNotifications = () => setNotifRev((n) => n + 1);

  const completeOnboarding = () => {
    setOnboarded(true);
    StorageService.setItem(ONBOARDED_KEY, '1');
  };

  const togglePrayerBell = (prayerKey: keyof PrayerBellsConfig) => {
    triggerHaptic('light');
    const turningOn = !prayerBells[prayerKey];
    const current = alertsConfig.prayers[prayerKey];
    setAlertsConfig({
      ...alertsConfig,
      // Turning a bell on also re-enables the master switch.
      enabled: turningOn ? true : alertsConfig.enabled,
      prayers: { ...alertsConfig.prayers, [prayerKey]: { ...current, adhan: turningOn } }
    });
    if (turningOn) {
      // Ask from a user action; reschedule once the answer is known.
      NotificationService.requestPermissions().then(() => setNotifRev((n) => n + 1));
    }
  };

  const addBookmark = (b: BookmarkItem) => {
    setBookmarks((prev) => {
      const updated = [b, ...prev.filter((item) => !(item.surahId === b.surahId && item.ayah === b.ayah))];
      StorageService.setObject('almosala_bookmarks', updated);
      return updated;
    });
  };

  const removeBookmark = (surahId: number, ayah: number) => {
    setBookmarks((prev) => {
      const updated = prev.filter((item) => !(item.surahId === surahId && item.ayah === ayah));
      StorageService.setObject('almosala_bookmarks', updated);
      return updated;
    });
  };

  const setReadingBookmark = (rb: ReadingBookmark | null) => {
    setReadingBookmarkState(rb);
    if (rb) {
      StorageService.setObject('almosala_reading_bookmark', rb);
    } else {
      StorageService.removeItem('almosala_reading_bookmark');
    }
  };

  /** Locate the device and switch to that place. Resolves to the new city, or null if denied/failed. */
  const refreshLocation = async (): Promise<City | null> => {
    triggerHaptic('medium');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc && loc.coords) {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        let geo: Location.LocationGeocodedAddress | undefined;
        try {
          [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        } catch (e) {
          // Reverse geocoding needs a network; coordinates alone are enough for prayer times.
        }
        const cityName = geo ? (geo.city || geo.subregion || geo.region || 'موقعي الحالي') : 'موقعي الحالي';
        const city: City = {
          id: 'live_gps',
          nameAr: cityName,
          nameEn: cityName,
          country: geo?.country || 'الموقع المباشر',
          countryAr: geo?.country || 'الموقع المباشر',
          countryEn: geo?.country || 'Current Location',
          countryCode: geo?.isoCountryCode || undefined,
          // GPS gives the device's own position, so its clock is the device's.
          timeZone: deviceTimeZone(),
          lat,
          lng
        };
        setCurrentCity(city);
        return city;
      }
    } catch (e) {
      console.warn('refreshLocation error:', e);
    }
    return null;
  };

  // Prayer times change only with the day, place or method — not every render.
  // They are for the city's current date and shown in the city's clock.
  const prayerTimes = useMemo(
    () => calculateAccuratePrayerTimes(currentCity.lat, currentCity.lng, cityNow(cityTimeZone), calculationMethod, asrMethod, cityTimeZone),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentCity.lat, currentCity.lng, cityTimeZone, calculationMethod, asrMethod, dayKey]
  );

  return (
    <AppContext.Provider
      value={{
        screen,
        navigate,
        goBack,
        themeMode,
        setThemeMode,
        lang,
        setLang,
        t,
        isRTL,
        currentCity,
        setCurrentCity,
        prayerTimes,
        prayerBells,
        togglePrayerBell,
        alertsConfig,
        setAlertsConfig,
        refreshNotifications,
        prefsLoaded,
        onboarded,
        completeOnboarding,
        calculationMethod,
        setCalculationMethod,
        asrMethod,
        setAsrMethod,
        bookmarks,
        addBookmark,
        removeBookmark,
        readingBookmark,
        setReadingBookmark,
        triggerHaptic,
        refreshLocation,
        selectedSurah,
        setSelectedSurah,
        quranFontSize,
        setQuranFontSize
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

/** Theme mode for components that may also render outside the provider (light there). */
export const useThemeMode = (): 'light' | 'dark' => useContext(AppContext)?.themeMode ?? 'light';
