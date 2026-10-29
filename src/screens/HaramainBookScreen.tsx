import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { MAKKAH_MOSQUE_COURSES, PROPHET_MOSQUE_COURSES } from '../data/haramainData';
import { toArabicNumber } from '../services/prayerCalculation';
import { AudioService, DownloadedLessonRecord } from '../services/audioService';
import { usePalette } from '../theme/palette';
import { useScreenParams } from '../navigation/routes';
import { localizeDuration } from '../i18n/language';

export const HaramainBookScreen: React.FC = () => {
  const { goBack, navigate, triggerHaptic, t, isRTL, lang } = useApp();
  const screenParams = useScreenParams();
  const p = usePalette();
  const course: any = useMemo(() => [...PROPHET_MOSQUE_COURSES, ...MAKKAH_MOSQUE_COURSES]
    .find((item: any) => item.id === screenParams?.courseId), [screenParams?.courseId]);
  const [query, setQuery] = useState('');
  const lessons = (course?.lessons || []).filter((lesson: any) => !query.trim() || lesson.titleAr.includes(query.trim()));
  const [downloadedMap, setDownloadedMap] = useState<Record<string, DownloadedLessonRecord>>({});
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  useEffect(() => {
    AudioService.getDownloadedLessons().then(setDownloadedMap).catch(() => {});
  }, []);

  const handleDownload = async (lesson: any) => {
    triggerHaptic('medium');
    setDownloading((prev) => new Set(prev).add(lesson.id));
    const result = await AudioService.downloadLesson(course, lesson, () => {});
    if (result) setDownloadedMap((prev) => ({ ...prev, [lesson.id]: result }));
    else Alert.alert(t('تعذّر التحميل', 'Download failed'), t('تحقق من اتصال الإنترنت ثم أعد المحاولة.', 'Check your internet connection and try again.'));
    setDownloading((prev) => {
      const next = new Set(prev);
      next.delete(lesson.id);
      return next;
    });
  };

  const isEn = lang === 'en';
  const categoryText: string = isEn ? (course?.categoryEn || course?.categoryAr) : course?.categoryAr;

  if (!course) return <View style={{ flex: 1, backgroundColor: p.bg }}><Header title={t('السلسلة غير موجودة', 'Series not found')} onBack={goBack} /></View>;

  return <View style={{ flex: 1, backgroundColor: p.bg }}>
    <Header title={t('تفاصيل الكتاب والسلسلة', 'Book & Series Details')} subtitle={categoryText} onBack={goBack} />
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: p.surface, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 20 }}>
        <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: p.hero, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Feather name="book-open" size={24} color={p.onHero} />
        </View>
        <TextUI variant="h2" color={p.ink}>{isEn && course.titleEn ? course.titleEn : course.titleAr}</TextUI>
        <TextUI variant="bodyMedium" weight="bold" color={p.primary} style={{ marginTop: 6 }}>{course.scholarAr}</TextUI>
        <TextUI variant="caption" color={p.muted} style={{ marginTop: 4 }}>{course.roleAr || t('من دروس الحرمين الشريفين', 'From the lessons of the Two Holy Mosques')} • {categoryText}</TextUI>
        <TextUI variant="body" color={p.ink} style={{ lineHeight: 22, marginTop: 14 }}>{course.descriptionAr}</TextUI>
        <View style={{ flexDirection: 'row', gap: 18, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderColor: p.border }}>
          <TextUI variant="caption" color={p.muted}>{toArabicNumber(course.lessons.length)} {t('درس مسجل', course.lessons.length === 1 ? 'recorded lesson' : 'recorded lessons')}</TextUI>
          <TextUI variant="caption" color={p.muted}>{course.badge}</TextUI>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 }}>
        <TextUI variant="h3" color={p.ink}>{t('دروس السلسلة', 'Series Lessons')}</TextUI>
        <TextUI variant="caption" color={p.muted}>{toArabicNumber(lessons.length)} {t('درس', lessons.length === 1 ? 'lesson' : 'lessons')}</TextUI>
      </View>
      <TextInput value={query} onChangeText={setQuery} placeholder={t('ابحث في عناوين الدروس', 'Search lesson titles')} placeholderTextColor={p.muted} style={{ backgroundColor: p.surface, color: p.ink, borderWidth: 1, borderColor: p.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, textAlign: isRTL ? 'right' : 'left', marginBottom: 10 }} />
      <View style={{ backgroundColor: p.surface, borderRadius: 18, borderWidth: 1, borderColor: p.border, paddingHorizontal: 14, paddingVertical: 2 }}>
        {lessons.map((lesson: any, index: number) => {
          const isDownloaded = !!downloadedMap[lesson.id];
          const isDownloading = downloading.has(lesson.id);
          // The download button is a sibling of the row button so buttons do not nest.
          return <View key={lesson.id} style={{ flexDirection: 'row', alignItems: 'center', borderBottomWidth: index === lessons.length - 1 ? 0 : 1, borderColor: p.border }}>
            <TouchableOpacity onPress={() => navigate('haramain_lesson', { courseId: course.id, lessonId: lesson.id })} activeOpacity={0.75} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: p.soft, alignItems: 'center', justifyContent: 'center' }}><TextUI variant="captionBold" color={p.primaryInk}>{toArabicNumber(lesson.number)}</TextUI></View>
              <View style={{ flex: 1 }}>
                <TextUI variant="bodyMedium" weight="bold" color={p.ink}>{lesson.titleAr}</TextUI>
                <TextUI variant="caption" color={p.muted} style={{ marginTop: 3 }}>{localizeDuration(lesson.duration) || t('درس صوتي', 'Audio lesson')} • {t('اضغط للاستماع وتدوين الفوائد', 'Tap to listen and take notes')}</TextUI>
              </View>
              <Feather name="play-circle" size={22} color={p.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isDownloaded ? t(`الدرس ${toArabicNumber(lesson.number)} منزَّل`, `Lesson ${toArabicNumber(lesson.number)} downloaded`) : t(`تنزيل الدرس ${toArabicNumber(lesson.number)}`, `Download lesson ${toArabicNumber(lesson.number)}`)}
              accessibilityState={{ disabled: isDownloaded || isDownloading, busy: isDownloading }}
              disabled={isDownloaded || isDownloading}
              onPress={() => handleDownload(lesson)}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              {isDownloading ? (
                <ActivityIndicator size="small" color={p.primary} />
              ) : (
                <Feather name={isDownloaded ? 'check-circle' : 'download-cloud'} size={19} color={isDownloaded ? p.success : p.muted} />
              )}
            </TouchableOpacity>
          </View>;
        })}
        {lessons.length === 0 ? <TextUI variant="body" color={p.muted} style={{ padding: 18 }}>{t('لا توجد دروس مطابقة.', 'No matching lessons.')}</TextUI> : null}
      </View>
    </ScrollView>
  </View>;
};
