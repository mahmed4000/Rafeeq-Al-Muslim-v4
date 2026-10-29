import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { ScreenHeader } from '../ui/ScreenHeader';
import { usePalette } from '../theme/palette';
import { StorageService } from '../services/storage';
import { toArabicNumber } from '../services/prayerCalculation';

// The dhikr wording only; virtues and evidence are shown once a sourced dataset exists.
const DHIKRS = ['سُبْحَانَ اللَّهِ', 'الْحَمْدُ لِلَّهِ', 'اللَّهُ أَكْبَرُ', 'لَا إِلَٰهَ إِلَّا اللَّهُ'];
const TARGETS = [33, 99, 100, 0]; // 0 = open count
const DAILY_KEY = 'rafeeq_tasbih_daily_v1';

const todayStamp = () => new Date().toISOString().slice(0, 10);

export const TasbihScreen: React.FC = () => {
  const { goBack, triggerHaptic, t } = useApp();
  const p = usePalette();

  const [dhikrIndex, setDhikrIndex] = useState(0);
  const [target, setTarget] = useState(33);
  const [count, setCount] = useState(0);
  const [round, setRound] = useState(1);
  const [todayTotal, setTodayTotal] = useState(0);

  useEffect(() => {
    let alive = true;
    StorageService.getObject<{ date: string; total: number }>(DAILY_KEY, { date: '', total: 0 }).then((saved) => {
      if (alive && saved.date === todayStamp()) setTodayTotal(saved.total);
    });
    return () => { alive = false; };
  }, []);

  const resetCounter = () => {
    triggerHaptic('medium');
    setCount(0);
    setRound(1);
  };

  // Functional updates so rapid taps between renders are never lost.
  const press = () => {
    setTodayTotal((prev) => {
      const nextTotal = prev + 1;
      StorageService.setObject(DAILY_KEY, { date: todayStamp(), total: nextTotal });
      return nextTotal;
    });
    const completesRound = target > 0 && count + 1 >= target;
    triggerHaptic(completesRound ? 'success' : 'light');
    setCount((prev) => {
      const next = prev + 1;
      if (target > 0 && next >= target) {
        setRound((r) => r + 1);
        return 0;
      }
      return next;
    });
  };

  const progress = target > 0 ? count / target : 0;
  const beads = Array.from({ length: 11 }, (_, i) => i);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader
        title={t('السبحة', 'Tasbih')}
        onBack={goBack}
        right={<TextUI size={13} color={p.muted} style={{ paddingHorizontal: 12 }}>{t(`اليوم: ${toArabicNumber(todayTotal)}`, `Today: ${toArabicNumber(todayTotal)}`)}</TextUI>}
      />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 14, flexGrow: 1 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8, alignItems: 'center' }}>
          {DHIKRS.map((d, i) => {
            const active = i === dhikrIndex;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => { setDhikrIndex(i); setCount(0); setRound(1); }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 999, justifyContent: 'center', backgroundColor: active ? p.primary : p.soft }}
              >
                <TextUI font="amiri" size={17} weight="bold" color={active ? p.onPrimary : p.primaryInk}>{d}</TextUI>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={{ borderRadius: 20, padding: 20, alignItems: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <TextUI font="amiri" size={34} color={p.quranInk} align="center" style={{ lineHeight: 60 }}>{DHIKRS[dhikrIndex]}</TextUI>
        </View>

        <View style={{ flex: 1, minHeight: 24 }} />

        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          {beads.map((i) => {
            const size = i === 5 ? 22 : 14;
            const color = i < 5 ? p.accent : (i === 5 ? p.primary : p.track);
            return <View key={i} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
          })}
        </View>

        <Pressable
          onPress={press}
          accessibilityRole="button"
          accessibilityLabel={target > 0
            ? t(`تسبيحة، ${toArabicNumber(count)} من ${toArabicNumber(target)}`, `Count, ${toArabicNumber(count)} of ${toArabicNumber(target)}`)
            : t(`تسبيحة، العدد ${toArabicNumber(count)}`, `Count, ${toArabicNumber(count)}`)}
          style={({ pressed }) => ({
            alignSelf: 'center',
            width: 190,
            height: 190,
            borderRadius: 95,
            borderWidth: 10,
            borderColor: p.accent,
            backgroundColor: p.surface,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: pressed ? 0.97 : 1 }]
          })}
        >
          <TextUI size={56} weight="bold" color={p.ink} align="center" style={{ lineHeight: 64 }}>{toArabicNumber(count)}</TextUI>
          <TextUI size={14} color={p.muted} align="center">
            {target > 0 ? t(`من ${toArabicNumber(target)} · الدورة ${toArabicNumber(round)}`, `of ${toArabicNumber(target)} · Round ${toArabicNumber(round)}`) : t('عدّ حر', 'Free count')}
          </TextUI>
        </Pressable>

        {target > 0 ? (
          <View style={{ height: 6, borderRadius: 3, backgroundColor: p.track, overflow: 'hidden', marginHorizontal: 40 }}>
            <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: p.accent }} />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {TARGETS.map((value) => {
            const active = value === target;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => { setTarget(value); setCount(0); setRound(1); }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={value > 0 ? t(`الهدف ${value}`, `Target ${value}`) : t('عدّ حر', 'Free count')}
                style={{ minWidth: 60, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: active ? p.accent : p.border, backgroundColor: active ? p.soft : 'transparent' }}
              >
                <TextUI size={15} weight="bold" color={active ? p.primaryInk : p.muted}>{value > 0 ? toArabicNumber(value) : t('حر', 'Free')}</TextUI>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={resetCounter}
            accessibilityRole="button"
            accessibilityLabel={t('تصفير العدّاد', 'Reset counter')}
            style={{ width: 48, minHeight: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: p.border }}
          >
            <Feather name="rotate-ccw" size={18} color={p.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};
