import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { RUQYAH_QURAN_ITEMS, RUQYAH_SUNNAH_ITEMS, RUQYAH_ADAB_ITEMS } from '../data/ruqyahData';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';

export const RuqyahScreen: React.FC = () => {
  const { goBack, theme, themeMode, t, triggerHaptic } = useApp();
  const [activeTab, setActiveTab] = useState<'quran' | 'sunnah' | 'adab'>('quran');
  const [counters, setCounters] = useState<Record<string, number>>({});

  const c = theme;

  const handleCount = (id: string, target: number) => {
    triggerHaptic('light');
    setCounters((prev) => {
      const current = prev[id] || 0;
      if (current < target) {
        const next = current + 1;
        if (next >= target) triggerHaptic('success');
        return { ...prev, [id]: next };
      }
      return prev;
    });
  };

  const items = activeTab === 'quran' ? RUQYAH_QURAN_ITEMS : activeTab === 'sunnah' ? RUQYAH_SUNNAH_ITEMS : RUQYAH_ADAB_ITEMS;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('الرقية الشرعية الشاملة', 'Authentic Islamic Ruqyah')}
        subtitle={t('من القرآن الكريم والسنة النبوية الصحيحة', 'From the Holy Quran & Sunnah')}
        onBack={goBack}
      />

      {/* Tabs (Quran / Sunnah / Etiquette) */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 18,
          marginTop: 12,
          marginBottom: 14,
          backgroundColor: c.surface,
          borderRadius: TOKENS.radius.pill,
          padding: 4,
          borderWidth: 1,
          borderColor: c.border
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('quran');
          }}
          style={{
            flex: 1,
            paddingVertical: 9,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            backgroundColor: activeTab === 'quran' ? TOKENS.colors.primary : 'transparent'
          }}
        >
          <TextUI variant="captionBold" color={activeTab === 'quran' ? '#FFFFFF' : c.textPrimary}>
            📖 آيات الرقية
          </TextUI>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('sunnah');
          }}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            backgroundColor: activeTab === 'sunnah' ? TOKENS.colors.primary : 'transparent'
          }}
        >
          <TextUI variant="captionBold" color={activeTab === 'sunnah' ? '#FFFFFF' : c.textPrimary}>
            🤲 أدعية السنة
          </TextUI>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            setActiveTab('adab');
          }}
          style={{
            flex: 1,
            paddingVertical: 8,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            backgroundColor: activeTab === 'adab' ? TOKENS.colors.primary : 'transparent'
          }}
        >
          <TextUI variant="captionBold" color={activeTab === 'adab' ? '#FFFFFF' : c.textPrimary}>
            ✨ الآداب
          </TextUI>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item: any) => {
          const count = counters[item.id] || 0;
          const target = item.repeat || 1;
          const isDone = count >= target;

          return (
            <View
              key={item.id}
              style={{
                backgroundColor: c.surface,
                borderRadius: 18,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: isDone ? '#4CAF50' : c.border,
                ...makeShadow('0 2px 8px rgba(0,0,0,0.02)', '#000', 0.02, 2)
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <TextUI variant="h4" color={TOKENS.colors.primaryDark}>
                  {item.titleAr || item.title}
                </TextUI>

                {item.repeat ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleCount(item.id, target)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: isDone ? '#E8F5E9' : (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20'),
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: TOKENS.radius.pill,
                      borderWidth: 1,
                      borderColor: isDone ? '#4CAF50' : TOKENS.colors.primary
                    }}
                  >
                    <TextUI variant="captionBold" color={isDone ? '#2E7D32' : TOKENS.colors.primaryDark}>
                      {toArabicNumber(count)} / {toArabicNumber(target)}
                    </TextUI>
                    <Feather name={isDone ? 'check' : 'rotate-cw'} size={12} color={isDone ? '#2E7D32' : TOKENS.colors.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TextUI
                variant={activeTab === 'quran' ? 'quranVerse' : 'body'}
                size={activeTab === 'quran' ? 17 : 14}
                color={c.textPrimary}
                style={{ lineHeight: activeTab === 'quran' ? 30 : 22, textAlign: 'justify', marginVertical: 6 }}
              >
                {item.textAr || item.text}
              </TextUI>

              {item.source ? (
                <TextUI variant="caption" color={c.textSecondary} style={{ marginTop: 4 }}>
                  📚 {item.source}
                </TextUI>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
