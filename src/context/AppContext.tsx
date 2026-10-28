import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { TOKENS } from '../constants/tokens';
import { CITIES } from '../constants/cities';
import { StorageService } from '../services/storage';
import {
  calculateAccuratePrayerTimes,
  getNextPrayerCountdown,
  PrayerTimeValues,
  NextPrayerInfo
} from '../services/prayerCalculation';
import { NotificationService, PrayerBellsConfig } from '../services/notificationService';

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

interface AppContextType {
  screen: string;
  navigate: (screenName: string, params?: any) => void;
  goBack: () => void;
  screenParams: any;
  themeMode: 'light' | 'dark';
  setThemeMode: (mode: 'light' | 'dark') => void;
  theme: typeof TOKENS.colors.light;
  lang: 'ar' | 'en';
  setLang: (lang: 'ar' | 'en') => void;
  t: (ar: string, en: string) => string;
  isRTL: boolean;
  currentCity: any;
  setCurrentCity: (city: any) => void;
  prayerTimes: PrayerTimeValues;
  nextPrayerInfo: NextPrayerInfo;
  prayerBells: PrayerBellsConfig;
  togglePrayerBell: (prayerKey: keyof PrayerBellsConfig) => void;
  calculationMethod: 'umm_al_qura' | 'egypt' | 'mwl' | 'isna';
  setCalculationMethod: (method: 'umm_al_qura' | 'egypt' | 'mwl' | 'isna') => void;
  asrMethod: 'standard' | 'hanafi';
  setAsrMethod: (m: 'standard' | 'hanafi') => void;
  bookmarks: BookmarkItem[];
  addBookmark: (b: BookmarkItem) => void;
  removeBookmark: (surahId: number, ayah: number) => void;
  readingBookmark: ReadingBookmark | null;
  setReadingBookmark: (rb: ReadingBookmark | null) => void;
  triggerHaptic: (type?: 'light' | 'medium' | 'heavy' | 'success') => void;
  refreshLocation: () => Promise<void>;
  // Quran reader state
  selectedSurah: any;
  setSelectedSurah: (s: any) => void;
  quranFontSize: number;
  setQuranFontSize: (size: number | ((prev: number) => number)) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [screen, setScreen] = useState<string>('home');
  const [stack, setStack] = useState<string[]>([]);
  const [screenParams, setScreenParams] = useState<any>({});
  const [themeMode, setThemeModeState] = useState<'light' | 'dark'>('light');
  const [lang, setLangState] = useState<'ar' | 'en'>('ar');
  const [currentCity, setCurrentCityState] = useState<any>(CITIES[0] || {
    id: 'makkah',
    nameAr: 'مكة المكرمة',
    nameEn: 'Makkah',
    countryAr: 'المملكة العربية السعودية',
    countryEn: 'Saudi Arabia',
    lat: 21.422487,
    lng: 39.826206,
    qiblaAngle: 0
  });

  const [calculationMethod, setCalcMethodState] = useState<'umm_al_qura' | 'egypt' | 'mwl' | 'isna'>('umm_al_qura');
  const [asrMethod, setAsrMethodState] = useState<'standard' | 'hanafi'>('standard');
  const [prayerBells, setPrayerBells] = useState<PrayerBellsConfig>({
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true
  });

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [readingBookmark, setReadingBookmarkState] = useState<ReadingBookmark | null>(null);
  const [selectedSurah, setSelectedSurah] = useState<any>(null);
  const [quranFontSize, setQuranFontSize] = useState<number>(24);

  const isRTL = lang === 'ar';
  const theme = themeMode === 'light' ? TOKENS.colors.light : {
    ...TOKENS.colors.light,
    bg: '#1C1511',
    bgSecondary: '#261E18',
    surface: '#2A201A',
    surfaceElevated: '#322620',
    textPrimary: '#FAF6F0',
    textSecondary: '#D4C3B3',
    border: '#3D3028'
  };

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

  // Navigation handlers
  const navigate = (nextScreen: string, params: any = {}) => {
    triggerHaptic('light');
    setStack((prev) => [...prev, screen]);
    setScreenParams(params);
    setScreen(nextScreen);
  };

