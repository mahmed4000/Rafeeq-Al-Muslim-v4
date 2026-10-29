import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { SkyPhase } from './SkyArch';

// The scene is drawn on a fixed 390-wide frame centred in the header; the ground,
// hills and low walls run the full width so wider screens stay continuous.
const FRAME = 390;
export const SCENE_HEIGHT = 330;

type Scene = {
  sky: [string, string, string];
  disk: string;
  diskTop: number;
  hill: string;
  build: string;
  window: string;
  ground: string;
  stars: number;
};

const SCENES: Record<SkyPhase, Scene> = {
  night: { sky: ['#141B2E', '#24304D', '#3B3550'], disk: '#F4E6C4', diskTop: 26, hill: '#2B2840', build: '#2A1F2A', window: '#E8B86A', ground: '#1E161E', stars: 1 },
  dawn: { sky: ['#2E3A5C', '#8C7A9A', '#E9B78A'], disk: '#F7D9A6', diskTop: 150, hill: '#5B4A5E', build: '#4A3446', window: '#F2C98D', ground: '#3A2836', stars: 0.5 },
  day: { sky: ['#5F8FA8', '#A9C4C8', '#EBD9BC'], disk: '#FFF1C9', diskTop: 22, hill: '#C9B08E', build: '#9A6B42', window: '#5D3A22', ground: '#7A4E2F', stars: 0 },
  afternoon: { sky: ['#B9875A', '#DDA674', '#F2CF9E'], disk: '#FFE9C2', diskTop: 112, hill: '#B98454', build: '#7E5233', window: '#F2C98D', ground: '#5D3A22', stars: 0 },
  dusk: { sky: ['#6B4A6E', '#C9785A', '#F0B77F'], disk: '#FFD9A0', diskTop: 150, hill: '#8A4E3E', build: '#5D3A22', window: '#F2C98D', ground: '#4A2E1C', stars: 0.35 }
};

const STARS = [[30, 40, 2.5], [120, 26, 2], [200, 58, 3], [252, 30, 2], [350, 70, 2.5], [160, 96, 2], [70, 104, 2]];

const box = (left: number, top: number, width: number, height: number, backgroundColor: string, extra?: ViewStyle): ViewStyle => ({
  position: 'absolute', left, top, width, height, backgroundColor, ...extra
});

/** Arch-topped window (horseshoe-like: rounded top, straight sides). */
const windowStyle = (left: number, top: number, width: number, height: number, color: string): ViewStyle =>
  box(left, top, width, height, color, { borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2 });

/** Decorative sky and Andalusian skyline for the current part of the day. */
export const SceneBackdrop: React.FC<{ phase: SkyPhase }> = ({ phase }) => {
  const s = SCENES[phase];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: SCENE_HEIGHT, overflow: 'hidden' }}>
      <LinearGradient colors={s.sky} locations={[0, 0.55, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      {/* Full-width layers */}
      <View style={{ position: 'absolute', left: -60, right: -60, top: 234, height: 160, borderRadius: 400, backgroundColor: s.hill, opacity: 0.55 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 250, height: 40, backgroundColor: s.build }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 288, bottom: 0, backgroundColor: s.ground }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 288, height: 1.5, backgroundColor: '#C69255', opacity: 0.7 }} />

      {/* Centred frame */}
      <View style={{ position: 'absolute', top: 0, height: 288, width: FRAME, left: '50%', marginLeft: -FRAME / 2 }}>
        {STARS.map(([x, y, r], i) => (
          <View key={i} style={box(x, y, r, r, '#FFF3DC', { borderRadius: r / 2, opacity: s.stars })} />
        ))}
        {/* Sun or moon on the centre line (over the dome), so it sits clear of the text when the layout mirrors */}
        <View style={box(FRAME / 2 - 52, s.diskTop - 18, 104, 104, s.disk, { borderRadius: 52, opacity: 0.18 })} />
        <View style={box(FRAME / 2 - 34, s.diskTop, 68, 68, s.disk, { borderRadius: 34 })} />

        {/* Square minaret */}
        <View style={box(74, 66, 2, 16, s.build)} />
        <View style={box(66, 80, 18, 14, s.build, { borderTopLeftRadius: 9, borderTopRightRadius: 9 })} />
        <View style={box(66, 92, 18, 26, s.build)} />
        <View style={box(54, 116, 42, 10, s.build)} />
        <View style={box(58, 124, 34, 166, s.build)} />
        <View style={windowStyle(68, 140, 14, 22, s.window)} />
        <View style={windowStyle(68, 186, 14, 22, s.window)} />

        {/* Domed hall */}
        <View style={box(175, 144, 8, 8, s.build, { borderRadius: 4 })} />
        <View style={box(177, 150, 4, 22, s.build)} />
        <View style={box(134, 168, 90, 48, s.build, { borderTopLeftRadius: 45, borderTopRightRadius: 45 })} />
        <View style={box(104, 214, 150, 76, s.build)} />
        {[116, 140, 164, 188, 212, 236].map((x) => <View key={x} style={windowStyle(x, 244, 14, 30, s.window)} />)}

        {/* Side wing */}
        <View style={box(254, 236, 136, 54, s.build)} />
        {[268, 296, 324, 352].map((x) => <View key={x} style={windowStyle(x, 252, 12, 24, s.window)} />)}
      </View>

      {/* Darker top edge so the header text stays readable on every sky */}
      <LinearGradient colors={['rgba(30,20,14,0.45)', 'rgba(30,20,14,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 220 }} />
    </View>
  );
};
