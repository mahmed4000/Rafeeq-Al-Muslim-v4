import React, { useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { usePalette, PALETTE } from '../theme/palette';

type Service = { screen?: string; title: string; titleEn: string; icon: keyof typeof Feather.glyphMap; soon?: boolean };
type Group = { title: string; titleEn: string; items: Service[] };

const GROUPS: Group[] = [
  {
    title: 'القرآن', titleEn: 'Quran',
    items: [
      { screen: 'quran_index', title: 'المصحف', titleEn: 'Mushaf', icon: 'book-open' },
      { screen: 'khatma', title: 'الختمة', titleEn: 'Khatma', icon: 'award' },
      { screen: 'tahfeez', title: 'الحفظ', titleEn: 'Memorize', icon: 'repeat' },
      { screen: 'downloads', title: 'التنزيلات', titleEn: 'Downloads', icon: 'download' }
    ]
  },
  {
    title: 'الذكر والدعاء', titleEn: 'Dhikr & dua',
    items: [
      { screen: 'azkar_categories', title: 'الأذكار', titleEn: 'Adhkar', icon: 'heart' },
      { screen: 'tasbih', title: 'المسبحة', titleEn: 'Tasbih', icon: 'circle' },
      { screen: 'ruqyah', title: 'الرقية', titleEn: 'Ruqyah', icon: 'shield' }
    ]
  },
  {
    title: 'العلم', titleEn: 'Learning',
    items: [
      { screen: 'haramain_lessons', title: 'دروس الحرمين', titleEn: 'Haramain lessons', icon: 'headphones' },
      { screen: 'hadith_40', title: 'الأربعون', titleEn: "Nawawi's 40", icon: 'bookmark' },
      { screen: 'allah_names', title: 'أسماء الله', titleEn: 'Names of Allah', icon: 'star' }
    ]
  },
  {
    title: 'الصلاة والوقت', titleEn: 'Prayer & time',
    items: [
      { screen: 'prayer_times', title: 'مواقيت الصلاة', titleEn: 'Prayer times', icon: 'clock' },
      { screen: 'prayer_month', title: 'مواقيت الشهر', titleEn: 'Monthly times', icon: 'calendar' },
      { screen: 'imsakiah', title: 'الإمساكية', titleEn: 'Imsakiah', icon: 'moon' },
      { screen: 'qibla', title: 'القبلة', titleEn: 'Qibla', icon: 'compass' },
      { screen: 'adhan_settings', title: 'الأذان والإقامة', titleEn: 'Adhan & iqamah', icon: 'bell' },
      { title: 'المسافر', titleEn: 'Traveller', icon: 'briefcase', soon: true }
    ]
  },
  {
    title: 'أخرى', titleEn: 'Other',
    items: [
      { screen: 'zakat_calculator', title: 'الزكاة', titleEn: 'Zakat', icon: 'percent' },
      { screen: 'settings', title: 'الإعدادات', titleEn: 'Settings', icon: 'sliders' }
    ]
  }
];

// Arabic letter variants folded so a search finds "الاذكار" as well as "الأذكار".
const fold = (s: string) => s.toLowerCase().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ً-ْ]/g, '');

export const AllServicesScreen: React.FC = () => {
  const { navigate, goBack, t, isRTL, triggerHaptic } = useApp();
  const p = usePalette();
  const tone = p.bg === PALETTE.dark.bg
    ? { bg: '#3A2C22', fg: '#D6A877', ring: '#4A3A2E' }
    : { bg: '#F2E3CF', fg: '#8C5E3C', ring: '#FBF3E8' };
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return GROUPS;
    return GROUPS
      .map((g) => ({ ...g, items: g.items.filter((s) => fold(s.title).includes(q) || fold(s.titleEn).includes(q)) }))
      .filter((g) => g.items.length);
  }, [query]);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Header: mocha band with a faint arcade */}
        <LinearGradient colors={['#5D3A22', '#8C5E3C']} style={{ paddingTop: Platform.OS === 'ios' ? 54 : Platform.OS === 'web' ? 18 : 14, paddingHorizontal: 16, paddingBottom: 18, gap: 16, overflow: 'hidden' }}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, bottom: -4, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 }}>
            {Array.from({ length: 9 }, (_, i) => (
              <View key={i} style={{ width: 40, height: 60, borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1.2, borderBottomWidth: 0, borderColor: 'rgba(198,146,85,0.45)' }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('رجوع', 'Back')}
              onPress={goBack}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(30,20,14,0.3)' }}
            >
              <Feather name={isRTL ? 'chevron-right' : 'chevron-left'} size={20} color="#FFF6EA" />
            </TouchableOpacity>
            <TextUI font="amiri" size={24} weight="bold" color="#FFF6EA">{t('كل الخدمات', 'All services')}</TextUI>
            <View style={{ width: 44 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 14, borderRadius: 14, backgroundColor: 'rgba(255,253,249,0.95)' }}>
            <Feather name="search" size={17} color="#6F5A4A" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t('ابحث عن خدمة', 'Search services')}
              placeholderTextColor="#6F5A4A"
              accessibilityLabel={t('ابحث عن خدمة', 'Search services')}
              style={{ flex: 1, color: '#2D1E16', fontFamily: 'Tajawal_400Regular', fontSize: 15, paddingVertical: 10, textAlign: isRTL ? 'right' : 'left' }}
            />
            {query ? (
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('مسح البحث', 'Clear search')} onPress={() => setQuery('')} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={16} color="#6F5A4A" />
              </TouchableOpacity>
            ) : null}
          </View>
        </LinearGradient>

        <View style={{ padding: 16, gap: 14 }}>
          {groups.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
              <Feather name="search" size={26} color={p.muted} />
              <TextUI size={15} weight="bold" color={p.ink}>{t('لا توجد خدمة بهذا الاسم', 'No service with that name')}</TextUI>
            </View>
          ) : null}
          {groups.map((g) => (
            <View key={g.title} style={{ borderRadius: 22, paddingVertical: 14, paddingHorizontal: 4, gap: 12, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
              <TextUI size={15} weight="bold" color={p.muted} style={{ paddingHorizontal: 10 }}>{t(g.title, g.titleEn)}</TextUI>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 }}>
                {g.items.map((s) => {
                  const label = t(s.title, s.titleEn);
                  return (
                    <TouchableOpacity
                      key={s.title}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={s.soon ? t(`${label}، قريبًا`, `${label}, coming soon`) : label}
                      disabled={s.soon}
                      aria-disabled={s.soon}
                      onPress={() => { if (!s.screen) return; triggerHaptic('light'); navigate(s.screen); }}
                      style={{ width: '25%', minHeight: 88, alignItems: 'center', gap: 6, opacity: s.soon ? 0.6 : 1 }}
                    >
                      <View style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg, borderWidth: 3, borderColor: tone.ring }}>
                        <Feather name={s.icon} size={22} color={tone.fg} />
                      </View>
                      <TextUI size={12.5} weight="medium" color={p.ink} align="center" numberOfLines={2} style={{ lineHeight: 17 }}>{label}</TextUI>
                      {s.soon ? (
                        <View style={{ position: 'absolute', top: -6, left: 0, right: 0, alignItems: 'center' }}>
                          <View style={{ paddingHorizontal: 6, borderRadius: 999, backgroundColor: p.accent }}>
                            <TextUI size={10.5} weight="bold" color="#2D1E16">{t('قريبًا', 'Soon')}</TextUI>
                          </View>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};
