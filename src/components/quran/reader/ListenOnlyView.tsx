import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, BackHandler } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TextUI } from '../../common/TextUI';
import { makeShadow } from '../../../constants/tokens';
import { toArabicNumber, toArabicIndicDigits } from '../../../services/prayerCalculation';
import { useApp } from '../../../context/AppContext';
import { usePalette } from '../../../theme/palette';

const GOLD = '#C69255';
// Quran text in the reader's King Fahd Hafs font (TextUI would replace the family and size).
const QURAN_TEXT = { fontFamily: 'KFGQPC_Hafs', textAlign: 'center', writingDirection: 'rtl' } as const;

export interface ListenOnlyViewProps {
  surahName: string;
  reciterName: string;
  ayahNumber: number;
  totalAyahs: number;
  /** The ayah being recited and the one after it (Hafs-font text), when known. */
  ayahText?: string;
  nextAyah?: { number: number; text: string };
  progressRatio: number;
  progressLabel: string;
  remainingLabel: string;
  isPlaying: boolean;
  isLoading: boolean;
  speed: number;
  ayahRepeats: number;
  /** Minutes until the recitation pauses by itself; 0 when off. */
  sleepMinutes: number;
  onTogglePlay: () => void;
  onSkip: (direction: 1 | -1) => void;
  onCycleSpeed: () => void;
  onOpenRepeat: () => void;
  onCycleSleep: () => void;
  onOpenReciter: () => void;
  /** Back to the mushaf; the recitation goes on. */
  onClose: () => void;
}

