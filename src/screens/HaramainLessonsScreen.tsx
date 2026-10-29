import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { PROPHET_MOSQUE_COURSES, MAKKAH_MOSQUE_COURSES } from '../data/haramainData';
import { AudioService, DownloadedLessonRecord, LessonResumeRecord } from '../services/audioService';
import { toArabicNumber } from '../services/prayerCalculation';
import { usePalette } from '../theme/palette';

const SCIENCE_ORDER = ['العقيدة', 'القرآن', 'التفسير', 'الحديث', 'الفقه', 'أصول الفقه', 'سيرة ورقائق'];
type Mosque = 'makkah' | 'madinah';

const MOSQUE_TABS: { id: Mosque; label: string }[] = [
  { id: 'makkah', label: 'المسجد الحرام' },
  { id: 'madinah', label: 'المسجد النبوي' }
];

/** "١٢ درسًا" / "٣ دروس" (Arabic plural agreement). */
function lessonsAr(n: number): string {
  if (n === 1) return 'درس واحد';
  if (n === 2) return 'درسان';
  const tail = n % 100;
  return `${toArabicNumber(n)} ${tail >= 3 && tail <= 10 ? 'دروس' : 'درسًا'}`;
}

export const HaramainLessonsScreen: React.FC = () => {
  const { navigate, triggerHaptic } = useApp();
  const p = usePalette();

  const [activeMosqueTab, setActiveMosqueTab] = useState<Mosque>('makkah');
  const [courseSearch, setCourseSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('الكل');
  const [downloadedMap, setDownloadedMap] = useState<Record<string, DownloadedLessonRecord>>({});
  const [resumeRecords, setResumeRecords] = useState<LessonResumeRecord[]>([]);

  // Listening progress and downloads change in the lesson and book screens; reload on return.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      AudioService.getDownloadedLessons().then((records) => { if (alive) setDownloadedMap(records); });
      AudioService.getResumeRecords().then((records) => { if (alive) setResumeRecords(Object.values(records).filter((r) => r?.lessonId)); });
      return () => { alive = false; };
    }, [])
  );

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

  /** Status line and progress for a course card, from saved listening positions and downloads. */
  const courseStatus = (course: any): { label: string; ratio: number } => {
    const total = course.lessons?.length || 0;
    if (total > 0 && course.lessons.every((lesson: any) => downloadedMap[lesson.id])) return { label: 'مُنزَّل', ratio: 1 };
    const reached = resumeRecords
      .filter((r) => r.courseId === course.id)
      .reduce((max, r) => Math.max(max, r.lessonNumber || 0), 0);
    if (!reached) return { label: 'جديد', ratio: 0 };
    return { label: `تابعت حتى الدرس ${toArabicNumber(reached)}`, ratio: total ? Math.min(1, reached / total) : 0 };
  };

  const switchMosque = (id: Mosque) => {
    if (id === activeMosqueTab) return;
    triggerHaptic('light');
    setActiveMosqueTab(id);
    setSelectedCategory('الكل');
    setCourseSearch('');
  };

  const openOfficialCourseArchive = async () => {
    try {
      await WebBrowser.openBrowserAsync('https://droos.prh.gov.sa/ElHaramain/books');
    } catch {
      Alert.alert('تعذّر فتح المكتبة', 'تحقق من اتصال الإنترنت ثم حاول مرة أخرى.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 56 : Platform.OS === 'web' ? 24 : 16, paddingBottom: 104, gap: 14 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title and downloads */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TextUI size={26} weight="bold" color={p.ink}>دروس الحرمين</TextUI>
          <TouchableOpacity
            activeOpacity={0.8}
            accessibilityRole="button"
            onPress={() => navigate('downloads')}
            style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
          >
            <Feather name="download" size={16} color={p.primary} />
            <TextUI size={14} weight="medium" color={p.ink}>التنزيلات</TextUI>
          </TouchableOpacity>
        </View>

        {/* Mosque switcher */}
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', padding: 4, borderRadius: 999, backgroundColor: p.bgAlt }}>
          {MOSQUE_TABS.map((tab) => {
            const active = activeMosqueTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => switchMosque(tab.id)}
                style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: active ? p.surface : 'transparent' }}
              >
                <TextUI size={14} weight={active ? 'bold' : 'medium'} color={active ? p.primaryInk : p.muted}>{tab.label}</TextUI>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
          <Feather name="search" size={18} color={p.muted} />
          <TextInput
            accessibilityLabel="بحث في الدروس"
            placeholder="كتاب، شيخ، أو موضوع"
            placeholderTextColor={p.muted}
            value={courseSearch}
            onChangeText={setCourseSearch}
            style={{ flex: 1, color: p.ink, textAlign: 'right', fontSize: 15, paddingVertical: 10 }}
          />
          {courseSearch ? (
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="مسح البحث" onPress={() => setCourseSearch('')} style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={16} color={p.muted} />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Subject chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((category) => {
            const selected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => { triggerHaptic('light'); setSelectedCategory(category); }}
                style={{ minHeight: 36, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 999, backgroundColor: selected ? p.primary : p.soft }}
              >
                <TextUI size={14} weight={selected ? 'bold' : 'medium'} color={selected ? p.onPrimary : p.primaryInk}>{category}</TextUI>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Courses by subject */}
        <TextUI size={17} weight="bold" color={p.ink} style={{ marginTop: 4 }}>الكراسي العلمية</TextUI>
        {groupedCourses.map(({ category, items }: any) => (
          <View key={category} style={{ gap: 10 }}>
            {selectedCategory === 'الكل' ? (
              <TextUI size={13} weight="bold" color={p.accentInk} style={{ paddingHorizontal: 4 }}>{`${category} · ${toArabicNumber(items.length)}`}</TextUI>
            ) : null}
            {items.map((course: any) => {
              const status = courseStatus(course);
              return (
                <TouchableOpacity
                  key={course.id}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`${course.titleAr}، ${course.scholarAr}، ${lessonsAr(course.lessons.length)}، ${status.label}`}
                  onPress={() => navigate('haramain_book', { courseId: course.id })}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
                >
                  <View style={{ width: 52, height: 60, borderTopLeftRadius: 26, borderTopRightRadius: 26, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: p.soft }}>
                    <Feather name="book-open" size={20} color={p.primary} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: p.soft }}>
                      <TextUI size={12} weight="bold" color={p.primaryInk}>{course.categoryAr}</TextUI>
                    </View>
                    <TextUI size={16} weight="bold" color={p.ink}>{course.titleAr}</TextUI>
                    <TextUI size={13} color={p.muted}>{`${course.scholarAr} · ${lessonsAr(course.lessons.length)} · ${status.label}`}</TextUI>
                    <View style={{ height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: p.border, marginTop: 2 }}>
                      <View style={{ height: 4, borderRadius: 2, backgroundColor: p.accent, width: `${Math.round(status.ratio * 100)}%` }} />
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
        {filteredCourses.length === 0 ? (
          <View style={{ alignItems: 'center', paddingVertical: 36, gap: 8 }}>
            <Feather name="search" size={26} color={p.muted} />
            <TextUI size={15} weight="bold" color={p.ink}>لا توجد سلاسل مطابقة</TextUI>
          </View>
        ) : null}

        {/* Official full library (external) */}
        <TouchableOpacity
          activeOpacity={0.85}
          accessibilityRole="link"
          onPress={openOfficialCourseArchive}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52, paddingHorizontal: 14, borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}
        >
          <Feather name="globe" size={18} color={p.primary} />
          <View style={{ flex: 1 }}>
            <TextUI size={14} weight="bold" color={p.ink}>المكتبة العلمية الكاملة للحرمين</TextUI>
            <TextUI size={12.5} color={p.muted}>الموقع الرسمي لدروس الحرمين</TextUI>
          </View>
          <Feather name="arrow-up-left" size={17} color={p.muted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};
