import React from 'react';
import { View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { SkyPhase } from './SkyArch';

// The scene is drawn on a fixed 390-wide frame centred in the header; the ground,
// hills and low walls run the full width so wider screens stay continuous.
const FRAME = 390;
export const SCENE_HEIGHT = 330;
const GROUND = 288;
const DISK_X = 336; // centre of the sun/moon in the frame
const CRESCENT_GOLD = '#D9A75A';

type Scene = {
  sky: [string, string, string];
  disk: string;
  diskTop: number;
  hill: string;
  build: string;
  /** Lit windows and carved trim. */
  window: string;
  ground: string;
  palm: string;
  cloud: string;
  clouds: number;
  stars: number;
};

const SCENES: Record<SkyPhase, Scene> = {
  night: { sky: ['#141B2E', '#24304D', '#3B3550'], disk: '#F4E6C4', diskTop: 66, hill: '#2B2840', build: '#2A1F2A', window: '#E8B86A', ground: '#1E161E', palm: '#161118', cloud: '#4A4766', clouds: 0.35, stars: 1 },
  dawn: { sky: ['#2E3A5C', '#8C7A9A', '#E9B78A'], disk: '#F7D9A6', diskTop: 112, hill: '#5B4A5E', build: '#4A3446', window: '#F2C98D', ground: '#3A2836', palm: '#33243A', cloud: '#F3D3C0', clouds: 0.55, stars: 0.6 },
  day: { sky: ['#5F8FA8', '#A9C4C8', '#EBD9BC'], disk: '#FFF1C9', diskTop: 66, hill: '#C9B08E', build: '#9A6B42', window: '#5D3A22', ground: '#7A4E2F', palm: '#6B4A2A', cloud: '#FFFFFF', clouds: 0.75, stars: 0 },
  afternoon: { sky: ['#B9875A', '#DDA674', '#F2CF9E'], disk: '#FFE9C2', diskTop: 92, hill: '#B98454', build: '#7E5233', window: '#F2C98D', ground: '#5D3A22', palm: '#5A3A22', cloud: '#FBE7CB', clouds: 0.6, stars: 0 },
  dusk: { sky: ['#6B4A6E', '#C9785A', '#F0B77F'], disk: '#FFD9A0', diskTop: 112, hill: '#8A4E3E', build: '#5D3A22', window: '#F2C98D', ground: '#4A2E1C', palm: '#3A2416', cloud: '#F2B9A0', clouds: 0.6, stars: 0.4 }
};

// [x, y, size] in the 390 frame.
const STARS = [
  [22, 34, 3], [64, 18, 2], [98, 52, 2.5], [130, 24, 3.5], [214, 44, 2], [246, 16, 3], [282, 58, 2.5],
  [318, 26, 3.5], [358, 48, 2], [40, 86, 2], [110, 98, 2.5], [300, 96, 2], [372, 92, 3], [176, 78, 2]
];
// [x, y, scale] — kept low, near the horizon, so they never sit behind the countdown text
// (the frame mirrors in native RTL, so either side can end up under the text).
const CLOUDS = [[-8, 168, 0.9], [298, 182, 0.8]];
// [x of trunk base, trunk height, lean in degrees]
const PALMS = [[22, 64, -6], [372, 72, 5], [344, 52, -4]];

const box = (left: number, top: number, width: number, height: number, backgroundColor: string, extra?: ViewStyle): ViewStyle => ({
  position: 'absolute', left, top, width, height, backgroundColor, ...extra
});

/** Arch-topped window (horseshoe-like: rounded top, straight sides). */
const windowStyle = (left: number, top: number, width: number, height: number, color: string): ViewStyle =>
  box(left, top, width, height, color, { borderTopLeftRadius: width / 2, borderTopRightRadius: width / 2 });

/**
 * Crescent finial (horns up), centred on x with its bottom at y: a ring that shows only its
 * lower edge, so it reads as a crescent over any sky colour.
 */
const Crescent: React.FC<{ x: number; y: number; size: number }> = ({ x, y, size }) => (
  <View
    style={{
      position: 'absolute', left: x - size / 2, top: y - size + 2, width: size, height: size, borderRadius: size / 2,
      borderBottomWidth: Math.max(2.5, size * 0.24), borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: CRESCENT_GOLD
    }}
  />
);

/** A row of merlons (stepped battlements) along a roof line. */
const Merlons: React.FC<{ left: number; width: number; top: number; color: string; size?: number }> = ({ left, width, top, color, size = 6 }) => {
  const count = Math.floor(width / (size * 2));
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={box(left + i * size * 2 + size / 2, top - size, size, size, color, { borderTopLeftRadius: 1.5, borderTopRightRadius: 1.5 })} />
      ))}
    </>
  );
};

const Cloud: React.FC<{ x: number; y: number; k: number; color: string; opacity: number }> = ({ x, y, k, color, opacity }) => (
  <View style={{ position: 'absolute', left: x, top: y, width: 96 * k, height: 34 * k, opacity }}>
    <View style={box(0, 16 * k, 96 * k, 18 * k, color, { borderRadius: 9 * k })} />
    <View style={box(14 * k, 6 * k, 30 * k, 26 * k, color, { borderRadius: 15 * k })} />
    <View style={box(36 * k, 0, 38 * k, 32 * k, color, { borderRadius: 19 * k })} />
  </View>
);

