import React, { useMemo, useState } from 'react';
import { ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { MAKKAH_MOSQUE_COURSES, PROPHET_MOSQUE_COURSES } from '../data/haramainData';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS } from '../constants/tokens';

export const HaramainBookScreen: React.FC = () => {
  const { goBack, navigate, screenParams, theme } = useApp();
  const c = theme;
  const course: any = useMemo(() => [...PROPHET_MOSQUE_COURSES, ...MAKKAH_MOSQUE_COURSES]
    .find((item: any) => item.id === screenParams?.courseId), [screenParams?.courseId]);
  const [query, setQuery] = useState('');
  const lessons = (course?.lessons || []).filter((lesson: any) => !query.trim() || lesson.titleAr.includes(query.trim()));

  if (!course) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="السلسلة غير موجودة" onBack={goBack} theme={c} /></View>;

  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <Header title="تفاصيل الكتاب والسلسلة" subtitle={course.categoryAr} onBack={goBack} theme={c} />
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
      <View style={{ backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 20 }}>
        <View style={{ width: 52, height: 52, borderRadius: 17, backgroundColor: TOKENS.colors.primaryDark, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Feather name="book-open" size={24} color="#FFFFFF" />
        </View>
        <TextUI variant="h2" color={c.textPrimary}>{course.titleAr}</TextUI>
        <TextUI variant="bodyMedium" weight="bold" color={TOKENS.colors.primary} style={{ marginTop: 6 }}>{course.scholarAr}</TextUI>
        <TextUI variant="caption" color={c.textSecondary} style={{ marginTop: 4 }}>{course.roleAr || 'من دروس الحرمين الشريفين'} • {course.categoryAr}</TextUI>
        <TextUI variant="body" color={c.textPrimary} style={{ lineHeight: 22, marginTop: 14 }}>{course.descriptionAr}</TextUI>
        <View style={{ flexDirection: 'row', gap: 18, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderColor: c.border }}>
          <TextUI variant="caption" color={c.textSecondary}>{toArabicNumber(course.lessons.length)} درس مسجل</TextUI>
          <TextUI variant="caption" color={c.textSecondary}>{course.badge}</TextUI>
        </View>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 10 }}>
        <TextUI variant="h3" color={c.textPrimary}>دروس السلسلة</TextUI>
        <TextUI variant="caption" color={c.textSecondary}>{toArabicNumber(lessons.length)} درس</TextUI>
      </View>
      <TextInput value={query} onChangeText={setQuery} placeholder="ابحث في عناوين الدروس" placeholderTextColor={c.textSecondary} style={{ backgroundColor: c.surface, color: c.textPrimary, borderWidth: 1, borderColor: c.border, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, fontSize: 13, textAlign: 'right', marginBottom: 10 }} />
      <View style={{ backgroundColor: c.surface, borderRadius: 18, borderWidth: 1, borderColor: c.border, paddingHorizontal: 14, paddingVertical: 2 }}>
        {lessons.map((lesson: any, index: number) => <TouchableOpacity key={lesson.id} onPress={() => navigate('haramain_lesson', { courseId: course.id, lessonId: lesson.id })} activeOpacity={0.75} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: index === lessons.length - 1 ? 0 : 1, borderColor: c.border }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: TOKENS.colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}><TextUI variant="captionBold" color={TOKENS.colors.primaryDark}>{toArabicNumber(lesson.number)}</TextUI></View>
          <View style={{ flex: 1 }}>
            <TextUI variant="bodyMedium" weight="bold" color={c.textPrimary}>{lesson.titleAr}</TextUI>
            <TextUI variant="caption" color={c.textSecondary} style={{ marginTop: 3 }}>{lesson.duration || 'درس صوتي'} • اضغط للاستماع وتدوين الفوائد</TextUI>
          </View>
          <Feather name="play-circle" size={22} color={TOKENS.colors.primary} />
        </TouchableOpacity>)}
        {lessons.length === 0 ? <TextUI variant="body" color={c.textSecondary} style={{ padding: 18 }}>لا توجد دروس مطابقة.</TextUI> : null}
      </View>
    </ScrollView>
  </View>;
};
