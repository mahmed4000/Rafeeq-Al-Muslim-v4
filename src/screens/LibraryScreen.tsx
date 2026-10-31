import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { usePalette, Palette } from '../theme/palette';
import { toArabicNumber } from '../services/prayerCalculation';
import { AudioService, LessonResumeRecord } from '../services/audioService';
import { MAKKAH_MOSQUE_COURSES, PROPHET_MOSQUE_COURSES } from '../data/haramainData';
import { HADITH_40_DATA } from '../data/hadith40Data';
import { ALLAH_99_NAMES } from '../data/allahNamesData';

const HARAMAIN_COURSES: any[] = [...MAKKAH_MOSQUE_COURSES, ...PROPHET_MOSQUE_COURSES];

// Each section's tile: a small arch "window" with its own drawing, like the adhkar tab.
type TileArt = 'lessons' | 'hadith' | 'names' | 'ruqyah' | 'zakat' | 'calendar';
const ART: Record<TileArt, { sky: string; ink: string }> = {
  lessons: { sky: '#E9A873', ink: '#4A2D1D' },
  hadith: { sky: '#F4E3C5', ink: '#7A4E2F' },
  names: { sky: '#2E2A4A', ink: '#F4D9A8' },
  ruqyah: { sky: '#E3EBDD', ink: '#3F7A55' },
  zakat: { sky: '#F8EAD0', ink: '#8A5A12' },
  calendar: { sky: '#5B3E63', ink: '#F4D9A8' }
};

const TileDrawing: React.FC<{ art: TileArt }> = ({ art }) => {
  const { sky, ink } = ART[art];
  return (
    <Svg width={92} height={80} viewBox="0 0 92 84">
      <Path d="M6 84 V38 A40 38 0 0 1 86 38 V84Z" fill={sky} />
      <G fill={ink}>
        {art === 'lessons' ? (
          <>
            <Rect x={24} y={60} width={44} height={24} />
            <Path d="M30 60 Q46 40 62 60Z" />
            <Rect x={44} y={34} width={4} height={8} />
          </>
        ) : art === 'hadith' ? (
          <>
            <Rect x={28} y={50} width={17} height={30} rx={2} />
            <Rect x={47} y={50} width={17} height={30} rx={2} />
          </>
        ) : art === 'names' ? (
          <Path d="M58 48 a14 14 0 1 1 -10 -24 a11 11 0 1 0 10 24z" />
        ) : art === 'ruqyah' ? (
          <Path d="M46 38 l14 8 v14 c0 10 -14 18 -14 18 s-14 -8 -14 -18 v-14z" />
        ) : art === 'zakat' ? (
          <>
            <Circle cx={40} cy={64} r={11} />
            <Circle cx={54} cy={58} r={11} opacity={0.75} />
          </>
        ) : (
          <>
            <Rect x={28} y={46} width={36} height={32} rx={3} />
            <Rect x={36} y={40} width={4} height={10} rx={2} />
            <Rect x={52} y={40} width={4} height={10} rx={2} />
          </>
        )}
      </G>
    </Svg>
  );
};

