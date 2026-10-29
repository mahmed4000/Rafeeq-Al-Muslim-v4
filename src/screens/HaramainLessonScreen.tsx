import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useLessonPlayer } from '../context/LessonPlayerContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { MAKKAH_MOSQUE_COURSES, PROPHET_MOSQUE_COURSES } from '../data/haramainData';
import { AudioService, LessonMarker } from '../services/audioService';
import { usePalette } from '../theme/palette';
import { useScreenParams } from '../navigation/routes';
import { localizeDuration } from '../i18n/language';

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const clock = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}`;

export const HaramainLessonScreen: React.FC = () => {
  const { goBack, t, isRTL, lang } = useApp();
  const player = useLessonPlayer();
  const screenParams = useScreenParams();
  const p = usePalette();
  const { course, lesson } = useMemo(() => {
    const all = [...PROPHET_MOSQUE_COURSES, ...MAKKAH_MOSQUE_COURSES];
    const foundCourse: any = all.find((item: any) => item.id === screenParams?.courseId);
    return { course: foundCourse, lesson: foundCourse?.lessons?.find((item: any) => item.id === screenParams?.lessonId) };
  }, [screenParams?.courseId, screenParams?.lessonId]);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [markers, setMarkers] = useState<LessonMarker[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteTarget, setNoteTarget] = useState<LessonMarker | null>(null);
  const [progressWidth, setProgressWidth] = useState(0);

  // The app-wide player keeps playing after this screen closes; this screen shows it
  // only when it is playing this lesson.
  const isThisLesson = !!lesson && player.track?.lessonId === lesson.id;
  const currentSecs = isThisLesson ? player.currentSecs : (resumeAt || 0);
  const totalSecs = isThisLesson ? player.totalSecs : 0;
  const playing = isThisLesson && player.playing;
  const loading = isThisLesson && player.loading;

  useEffect(() => {
    if (!course || !lesson) return;
    let alive = true;
    (async () => {
      const [resume, savedMarkers] = await Promise.all([
        AudioService.getLessonResume(lesson.id, course.id),
        AudioService.getLessonMarkers(course.id, lesson.id)
      ]);
      if (alive) {
        if (resume && resume.currentSecs > 5) setResumeAt(resume.currentSecs);
        setMarkers(savedMarkers);
      }
    })();
    return () => { alive = false; };
  }, [course?.id, lesson?.id]);

  const startPlayback = (from: number) => {
    if (!course || !lesson) return;
    setResumeAt(null);
    player.play(course, lesson, from);
  };

  // Opened from Home's "continue listening": start from the saved position right away.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (!screenParams?.autoplay || autoStarted.current || resumeAt == null || isThisLesson) return;
    autoStarted.current = true;
    startPlayback(resumeAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeAt, screenParams?.autoplay]);

  if (!course || !lesson) return <View style={{ flex: 1, backgroundColor: p.bg }}><Header title={t('الدرس غير موجود', 'Lesson not found')} onBack={goBack} /></View>;

  const isEn = lang === 'en';
  const categoryText: string = isEn ? (course.categoryEn || course.categoryAr) : course.categoryAr;
  const togglePlayback = () => {
    if (isThisLesson) player.toggle();
    else startPlayback(resumeAt || 0);
  };
  const seek = (to: number) => {
    if (isThisLesson) player.seek(to);
  };
  const addMarker = async () => {
    const marker: LessonMarker = { id: `${lesson.id}-${Date.now()}`, courseId: course.id, lessonId: lesson.id, seconds: currentSecs, note: '', createdAt: Date.now() };
    await AudioService.saveLessonMarker(marker);
    setMarkers((prev) => [marker, ...prev]);
    setNoteTarget(marker);
    setNoteDraft('');
  };
  const saveNote = async () => {
    if (!noteTarget) return;
    await AudioService.deleteLessonMarker(lesson.id, noteTarget.id);
    const updated = { ...noteTarget, note: noteDraft.trim() };
    await AudioService.saveLessonMarker(updated);
    setMarkers((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    setNoteTarget(null);
  };
  const cycleSpeed = () => {
    player.setSpeed(SPEEDS[(SPEEDS.indexOf(player.speed) + 1) % SPEEDS.length]);
  };
  // A marker plays this lesson from its time (starting it if another lesson is playing).
  const jumpTo = (secs: number) => {
    if (isThisLesson) player.seek(secs);
    else startPlayback(secs);
  };

  return <View style={{ flex: 1, backgroundColor: p.bg }}>
    <Header title={t('مشغل الدرس', 'Lesson Player')} subtitle={categoryText} onBack={goBack} />
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 38 }}>
      <View style={{ backgroundColor: p.hero, borderRadius: 24, padding: 22, minHeight: 180, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Feather name="headphones" size={22} color={p.accent} /><TextUI variant="captionBold" color={p.onHero}>{categoryText}</TextUI></View>
        <View><TextUI variant="h2" color={p.onHero}>{lesson.titleAr}</TextUI><TextUI variant="bodyMedium" color={p.onHeroMuted} style={{ marginTop: 6 }}>{course.scholarAr}</TextUI></View>
        <TextUI variant="caption" color={p.onHeroMuted}>{isEn && course.titleEn ? course.titleEn : course.titleAr}</TextUI>
      </View>
      {resumeAt != null && !isThisLesson ?<TouchableOpacity onPress={() => startPlayback(resumeAt)} style={{ marginTop: 14, borderRadius: 14, padding: 13, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, flexDirection: 'row', gap: 8, alignItems: 'center' }}><Feather name="rotate-ccw" size={16} color={p.primary} /><TextUI variant="captionBold" color={p.ink}>{t('استئناف من', 'Resume from')} {clock(resumeAt)}</TextUI></TouchableOpacity> : null}
      <View style={{ marginTop: 20, backgroundColor: p.surface, borderRadius: 22, borderWidth: 1, borderColor: p.border, padding: 18 }}>
        <TouchableOpacity activeOpacity={1} onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)} onPress={(event) => { if (totalSecs && progressWidth) seek(totalSecs * event.nativeEvent.locationX / progressWidth); }} style={{ height: 14, justifyContent: 'center' }}>
          <View style={{ height: 6, backgroundColor: p.border, borderRadius: 8, overflow: 'hidden' }}><View style={{ height: 6, width: `${totalSecs ? Math.min(100, currentSecs / totalSecs * 100) : 0}%`, backgroundColor: p.primary }} /></View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><TextUI variant="caption" color={p.muted}>{clock(currentSecs)}</TextUI><TextUI variant="caption" color={p.muted}>{totalSecs ? clock(totalSecs) : localizeDuration(lesson.duration)}</TextUI></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26, paddingVertical: 15 }}>
          <TouchableOpacity onPress={() => seek(currentSecs + 30)}><Feather name="fast-forward" size={23} color={p.muted} /></TouchableOpacity>
          <TouchableOpacity onPress={() => seek(currentSecs - 15)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: p.bgAlt, alignItems: 'center', justifyContent: 'center' }}><Feather name="rotate-ccw" size={21} color={p.ink} /></TouchableOpacity>
          <TouchableOpacity onPress={togglePlayback} style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: p.primary, alignItems: 'center', justifyContent: 'center' }}>{loading ? <ActivityIndicator color={p.onPrimary} /> : <Feather name={playing ? 'pause' : 'play'} size={28} color={p.onPrimary} />}</TouchableOpacity>
          <TouchableOpacity onPress={() => seek(currentSecs + 15)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: p.bgAlt, alignItems: 'center', justifyContent: 'center' }}><Feather name="rotate-cw" size={21} color={p.ink} /></TouchableOpacity>
          <TouchableOpacity onPress={() => seek(currentSecs - 30)}><Feather name="rewind" size={23} color={p.muted} /></TouchableOpacity>
        </View>
        <TouchableOpacity onPress={cycleSpeed} style={{ alignSelf: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: p.bgAlt, flexDirection: 'row', alignItems: 'center', gap: 7 }}><Feather name="sliders" size={14} color={p.primary} /><TextUI variant="captionBold" color={p.ink}>{t('سرعة التشغيل', 'Playback speed')} {player.speed}×</TextUI></TouchableOpacity>
      </View>
      <TouchableOpacity onPress={addMarker} style={{ marginTop: 16, padding: 15, borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Feather name="bookmark" size={18} color={p.primary} /><TextUI variant="bodyBold" color={p.ink}>{t(`ضع علامة عند ${clock(currentSecs)} وأضف ملاحظة`, `Mark ${clock(currentSecs)} and add a note`)}</TextUI></TouchableOpacity>
      <TextUI variant="h3" color={p.ink} style={{ marginTop: 24, marginBottom: 10 }}>{t('علاماتي وملاحظاتي', 'My Marks & Notes')}</TextUI>
      {markers.length ? markers.map((marker) => <View key={marker.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: p.surface, borderRadius: 15, borderWidth: 1, borderColor: p.border, padding: 13, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => jumpTo(marker.seconds)} style={{ width: 50, paddingVertical: 8, alignItems: 'center', borderRadius: 10, backgroundColor: p.soft }}><TextUI variant="captionBold" color={p.primaryInk}>{clock(marker.seconds)}</TextUI></TouchableOpacity>
        <TouchableOpacity onPress={() => { setNoteTarget(marker); setNoteDraft(marker.note); }} style={{ flex: 1 }}><TextUI variant="caption" color={marker.note ? p.ink : p.muted}>{marker.note || t('أضف فائدة أو ملاحظة نصية', 'Add a benefit or text note')}</TextUI></TouchableOpacity>
        <TouchableOpacity onPress={async () => { await AudioService.deleteLessonMarker(lesson.id, marker.id); setMarkers((prev) => prev.filter((item) => item.id !== marker.id)); }}><Feather name="trash-2" size={16} color={p.muted} /></TouchableOpacity>
      </View>) : <TextUI variant="caption" color={p.muted}>{t('ستظهر العلامات التي تحفظها هنا، ويمكنك لمس الوقت للعودة إليه.', 'Marks you save will appear here; tap a time to go back to it.')}</TextUI>}
      <TouchableOpacity onPress={() => goBack()} style={{ marginTop: 20, alignSelf: 'center', padding: 12 }}><TextUI variant="captionBold" color={p.primary}>{t('العودة إلى قائمة دروس الكتاب', "Back to the book's lessons")}</TextUI></TouchableOpacity>
    </ScrollView>
    {noteTarget ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 22 }}><View style={{ backgroundColor: p.surface, borderRadius: 20, padding: 18 }}><TextUI size={16} weight="bold" color={p.ink}>{t('ملاحظة عند', 'Note at')} {clock(noteTarget.seconds)}</TextUI><TextInput value={noteDraft} onChangeText={setNoteDraft} placeholder={t('اكتب الفائدة أو الملاحظة هنا', 'Write the benefit or note here')} placeholderTextColor={p.muted} multiline textAlign={isRTL ? 'right' : 'left'} style={{ minHeight: 110, marginTop: 14, padding: 12, borderWidth: 1, borderColor: p.border, borderRadius: 12, color: p.ink, textAlignVertical: 'top' }} /><View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 }}><TouchableOpacity onPress={() => setNoteTarget(null)}><TextUI size={13} color={p.muted}>{t('إلغاء', 'Cancel')}</TextUI></TouchableOpacity><TouchableOpacity onPress={saveNote}><TextUI size={13} weight="bold" color={p.primary}>{t('حفظ', 'Save')}</TextUI></TouchableOpacity></View></View></View> : null}
  </View>;
};
