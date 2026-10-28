import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { AZKAR_CATEGORIES, AZKAR_DATABASE, AzkarCategory } from '../data/azkarData';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';

type FilterGroup = 'all' | 'daily' | 'prayer' | 'occasions';

export const AzkarCategoriesScreen: React.FC = () => {
  const { goBack, navigate, theme, themeMode, t, triggerHaptic, isRTL } = useApp();
  const c = theme;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<FilterGroup>('all');

  // Calculate total azkar count across all categories
  const totalAzkarCount = useMemo(() => {
    return Object.values(AZKAR_DATABASE).reduce((acc, list) => acc + list.length, 0);
  }, []);

  // Determine current recommended category based on hour of day
  const recommendedCategory = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 12) {
      return AZKAR_CATEGORIES.find((c) => c.id === 'morning') || AZKAR_CATEGORIES[0];
    } else if (hour >= 15 && hour < 20) {
      return AZKAR_CATEGORIES.find((c) => c.id === 'evening') || AZKAR_CATEGORIES[1];
    } else if (hour >= 20 || hour < 4) {
      return AZKAR_CATEGORIES.find((c) => c.id === 'sleep') || AZKAR_CATEGORIES[5];
    }
    return AZKAR_CATEGORIES.find((c) => c.id === 'prayer_azkar') || AZKAR_CATEGORIES[2];
  }, []);

  // Filter categories by search and group
  const filteredCategories = useMemo(() => {
    return AZKAR_CATEGORIES.filter((cat) => {
      // Group filter
      if (selectedGroup !== 'all' && cat.group !== selectedGroup) {
        return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;

      const q = searchQuery.trim().toLowerCase();
      const titleMatch = cat.titleAr.toLowerCase().includes(q) || cat.titleEn.toLowerCase().includes(q);
      const subtitleMatch = cat.subtitleAr.toLowerCase().includes(q);

      // Search inside category azkar texts
      const items = AZKAR_DATABASE[cat.id] || [];
      const contentMatch = items.some(
        (item) => item.ar.includes(q) || item.virtue.includes(q) || item.en.toLowerCase().includes(q)
      );

      return titleMatch || subtitleMatch || contentMatch;
    });
  }, [searchQuery, selectedGroup]);

  const GROUPS: Array<{ id: FilterGroup; labelAr: string; icon: string }> = [
    { id: 'all', labelAr: 'الكل', icon: 'grid' },
    { id: 'daily', labelAr: 'اليومية', icon: 'sun' },
    { id: 'prayer', labelAr: 'الصلاة', icon: 'heart' },
    { id: 'occasions', labelAr: 'أحوال ومناسبات', icon: 'compass' }
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('حصن المسلم والأذكار', 'Azkar & Supplications')}
        subtitle={t(`${toArabicNumber(totalAzkarCount)} ذكراً مأثوراً في ${toArabicNumber(AZKAR_CATEGORIES.length)} أبواب مباركة`, `${totalAzkarCount} Azkar across ${AZKAR_CATEGORIES.length} Categories`)}
        onBack={goBack}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Featured Section: Morning & Evening Azkar (الورد اليومي) */}
        <View style={{ marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="sun" size={16} color={TOKENS.colors.primary} />
              <TextUI variant="h4" color={c.textPrimary}>
                {t('الورد اليومي (الصباح والمساء)', 'Daily Azkar: Morning & Evening')}
              </TextUI>
            </View>
            <TextUI variant="caption" color={c.textSecondary}>
              {t('حصن المسلم اليومي', 'Daily Fortress')}
            </TextUI>
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            {/* Morning Azkar Card */}
            {(() => {
              const morningCat = AZKAR_CATEGORIES.find((cat) => cat.id === 'morning') || AZKAR_CATEGORIES[0];
              const isMorningActive = recommendedCategory.id === 'morning';
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    triggerHaptic('medium');
                    navigate('azkar_session', { category: morningCat });
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: themeMode === 'light' ? '#FFF9F0' : '#2D2319',
                    borderRadius: 18,
                    padding: 14,
                    borderWidth: isMorningActive ? 1.5 : 1,
                    borderColor: isMorningActive ? TOKENS.colors.primary : c.border,
                    ...makeShadow('0 3px 10px rgba(0,0,0,0.03)', '#000', 0.03, 3)
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: themeMode === 'light' ? '#FEEFD8' : '#3E3020',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Feather name="sun" size={18} color="#D97706" />
                    </View>
                    {isMorningActive && (
                      <View
                        style={{
                          backgroundColor: '#D97706',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 8
                        }}
                      >
                        <TextUI size={10} weight="bold" color="#FFFFFF">
                          {t('الآن', 'Now')}
                        </TextUI>
                      </View>
                    )}
                  </View>

                  <TextUI size={15} weight="bold" color={c.textPrimary} style={{ marginBottom: 2 }}>
                    {morningCat.titleAr}
                  </TextUI>
                  <TextUI size={11} color={c.textSecondary} style={{ marginBottom: 10 }} numberOfLines={1}>
                    {t('بعد الفجر حتى الشروق', 'Post-Fajr till Sunrise')}
                  </TextUI>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: themeMode === 'light' ? '#F5E9D8' : '#3D2F22',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 10
                    }}
                  >
                    <TextUI size={11} weight="bold" color={TOKENS.colors.primaryDark}>
                      {toArabicNumber(morningCat.count)} ذكر
                    </TextUI>
                    <Feather name={isRTL ? 'arrow-left' : 'arrow-right'} size={12} color={TOKENS.colors.primaryDark} />
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* Evening Azkar Card */}
            {(() => {
              const eveningCat = AZKAR_CATEGORIES.find((cat) => cat.id === 'evening') || AZKAR_CATEGORIES[1];
              const isEveningActive = recommendedCategory.id === 'evening';
              return (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    triggerHaptic('medium');
                    navigate('azkar_session', { category: eveningCat });
                  }}
                  style={{
                    flex: 1,
                    backgroundColor: themeMode === 'light' ? '#F4F7FC' : '#1F2733',
                    borderRadius: 18,
                    padding: 14,
                    borderWidth: isEveningActive ? 1.5 : 1,
                    borderColor: isEveningActive ? '#3B82F6' : c.border,
                    ...makeShadow('0 3px 10px rgba(0,0,0,0.03)', '#000', 0.03, 3)
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 19,
                        backgroundColor: themeMode === 'light' ? '#E0EDFE' : '#28364A',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Feather name="moon" size={18} color="#3B82F6" />
                    </View>
                    {isEveningActive && (
                      <View
                        style={{
                          backgroundColor: '#3B82F6',
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                          borderRadius: 8
                        }}
                      >
                        <TextUI size={10} weight="bold" color="#FFFFFF">
                          {t('الآن', 'Now')}
                        </TextUI>
                      </View>
                    )}
                  </View>

                  <TextUI size={15} weight="bold" color={c.textPrimary} style={{ marginBottom: 2 }}>
                    {eveningCat.titleAr}
                  </TextUI>
                  <TextUI size={11} color={c.textSecondary} style={{ marginBottom: 10 }} numberOfLines={1}>
                    {t('بعد العصر حتى الغروب', 'Post-Asr till Sunset')}
                  </TextUI>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: themeMode === 'light' ? '#E2EDFA' : '#2A3A52',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 10
                    }}
                  >
                    <TextUI size={11} weight="bold" color={themeMode === 'light' ? '#1D4ED8' : '#93C5FD'}>
                      {toArabicNumber(eveningCat.count)} ذكر
                    </TextUI>
                    <Feather name={isRTL ? 'arrow-left' : 'arrow-right'} size={12} color={themeMode === 'light' ? '#1D4ED8' : '#93C5FD'} />
                  </View>
                </TouchableOpacity>
              );
            })()}
          </View>
        </View>

        {/* Search Bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surface,
            borderRadius: 16,
            paddingHorizontal: 14,
            paddingVertical: Platform.OS === 'ios' ? 12 : 8,
            borderWidth: 1,
            borderColor: c.border,
            marginBottom: 14,
            ...makeShadow('0 2px 8px rgba(0,0,0,0.02)', '#000', 0.02, 2)
          }}
        >
          <Feather name="search" size={18} color={c.textSecondary} style={{ marginRight: isRTL ? 0 : 10, marginLeft: isRTL ? 10 : 0 }} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('ابحث في الأذكار، الأدعية، أو الفضائل...', 'Search azkar, duas, or virtues...')}
            placeholderTextColor={c.textSecondary}
            style={{
              flex: 1,
              fontFamily: 'Cairo-Regular',
              fontSize: 13,
              color: c.textPrimary,
              textAlign: isRTL ? 'right' : 'left'
            }}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x-circle" size={16} color={c.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Group Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, marginBottom: 16 }}
        >
          {GROUPS.map((grp) => {
            const isSelected = selectedGroup === grp.id;
            return (
              <TouchableOpacity
                key={grp.id}
                activeOpacity={0.8}
                onPress={() => {
                  triggerHaptic('light');
                  setSelectedGroup(grp.id);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: isSelected ? TOKENS.colors.primary : c.surface,
                  borderWidth: 1,
                  borderColor: isSelected ? TOKENS.colors.primary : c.border
                }}
              >
                <Feather
                  name={grp.icon as any}
                  size={14}
                  color={isSelected ? '#FFFFFF' : c.textSecondary}
                />
                <TextUI
                  size={12}
                  weight={isSelected ? 'bold' : 'regular'}
                  color={isSelected ? '#FFFFFF' : c.textPrimary}
                >
                  {grp.labelAr}
                </TextUI>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Categories List */}
        {filteredCategories.length === 0 ? (
          <View
            style={{
              padding: 32,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: c.surface,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: c.border,
              marginTop: 10
            }}
          >
            <Feather name="search" size={36} color={c.textSecondary} style={{ marginBottom: 12, opacity: 0.6 }} />
            <TextUI variant="h4" color={c.textPrimary} style={{ marginBottom: 4 }}>
              {t('لا توجد نتائج مطابقة', 'No matching results')}
            </TextUI>
            <TextUI variant="caption" color={c.textSecondary} style={{ textAlign: 'center', marginBottom: 16 }}>
              {t('لم نجد أذكاراً تطابق عبارة البحث الحالية', 'No azkar found matching your search')}
            </TextUI>
            <TouchableOpacity
              onPress={() => {
                setSearchQuery('');
                setSelectedGroup('all');
              }}
              style={{
                backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12
              }}
            >
              <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
                {t('إعادة تعيين البحث', 'Reset Search')}
              </TextUI>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {filteredCategories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                activeOpacity={0.82}
                onPress={() => {
                  triggerHaptic('light');
                  navigate('azkar_session', { category: cat });
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: c.surface,
                  borderRadius: 18,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: c.border,
                  ...makeShadow('0 2px 8px rgba(0,0,0,0.03)', '#000', 0.03, 3)
                }}
              >
                {/* Category Icon */}
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 24,
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: isRTL ? 0 : 14,
                    marginLeft: isRTL ? 14 : 0
                  }}
                >
                  <Feather name={cat.icon as any} size={22} color={TOKENS.colors.primary} />
                </View>

                {/* Title & Subtitle */}
                <View style={{ flex: 1 }}>
                  <TextUI variant="h4" color={c.textPrimary}>
                    {cat.titleAr}
                  </TextUI>
                  <TextUI variant="caption" color={c.textSecondary} style={{ marginTop: 2 }}>
                    {cat.subtitleAr}
                  </TextUI>
                </View>

                {/* Count Badge & Chevron */}
                <View style={{ alignItems: 'flex-end', gap: 6 }}>
                  <View
                    style={{
                      backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20',
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      borderRadius: TOKENS.radius.pill
                    }}
                  >
                    <TextUI variant="captionBold" color={TOKENS.colors.primaryDark}>
                      {toArabicNumber(cat.count)} ذكر
                    </TextUI>
                  </View>
                  <Feather name={isRTL ? "chevron-left" : "chevron-right"} size={16} color={c.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