const Tile: React.FC<{ p: Palette; art: TileArt; label: string; meta: string; onPress: () => void }> = ({ p, art, label, meta, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    accessibilityRole="button"
    accessibilityLabel={`${label}، ${meta}`}
    onPress={onPress}
    style={{ flex: 1, minWidth: 0, borderRadius: 18, paddingTop: 8, paddingBottom: 10, paddingHorizontal: 6, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, alignItems: 'center', gap: 6 }}
  >
    <TileDrawing art={art} />
    <View style={{ minHeight: 44, justifyContent: 'center' }}>
      <TextUI size={13.5} weight="bold" color={p.ink} align="center" numberOfLines={2}>{label}</TextUI>
    </View>
    <TextUI size={11.5} color={p.muted} align="center" numberOfLines={1}>{meta}</TextUI>
  </TouchableOpacity>
);

/** «المكتبة» tab: Haramain lessons first, then the reference sections as arch tiles. */
export const LibraryScreen: React.FC = () => {
  const { navigate, t, triggerHaptic } = useApp();
  const p = usePalette();
  const [listening, setListening] = useState<LessonResumeRecord | null>(null);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      AudioService.getLatestUnfinished().then((r) => { if (alive) setListening(r); });
      return () => { alive = false; };
    }, [])
  );

  const course = listening ? HARAMAIN_COURSES.find((c) => c.id === listening.courseId) : null;
  const lesson = course?.lessons?.find((l: any) => l.id === listening?.lessonId);
  const openFeatured = () => {
    triggerHaptic('light');
    if (course && lesson) navigate('haramain_lesson', { courseId: course.id, lessonId: lesson.id, autoplay: true });
    else navigate('haramain_lessons');
  };

  const tiles: { art: TileArt; label: string; meta: string; screen: string }[] = [
    { art: 'lessons', label: t('دروس الحرمين', 'Haramain lessons'), meta: t(`${toArabicNumber(HARAMAIN_COURSES.length)} مقررًا`, `${HARAMAIN_COURSES.length} courses`), screen: 'haramain_lessons' },
    { art: 'hadith', label: t('الأربعون النووية', 'An-Nawawi’s forty'), meta: t(`${toArabicNumber(HADITH_40_DATA.length)} حديثًا`, `${HADITH_40_DATA.length} hadith`), screen: 'hadith_40' },
    { art: 'names', label: t('أسماء الله الحسنى', 'Names of Allah'), meta: t(`${toArabicNumber(ALLAH_99_NAMES.length)} اسمًا`, `${ALLAH_99_NAMES.length} names`), screen: 'allah_names' },
    { art: 'ruqyah', label: t('الرقية الشرعية', 'Ruqyah'), meta: t('من القرآن والسنة', 'Quran and Sunnah'), screen: 'ruqyah' },
    { art: 'zakat', label: t('الزكاة', 'Zakat'), meta: t('المال وزكاة الفطر', 'Wealth and fitr'), screen: 'zakat_calculator' },
    { art: 'calendar', label: t('مواقيت الشهر', 'Monthly times'), meta: t('هجري وميلادي', 'Hijri and Gregorian'), screen: 'prayer_month' }
  ];
  const rows = [tiles.slice(0, 3), tiles.slice(3, 6)];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: p.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : Platform.OS === 'web' ? 24 : 20, paddingBottom: 110, gap: 14 }} showsVerticalScrollIndicator={false}>
      <TextUI font="amiri" size={30} weight="bold" color={p.primaryInk}>{t('المكتبة', 'Library')}</TextUI>

      {/* Featured: Haramain lessons (continue, or explore) */}
      <TouchableOpacity activeOpacity={0.88} accessibilityRole="button" onPress={openFeatured} style={{ borderRadius: 24, overflow: 'hidden', minHeight: 170, backgroundColor: '#5D3A22' }}>
        <Svg width="100%" height="100%" viewBox="0 0 358 170" preserveAspectRatio="xMinYMax slice" style={{ position: 'absolute', top: 0, left: 0 }}>
          <Path d="M0 0 H358 V170 H0Z" fill="#7A4E2F" />
          <Path d="M200 0 H358 V170 H160Z" fill="#A86A3E" opacity={0.55} />
          <G fill="#2D1E16" opacity={0.55}>
            <Rect x={20} y={70} width={14} height={100} />
            <Path d="M20 70 Q27 56 34 70Z" />
            <Rect x={40} y={110} width={110} height={60} />
            <Path d="M60 110 Q95 66 130 110Z" />
            <Rect x={156} y={82} width={12} height={88} />
            <Path d="M156 82 Q162 70 168 82Z" />
          </G>
          <G fill="#F2C98D" opacity={0.8}>
            <Path d="M58 128 h10 v18 h-10z M58 128 a5 5 0 0 1 10 0z" />
            <Path d="M82 128 h10 v18 h-10z M82 128 a5 5 0 0 1 10 0z" />
            <Path d="M106 128 h10 v18 h-10z M106 128 a5 5 0 0 1 10 0z" />
          </G>
        </Svg>
        <View style={{ width: '52%', alignSelf: 'flex-start', padding: 18, gap: 4, justifyContent: 'center', minHeight: 170 }}>
          <TextUI size={12.5} weight="bold" color="#F4D9A8">{t('دروس الحرمين', 'Haramain lessons')}</TextUI>
          <TextUI size={18} weight="bold" color="#FFFDF9" numberOfLines={2}>
            {course && lesson ? t(`تابع: ${lesson.titleAr}`, `Continue: ${lesson.titleAr}`) : t('كراسي العلماء في الحرمين', 'Scholars’ lessons in the Haramain')}
          </TextUI>
          <TextUI size={12.5} color="#F1DCC0" numberOfLines={1}>
            {course && lesson ? `${course.scholarAr} · ${t(`الدرس ${toArabicNumber(lesson.number)}`, `Lesson ${lesson.number}`)}` : t('المسجد الحرام والمسجد النبوي', 'Makkah and Madinah')}
          </TextUI>
          <View style={{ alignSelf: 'flex-start', marginTop: 6, minHeight: 38, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', backgroundColor: '#F4D9A8' }}>
            <TextUI size={14} weight="bold" color="#2D1E16">{course && lesson ? t('استمع', 'Listen') : t('تصفّح', 'Browse')}</TextUI>
          </View>
        </View>
      </TouchableOpacity>

      {/* Sections */}
      {rows.map((row, i) => (
        <View key={`row-${i}`} style={{ flexDirection: 'row', gap: 10 }}>
          {row.map((tile) => (
            <Tile key={tile.screen} p={p} art={tile.art} label={tile.label} meta={tile.meta} onPress={() => { triggerHaptic('light'); navigate(tile.screen); }} />
          ))}
        </View>
      ))}

      {/* Trust note */}
      <View style={{ borderRadius: 18, padding: 14, backgroundColor: p.soft, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
        <Feather name="shield" size={18} color={p.primary} style={{ marginTop: 3 }} />
        <TextUI size={13.5} color={p.ink} style={{ flex: 1, lineHeight: 23 }}>
          {t('النصوص الدينية هنا تُعرض مع مصادرها، وما لم يُوثَّق بعد نعمل على توثيقه.', 'Religious texts here are shown with their sources; we are documenting the rest.')}
        </TextUI>
      </View>
    </ScrollView>
  );
};
