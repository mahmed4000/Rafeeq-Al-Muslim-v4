import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { RUQYAH_QURAN_ITEMS, RUQYAH_SUNNAH_ITEMS, RUQYAH_ADAB_ITEMS } from '../data/ruqyahData';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';
import { usePalette } from '../theme/palette';

export const RuqyahScreen: React.FC = () => {
  const { goBack, t, triggerHaptic } = useApp();
  const [activeTab, setActiveTab] = useState<'quran' | 'sunnah' | 'adab'>('quran');
  const [counters, setCounters] = useState<Record<string, number>>({});

  const p = usePalette();

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
    <View style={{ flex: 1, backgroundColor: p.bg }}>
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
          backgroundColor: p.surface,
          borderRadius: TOKENS.radius.pill,
          padding: 4,
          borderWidth: 1,
          borderColor: p.border
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
            backgroundColor: activeTab === 'quran' ? p.primary : 'transparent'
          }}
        >
          <TextUI variant="captionBold" color={activeTab === 'quran' ? p.onPrimary : p.ink}>
            {t('📖 آيات الرقية', '📖 Ruqyah verses')}
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
            backgroundColor: activeTab === 'sunnah' ? p.primary : 'transparent'
          }}
        >
          <TextUI variant="captionBold" color={activeTab === 'sunnah' ? p.onPrimary : p.ink}>
            {t('🤲 أدعية السنة', '🤲 Sunnah supplications')}
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
            backgroundColor: activeTab === 'adab' ? p.primary : 'transparent'
          }}
        >
          <TextUI variant="captionBold" color={activeTab === 'adab' ? p.onPrimary : p.ink}>
            {t('✨ الآداب', '✨ Etiquette')}
          </TextUI>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
      >
        {items.map((item: any, index: number) => {
          const itemKey = item.id || `${activeTab}-${index}`;
          const count = counters[itemKey] || 0;
          const target = item.repeat || 1;
          const isDone = count >= target;

          return (
            <View
              key={itemKey}
              style={{
                backgroundColor: p.surface,
                borderRadius: 18,
                padding: 18,
                marginBottom: 12,
                borderWidth: 1,
                borderColor: isDone ? p.success :p.border,
                ...makeShadow('0 2px 8px rgba(0,0,0,0.02)', '#000', 0.02, 2)
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <TextUI variant="h4" color={p.primaryInk}>
                  {item.titleAr || item.title}
                </TextUI>

                {item.repeat ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleCount(itemKey, target)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      backgroundColor: isDone ? p.successBg : p.soft,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: TOKENS.radius.pill,
                      borderWidth: 1,
                      borderColor: isDone ? p.success :p.primary
                    }}
                  >
                    <TextUI variant="captionBold" color={isDone ? p.successInk :p.primaryInk}>
                      {toArabicNumber(count)} / {toArabicNumber(target)}
                    </TextUI>
                    <Feather name={isDone ? 'check' : 'rotate-cw'} size={12} color={isDone ? p.successInk :p.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TextUI
                variant={activeTab === 'quran' ? 'quranVerse' : 'body'}
                size={activeTab === 'quran' ? 17 : 14}
                color={p.ink}
                style={{ lineHeight: activeTab === 'quran' ? 30 : 22, textAlign: 'justify', marginVertical: 6 }}
              >
                {/* Quran items keep their text in `verse`, adab items in `descAr`. */}
                {item.textAr || item.text || item.verse || item.descAr}
              </TextUI>

              {item.source || item.reference ? (
                <TextUI variant="caption" color={p.muted} style={{ marginTop: 4 }}>
                  📚 {item.source || item.reference}
                </TextUI>
              ) : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};