/** "Listen only": the current ayah large on a calm screen, with big controls. Audio is not interrupted. */
export const ListenOnlyView: React.FC<ListenOnlyViewProps> = ({
  surahName, reciterName, ayahNumber, totalAyahs, ayahText, nextAyah, progressRatio, progressLabel, remainingLabel,
  isPlaying, isLoading, speed, ayahRepeats, sleepMinutes,
  onTogglePlay, onSkip, onCycleSpeed, onOpenRepeat, onCycleSleep, onOpenReciter, onClose
}) => {
  const p = usePalette();
  const { t, isRTL, triggerHaptic } = useApp();
  const insets = useSafeAreaInsets();

  // Android back returns to the mushaf instead of leaving the reader.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [onClose]);

  const speedLabel = `${toArabicNumber(String(speed || 1).replace('.', isRTL ? '٫' : '.'))}×`;
  const progressPercent = `${Math.min(100, Math.max(0, progressRatio * 100))}%` as const;

  const pill = (icon: React.ComponentProps<typeof Feather>['name'] | null, label: string, a11y: string) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => { triggerHaptic('light'); onClose(); }}
      style={{ height: 40, minWidth: 40, paddingHorizontal: label ? 14 : 0, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,253,249,0.14)' }}
    >
      {icon ? <Feather name={icon} size={20} color={p.onHero} /> : <TextUI size={13.5} weight="bold" color={p.onHero}>{label}</TextUI>}
    </TouchableOpacity>
  );

  const roundButton = (icon: React.ComponentProps<typeof Feather>['name'], label: string, onPress: () => void) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => { triggerHaptic('light'); onPress(); }}
      style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
    >
      <Feather name={icon} size={22} color={p.primary} />
    </TouchableOpacity>
  );

  const tile = (value: string, label: string, a11y: string, onPress: () => void) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={() => { triggerHaptic('light'); onPress(); }}
      style={{ flex: 1, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
    >
      <TextUI size={14} weight="bold" color={p.ink} numberOfLines={1}>{value}</TextUI>
      <TextUI size={11.5} color={p.muted} numberOfLines={1}>{label}</TextUI>
    </TouchableOpacity>
  );

  return (
    <View accessibilityViewIsModal style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 40, elevation: 12, backgroundColor: p.bg }}>
      {/* Dusk panel behind the header, the surah and the top of the ayah card */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top + 250, backgroundColor: p.hero }} />

      <View style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: insets.bottom + 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {pill('chevron-down', '', t('تصغير والعودة إلى المصحف', 'Minimise and return to the mushaf'))}
          <TextUI size={13} color={p.onHeroMuted}>{t('استماع فقط', 'Listen only')}</TextUI>
          {pill(null, t('المصحف', 'Mushaf'), t('فتح المصحف على الآية', 'Open the mushaf at the ayah'))}
        </View>

        {/* Surah, in the banner's double frame, and reciter */}
        <View style={{ marginTop: 18, alignItems: 'center', gap: 10 }}>
          <View style={{ alignSelf: 'stretch', borderWidth: 1.5, borderColor: 'rgba(244,217,168,0.7)', borderRadius: 14, padding: 4 }}>
            <View style={{ borderWidth: 1, borderColor: 'rgba(244,217,168,0.5)', borderRadius: 10, paddingVertical: 6, alignItems: 'center' }}>
              <Text style={[QURAN_TEXT, { fontSize: 24, lineHeight: 42, color: p.onHero }]}>{`سُورَةُ ${surahName}`}</Text>
            </View>
          </View>
          <TextUI size={14} color={p.onHeroMuted} numberOfLines={1}>
            {t(`${reciterName} · الآية ${toArabicNumber(ayahNumber)} من ${toArabicNumber(totalAyahs)}`, `${reciterName} · Verse ${ayahNumber} of ${totalAyahs}`)}
          </TextUI>
        </View>

        {/* The ayah being recited, large, then the next one faded */}
        <View
          accessibilityLabel={t('الآية الحالية', 'Current verse')}
          style={{ flex: 1, marginTop: 18, borderRadius: 24, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, ...makeShadow('0 14px 30px rgba(45,30,22,0.18)', '#2D1E16', 0.18, 8) }}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 22, paddingHorizontal: 18, gap: 12 }}>
            {ayahText ? (
              <Text style={[QURAN_TEXT, { fontSize: 27, lineHeight: 56, color: p.ink }]}>
                {ayahText}<Text style={{ color: GOLD }}>{` ﴿${toArabicIndicDigits(ayahNumber)}﴾`}</Text>
              </Text>
            ) : (
              <ActivityIndicator color={p.primary} />
            )}
            {nextAyah ? (
              <Text numberOfLines={3} style={[QURAN_TEXT, { fontSize: 18, lineHeight: 36, color: p.muted, opacity: 0.7 }]}>
                {nextAyah.text}<Text style={{ color: GOLD }}>{` ﴿${toArabicIndicDigits(nextAyah.number)}﴾`}</Text>
              </Text>
            ) : null}
          </ScrollView>
        </View>

        {/* Progress through the portion or the surah */}
        <View style={{ marginTop: 18, paddingHorizontal: 6, gap: 8 }}>
          <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: p.border }}>
            <View style={{ height: 6, backgroundColor: GOLD, width: progressPercent }} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TextUI size={12.5} color={p.muted} numberOfLines={1} style={{ flexShrink: 1 }}>{progressLabel}</TextUI>
            <TextUI size={12.5} color={p.muted}>{t(`بقي ${remainingLabel}`, `${remainingLabel} left`)}</TextUI>
          </View>
        </View>

        {/* Big controls; "previous" sits at the start edge, as in the mushaf player */}
        <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
          {roundButton(isRTL ? 'skip-forward' : 'skip-back', t('الآية السابقة', 'Previous verse'), () => onSkip(-1))}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? t('إيقاف مؤقت', 'Pause') : t('تشغيل', 'Play')}
            onPress={onTogglePlay}
            style={{ width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primary, ...makeShadow('0 10px 24px rgba(93,58,34,0.35)', '#5D3A22', 0.35, 10) }}
          >
            {isLoading ? <ActivityIndicator color={p.onPrimary} /> : <Feather name={isPlaying ? 'pause' : 'play'} size={32} color={p.onPrimary} style={{ marginLeft: isPlaying ? 0 : 3 }} />}
          </TouchableOpacity>
          {roundButton(isRTL ? 'skip-back' : 'skip-forward', t('الآية التالية', 'Next verse'), () => onSkip(1))}
        </View>

        <View style={{ marginTop: 18, flexDirection: 'row', gap: 8 }}>
          {tile(speedLabel, t('السرعة', 'Speed'), t(`سرعة التلاوة ${speedLabel}`, `Recitation speed ${speedLabel}`), onCycleSpeed)}
          {tile(
            ayahRepeats > 1 ? t(`${toArabicNumber(ayahRepeats)} مرات`, `${ayahRepeats}×`) : t('مرة', 'Once'),
            t('التكرار', 'Repeat'),
            t('إعدادات التكرار', 'Repeat settings'),
            onOpenRepeat
          )}
          {tile(
            sleepMinutes ? t(`${toArabicNumber(sleepMinutes)} د`, `${sleepMinutes} min`) : t('إيقاف', 'Off'),
            t('مؤقّت النوم', 'Sleep timer'),
            sleepMinutes ? t(`مؤقّت النوم ${toArabicNumber(sleepMinutes)} دقيقة. اضغط للتغيير`, `Sleep timer ${sleepMinutes} minutes. Tap to change`) : t('مؤقّت النوم متوقف. اضغط للتشغيل', 'Sleep timer off. Tap to set'),
            onCycleSleep
          )}
          {tile(t('القارئ', 'Reciter'), t('تغيير', 'Change'), t(`القارئ: ${reciterName}. اضغط للتغيير`, `Reciter: ${reciterName}. Tap to change`), onOpenReciter)}
        </View>
      </View>
    </View>
  );
};
