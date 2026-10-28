import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { HADITH_40_DATA } from '../data/hadith40Data';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';

export const Hadith40Screen: React.FC = () => {
  const { goBack, theme, themeMode, t, triggerHaptic } = useApp();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<number | null>(1);

  const c = theme;

  const filtered = HADITH_40_DATA.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase().trim();
    return (
      item.titleAr.includes(q) ||
      item.titleEn.toLowerCase().includes(q) ||
      item.textAr.includes(q) ||
      item.id.toString() === q ||
      toArabicNumber(item.id) === q
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('الأربعون النووية', 'The 40 Hadith of An-Nawawi')}
        subtitle={t('جوامع الكلم من الأحاديث الصحيحة النبوية', 'Prophetic Wisdoms with Explanations')}
        onBack={goBack}
      />

      {/* Search Input */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: c.surface,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: c.border,
            gap: 8,
            marginBottom: 10
          }}
        >
          <Feather name="search" size={18} color={c.textSecondary} />
          <TextInput
            placeholder={t('ابحث في متن الحديث أو رقمه...', 'Search hadith text or number...')}
            placeholderTextColor={c.textSecondary}
            value={search}
            onChangeText={setSearch}
            style={{
              flex: 1,
              color: c.textPrimary,
              textAlign: 'right',
              fontSize: 14
            }}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Feather name="x" size={16} color={c.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => `hadith-${item.id}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isExpanded = expandedId === item.id;
          return (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => {
                triggerHaptic('light');
                setExpandedId(isExpanded ? null : item.id);
              }}
              style={{
                backgroundColor: c.surface,
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: isExpanded ? TOKENS.colors.primary : c.border,
                ...makeShadow('0 2px 8px rgba(0,0,0,0.02)', '#000', 0.02, 2)
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                  <View
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: TOKENS.colors.primary
                    }}
                  >
                    <TextUI variant="captionBold" color={TOKENS.colors.primaryDark}>
                      {toArabicNumber(item.id)}
                    </TextUI>
                  </View>

                  <View style={{ flex: 1 }}>
                    <TextUI variant="h4" color={c.textPrimary}>
                      {item.titleAr}
                    </TextUI>
                    <TextUI variant="caption" color={c.textSecondary} style={{ marginTop: 2 }}>
                      {item.titleEn}
                    </TextUI>
                  </View>
                </View>

                <Feather name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} color={c.textSecondary} />
              </View>

              {isExpanded && (
                <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderColor: c.border }}>
                  <TextUI variant="quranVerse" size={16} color={c.textPrimary} style={{ lineHeight: 28, textAlign: 'justify', marginBottom: 12 }}>
                    {item.textAr}
                  </TextUI>

                  {item.lessons?.length ? (
                    <View
                      style={{
                        backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: TOKENS.colors.secondary
                      }}
                    >
                      <TextUI variant="captionBold" color={TOKENS.colors.primaryDark} style={{ marginBottom: 4 }}>
                        💡 الفوائد والدروس المستفادة:
                      </TextUI>
                      <View style={{ gap: 5 }}>
                        {item.lessons.map((lesson: string, index: number) => (
                          <TextUI key={`${item.id}-lesson-${index}`} variant="caption" color={TOKENS.colors.primaryDark} style={{ lineHeight: 18 }}>
                            • {lesson}
                          </TextUI>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};
