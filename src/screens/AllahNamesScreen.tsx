import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { ALLAH_99_NAMES } from '../data/allahNamesData';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';

export const AllahNamesScreen: React.FC = () => {
  const { goBack, theme, themeMode, t, triggerHaptic } = useApp();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const c = theme;

  const filtered = ALLAH_99_NAMES.filter((item) => {
    if (!search) return true;
    const q = search.toLowerCase().trim();
    return (
      item.nameAr.includes(q) ||
      item.nameEn.toLowerCase().includes(q) ||
      item.meaningAr.includes(q) ||
      item.id.toString() === q ||
      toArabicNumber(item.id) === q
    );
  });

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('أسماء الله الحسنى', '99 Beautiful Names of Allah')}
        subtitle={t('٩٩ اسماً • من أحصاها دخل الجنة', 'Divine Attributes and Meanings')}
        onBack={goBack}
      />

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
            placeholder={t('ابحث عن اسم أو معناه...', 'Search name or meaning...')}
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
        keyExtractor={(item) => `name-${item.id}`}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        renderItem={({ item }) => {
          const isSelected = selectedId === item.id;
          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                triggerHaptic('light');
                setSelectedId(isSelected ? null : item.id);
              }}
              style={{
                flex: 1,
                backgroundColor: c.surface,
                borderRadius: 16,
                padding: 14,
                marginBottom: 10,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: isSelected ? TOKENS.colors.primary : c.border,
                ...makeShadow('0 2px 8px rgba(0,0,0,0.02)', '#000', 0.02, 2)
              }}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 6
                }}
              >
                <TextUI variant="badge" color={TOKENS.colors.primaryDark}>
                  {toArabicNumber(item.id)}
                </TextUI>
              </View>

              <TextUI variant="quranHeader" size={18} color={TOKENS.colors.primaryDark}>
                {item.nameAr}
              </TextUI>
              <TextUI variant="caption" color={TOKENS.colors.secondary} style={{ marginTop: 2 }}>
                {item.nameEn}
              </TextUI>

              {isSelected && (
                <View
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTopWidth: 1,
                    borderColor: c.border,
                    width: '100%'
                  }}
                >
                  <TextUI variant="caption" color={c.textSecondary} style={{ textAlign: 'center', lineHeight: 16 }}>
                    {item.meaningAr}
                  </TextUI>
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
};
