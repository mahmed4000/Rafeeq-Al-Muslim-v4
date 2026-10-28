import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import * as WebBrowser from 'expo-web-browser';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { PROPHET_MOSQUE_COURSES, MAKKAH_MOSQUE_COURSES } from '../data/haramainData';
import { AudioService, DownloadedLessonRecord } from '../services/audioService';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';

const SCIENCE_ORDER = ['العقيدة', 'القرآن', 'التفسير', 'الحديث', 'الفقه', 'أصول الفقه', 'سيرة ورقائق'];

export const HaramainLessonsScreen: React.FC = () => {
  const { goBack, navigate, theme, themeMode, t, triggerHaptic } = useApp();
  const c = theme;

  const [activeMosqueTab, setActiveMosqueTab] = useState<'madinah' | 'makkah'>('madinah');
  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [currentSecs, setCurrentSecs] = useState<number>(0);
  const [totalSecs, setTotalSecs] = useState<number>(0);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const [downloadedMap, setDownloadedMap] = useState<Record<string, DownloadedLessonRecord>>({});
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<string>>(new Set());

  const nativePlayerRef = useRef<any>(null);
  const webAudioRef = useRef<any>(null);

  const courses = activeMosqueTab === 'madinah' ? PROPHET_MOSQUE_COURSES : MAKKAH_MOSQUE_COURSES;
  const categories = useMemo(() => ['الكل', ...Array.from(new Set(courses.map((course: any) => course.categoryAr).filter(Boolean)))
    .sort((a: any, b: any) => {
      const aIndex = SCIENCE_ORDER.indexOf(a);
      const bIndex = SCIENCE_ORDER.indexOf(b);
      if (aIndex >= 0 || bIndex >= 0) return (aIndex < 0 ? 99 : aIndex) - (bIndex < 0 ? 99 : bIndex);
      return String(a).localeCompare(String(b), 'ar');
    })], [courses]);
  const filteredCourses = useMemo(() => {
    const query = courseSearch.trim().toLowerCase();
    return courses.filter((course: any) => {
      const matchesCategory = selectedCategory === 'الكل' || course.categoryAr === selectedCategory;
      const searchableText = [course.titleAr, course.scholarAr, course.categoryAr, ...(course.lessons || []).map((lesson: any) => lesson.titleAr)].join(' ').toLowerCase();
      return matchesCategory && (!query || searchableText.includes(query));
    });
  }, [courses, courseSearch, selectedCategory]);
  const groupedCourses = useMemo(() => categories
    .filter((category: string) => category !== 'الكل')
    .map((category: string) => ({
      category,
      items: filteredCourses.filter((course: any) => course.categoryAr === category)
        .sort((a: any, b: any) => a.titleAr.localeCompare(b.titleAr, 'ar'))
    }))
    .filter((group: any) => group.items.length > 0), [categories, filteredCourses]);
  const lessonCount = courses.reduce((total: number, course: any) => total + (course.lessons?.length || 0), 0);

  // Load downloaded state
  useEffect(() => {
    (async () => {
      const records = await AudioService.getDownloadedLessons();
      setDownloadedMap(records);
    })();
  }, []);

  const stopAllAudio = () => {
    try {
      if (nativePlayerRef.current) {
        nativePlayerRef.current.pause();
        nativePlayerRef.current.remove();
        nativePlayerRef.current = null;
      }
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
      setIsPlaying(false);
    } catch (e) {}
  };

  const playLesson = async (course: any, lesson: any) => {
    triggerHaptic('light');
    if (activeLesson?.id === lesson.id && nativePlayerRef.current) {
      if (isPlaying) {
        nativePlayerRef.current.pause();
        setIsPlaying(false);
      } else {
        nativePlayerRef.current.play();
        setIsPlaying(true);
      }
      return;
    }
    if (activeLesson?.id === lesson.id && webAudioRef.current) {
      if (isPlaying) {
        webAudioRef.current.pause();
        setIsPlaying(false);
      } else {
        webAudioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
      return;
    }
    stopAllAudio();
    setActiveLesson(lesson);
    setSelectedCourse(course);

    const isDownloaded = downloadedMap[lesson.id];
    const url = isDownloaded?.localUri || lesson.audioUrl || course.audioStreamUrl;

    try {
      const player = createAudioPlayer(url, { updateInterval: 500 });
      if (player) {
        nativePlayerRef.current = player;
        player.setPlaybackRate(playbackSpeed);
        player.addListener('playbackStatusUpdate', (status: any) => {
          if (status) {
            const cur = Math.floor(status.currentTime || 0);
            const tot = Math.floor(status.duration || 0);
            setCurrentSecs(cur);
            setTotalSecs(tot);
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        });
        player.play();
        setIsPlaying(true);
        return;
      }
    } catch (e) {}

    // HTML5 fallback for web
    if (typeof window !== 'undefined' && typeof Audio !== 'undefined') {
      const sound = new Audio(url);
      webAudioRef.current = sound;
      sound.playbackRate = playbackSpeed;
      sound.ontimeupdate = () => {
        setCurrentSecs(Math.floor(sound.currentTime));
        setTotalSecs(Math.floor(sound.duration || 0));
      };
      sound.onended = () => setIsPlaying(false);
      sound.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const togglePlayPause = () => {
    triggerHaptic('light');
    if (isPlaying) {
      nativePlayerRef.current?.pause();
      webAudioRef.current?.pause();
      setIsPlaying(false);
    } else {
      nativePlayerRef.current?.play();
      webAudioRef.current?.play();
      setIsPlaying(true);
    }
  };

  const skipSeconds = (delta: number) => {
    triggerHaptic('light');
    const next = Math.max(0, currentSecs + delta);
    if (nativePlayerRef.current) {
      if (typeof nativePlayerRef.current.seekTo === 'function') {
        nativePlayerRef.current.seekTo(next);
      } else {
        nativePlayerRef.current.currentTime = next;
      }
    }
    if (webAudioRef.current) {
      webAudioRef.current.currentTime = next;
    }
    setCurrentSecs(next);
  };

  const handleDownload = async (course: any, lesson: any) => {
    triggerHaptic('medium');
    setDownloadProgress((prev) => ({ ...prev, [lesson.id]: 10 }));
    const result = await AudioService.downloadLesson(course, lesson, (pct) => {
      setDownloadProgress((prev) => ({ ...prev, [lesson.id]: pct }));
    });
    if (result) {
      setDownloadedMap((prev) => ({ ...prev, [lesson.id]: result }));
    } else {
      Alert.alert('تعذّر التحميل', 'تحقق من اتصال الإنترنت ثم أعد المحاولة.');
    }
    setDownloadProgress((prev) => {
      const next = { ...prev };
      delete next[lesson.id];
      return next;
    });
  };

  const openOfficialCourseArchive = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://droos.prh.gov.sa/ElHaramain/books');
    } catch {
      Alert.alert('تعذّر فتح المكتبة', 'تحقق من اتصال الإنترنت ثم حاول مرة أخرى.');
    }
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${toArabicNumber(m)}:${toArabicNumber(sec)}`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('دروس وكراسي الحرمين الشريفين', 'Haramain Scholars Chairs')}
        subtitle={t('المسجد الحرام بمكة • المسجد النبوي بالمدينة', 'Makkah & Madinah Scholars')}
        onBack={goBack}
        theme={c}
      />

      {/* Mosque Tabs (Madinah / Makkah) */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: 18,
          marginTop: 12,
          marginBottom: 16,
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
            setActiveMosqueTab('madinah');
            setSelectedCategory('الكل');
            setCourseSearch('');
          }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            backgroundColor: activeMosqueTab === 'madinah' ? TOKENS.colors.primary : 'transparent'
          }}
        >
          <TextUI
            size={14}
            weight="bold"
            color={activeMosqueTab === 'madinah' ? '#FFFFFF' : c.textPrimary}
          >
            🕌 المسجد النبوي الشريف
          </TextUI>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            triggerHaptic('light');
            setActiveMosqueTab('makkah');
            setSelectedCategory('الكل');
            setCourseSearch('');
          }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: TOKENS.radius.pill,
            alignItems: 'center',
            backgroundColor: activeMosqueTab === 'makkah' ? TOKENS.colors.primary : 'transparent'
          }}
        >
          <TextUI
            size={14}
            weight="bold"
            color={activeMosqueTab === 'makkah' ? '#FFFFFF' : c.textPrimary}
          >
            🕋 المسجد الحرام بمكة
          </TextUI>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Course catalog */}
        <TextUI size={16} weight="bold" color={c.textPrimary} style={{ marginBottom: 12 }}>
          {t('السلاسل العلمية حسب العلم', 'Scientific series by subject')}
        </TextUI>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={openOfficialCourseArchive}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: themeMode === 'light' ? '#F2F6F1' : '#242D27', borderRadius: 15, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: c.border }}
        >
          <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: TOKENS.colors.primary }}>
            <Feather name="book-open" size={18} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <TextUI size={13} weight="bold" color={c.textPrimary}>المكتبة العلمية الكاملة للحرمين</TextUI>
            <TextUI size={11} color={c.textSecondary} style={{ marginTop: 3 }}>تصفح الكتب والشروح وشغّل التسجيلات في نافذة التطبيق</TextUI>
          </View>
          <Feather name="arrow-up-left" size={17} color={TOKENS.colors.primary} />
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <TextUI size={16} weight="bold" color={c.textPrimary}>{t('السلاسل المصنفة داخل التطبيق', 'Curated in-app courses')}</TextUI>
          <TextUI size={11} color={c.textSecondary}>{toArabicNumber(courses.length)} سلسلة • {toArabicNumber(lessonCount)} درس</TextUI>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1, borderColor: c.border, gap: 8, marginBottom: 10 }}>
          <Feather name="search" size={16} color={c.textSecondary} />
          <TextInput
            placeholder="ابحث باسم السلسلة أو الشيخ أو الدرس..."
            placeholderTextColor={c.textSecondary}
            value={courseSearch}
            onChangeText={setCourseSearch}
            style={{ flex: 1, color: c.textPrimary, textAlign: 'right', fontSize: 13 }}
          />
          {courseSearch ? <TouchableOpacity onPress={() => setCourseSearch('')}><Feather name="x" size={15} color={c.textSecondary} /></TouchableOpacity> : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {categories.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                onPress={() => setSelectedCategory(category)}
                style={{ paddingHorizontal: 13, paddingVertical: 7, borderRadius: TOKENS.radius.pill, backgroundColor: isSelected ? TOKENS.colors.primary : c.surface, borderWidth: 1, borderColor: isSelected ? TOKENS.colors.primary : c.border }}
              >
                <TextUI size={11} weight="bold" color={isSelected ? '#FFFFFF' : c.textSecondary}>{category}</TextUI>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {groupedCourses.map(({ category, items }: any) => (
          <View key={category}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 10, paddingBottom: 8, borderBottomWidth: 1, borderColor: c.border }}>
              <Feather name="book-open" size={16} color={TOKENS.colors.primary} />
              <TextUI size={15} weight="bold" color={TOKENS.colors.primaryDark}>{category}</TextUI>
              <TextUI size={11} color={c.textSecondary}>{toArabicNumber(items.length)} سلسلة</TextUI>
            </View>
            {items.map((course: any) => {
          const expanded = expandedCourseIds.has(course.id) || !!courseSearch.trim();
          const visibleLessons = expanded ? course.lessons : course.lessons.slice(0, 3);
          return (
          <View
            key={course.id}
            style={{
              backgroundColor: c.surface,
              borderRadius: 18,
              padding: 18,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: c.border,
              ...makeShadow('0 2px 8px rgba(0,0,0,0.03)', '#000', 0.03, 3)
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <View style={{ flex: 1 }}>
                <TextUI variant="h4" color={TOKENS.colors.primaryDark}>
                  {course.titleAr}
                </TextUI>
                <TextUI variant="bodyMedium" color={TOKENS.colors.primary} style={{ marginTop: 2 }}>
                  {course.scholarAr}
                </TextUI>
              </View>

              <View
                style={{
                  backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: TOKENS.radius.pill
                }}
              >
                <TextUI variant="badge" color={TOKENS.colors.primaryDark}>
                  {course.categoryAr}
                </TextUI>
              </View>
            </View>

            <TextUI variant="caption" color={c.textSecondary} style={{ lineHeight: 18, marginBottom: 12 }}>
              {course.descriptionAr}
            </TextUI>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <Feather name="headphones" size={13} color={TOKENS.colors.primary} />
              <TextUI variant="caption" color={c.textSecondary}>{toArabicNumber(course.lessons.length)} درس مسجل</TextUI>
            </View>

            <TouchableOpacity onPress={() => navigate('haramain_book', { courseId: course.id })} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 11, backgroundColor: TOKENS.colors.primaryDark, borderRadius: 12, marginBottom: 12 }}>
              <Feather name="book-open" size={16} color="#FFFFFF" />
              <TextUI variant="captionBold" color="#FFFFFF">افتح صفحة الكتاب وجميع الدروس</TextUI>
            </TouchableOpacity>

            {/* Lessons List in Course */}
            <View style={{ gap: 8 }}>
              {visibleLessons.map((lesson: any) => {
                const isCurrent = activeLesson?.id === lesson.id;
                const isDownloaded = !!downloadedMap[lesson.id];
                const isDownloading = downloadProgress[lesson.id] != null;

                return (
                  <View
                    key={lesson.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: isCurrent ? (themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20') : c.bgSecondary,
                      borderRadius: 12,
                      padding: 10
                    }}
                  >
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => navigate('haramain_lesson', { courseId: course.id, lessonId: lesson.id })}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                      <Feather
                        name={isCurrent && isPlaying ? 'pause-circle' : 'play-circle'}
                        size={22}
                        color={TOKENS.colors.primary}
                      />
                      <View style={{ flex: 1 }}>
                        <TextUI variant="bodyMedium" weight={isCurrent ? 'bold' : 'medium'} color={c.textPrimary} numberOfLines={1}>
                          {lesson.number}. {lesson.titleAr}
                        </TextUI>
                        <TextUI variant="caption" color={c.textSecondary}>
                          {lesson.duration}
                        </TextUI>
                      </View>
                    </TouchableOpacity>

                    {/* Download Button */}
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => handleDownload(course, lesson)}
                      disabled={isDownloaded || isDownloading}
                      style={{ padding: 6 }}
                    >
                      {isDownloading ? (
                        <ActivityIndicator size="small" color={TOKENS.colors.primary} />
                      ) : (
                        <Feather
                          name={isDownloaded ? 'check-circle' : 'download-cloud'}
                          size={18}
                          color={isDownloaded ? '#4CAF50' : c.textSecondary}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {course.lessons.length > 3 && !courseSearch.trim() ? (
              <TouchableOpacity
                onPress={() => setExpandedCourseIds((previous) => {
                  const next = new Set(previous);
                  if (next.has(course.id)) next.delete(course.id);
                  else next.add(course.id);
                  return next;
                })}
                style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingTop: 12 }}
              >
                <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>
                  {expanded ? 'إخفاء الحلقات' : `عرض جميع الحلقات (${toArabicNumber(course.lessons.length)})`}
                </TextUI>
                <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={15} color={TOKENS.colors.primary} />
              </TouchableOpacity>
            ) : null}
          </View>
          );
            })}
          </View>
        ))}
        {filteredCourses.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36 }}>
            <Feather name="search" size={26} color={c.textSecondary} />
            <TextUI size={13} weight="bold" color={c.textPrimary} style={{ marginTop: 10 }}>لا توجد سلاسل مطابقة</TextUI>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Audio Player Bar */}
      {activeLesson && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: c.surfaceElevated,
            borderTopWidth: 1,
            borderColor: c.border,
            paddingHorizontal: 18,
            paddingVertical: 12,
            ...makeShadow('0 -4px 16px rgba(0,0,0,0.08)', '#000', 0.08, 6)
          }}
        >
          {/* Progress Slider Bar */}
          <View style={{ height: 3, width: '100%', backgroundColor: c.border, marginBottom: 10 }}>
            <View
              style={{
                height: '100%',
                width: totalSecs > 0 ? `${(currentSecs / totalSecs) * 100}%` : '0%',
                backgroundColor: TOKENS.colors.primary
              }}
            />
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <TextUI size={13} weight="bold" color={c.textPrimary} numberOfLines={1}>
                {activeLesson.titleAr}
              </TextUI>
              <TextUI size={11} color={c.textSecondary}>
                {formatSecs(currentSecs)} / {formatSecs(totalSecs)}
              </TextUI>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <TouchableOpacity
                onPress={() => {
                  const speeds = [1, 1.25, 1.5, 2];
                  const nextSpeed = speeds[(speeds.indexOf(playbackSpeed) + 1) % speeds.length];
                  setPlaybackSpeed(nextSpeed);
                  nativePlayerRef.current?.setPlaybackRate?.(nextSpeed);
                  if (webAudioRef.current) webAudioRef.current.playbackRate = nextSpeed;
                }}
                style={{ minWidth: 36, alignItems: 'center' }}
              >
                <TextUI size={11} weight="bold" color={c.textPrimary}>{playbackSpeed}×</TextUI>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => skipSeconds(-15)}>
                <Feather name="rotate-ccw" size={18} color={c.textPrimary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={togglePlayPause}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  backgroundColor: TOKENS.colors.primary,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Feather name={isPlaying ? 'pause' : 'play'} size={18} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity onPress={() => skipSeconds(15)}>
                <Feather name="rotate-cw" size={18} color={c.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};