/** Date palm: a slightly leaning trunk and a crown of fronds. */
const Palm: React.FC<{ x: number; height: number; lean: number; color: string }> = ({ x, height, lean, color }) => {
  const top = GROUND - height;
  const fronds = [-150, -115, -80, -45, -10, 25];
  return (
    <View style={{ position: 'absolute', left: x - 20, top: top - 20, width: 40, height: height + 20, transform: [{ rotate: `${lean}deg` }] }}>
      <View style={box(18, 20, 4, height, color, { borderRadius: 2 })} />
      {fronds.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <View
            key={deg}
            style={box(20 + Math.cos(rad) * 12 - 15, 20 + Math.sin(rad) * 12 - 3.5, 30, 7, color, { borderRadius: 4, transform: [{ rotate: `${deg}deg` }] })}
          />
        );
      })}
    </View>
  );
};

/** Decorative sky and Andalusian skyline for the current part of the day. */
export const SceneBackdrop: React.FC<{ phase: SkyPhase }> = ({ phase }) => {
  const s = SCENES[phase];
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: SCENE_HEIGHT, overflow: 'hidden' }}>
      <LinearGradient colors={s.sky} locations={[0, 0.55, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      {/* Full-width layers */}
      <View style={{ position: 'absolute', left: -60, right: -60, top: 234, height: 160, borderRadius: 400, backgroundColor: s.hill, opacity: 0.55 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 254, height: 36, backgroundColor: s.build }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: GROUND, bottom: 0, backgroundColor: s.ground }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: GROUND, height: 1.5, backgroundColor: '#C69255', opacity: 0.7 }} />

      {/* Centred frame */}
      <View style={{ position: 'absolute', top: 0, height: GROUND, width: FRAME, left: '50%', marginLeft: -FRAME / 2 }}>
        {s.stars > 0 && STARS.map(([x, y, r], i) => (
          <View key={i} style={box(x, y, r, r, '#FFF3DC', { borderRadius: r / 2, opacity: s.stars * (i % 3 === 0 ? 1 : 0.7) })} />
        ))}
        {CLOUDS.map(([x, y, k], i) => <Cloud key={i} x={x} y={y} k={k} color={s.cloud} opacity={s.clouds} />)}

        {/* Sun or moon above the wing, beside the centred countdown; kept above the city pill's
            height because the frame mirrors in native RTL and either side can hold the pill */}
        <View style={box(DISK_X - 45, s.diskTop - 15, 90, 90, s.disk, { borderRadius: 45, opacity: 0.18 })} />
        <View style={box(DISK_X - 30, s.diskTop, 60, 60, s.disk, { borderRadius: 30 })} />

        {/* Square minaret with lantern, merlons, carved bands and a lattice panel */}
        <View style={box(74, 58, 2, 20, s.build)} />
        <Crescent x={75} y={52} size={13} />
        <View style={box(66, 78, 18, 16, s.build, { borderTopLeftRadius: 9, borderTopRightRadius: 9 })} />
        <View style={box(66, 92, 18, 26, s.build)} />
        <View style={windowStyle(71, 98, 8, 14, s.window)} />
        <Merlons left={54} width={42} top={116} color={s.build} />
        <View style={box(54, 116, 42, 10, s.build)} />
        <View style={box(58, 124, 34, 166, s.build)} />
        <View style={box(58, 130, 34, 2, s.window, { opacity: 0.55 })} />
        <View style={windowStyle(68, 140, 14, 22, s.window)} />
        <View style={box(58, 172, 34, 2, s.window, { opacity: 0.55 })} />
        <View style={windowStyle(68, 182, 14, 22, s.window)} />
        <View style={box(58, 214, 34, 2, s.window, { opacity: 0.55 })} />
        {[0, 1, 2].map((row) => [0, 1, 2].map((col) => (
          <View key={`${row}-${col}`} style={box(63 + col * 9, 224 + row * 10, 6, 6, s.window, { opacity: 0.5, transform: [{ rotate: '45deg' }] })} />
        )))}

        {/* Domed hall with merlons and a ribbed drum */}
        <View style={box(177, 142, 4, 28, s.build)} />
        <View style={box(175, 150, 8, 8, s.build, { borderRadius: 4 })} />
        <Crescent x={179} y={134} size={16} />
        <View style={box(134, 168, 90, 48, s.build, { borderTopLeftRadius: 45, borderTopRightRadius: 45 })} />
        <View style={box(132, 208, 94, 4, s.window, { opacity: 0.45 })} />
        <Merlons left={104} width={30} top={214} color={s.build} />
        <Merlons left={226} width={30} top={214} color={s.build} />
        <View style={box(104, 214, 150, 76, s.build)} />
        <View style={box(104, 236, 150, 2, s.window, { opacity: 0.4 })} />
        {[116, 140, 164, 188, 212, 236].map((x) => <View key={x} style={windowStyle(x, 244, 14, 30, s.window)} />)}

        {/* Side wing with merlons */}
        <Merlons left={254} width={136} top={236} color={s.build} />
        <View style={box(254, 236, 136, 54, s.build)} />
        {[268, 296, 324, 352].map((x) => <View key={x} style={windowStyle(x, 252, 12, 24, s.window)} />)}

        {PALMS.map(([x, h, lean]) => <Palm key={x} x={x} height={h} lean={lean} color={s.palm} />)}
      </View>

      {/* Darker top edge so the header text stays readable on every sky */}
      <LinearGradient colors={['rgba(30,20,14,0.45)', 'rgba(30,20,14,0)']} style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 220 }} />
    </View>
  );
};