  const goBack = () => {
    triggerHaptic('light');
    if (stack.length > 0) {
      const prev = stack[stack.length - 1];
      setStack((s) => s.slice(0, s.length - 1));
      setScreen(prev);
    } else {
      setScreen('home');
    }
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
        if (savedCalc) setCalcMethodState(savedCalc as any);

        const savedBells = await StorageService.getObject<PrayerBellsConfig>('almosala_bells', {
          fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true
        });
        setPrayerBells(savedBells);

        const savedBookmarks = await StorageService.getObject<BookmarkItem[]>('almosala_bookmarks', []);
        setBookmarks(savedBookmarks);

        const savedReading = await StorageService.getObject<ReadingBookmark | null>('almosala_reading_bookmark', null);
        setReadingBookmarkState(savedReading);

        const savedCity = await StorageService.getObject<any>('almosala_city', null);
        if (savedCity) setCurrentCityState(savedCity);
      } catch (e) {
        console.warn('Error loading initial preferences:', e);
      }
    })();
  }, []);

  const setThemeMode = (mode: 'light' | 'dark') => {
    setThemeModeState(mode);
    StorageService.setItem('almosala_theme', mode);
  };

  const setLang = (l: 'ar' | 'en') => {
    setLangState(l);
    StorageService.setItem('almosala_lang', l);
  };

  const setCalculationMethod = (method: 'umm_al_qura' | 'egypt' | 'mwl' | 'isna') => {
    setCalcMethodState(method);
    StorageService.setItem('almosala_calc_method', method);
  };

  const setAsrMethod = (m: 'standard' | 'hanafi') => {
    setAsrMethodState(m);
    StorageService.setItem('almosala_asr_method', m);
  };

  const setCurrentCity = (city: any) => {
    setCurrentCityState(city);
    StorageService.setObject('almosala_city', city);
    // Automatically reschedule notifications for new city
    NotificationService.scheduleWeeklyPrayerNotifications(
      city.nameAr,
      city.nameEn,
      city.lat,
      city.lng,
      prayerBells,
      calculationMethod
    );
  };

  const togglePrayerBell = (prayerKey: keyof PrayerBellsConfig) => {
    triggerHaptic('light');
    setPrayerBells((prev) => {
      const next = { ...prev, [prayerKey]: !prev[prayerKey] };
      StorageService.setObject('almosala_bells', next);
      NotificationService.scheduleWeeklyPrayerNotifications(
        currentCity.nameAr,
        currentCity.nameEn,
        currentCity.lat,
        currentCity.lng,
        next,
        calculationMethod
      );
      return next;
    });
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

  const refreshLocation = async () => {
    triggerHaptic('medium');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (loc && loc.coords) {
        const lat = loc.coords.latitude;
        const lng = loc.coords.longitude;
        const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
        const cityName = geo ? (geo.city || geo.subregion || geo.region || 'موقعي الحالي') : 'موقعي الحالي';
        const newCity = {
          id: 'live_gps',
          nameAr: cityName,
          nameEn: cityName,
          countryAr: geo?.country || 'الموقع المباشر',
          countryEn: geo?.country || 'Current Location',
          lat,
          lng,
          qiblaAngle: 0
        };
        setCurrentCity(newCity);
      }
    } catch (e) {
      console.warn('refreshLocation error:', e);
    }
  };

  // Calculate prayer times
  const prayerTimes = calculateAccuratePrayerTimes(
    currentCity.lat,
    currentCity.lng,
    new Date(),
    calculationMethod,
    asrMethod
  );

  const [nextPrayerInfo, setNextPrayerInfo] = useState<NextPrayerInfo>(() =>
    getNextPrayerCountdown(prayerTimes, new Date())
  );

  // Live second-by-second countdown without re-rendering unnecessary components
  useEffect(() => {
    const timer = setInterval(() => {
      setNextPrayerInfo(getNextPrayerCountdown(prayerTimes, new Date()));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentCity, calculationMethod, asrMethod]);

  return (
    <AppContext.Provider
      value={{
        screen,
        navigate,
        goBack,
        screenParams,
        themeMode,
        setThemeMode,
        theme,
        lang,
        setLang,
        t,
        isRTL,
        currentCity,
        setCurrentCity,
        prayerTimes,
        nextPrayerInfo,
        prayerBells,
        togglePrayerBell,
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
