import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { MAKKAH_MOSQUE_COURSES, PROPHET_MOSQUE_COURSES } from '../data/haramainData';
import { AudioService, LessonMarker } from '../services/audioService';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS } from '../constants/tokens';

const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const clock = (n: number) => `${Math.floor(n / 60).toString().padStart(2, '0')}:${Math.floor(n % 60).toString().padStart(2, '0')}`;

export const HaramainLessonScreen: React.FC = () => {
  const { goBack, screenParams, theme } = useApp();
  const c = theme;
  const { course, lesson } = useMemo(() => {
    const all = [...PROPHET_MOSQUE_COURSES, ...MAKKAH_MOSQUE_COURSES];
    const foundCourse: any = all.find((item: any) => item.id === screenParams?.courseId);
    return { course: foundCourse, lesson: foundCourse?.lessons?.find((item: any) => item.id === screenParams?.lessonId) };
  }, [screenParams?.courseId, screenParams?.lessonId]);
  const [currentSecs, setCurrentSecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [resumeAt, setResumeAt] = useState<number | null>(null);
  const [markers, setMarkers] = useState<LessonMarker[]>([]);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteTarget, setNoteTarget] = useState<LessonMarker | null>(null);
  const [progressWidth, setProgressWidth] = useState(0);
  const playerRef = useRef<any>(null);
  const lastSavedSecond = useRef(-1);

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

  useEffect(() => () => {
    const player = playerRef.current;
    if (player) {
      if (course && lesson) AudioService.saveResumeProgress(course.id, lesson.id, lesson.number, lesson.titleAr, player.currentTime || currentSecs, player.duration || totalSecs);
      player.remove();
      playerRef.current = null;
    }
  }, [course?.id, lesson?.id]);

  useEffect(() => {
    if (!course || !lesson || currentSecs === lastSavedSecond.current || currentSecs % 4 !== 0) return;
    lastSavedSecond.current = currentSecs;
    AudioService.saveResumeProgress(course.id, lesson.id, lesson.number, lesson.titleAr, currentSecs, totalSecs);
  }, [course?.id, lesson?.id, currentSecs, totalSecs]);

  if (!course || !lesson) return <View style={{ flex: 1, backgroundColor: c.bg }}><Header title="الدرس غير موجود" onBack={goBack} theme={c} /></View>;

  const startPlayback = async (from = currentSecs) => {
    const saved = await AudioService.getDownloadedLessons();
    const source = saved[lesson.id]?.localUri || lesson.audioUrl || course.audioStreamUrl;
    if (!source) { Alert.alert('تعذر تشغيل الدرس', 'لا يتوفر رابط صوتي لهذا الدرس.'); return; }
    try {
      setLoading(true);
      const player = createAudioPlayer(source, { updateInterval: 500 });
      playerRef.current = player;
      player.setPlaybackRate(speed);
      player.addListener('playbackStatusUpdate', (status: any) => {
        setLoading(!!status?.isBuffering);
        setPlaying(!!status?.playing);
        setCurrentSecs(Math.floor(status?.currentTime || 0));
        setTotalSecs(Math.floor(status?.duration || 0));
        if (status?.didJustFinish) setPlaying(false);
      });
      if (from > 0) await player.seekTo(from);
      player.play();
    } catch {
      setLoading(false);
      Alert.alert('تعذر تشغيل الدرس', 'تحقق من اتصال الإنترنت ثم حاول مرة أخرى.');
    }
  };

  const togglePlayback = () => {
    if (playerRef.current) {
      if (playing) playerRef.current.pause(); else playerRef.current.play();
    } else startPlayback(resumeAt || currentSecs);
  };
  const seek = (to: number) => {
    const value = Math.max(0, Math.min(totalSecs || Number.MAX_SAFE_INTEGER, to));
    playerRef.current?.seekTo(value);
    setCurrentSecs(value);
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
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    playerRef.current?.setPlaybackRate(next);
  };

  return <View style={{ flex: 1, backgroundColor: c.bg }}>
    <Header title="مشغل الدرس" subtitle={course.categoryAr} onBack={goBack} theme={c} />
    <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 38 }}>
      <View style={{ backgroundColor: TOKENS.colors.primaryDark, borderRadius: 24, padding: 22, minHeight: 180, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Feather name="headphones" size={22} color={TOKENS.colors.secondary} /><TextUI variant="captionBold" color="#F5EDE4">{course.categoryAr}</TextUI></View>
        <View><TextUI variant="h2" color="#FFFFFF">{lesson.titleAr}</TextUI><TextUI variant="bodyMedium" color="#E7D7C6" style={{ marginTop: 6 }}>{course.scholarAr}</TextUI></View>
        <TextUI variant="caption" color="#E7D7C6">{course.titleAr}</TextUI>
      </View>
      {resumeAt != null && !playerRef.current ? <TouchableOpacity onPress={() => { setCurrentSecs(resumeAt); setResumeAt(null); startPlayback(resumeAt); }} style={{ marginTop: 14, borderRadius: 14, padding: 13, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', gap: 8, alignItems: 'center' }}><Feather name="rotate-ccw" size={16} color={TOKENS.colors.primary} /><TextUI variant="captionBold" color={c.textPrimary}>استئناف من {clock(resumeAt)}</TextUI></TouchableOpacity> : null}
      <View style={{ marginTop: 20, backgroundColor: c.surface, borderRadius: 22, borderWidth: 1, borderColor: c.border, padding: 18 }}>
        <TouchableOpacity activeOpacity={1} onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)} onPress={(event) => { if (totalSecs && progressWidth) seek(totalSecs * event.nativeEvent.locationX / progressWidth); }} style={{ height: 14, justifyContent: 'center' }}>
          <View style={{ height: 6, backgroundColor: c.border, borderRadius: 8, overflow: 'hidden' }}><View style={{ height: 6, width: `${totalSecs ? Math.min(100, currentSecs / totalSecs * 100) : 0}%`, backgroundColor: TOKENS.colors.primary }} /></View>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}><TextUI variant="caption" color={c.textSecondary}>{clock(currentSecs)}</TextUI><TextUI variant="caption" color={c.textSecondary}>{totalSecs ? clock(totalSecs) : lesson.duration}</TextUI></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26, paddingVertical: 15 }}>
          <TouchableOpacity onPress={() => seek(currentSecs + 30)}><Feather name="fast-forward" size={23} color={c.textSecondary} /></TouchableOpacity>
          <TouchableOpacity onPress={() => seek(currentSecs - 15)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center' }}><Feather name="rotate-ccw" size={21} color={c.textPrimary} /></TouchableOpacity>
          <TouchableOpacity onPress={togglePlayback} style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: TOKENS.colors.primary, alignItems: 'center', justifyContent: 'center' }}>{loading ? <ActivityIndicator color="#fff" /> : <Feather name={playing ? 'pause' : 'play'} size={28} color="#fff" />}</TouchableOpacity>
          <TouchableOpacity onPress={() => seek(currentSecs + 15)} style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: c.bgSecondary, alignItems: 'center', justifyContent: 'center' }}><Feather name="rotate-cw" size={21} color={c.textPrimary} /></TouchableOpacity>
          <TouchableOpacity onPress={() => seek(currentSecs - 30)}><Feather name="rewind" size={23} color={c.textSecondary} /></TouchableOpacity>
        </View>
        <TouchableOpacity onPress={cycleSpeed} style={{ alignSelf: 'center', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: c.bgSecondary, flexDirection: 'row', alignItems: 'center', gap: 7 }}><Feather name="sliders" size={14} color={TOKENS.colors.primary} /><TextUI variant="captionBold" color={c.textPrimary}>سرعة التشغيل {speed}×</TextUI></TouchableOpacity>
      </View>
      <TouchableOpacity onPress={addMarker} style={{ marginTop: 16, padding: 15, borderRadius: 16, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 10 }}><Feather name="bookmark" size={18} color={TOKENS.colors.primary} /><TextUI variant="bodyBold" color={c.textPrimary}>ضع علامة عند {clock(currentSecs)} وأضف ملاحظة</TextUI></TouchableOpacity>
      <TextUI variant="h3" color={c.textPrimary} style={{ marginTop: 24, marginBottom: 10 }}>علاماتي وملاحظاتي</TextUI>
      {markers.length ? markers.map((marker) => <View key={marker.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: c.surface, borderRadius: 15, borderWidth: 1, borderColor: c.border, padding: 13, marginBottom: 8 }}>
        <TouchableOpacity onPress={() => seek(marker.seconds)} style={{ width: 50, paddingVertical: 8, alignItems: 'center', borderRadius: 10, backgroundColor: TOKENS.colors.primaryLight }}><TextUI variant="captionBold" color={TOKENS.colors.primaryDark}>{clock(marker.seconds)}</TextUI></TouchableOpacity>
        <TouchableOpacity onPress={() => { setNoteTarget(marker); setNoteDraft(marker.note); }} style={{ flex: 1 }}><TextUI variant="caption" color={marker.note ? c.textPrimary : c.textSecondary}>{marker.note || 'أضف فائدة أو ملاحظة نصية'}</TextUI></TouchableOpacity>
        <TouchableOpacity onPress={async () => { await AudioService.deleteLessonMarker(lesson.id, marker.id); setMarkers((prev) => prev.filter((item) => item.id !== marker.id)); }}><Feather name="trash-2" size={16} color={c.textSecondary} /></TouchableOpacity>
      </View>) : <TextUI variant="caption" color={c.textSecondary}>ستظهر العلامات التي تحفظها هنا، ويمكنك لمس الوقت للعودة إليه.</TextUI>}
      <TouchableOpacity onPress={() => navigateToBook()} style={{ marginTop: 20, alignSelf: 'center', padding: 12 }}><TextUI variant="captionBold" color={TOKENS.colors.primary}>العودة إلى قائمة دروس الكتاب</TextUI></TouchableOpacity>
    </ScrollView>
    {noteTarget ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 22 }}><View style={{ backgroundColor: c.surface, borderRadius: 20, padding: 18 }}><TextUI size={16} weight="bold" color={c.textPrimary}>ملاحظة عند {clock(noteTarget.seconds)}</TextUI><TextInput value={noteDraft} onChangeText={setNoteDraft} placeholder="اكتب الفائدة أو الملاحظة هنا" placeholderTextColor={c.textSecondary} multiline textAlign="right" style={{ minHeight: 110, marginTop: 14, padding: 12, borderWidth: 1, borderColor: c.border, borderRadius: 12, color: c.textPrimary, textAlignVertical: 'top' }} /><View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 14 }}><TouchableOpacity onPress={() => setNoteTarget(null)}><TextUI size={13} color={c.textSecondary}>إلغاء</TextUI></TouchableOpacity><TouchableOpacity onPress={saveNote}><TextUI size={13} weight="bold" color={TOKENS.colors.primary}>حفظ</TextUI></TouchableOpacity></View></View></View> : null}
  </View>;

  function navigateToBook() { goBack(); }
};
