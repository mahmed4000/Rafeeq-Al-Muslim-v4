import React from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { MoorishArchFrame } from '../components/common/MoorishArchFrame';
import { TOKENS, makeShadow } from '../constants/tokens';
import { getFullDateInfo } from '../services/hijriDate';
import { toArabicNumber } from '../services/prayerCalculation';
import { AZKAR_CATEGORIES } from '../data/azkarData';

export const HomeScreen: React.FC = () => {
  const {
    navigate,
    theme,
    themeMode,
    t,
    currentCity,
    prayerTimes,
    nextPrayerInfo,
    prayerBells,
    togglePrayerBell,
    readingBookmark,
    refreshLocation,
    triggerHaptic
  } = useApp();

  const c = theme;
  const dateInfo = getFullDateInfo();

  const prayersList = [
    { key: 'fajr' as const, nameAr: 'الفجر', nameEn: 'Fajr', time: prayerTimes.fajr.timeStr, icon: 'sunrise' as const },
    { key: 'dhuhr' as const, nameAr: 'الظهر', nameEn: 'Dhuhr', time: prayerTimes.dhuhr.timeStr, icon: 'sun' as const },
    { key: 'asr' as const, nameAr: 'العصر', nameEn: 'Asr', time: prayerTimes.asr.timeStr, icon: 'clock' as const },
    { key: 'maghrib' as const, nameAr: 'المغرب', nameEn: 'Maghrib', time: prayerTimes.maghrib.timeStr, icon: 'sunset' as const },
    { key: 'isha' as const, nameAr: 'العشاء', nameEn: 'Isha', time: prayerTimes.isha.timeStr, icon: 'moon' as const }
  ];

  const quickFeatures = [
    { id: 'quran_index', titleAr: 'المصحف الشريف', titleEn: 'Holy Quran', icon: 'book-open', screen: 'quran_index', color: '#8C5E3C' },
    { id: 'azkar_categories', titleAr: 'حصن المسلم', titleEn: 'Azkar & Duas', icon: 'heart', screen: 'azkar_categories', color: '#5D3A22' },
    { id: 'haramain_lessons', titleAr: 'كراسي الحرمين', titleEn: 'Haramain Lessons', icon: 'mic', screen: 'haramain_lessons', color: '#1E5A3E' },
    { id: 'qibla', titleAr: 'اتجاه القبلة', titleEn: 'Qibla Direction', icon: 'compass', screen: 'qibla', color: '#C69255' },
    { id: 'zakat_calculator', titleAr: 'حاسبة الزكاة', titleEn: 'Zakat Calculator', icon: 'dollar-sign', screen: 'zakat_calculator', color: '#7B5E28' },
    { id: 'hadith_40', titleAr: 'الأربعون النووية', titleEn: '40 Hadith', icon: 'award', screen: 'hadith_40', color: '#8C5E3C' },
    { id: 'allah_names', titleAr: 'أسماء الله الحسنى', titleEn: '99 Divine Names', icon: 'star', screen: 'allah_names', color: '#A66B38' },
    { id: 'ruqyah', titleAr: 'الرقية الشرعية', titleEn: 'Islamic Ruqyah', icon: 'shield', screen: 'ruqyah', color: '#2D4F38' }
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 56 : (Platform.OS === 'web' ? 42 : 16),
        paddingBottom: 95
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Top Brand Header */}
      <View style={{ marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextUI variant="h1" color={TOKENS.colors.primaryDark}>
              {t('المصلى', 'Al-Mosala')}
            </TextUI>
            <View
              style={{
                backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: TOKENS.radius.pill,
                marginRight: 8,
                borderWidth: 1,
                borderColor: TOKENS.colors.secondary
              }}
            >
              <TextUI variant="badge" weight="medium" color={TOKENS.colors.primaryDark}>
                {t('الأندلسي', 'Pro 2026')}
              </TextUI>
            </View>
          </View>

          {/* Settings & City button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigate('settings')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                width: 34,
                height: 34,
                borderRadius: TOKENS.radius.pill,
                backgroundColor: c.surface,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <Feather name="settings" size={16} color={c.textPrimary} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={refreshLocation}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                backgroundColor: c.surface,
                paddingHorizontal: 11,
                paddingVertical: 6,
                borderRadius: TOKENS.radius.pill,
                borderWidth: 1,
                borderColor: c.border
              }}
            >
              <Feather name="map-pin" size={13} color={TOKENS.colors.primary} />
              <TextUI size={12} weight="medium" color={c.textPrimary}>
                {currentCity.nameAr}
              </TextUI>
            </TouchableOpacity>
          </View>
        </View>

        <MoorishArchFrame height={18} color={TOKENS.colors.secondary} opacity={0.6} />
      </View>

      {/* 2. Hero Next Prayer Card with Live Countdown (Standard Proportions) */}
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => navigate('prayer_times')}
        style={{
          borderRadius: 16,
          padding: 15,
          backgroundColor: TOKENS.colors.primaryDark,
          marginBottom: 12,
          ...makeShadow('0 4px 14px rgba(93, 58, 34, 0.20)', TOKENS.colors.primaryDark, 0.18, 5)
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 }}>
              <Feather name="clock" size={13} color={TOKENS.colors.secondary} />
              <TextUI variant="caption" weight="medium" color={TOKENS.colors.secondaryLight}>
                {t('الصلاة القادمة', 'Next Prayer')}
              </TextUI>
            </View>
            <TextUI cairo size={24} weight="bold" color="#FFFFFF">
              {nextPrayerInfo.nameAr}
            </TextUI>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <TextUI variant="caption" color={TOKENS.colors.secondaryLight} style={{ marginBottom: 3 }}>
              {t('موعد الأذان', 'Adhan Time')}
            </TextUI>
            <TextUI variant="h2" color="#FFFFFF">
              {nextPrayerInfo.time}
            </TextUI>
          </View>
        </View>

        {/* Countdown Bar */}
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <TextUI variant="caption" color={TOKENS.colors.secondaryLight}>
              {t('الوقت المتبقي', 'Time Remaining')}
            </TextUI>
            <TextUI variant="bodyLarge" weight="bold" color={TOKENS.colors.secondary}>
              {nextPrayerInfo.countdownText}
            </TextUI>
          </View>

          <View style={{ height: 5, width: '100%', backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 2.5, overflow: 'hidden' }}>
            <View
              style={{
                height: '100%',
                width: `${nextPrayerInfo.progress}%`,
                backgroundColor: TOKENS.colors.secondary,
                borderRadius: 2.5
              }}
            />
          </View>
        </View>
      </TouchableOpacity>

      {/* 2.5 Hijri & Gregorian Dates Card (Full Text, Standard Balanced Proportions) */}
      <View
        style={{
          backgroundColor: c.surface,
          borderRadius: 14,
          paddingVertical: 9,
          paddingHorizontal: 14,
          marginBottom: 14,
          borderWidth: 1,
          borderColor: c.border,
          ...makeShadow('0 2px 6px rgba(0,0,0,0.03)', '#000', 0.03, 2)
        }}
      >
        {/* Hijri Date Row - 100% Full Text */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 3
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: themeMode === 'light' ? '#FFF5EA' : '#33271C',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: TOKENS.colors.secondary
              }}
            >
              <Feather name="moon" size={13} color={TOKENS.colors.secondary} />
            </View>
            <TextUI size={12} weight="medium" color={c.textSecondary}>
              {t('التاريخ الهجري', 'Hijri')}
            </TextUI>
          </View>

          <TextUI size={13.5} weight="bold" color={c.textPrimary}>
            {dateInfo.hijriFormatted}
          </TextUI>
        </View>

        {/* Separator Line */}
        <View style={{ height: 1, backgroundColor: c.border, marginVertical: 5 }} />

        {/* Gregorian Date Row - 100% Full Text */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: 3
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                backgroundColor: themeMode === 'light' ? '#F0F5F2' : '#1E2D24',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: themeMode === 'light' ? '#B8D5C4' : '#2A4535'
              }}
            >
              <Feather name="calendar" size={13} color={themeMode === 'light' ? '#2D6A4F' : '#52B788'} />
            </View>
            <TextUI size={12} weight="medium" color={c.textSecondary}>
              {t('التاريخ الميلادي', 'Gregorian')}
            </TextUI>
          </View>

          <TextUI size={13} weight="medium" color={c.textPrimary}>
            {dateInfo.gregorianFormatted}
          </TextUI>
        </View>
      </View>

      {/* 3. Daily 5 Prayers Horizontal Card Grid (Standard & Balanced) */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <TextUI variant="h4" color={c.textPrimary}>
            {t('مواقيت الصلاة اليوم', "Today's Prayer Schedule")}
          </TextUI>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigate('prayer_times')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}
          >
            <TextUI variant="caption" weight="medium" color={TOKENS.colors.primary}>
              {t('عرض الكل', 'View All')}
            </TextUI>
            <Feather name="chevron-left" size={13} color={TOKENS.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'space-between' }}>
          {prayersList.map((p) => {
            const isNext = p.key === nextPrayerInfo.id;
            const hasBell = prayerBells[p.key];
            const timeOnly = p.time.split(' ')[0];

            return (
              <View
                key={p.key}
                style={{
                  flex: 1,
                  backgroundColor: isNext
                    ? (themeMode === 'light' ? '#F7EEE3' : '#3E2E20')
                    : c.surface,
                  borderRadius: 12,
                  paddingVertical: 10,
                  paddingHorizontal: 2,
                  alignItems: 'center',
                  borderWidth: isNext ? 1.5 : 1,
                  borderColor: isNext
                    ? TOKENS.colors.primary
                    : c.border,
                  ...makeShadow('0 1px 4px rgba(0,0,0,0.03)', '#000', 0.03, 2)
                }}
              >
                {/* Prayer Icon */}
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: isNext
                      ? (themeMode === 'light' ? '#EAD6C3' : '#4E3A29')
                      : (themeMode === 'light' ? '#F5EFE8' : '#2A2018'),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 3
                  }}
                >
                  <Feather
                    name={p.icon}
                    size={14}
                    color={isNext ? TOKENS.colors.primaryDark : TOKENS.colors.primary}
                  />
                </View>

                {/* Prayer Name */}
                <TextUI
                  cairo
                  size={13}
                  weight="bold"
                  color={isNext ? TOKENS.colors.primaryDark : c.textPrimary}
                  style={{ marginBottom: 2 }}
                  numberOfLines={1}
                >
                  {p.nameAr}
                </TextUI>

                {/* Prayer Time */}
                <TextUI
                  variant="bodyMedium"
                  weight="bold"
                  color={isNext ? TOKENS.colors.primaryDark : c.textPrimary}
                  numberOfLines={1}
                >
                  {timeOnly}
                </TextUI>

                {/* Notification Bell */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => togglePrayerBell(p.key)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: hasBell
                      ? (themeMode === 'light' ? '#FFF5EA' : '#3D2D1E')
                      : (themeMode === 'light' ? '#F4EDE4' : '#291F17'),
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 5
                  }}
                >
                  <Feather
                    name={hasBell ? 'bell' : 'bell-off'}
                    size={11}
                    color={hasBell ? TOKENS.colors.secondary : c.textSecondary}
                  />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* 3.5. Daily Azkar Quick Access (Morning & Evening) */}
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="sun" size={15} color={TOKENS.colors.primary} />
            <TextUI variant="h4" color={c.textPrimary}>
              {t('الورد اليومي', 'Daily Azkar')}
            </TextUI>
          </View>
          <TouchableOpacity
            onPress={() => navigate('azkar_categories')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
              {t('جميع الأذكار ←', 'All Azkar ←')}
            </TextUI>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {/* Morning Azkar Quick Card */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => {
              triggerHaptic?.('light');
              const morningCat = AZKAR_CATEGORIES.find((cat) => cat.id === 'morning') || AZKAR_CATEGORIES[0];
              navigate('azkar_session', { category: morningCat });
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: themeMode === 'light' ? '#FFF9F0' : '#2D2319',
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: themeMode === 'light' ? '#F2DFCA' : '#423222',
              ...makeShadow('0 2px 6px rgba(0,0,0,0.03)', '#000', 0.03, 2)
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: themeMode === 'light' ? '#FEEFD8' : '#3E3020',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10
              }}
            >
              <Feather name="sun" size={17} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <TextUI size={14} weight="bold" color={c.textPrimary}>
                {t('أذكار الصباح', 'Morning')}
              </TextUI>
              <TextUI size={11} color={c.textSecondary}>
                {toArabicNumber(27)} ذكراً
              </TextUI>
            </View>
            <Feather name="chevron-left" size={15} color={c.textSecondary} />
          </TouchableOpacity>

          {/* Evening Azkar Quick Card */}
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={() => {
              triggerHaptic?.('light');
              const eveningCat = AZKAR_CATEGORIES.find((cat) => cat.id === 'evening') || AZKAR_CATEGORIES[1];
              navigate('azkar_session', { category: eveningCat });
            }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: themeMode === 'light' ? '#F4F7FC' : '#1F2733',
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: themeMode === 'light' ? '#D6E2F5' : '#2B394E',
              ...makeShadow('0 2px 6px rgba(0,0,0,0.03)', '#000', 0.03, 2)
            }}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: themeMode === 'light' ? '#E0EDFE' : '#28364A',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10
              }}
            >
              <Feather name="moon" size={17} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <TextUI size={14} weight="bold" color={c.textPrimary}>
                {t('أذكار المساء', 'Evening')}
              </TextUI>
              <TextUI size={11} color={c.textSecondary}>
                {toArabicNumber(27)} ذكراً
              </TextUI>
            </View>
            <Feather name="chevron-left" size={15} color={c.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 4. Blessed Friday Special Card (Shown on Fridays) */}
      {(() => {
        const isFriday = new Date().getDay() === 5;
        if (!isFriday) return null;
        return (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => {
              triggerHaptic?.('medium');
              navigate('quran_reader', { surahId: 18, startPage: 293 });
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: themeMode === 'light' ? '#F0FDF4' : '#142E1F',
              borderRadius: 16,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: '#22C55E',
              ...makeShadow('0 4px 14px rgba(34, 197, 94, 0.15)', '#22C55E', 0.15, 6)
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                backgroundColor: themeMode === 'light' ? '#DCFCE7' : '#1D452E',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12
              }}
            >
              <Feather name="star" size={20} color="#16A34A" />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <TextUI size={15} weight="bold" color={themeMode === 'light' ? '#15803D' : '#4ADE80'}>
                  {t('يوم الجمعة المبارك 🕌', 'Blessed Friday')}
                </TextUI>
                <View style={{ backgroundColor: '#22C55E', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 }}>
                  <TextUI size={10} weight="bold" color="#FFFFFF">{t('سنة', 'Sunnah')}</TextUI>
                </View>
              </View>
              <TextUI size={12} color={c.textSecondary} style={{ marginTop: 2 }}>
                {t('قراءة سورة الكهف • الصلاة على النبي ﷺ • ساعة الإجابة', 'Surah Al-Kahf & Salawat')}
              </TextUI>
            </View>
            <Feather name="chevron-left" size={18} color="#16A34A" />
          </TouchableOpacity>
        );
      })()}

      {/* 5. Islamic Features Bento Grid (Modern Elevated Islamic Layout) */}
      <View style={{ marginBottom: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <TextUI variant="h4" color={c.textPrimary}>
            {t('الموسوعة والخدمات الإسلامية', 'Islamic Features & Services')}
          </TextUI>
          <TextUI variant="caption" color={c.textSecondary}>
            {t('خدمات شاملة للمسلم', 'All Services')}
          </TextUI>
        </View>

        {/* Bento Primary Hero Tile: Holy Quran */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => {
            triggerHaptic?.('light');
            if (readingBookmark) {
              navigate('quran_reader', { surahId: readingBookmark.surahId, ayah: readingBookmark.ayah });
            } else {
              navigate('quran_index');
            }
          }}
          style={{
            backgroundColor: themeMode === 'light' ? '#FFFDF9' : '#2C221A',
            borderRadius: 18,
            padding: 16,
            marginBottom: 10,
            borderWidth: 1.5,
            borderColor: TOKENS.colors.secondary,
            ...makeShadow('0 4px 14px rgba(198, 146, 85, 0.12)', TOKENS.colors.secondary, 0.12, 5)
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: themeMode === 'light' ? '#FBF1E4' : '#3E3022',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: TOKENS.colors.secondary
                }}
              >
                <Feather name="book-open" size={22} color={TOKENS.colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TextUI size={16} weight="bold" color={c.textPrimary}>
                    {t('المصحف الشريف المرتل', 'Holy Quran')}
                  </TextUI>
                  <View style={{ backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#3B2E24', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 }}>
                    <TextUI size={10} weight="bold" color={TOKENS.colors.primaryDark}>
                      {readingBookmark ? t('متابعة', 'Resume') : t('١١٤ سورة', '114 Surahs')}
                    </TextUI>
                  </View>
                </View>
                <TextUI size={12} color={c.textSecondary} style={{ marginTop: 3 }} numberOfLines={1}>
                  {readingBookmark
                    ? `${t('آخر قراءة:', 'Last Read:')} سورة ${readingBookmark.surahName} • الآية ${toArabicNumber(readingBookmark.ayah)}`
                    : t('قراءة بالخط العثماني، تفسير الآيات، وتلاوات مشاهير القرّاء', 'Uthmani Script, Tafsir, & Famous Reciters')}
                </TextUI>
              </View>
            </View>
            <Feather name="chevron-left" size={18} color={TOKENS.colors.primary} />
          </View>
        </TouchableOpacity>

        {/* 2x2 Bento Tiles for Core Features */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' }}>
          {quickFeatures.filter((f) => f.id !== 'quran_index' && f.id !== 'azkar_categories').map((f) => (
            <TouchableOpacity
              key={f.id}
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic?.('light');
                navigate(f.screen);
              }}
              style={{
                width: '48.5%',
                backgroundColor: c.surface,
                borderRadius: 14,
                paddingVertical: 12,
                paddingHorizontal: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                borderWidth: 1,
                borderColor: c.border,
                ...makeShadow('0 2px 6px rgba(0,0,0,0.02)', '#000', 0.02, 2)
              }}
            >
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: themeMode === 'light' ? `${f.color}15` : `${f.color}30`,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Feather name={f.icon as any} size={18} color={f.color} />
              </View>
              <View style={{ flex: 1 }}>
                <TextUI size={13} weight="bold" color={c.textPrimary} numberOfLines={1}>
                  {f.titleAr}
                </TextUI>
                <TextUI size={10.5} color={c.textSecondary} numberOfLines={1}>
                  {f.titleEn}
                </TextUI>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 6. Daily Ayah Inspiration Card */}
      <View
        style={{
          borderRadius: 14,
          backgroundColor: c.surface,
          padding: 14,
          borderWidth: 1,
          borderColor: c.border,
          marginBottom: 10
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 }}>
          <Feather name="sun" size={14} color={TOKENS.colors.secondary} />
          <TextUI variant="captionBold" color={TOKENS.colors.secondary}>
            {t('آية وتأمل اليوم', 'Ayah of the Day')}
          </TextUI>
        </View>

        <TextUI variant="quranVerse" size={16} weight="bold" color={TOKENS.colors.primaryDark} style={{ lineHeight: 28, textAlign: 'center', marginVertical: 6 }}>
          ﴿ إِنَّ ٱلَّذِينَ ءَامَنُوا۟ وَعَمِلُوا۟ ٱلصَّـٰلِحَـٰتِ سَيَجْعَلُ لَهُمُ ٱلرَّحْمَـٰنُ وُدًّۭا ﴾
        </TextUI>

        <TextUI variant="caption" color={c.textSecondary} style={{ textAlign: 'center', marginTop: 2 }}>
          {t('سورة مريم • الآية ٩٦', 'Surah Maryam • Verse 96')}
        </TextUI>
      </View>
    </ScrollView>
  );
};
