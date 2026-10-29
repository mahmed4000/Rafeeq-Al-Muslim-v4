import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { AZKAR_CATEGORIES, AZKAR_DATABASE } from '../data/azkarData';
import { toArabicNumber } from '../services/prayerCalculation';
import { StorageService } from '../services/storage';
import { usePalette } from '../theme/palette';

type FilterGroup = 'all' | 'daily' | 'prayer' | 'occasions';

const GROUPS: { id: FilterGroup; labelAr: string; labelEn: string }[] = [
  { id: 'all', labelAr: 'الكل', labelEn: 'All' },
  { id: 'daily', labelAr: 'اليومية', labelEn: 'Daily' },
  { id: 'prayer', labelAr: 'الصلاة', labelEn: 'Prayer' },
  { id: 'occasions', labelAr: 'أحوال ومناسبات', labelEn: 'Occasions' }
];

// Same key and shape as AzkarSessionScreen's same-day progress.
const PROGRESS_KEY = 'rafeeq_azkar_progress_v1';
type SessionProgress = Record<string, { day: string; index: number; counter: number }>;

/** "١٢ ذكرًا" / "٣ أذكار" (Arabic plural agreement). */
function adhkarAr(n: number): string {
  if (n === 1) return 'ذكر واحد';
  if (n === 2) return 'ذكران';
  const tail = n % 100;
  return `${toArabicNumber(n)} ${tail >= 3 && tail <= 10 ? 'أذكار' : 'ذكرًا'}`;
}

const countOf = (id: string) => (AZKAR_DATABASE[id] || []).length;

export const AzkarCategoriesScreen: React.FC = () => {
  const { navigate, t, triggerHaptic } = useApp();
  const p = usePalette();

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
      const titleMatch = cat.titleAr.toLowerCase().includes(q) || cat.titleEn.toLowerCase().includes(q) || cat.subtitleAr.toLowerCase().includes(q);
      // Virtue lines are hidden in sessions until sourced, so they are not searched either.
      const contentMatch = (AZKAR_DATABASE[cat.id] || []).some((item) => item.ar.includes(q) || item.en.toLowerCase().includes(q));
      return titleMatch || contentMatch;
    });
  }, [searchQuery, selectedGroup]);

  const openSession = (id: string) => {
    triggerHaptic('light');
    navigate('azkar_session', { categoryId: id });
  };

  const dailyCard = (id: 'morning' | 'evening', icon: 'sun' | 'moon') => {
    const cat = AZKAR_CATEGORIES.find((c) => c.id === id);
    if (!cat) return null;
    const total = countOf(id);
    const at = stoppedAt(id);
    const isNow = recommendedId === id;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={`${cat.titleAr}، ${adhkarAr(total)}${at ? `، توقفت عند ${toArabicNumber(at + 1)}` : ''}`}
        onPress={() => openSession(id)}
        style={{ flex: 1, gap: 8, padding: 14, borderRadius: 18, backgroundColor: isNow ? p.hero : p.surface, borderWidth: 1, borderColor: isNow ? p.hero : p.border }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: isNow ? 'rgba(250,241,230,0.14)' : p.soft }}>
            <Feather name={icon} size={18} color={isNow ? p.accent : p.primaryInk} />
          </View>
          {isNow ? (
            <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: p.accent }}>
              <TextUI size={12} weight="bold" color="#2D1E16">{t('الآن', 'Now')}</TextUI>
            </View>
          ) : null}
        </View>
        <TextUI size={16} weight="bold" color={isNow ? p.onHero : p.ink}>{cat.titleAr}</TextUI>
        <TextUI size={13} color={isNow ? p.onHeroMuted : p.muted}>
          {at ? `توقفت عند ${toArabicNumber(at + 1)} من ${toArabicNumber(total)}` : adhkarAr(total)}
        </TextUI>
        <View style={{ height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: isNow ? 'rgba(250,241,230,0.2)' : p.border }}>
          <View style={{ height: 4, borderRadius: 2, backgroundColor: p.accent, width: `${total ? Math.round((at / total) * 100) : 0}%` }} />
        </View>
      </TouchableOpacity>
    );
  };

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
          <TextUI size={26} weight="bold" color={p.ink}>{t('الأذكار', 'Adhkar')}</TextUI>
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

        {/* Morning and evening */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {dailyCard('morning', 'sun')}
          {dailyCard('evening', 'moon')}
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <Feather name="search" size={18} color={p.muted} />
          <TextInput
            accessibilityLabel={t('بحث في الأذكار', 'Search adhkar')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('باب أو كلمة من الذكر', 'Category or a word from the dhikr')}
            placeholderTextColor={p.muted}
            style={{ flex: 1, color: p.ink, textAlign: 'right', fontSize: 15, paddingVertical: 10 }}
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
          <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
            {filteredCategories.map((cat, i) => {
              const total = countOf(cat.id);
              const at = stoppedAt(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={`${cat.titleAr}، ${adhkarAr(total)}`}
                  onPress={() => openSession(cat.id)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 14, minHeight: 64, borderTopWidth: i ? 1 : 0, borderColor: p.border }}
                >
                  <View style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: p.soft }}>
                    <Feather name={cat.icon as any} size={20} color={p.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <TextUI size={16} weight="bold" color={p.ink}>{cat.titleAr}</TextUI>
                    <TextUI size={13} color={p.muted} numberOfLines={1}>{at ? `توقفت عند ${toArabicNumber(at + 1)} من ${toArabicNumber(total)}` : cat.subtitleAr}</TextUI>
                  </View>
                  <TextUI size={13} color={p.muted}>{adhkarAr(total)}</TextUI>
                  <Feather name="chevron-left" size={16} color={p.muted} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
