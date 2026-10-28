import { Platform } from 'react-native';
import { createAudioPlayer } from 'expo-audio';

export interface AyahPlayback {
  /** Resolves with the clip length in seconds when it finishes (0 if unknown); rejects on error. */
  finished: Promise<number>;
  stop: () => void;
}

/** Play one recitation clip from start to end (native: expo-audio, web: HTML audio). */
export function playClip(url: string, rate = 1): AyahPlayback {
  if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
    const audio = new Audio(url);
    audio.playbackRate = rate;
    let settle: (secs: number) => void = () => {};
    let fail: (e: unknown) => void = () => {};
    const finished = new Promise<number>((resolve, reject) => { settle = resolve; fail = reject; });
    audio.onended = () => settle(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => fail(new Error('audio error'));
    audio.play().catch(fail);
    return { finished, stop: () => { audio.pause(); settle(0); } };
  }

  const player = createAudioPlayer(url, { updateInterval: 250 });
  player.setPlaybackRate(rate);
  let duration = 0;
  let done = false;
  let settle: (secs: number) => void = () => {};
  const finished = new Promise<number>((resolve) => { settle = resolve; });
  const finish = () => {
    if (done) return;
    done = true;
    try { player.remove(); } catch {}
    settle(duration);
  };
  player.addListener('playbackStatusUpdate', (status: any) => {
    if (status?.duration) duration = status.duration;
    if (status?.didJustFinish) finish();
  });
  player.play();
  return { finished, stop: finish };
}

export const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
