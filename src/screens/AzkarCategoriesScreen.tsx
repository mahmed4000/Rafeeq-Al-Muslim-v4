import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { AZKAR_CATEGORIES, AZKAR_DATABASE } from '../data/azkarData';
import { toArabicNumber } from '../services/prayerCalculation';
import { StorageService } from '../services/storage';
import { usePalette, PALETTE } from '../theme/palette';
import { LinearGradient } from 'expo-linear-gradient';
import { ArchScene } from '../components/azkar/ArchScene';
import { getUiLanguage } from '../i18n/language';

type FilterGroup = 'all' | 'daily' | 'prayer' | 'occasions';

const GROUPS: { id: FilterGroup; labelAr: string; labelEn: string }[] = [
  { id: 'all', labelAr: 'الكل', labelEn: 'All' },
  { id: 'daily', labelAr: 'اليومية', labelEn: 'Daily' },
  { id: 'prayer', labelAr: 'الصلاة', labelEn: 'Prayer' },
  { id: 'occasions', labelAr: 'أحوال ومناسبات', labelEn: 'Occasions' }
];

// Same key and shape as AzkarSessionScreen's same-day progress.
const PROGRESS_KEY = 'rafeeq_azkar_progress_v1';
type SessionProgress = Record<string, { day: string; index: number; counter: number; doneDay?: string }>;

// Once-a-day sessions shown in the banner, in the order of the day.
const DAILY_SESSIONS = ['waking', 'morning', 'evening', 'sleep'];

/** "١٢ ذكرًا" / "٣ أذكار" (Arabic plural agreement). */
function adhkarAr(n: number): string {
  if (getUiLanguage() === 'en') return `${toArabicNumber(n)} ${n === 1 ? 'dhikr' : 'adhkar'}`;
  if (n === 1) return 'ذكر واحد';
  if (n === 2) return 'ذكران';
  const tail = n % 100;
  return `${toArabicNumber(n)} ${tail >= 3 && tail <= 10 ? 'أذكار' : 'ذكرًا'}`;
}

const countOf = (id: string) => (AZKAR_DATABASE[id] || []).length;

