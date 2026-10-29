import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { AudioService } from '../services/audioService';
import { tr } from '../i18n/language';

/** The Haramain lesson being played, independent of which screen is open. */
export interface LessonTrack {
  courseId: string;
  lessonId: string;
  lessonNumber: number;
  title: string;
  scholar: string;
}

interface LessonPlayerState {
  track: LessonTrack | null;
  playing: boolean;
  loading: boolean;
  currentSecs: number;
  totalSecs: number;
  speed: number;
  /** Start a lesson (replacing any other) from `from` seconds. */
  play: (course: any, lesson: any, from?: number) => Promise<void>;
  toggle: () => void;
  pause: () => void;
  seek: (secs: number) => void;
  setSpeed: (speed: number) => void;
  /** Stop and forget the current lesson (its position is saved). */
  stop: () => void;
}

const LessonPlayerContext = createContext<LessonPlayerState | null>(null);

export const LessonPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [track, setTrack] = useState<LessonTrack | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentSecs, setCurrentSecs] = useState(0);
  const [totalSecs, setTotalSecs] = useState(0);
  const [speed, setSpeedState] = useState(1);
  const playerRef = useRef<any>(null);
  const trackRef = useRef<LessonTrack | null>(null);
  const lastSavedSecond = useRef(-1);

  const saveProgress = (secs: number, total: number) => {
    const t = trackRef.current;
    if (t) AudioService.saveResumeProgress(t.courseId, t.lessonId, t.lessonNumber, t.title, secs, total);
  };

  const release = () => {
    const player = playerRef.current;
    if (!player) return;
    saveProgress(player.currentTime || 0, player.duration || 0);
    try {
      player.pause();
      player.remove();
    } catch {}
    playerRef.current = null;
  };

  const play = async (course: any, lesson: any, from = 0) => {
    const saved = await AudioService.getDownloadedLessons();
    const source = saved[lesson.id]?.localUri || lesson.audioUrl || course.audioStreamUrl;
    if (!source) {
      Alert.alert(tr('تعذر تشغيل الدرس', "Couldn't play the lesson"), tr('لا يتوفر رابط صوتي لهذا الدرس.', 'No audio link is available for this lesson.'));
      return;
    }
    release();
    const next: LessonTrack = { courseId: course.id, lessonId: lesson.id, lessonNumber: lesson.number, title: lesson.titleAr, scholar: course.scholarAr };
    trackRef.current = next;
    lastSavedSecond.current = -1;
    setTrack(next);
    setCurrentSecs(Math.floor(from));
    setTotalSecs(0);
    try {
      setLoading(true);
      const player = createAudioPlayer(source, { updateInterval: 500 });
      playerRef.current = player;
      player.setPlaybackRate(speed);
      player.addListener('playbackStatusUpdate', (status: any) => {
        if (playerRef.current !== player) return;
        setLoading(!!status?.isBuffering);
        setPlaying(!!status?.playing && !status?.didJustFinish);
        setCurrentSecs(Math.floor(status?.currentTime || 0));
        setTotalSecs(Math.floor(status?.duration || 0));
      });
      if (from > 0) await player.seekTo(from);
      player.play();
    } catch {
      setLoading(false);
      Alert.alert(tr('تعذر تشغيل الدرس', "Couldn't play the lesson"), tr('تحقق من اتصال الإنترنت ثم حاول مرة أخرى.', 'Check your internet connection and try again.'));
    }
  };

  // Save the position every few seconds while playing (same cadence as before).
  useEffect(() => {
    if (!track || currentSecs === lastSavedSecond.current || currentSecs % 4 !== 0) return;
    lastSavedSecond.current = currentSecs;
    saveProgress(currentSecs, totalSecs);
  }, [track, currentSecs, totalSecs]);

  // Release the player if the whole app tree unmounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => release(), []);

  const toggle = () => {
    const player = playerRef.current;
    if (!player) return;
    if (playing) player.pause();
    else player.play();
  };

  const pause = () => {
    const player = playerRef.current;
    if (player && playing) {
      player.pause();
      saveProgress(player.currentTime || currentSecs, player.duration || totalSecs);
    }
  };

  const seek = (secs: number) => {
    const value = Math.max(0, Math.min(totalSecs || Number.MAX_SAFE_INTEGER, secs));
    playerRef.current?.seekTo(value);
    setCurrentSecs(Math.floor(value));
  };

  const setSpeed = (next: number) => {
    setSpeedState(next);
    playerRef.current?.setPlaybackRate(next);
  };

  const stop = () => {
    release();
    trackRef.current = null;
    setTrack(null);
    setPlaying(false);
    setLoading(false);
  };

  return (
    <LessonPlayerContext.Provider value={{ track, playing, loading, currentSecs, totalSecs, speed, play, toggle, pause, seek, setSpeed, stop }}>
      {children}
    </LessonPlayerContext.Provider>
  );
};

export const useLessonPlayer = (): LessonPlayerState => {
  const ctx = useContext(LessonPlayerContext);
  if (!ctx) throw new Error('useLessonPlayer must be used inside LessonPlayerProvider');
  return ctx;
};
