import React, { useRef, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextUI } from '../../common/TextUI';
import { makeShadow } from '../../../constants/tokens';
import { toArabicNumber } from '../../../services/prayerCalculation';
import { useApp } from '../../../context/AppContext';
import { usePalette } from '../../../theme/palette';
import { SCROLL_SPEED_OPTIONS } from './readerShared';

export interface ReaderPlayerProps {
  reciterName: string;
  ayahNumber: number;
  totalAyahs: number;
  ayahRepeats: number;
  speed: number;
  isPlaying: boolean;
  isLoading: boolean;
  progressRatio: number;
  elapsedLabel: string;
  remainingLabel: string;
  autoScroll: boolean;
  scrollSpeedIndex: number;
  onScrollSpeed: (index: number) => void;
  onStopAutoScroll: () => void;
  onSeek: (locationX: number, width: number) => void;
  onTogglePlay: () => void;
  onSkip: (direction: 1 | -1) => void;
  onCycleSpeed: () => void;
  onOpenRepeat: () => void;
  onOpenTafsir: () => void;
  onOpenReciter: () => void;
  onStop: () => void;
}

/** Floating "Listen" button shown in the reader while nothing is playing. */
export const ListenButton: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const p = usePalette();
  const { triggerHaptic, t } = useApp();
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={t('استمع إلى التلاوة', 'Listen to the recitation')}
      onPress={() => { triggerHaptic('light'); onPress(); }}
      style={{
        position: 'absolute', end: 16, bottom: Platform.OS === 'ios' ? 30 : 16,
        minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, borderRadius: 25,
        backgroundColor: p.primary, ...makeShadow('0 6px 18px rgba(45,30,22,0.25)', '#2D1E16', 0.25, 8)
      }}
    >
      <Feather name="play" size={18} color={p.onPrimary} />
      <TextUI size={15} weight="bold" color={p.onPrimary}>{t('استمع', 'Listen')}</TextUI>
    </TouchableOpacity>
  );
};

/**
 * Floating recitation player. Compact by default (play/pause, reciter and ayah, close); the
 * chevron opens the full controls: seek, previous/next ayah, speed, repeat and tafsir.
 */
