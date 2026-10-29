import React from 'react';
import { View, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { useLessonPlayer } from '../../context/LessonPlayerContext';
import { TextUI } from '../common/TextUI';
import { makeShadow } from '../../constants/tokens';
import { toArabicNumber } from '../../services/prayerCalculation';
import { usePalette } from '../../theme/palette';

/** Floating "now playing" bar above the tab bar while a Haramain lesson is loaded (from the design). */
export const MiniLessonPlayer: React.FC = () => {
  const { navigate, triggerHaptic } = useApp();
  const player = useLessonPlayer();
  const p = usePalette();
  const track = player.track;
  if (!track) return null;

  const ratio = player.totalSecs ? Math.min(1, player.currentSecs / player.totalSecs) : 0;
  const speedLabel = `${toArabicNumber(String(player.speed).replace('.', '٫'))}×`;

  return (
    <View
      accessibilityLabel="المشغّل المصغّر"
      style={{
        marginHorizontal: 12,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 16,
        backgroundColor: p.hero,
        ...makeShadow('0 8px 24px rgba(45,30,22,0.2)', '#2D1E16', 0.2, 8)
      }}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={player.playing ? 'إيقاف مؤقت' : 'تشغيل'}
        onPress={() => { triggerHaptic('light'); player.toggle(); }}
        style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: p.accent }}
      >
        {player.loading ? (
          <ActivityIndicator size="small" color="#2D1E16" />
        ) : (
          <Feather name={player.playing ? 'pause' : 'play'} size={18} color="#2D1E16" style={{ marginLeft: player.playing ? 0 : 2 }} />
        )}
      </TouchableOpacity>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`فتح الدرس: ${track.title}، الدرس ${toArabicNumber(track.lessonNumber)}`}
        onPress={() => navigate('haramain_lesson', { courseId: track.courseId, lessonId: track.lessonId })}
        style={{ flex: 1, minHeight: 44, justifyContent: 'center', gap: 4 }}
      >
        <TextUI size={14} weight="bold" color={p.onHero} numberOfLines={1}>{`${track.title} — الدرس ${toArabicNumber(track.lessonNumber)}`}</TextUI>
        <View style={{ height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(250,241,230,0.2)' }}>
          <View style={{ height: 3, borderRadius: 2, backgroundColor: p.accent, width: `${Math.round(ratio * 100)}%` }} />
        </View>
      </TouchableOpacity>
      <TextUI size={13} weight="bold" color={p.onHeroMuted}>{speedLabel}</TextUI>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="إيقاف الدرس وإغلاق المشغّل"
        onPress={() => { triggerHaptic('light'); player.stop(); }}
        style={{ width: 36, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Feather name="x" size={18} color={p.onHeroMuted} />
      </TouchableOpacity>
    </View>
  );
};