export const AzkarCategoriesScreen: React.FC = () => {
  const { navigate, t, triggerHaptic, isRTL, lang } = useApp();
  const p = usePalette();
  const titleOf = (cat: { titleAr: string; titleEn: string }) => (lang === 'en' ? cat.titleEn : cat.titleAr);
  const stoppedLabel = (at: number, total?: number) =>
    total === undefined
      ? t(`توقفت عند ${toArabicNumber(at + 1)}`, `stopped at ${toArabicNumber(at + 1)}`)
      : t(`توقفت عند ${toArabicNumber(at + 1)} من ${toArabicNumber(total)}`, `Stopped at ${toArabicNumber(at + 1)} of ${toArabicNumber(total)}`);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<FilterGroup>('all');
  const [progress, setProgress] = useState<SessionProgress>({});

  // Where each session stopped today (written by the session screen).
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      StorageService.getObject<SessionProgress>(PROGRESS_KEY, {}).then((saved) => { if (alive) setProgress(saved || {}); });
      return () => { alive = false; };
    }, [])
  );
  const today = new Date().toDateString();
  const stoppedAt = (id: string) => {
    const saved = progress[id];
    return saved && saved.day === today && saved.index > 0 ? saved.index : 0;
  };
  const doneToday = (id: string) => progress[id]?.doneDay === today;
  const isDark = p.bg === PALETTE.dark.bg;

  // Suggested session by time of day (unchanged rule from the previous screen).
  const recommendedId = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) return 'morning';
    if (hour >= 15 && hour < 20) return 'evening';
    if (hour >= 20 || hour < 4) return 'sleep';
    return 'prayer_azkar';
  }, []);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return AZKAR_CATEGORIES.filter((cat) => {
      if (selectedGroup !== 'all' && cat.group !== selectedGroup) return false;
      if (!q) return true;
      const titleMatch = cat.titleAr.toLowerCase().includes(q) || cat.titleEn.toLowerCase().includes(q) || cat.subtitleAr.toLowerCase().includes(q) || cat.subtitleEn.toLowerCase().includes(q);
      // Virtue lines are hidden in sessions until sourced, so they are not searched either.
      const contentMatch = (AZKAR_DATABASE[cat.id] || []).some((item) => item.ar.includes(q) || item.en.toLowerCase().includes(q));
      return titleMatch || contentMatch;
    });
  }, [searchQuery, selectedGroup]);

  const openSession = (id: string) => {
    triggerHaptic('light');
    navigate('azkar_session', { categoryId: id });
  };

  // Dusk banner: today's once-a-day sessions, each a chip that opens it.
  const renderBanner = () => {
    const done = DAILY_SESSIONS.filter(doneToday).length;
    return (
      <View style={{ borderRadius: 22, overflow: 'hidden' }}>
        <LinearGradient colors={['#2E3A5C', '#6B4A6E', '#C9785A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flexDirection: 'row' }}>
          <View style={{ flex: 1, paddingVertical: 16, paddingHorizontal: 14, gap: 10 }}>
          <TextUI size={12.5} weight="bold" color="#F4D9A8">{t('وِرد الأذكار اليوم', "Today's adhkar")}</TextUI>
          <TextUI size={19} weight="bold" color="#FFF6EA">
            {t(`${toArabicNumber(done)} من ${toArabicNumber(DAILY_SESSIONS.length)} جلسات`, `${toArabicNumber(done)} of ${toArabicNumber(DAILY_SESSIONS.length)} sessions`)}
          </TextUI>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {DAILY_SESSIONS.map((id) => {
              const cat = AZKAR_CATEGORIES.find((c) => c.id === id);
              if (!cat) return null;
              const finished = doneToday(id);
              const at = stoppedAt(id);
              const isNow = recommendedId === id && !finished;
              const state = finished ? t('تمّت', 'done') : at ? stoppedLabel(at) : isNow ? t('الآن', 'now') : '';
              return (
                <TouchableOpacity
                  key={id}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={state ? `${titleOf(cat)}${t('، ', ', ')}${state}` : titleOf(cat)}
                  onPress={() => openSession(id)}
                  style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, borderRadius: 999, backgroundColor: finished ? '#C69255' : isNow ? 'rgba(255,246,234,0.28)' : 'rgba(255,246,234,0.14)', borderWidth: isNow ? 1 : 0, borderColor: '#F4D9A8' }}
                >
                  {finished ? <Feather name="check" size={13} color="#2D1E16" /> : null}
                  <TextUI size={12.5} weight={finished || isNow ? 'bold' : 'medium'} color={finished ? '#2D1E16' : '#FFF6EA'}>{titleOf(cat).replace(/^أذكار /, '')}</TextUI>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextUI size={12} color="#E8D3B4">{t('من جلساتك أنت · على جهازك فقط', 'From your own sessions · on your device only')}</TextUI>
          </View>
          {/* Decorative arch with a crescent, at the end side */}
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 84, alignSelf: 'stretch' }}>
            <View style={{ position: 'absolute', left: 6, right: 6, top: 20, bottom: -2, borderTopLeftRadius: 36, borderTopRightRadius: 36, borderWidth: 1.5, borderBottomWidth: 0, borderColor: 'rgba(244,217,168,0.5)' }} />
            <View style={{ position: 'absolute', left: 27, top: 40, width: 30, height: 30, borderRadius: 15, backgroundColor: '#F4D9A8' }} />
            <View style={{ position: 'absolute', left: 37, top: 34, width: 26, height: 26, borderRadius: 13, backgroundColor: '#4E4566' }} />
            {[[20, 88], [62, 100], [34, 118]].map(([x, y]) => <View key={x} style={{ position: 'absolute', left: x, top: y, width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#FFF3DC' }} />)}
          </View>
        </LinearGradient>
      </View>
    );
  };

  type Tile = { id: string; title: string; total: number; at: number; done: boolean; onPress: () => void; a11y: string };
  const renderTile = (tile: Tile) => (
    <TouchableOpacity
      key={tile.id}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={tile.a11y}
      onPress={tile.onPress}
      style={{ width: '31.5%', minHeight: 150, borderRadius: 18, padding: 7, paddingBottom: 10, gap: 8, alignItems: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
    >
      <ArchScene id={tile.id} border={p.border} dim={isDark} />
      {tile.done ? (
        // A flex row so the badge sits at the end side on web and native alike.
        <View style={{ position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: p.success }}>
            <Feather name="check" size={13} color="#FFFDF9" />
          </View>
        </View>
      ) : null}
      <TextUI size={13} weight="bold" color={p.ink} align="center" numberOfLines={2} style={{ lineHeight: 18 }}>{tile.title}</TextUI>
      {tile.at > 0 && tile.total > 0 ? (
        <View style={{ width: '70%', height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: p.border }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: p.accent, width: `${Math.round((tile.at / tile.total) * 100)}%` }} />
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const showTasbihTile = selectedGroup === 'all' && !searchQuery.trim();

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 24 : 16, paddingBottom: 104, gap: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title and tasbih */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TextUI font="amiri" size={28} weight="bold" color={p.primaryInk}>{t('الأذكار', 'Adhkar')}</TextUI>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            onPress={() => navigate('tasbih')}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 999, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
          >
            <Feather name="circle" size={16} color={p.primary} />
            <TextUI size={14} weight="medium" color={p.ink}>{t('السبحة', 'Tasbih')}</TextUI>
          </TouchableOpacity>
        </View>

        {renderBanner()}

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <Feather name="search" size={18} color={p.muted} />
          <TextInput
            accessibilityLabel={t('بحث في الأذكار', 'Search adhkar')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('باب أو كلمة من الذكر', 'Category or a word from the dhikr')}
            placeholderTextColor={p.muted}
            style={{ flex: 1, color: p.ink, textAlign: isRTL ? 'right' : 'left', fontSize: 15, paddingVertical: 10 }}
          />
          {searchQuery ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('مسح البحث', 'Clear search')} onPress={() => setSearchQuery('')} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={16} color={p.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Groups */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {GROUPS.map((grp) => {
            const selected = selectedGroup === grp.id;
            return (
              <TouchableOpacity
                key={grp.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => { triggerHaptic('light'); setSelectedGroup(grp.id); }}
                style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: selected ? p.primary : p.soft }}
              >
                <TextUI size={14} weight={selected ? 'bold' : 'medium'} color={selected ? p.onPrimary : p.primaryInk}>{t(grp.labelAr, grp.labelEn)}</TextUI>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* All categories */}
        {filteredCategories.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
            <Feather name="search" size={26} color={p.muted} />
            <TextUI size={15} weight="bold" color={p.ink}>{t('لا توجد نتائج مطابقة', 'No matching results')}</TextUI>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => { setSearchQuery(''); setSelectedGroup('all'); }}
              style={{ minHeight: 40, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 12, backgroundColor: p.soft }}
            >
              <TextUI size={14} weight="bold" color={p.primaryInk}>{t('إعادة تعيين البحث', 'Reset search')}</TextUI>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
            {filteredCategories.map((cat) => {
              const total = countOf(cat.id);
              const at = stoppedAt(cat.id);
              const done = doneToday(cat.id);
              const status = done ? t('أتممتها اليوم', 'finished today') : at ? stoppedLabel(at, total) : adhkarAr(total);
              return renderTile({
                id: cat.id,
                title: titleOf(cat),
                total,
                at,
                done,
                onPress: () => openSession(cat.id),
                a11y: `${titleOf(cat)}${t('، ', ', ')}${status}`
              });
            })}
            {showTasbihTile
              ? renderTile({ id: 'tasbih', title: t('السبحة', 'Tasbih'), total: 0, at: 0, done: false, onPress: () => { triggerHaptic('light'); navigate('tasbih'); }, a11y: t('السبحة', 'Tasbih') })
              : null}
            {/* Keep the last row aligned to the start when it is not full */}
            {Array.from({ length: (3 - ((filteredCategories.length + (showTasbihTile ? 1 : 0)) % 3)) % 3 }, (_, i) => <View key={`pad${i}`} style={{ width: '31.5%' }} />)}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