export const ReaderPlayer: React.FC<ReaderPlayerProps> = ({
  reciterName, ayahNumber, totalAyahs, ayahRepeats, speed, isPlaying, isLoading, progressRatio,
  elapsedLabel, remainingLabel, autoScroll, scrollSpeedIndex, onScrollSpeed, onStopAutoScroll,
  onSeek, onTogglePlay, onSkip, onCycleSpeed, onOpenRepeat, onOpenTafsir, onOpenReciter, onStop
}) => {
  const p = usePalette();
  const { triggerHaptic, t, isRTL } = useApp();
  const progressWidth = useRef(0);
  const [expanded, setExpanded] = useState(false);
  const speedLabel = `${toArabicNumber(String(speed || 1).replace('.', isRTL ? '٫' : '.'))}×`;
  const progressPercent = `${Math.min(100, Math.max(0, progressRatio * 100))}%` as const;
  const ayahLine = t(`الآية ${toArabicNumber(ayahNumber)} من ${toArabicNumber(totalAyahs)}`, `Verse ${toArabicNumber(ayahNumber)} of ${toArabicNumber(totalAyahs)}`);
  const toggleExpanded = () => { triggerHaptic('light'); setExpanded((v) => !v); };
  const playButton = (size: number) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? t('إيقاف مؤقت', 'Pause') : t('تشغيل', 'Play')}
      onPress={onTogglePlay}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primary }}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={p.onPrimary} />
      ) : (
        <Feather name={isPlaying ? 'pause' : 'play'} size={size * 0.43} color={p.onPrimary} style={{ marginLeft: isPlaying ? 0 : 2 }} />
      )}
    </TouchableOpacity>
  );

  const iconButton = (icon: React.ComponentProps<typeof Feather>['name'], label: string, onPress: () => void, color = p.ink) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={icon} size={20} color={color} />
    </TouchableOpacity>
  );

  return (
    <View style={{ position: 'absolute', left: 12, right: 12, bottom: Platform.OS === 'ios' ? 28 : 12, gap: 8 }}>
      {/* Auto-scroll speed (only while auto-scroll is on) */}
      {autoScroll && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6, borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <Feather name="chevrons-down" size={16} color={p.primary} style={{ marginStart: 4 }} />
          <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            {SCROLL_SPEED_OPTIONS.map((opt, idx) => {
              const selected = scrollSpeedIndex === idx;
              return (
                <TouchableOpacity
                  key={`scroll-spd-${idx}`}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => { triggerHaptic('light'); onScrollSpeed(idx); }}
                  style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 8, borderRadius: 10, backgroundColor: selected ? p.primary : 'transparent' }}
                >
                  <TextUI size={12.5} weight={selected ? 'bold' : 'medium'} color={selected ? p.onPrimary : p.muted}>{t(opt.label, opt.labelEn)}</TextUI>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t('إيقاف التمرير التلقائي', 'Stop auto-scroll')}
            onPress={() => { triggerHaptic('light'); onStopAutoScroll(); }}
            style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 10, borderRadius: 10, backgroundColor: p.dangerBg }}
          >
            <TextUI size={12.5} weight="bold" color={p.danger}>{t('إيقاف', 'Stop')}</TextUI>
          </TouchableOpacity>
        </View>
      )}

      <View
        accessibilityLabel={t('مشغّل التلاوة', 'Recitation player')}
        style={{
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 6,
          gap: 6,
          backgroundColor: p.surface,
          borderWidth: 1,
          borderColor: p.border,
          ...makeShadow('0 8px 24px rgba(45,30,22,0.18)', '#2D1E16', 0.18, 8)
        }}
      >
        {!expanded ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {playButton(44)}
              <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('عرض كل أدوات التلاوة', 'Show all recitation controls')} onPress={toggleExpanded} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
                <TextUI size={14} weight="bold" color={p.ink} numberOfLines={1}>{reciterName}</TextUI>
                <TextUI size={12.5} color={p.muted} numberOfLines={1}>{ayahLine}</TextUI>
              </TouchableOpacity>
              {iconButton('chevron-up', t('عرض كل أدوات التلاوة', 'Show all recitation controls'), toggleExpanded, p.muted)}
              {iconButton('x', t('إيقاف التلاوة وإخفاء المشغّل', 'Stop recitation and hide player'), onStop, p.muted)}
            </View>
            <View style={{ height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: p.border, marginBottom: 2 }}>
              <View style={{ height: 3, backgroundColor: p.accent, width: progressPercent }} />
            </View>
          </>
        ) : (
        <>
        {/* Reciter, ayah and speed */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={t(`القارئ: ${reciterName}`, `Reciter: ${reciterName}`)} onPress={onOpenReciter} style={{ flex: 1, minHeight: 44, justifyContent: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TextUI size={14} weight="bold" color={p.ink} numberOfLines={1}>{reciterName}</TextUI>
              <Feather name="chevron-down" size={14} color={p.muted} />
            </View>
            <TextUI size={12.5} color={p.muted} numberOfLines={1}>
              {t(`${ayahLine} · تكرار الآية ×${toArabicNumber(ayahRepeats || 1)}`, `${ayahLine} · Verse repeat ×${toArabicNumber(ayahRepeats || 1)}`)}
            </TextUI>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={t(`سرعة التلاوة ${speedLabel}`, `Recitation speed ${speedLabel}`)}
            onPress={onCycleSpeed}
            style={{ minHeight: 36, minWidth: 52, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: speed > 1 ? p.primary : p.border, backgroundColor: speed > 1 ? p.soft : 'transparent' }}
          >
            <TextUI size={13} weight="bold" color={speed > 1 ? p.primaryInk : p.ink}>{speedLabel}</TextUI>
          </TouchableOpacity>
          {iconButton('chevron-down', t('تصغير المشغّل', 'Collapse the player'), toggleExpanded, p.muted)}
        </View>

        {/* Surah progress (tap to seek) with elapsed and remaining time */}
        <TouchableOpacity
          activeOpacity={0.9}
          accessibilityRole="adjustable"
          accessibilityLabel={t(`تقدّم السورة، مضى ${elapsedLabel}، بقي ${remainingLabel}`, `Surah progress, ${elapsedLabel} elapsed, ${remainingLabel} remaining`)}
          onLayout={(event) => { progressWidth.current = event.nativeEvent.layout.width; }}
          onPress={(event) => onSeek(event.nativeEvent.locationX, progressWidth.current)}
          style={{ height: 16, justifyContent: 'center' }}
        >
          <View style={{ height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: p.border }}>
            <View style={{ height: 4, borderRadius: 2, backgroundColor: p.accent, width: progressPercent }} />
          </View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 }}>
          <TextUI size={12} color={p.muted}>{elapsedLabel}</TextUI>
          <TextUI size={12} color={p.muted}>{`-${remainingLabel}`}</TextUI>
        </View>

        {/* Controls */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {iconButton('repeat', t('إعدادات التكرار والتلاوة', 'Repeat and recitation settings'), onOpenRepeat, p.muted)}
          {/* "Previous" sits at the start edge and points toward it (right in RTL, left in LTR), as in the design. */}
          {iconButton(isRTL ? 'skip-forward' : 'skip-back', t('الآية السابقة', 'Previous verse'), () => onSkip(-1))}
          {playButton(56)}
          {iconButton(isRTL ? 'skip-back' : 'skip-forward', t('الآية التالية', 'Next verse'), () => onSkip(1))}
          {iconButton('book-open', t('تفسير الآية الحالية', 'Tafsir of the current verse'), onOpenTafsir, p.muted)}
        </View>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إيقاف التلاوة وإخفاء المشغّل', 'Stop recitation and hide player')} onPress={onStop} style={{ alignSelf: 'center', minHeight: 36, justifyContent: 'center', paddingHorizontal: 12 }}>
          <TextUI size={13} weight="medium" color={p.muted}>{t('إيقاف التلاوة', 'Stop recitation')}</TextUI>
        </TouchableOpacity>
        </>
        )}
      </View>
    </View>
  );
};
