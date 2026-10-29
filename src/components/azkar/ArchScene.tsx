import React from 'react';
import { View, ViewStyle } from 'react-native';

// Small scenes inside the arch of each adhkar tile, drawn from plain views on a
// 100×86 frame (ground line at 70). Shapes only; no imagery.
const W = 100;
const H = 86;

const NIGHT = '#2E3A5C';
const SAND = '#F2E3CF';
const DAY = '#F6E7CF';
const DAWN = '#E9A979';
const MINT = '#E3EBDD';
const WATER = '#DCE9EE';
const MOON = '#F4D9A8';
const STAR = '#FFF3DC';

const box = (left: number, top: number, width: number, height: number, backgroundColor: string, extra?: ViewStyle): ViewStyle => ({
  position: 'absolute', left, top, width, height, backgroundColor, ...extra
});
const dot = (x: number, y: number, r: number, color: string, extra?: ViewStyle) => box(x - r, y - r, r * 2, r * 2, color, { borderRadius: r, ...extra });

const Stars = () => (
  <>
    {[[18, 18, 1.3], [80, 14, 1.1], [86, 40, 1], [24, 46, 1], [64, 30, 0.9]].map(([x, y, r], i) => <View key={i} style={dot(x, y, r, STAR)} />)}
  </>
);
const Crescent: React.FC<{ x: number; y: number; r: number; sky: string }> = ({ x, y, r, sky }) => (
  <>
    <View style={dot(x, y, r, MOON)} />
    <View style={dot(x + r * 0.45, y - r * 0.3, r * 0.85, sky)} />
  </>
);
const Ground: React.FC<{ color: string }> = ({ color }) => <View style={box(-20, 68, W + 40, 40, color, { borderTopLeftRadius: 70, borderTopRightRadius: 70 })} />;
const Arch: React.FC<{ x: number; top: number; w: number; color: string }> = ({ x, top, w, color }) => (
  <View style={box(x, top, w, H - top, color, { borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2 })} />
);

type SceneDef = { sky: string; draw: () => React.ReactNode };

export const ARCH_SCENES: Record<string, SceneDef> = {
  morning: { sky: DAY, draw: () => (<><View style={dot(50, 50, 22, '#F7D7A3', { opacity: 0.6 })} /><View style={dot(50, 50, 15, '#F0B77F')} /><Ground color="#C69255" /></>) },
  evening: { sky: NIGHT, draw: () => (<><Stars /><Crescent x={46} y={36} r={14} sky={NIGHT} /><Ground color="#4A3446" /></>) },
  prayer_azkar: { sky: SAND, draw: () => (<><Arch x={28} top={22} w={44} color="#8C5E3C" /><Arch x={38} top={34} w={24} color={DAY} /><View style={box(20, 80, 60, 6, '#C69255')} /></>) },
  after_prayer: { sky: SAND, draw: () => (<><Arch x={28} top={22} w={44} color="#5D3A22" /><View style={box(49, 34, 2, 12, '#C69255')} /><View style={dot(50, 50, 5, '#F2C98D')} /></>) },
  masjid: {
    sky: DAY,
    draw: () => (
      <>
        <View style={box(49, 16, 2, 12, '#8C5E3C')} />
        {/* Crescent finial (horns up): a ring showing only its lower edge */}
        <View style={{ position: 'absolute', left: 45, top: 6, width: 10, height: 10, borderRadius: 5, borderBottomWidth: 2.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: '#C69255' }} />
        <View style={box(32, 28, 36, 26, '#8C5E3C', { borderTopLeftRadius: 18, borderTopRightRadius: 18 })} />
        <View style={box(20, 52, 60, 34, '#8C5E3C')} />
        {[30, 46, 62].map((x) => <View key={x} style={box(x, 62, 8, 14, DAY, { borderTopLeftRadius: 4, borderTopRightRadius: 4 })} />)}
      </>
    )
  },
  sleep: { sky: NIGHT, draw: () => (<><Stars /><Crescent x={52} y={44} r={18} sky={NIGHT} /></>) },
  waking: { sky: DAWN, draw: () => (<><View style={dot(50, 70, 24, '#FFE3B8', { opacity: 0.5 })} /><View style={dot(50, 70, 16, '#FFE3B8')} /><Ground color="#8A4E3E" /></>) },
  karb: {
    sky: MINT,
    draw: () => (
      <>
        <View style={box(30, 30, 18, 46, '#4E7D5B', { borderTopLeftRadius: 9, borderTopRightRadius: 9, transform: [{ rotate: '-14deg' }] })} />
        <View style={box(52, 30, 18, 46, '#4E7D5B', { borderTopLeftRadius: 9, borderTopRightRadius: 9, transform: [{ rotate: '14deg' }] })} />
      </>
    )
  },
  wudu_home: { sky: WATER, draw: () => <View style={box(36, 34, 28, 28, '#6C9AB0', { borderRadius: 14, borderTopLeftRadius: 0, transform: [{ rotate: '45deg' }] })} /> },
  food_travel: {
    sky: DAY,
    draw: () => (
      <>
        <View style={dot(76, 24, 8, '#F0B77F')} />
        <Ground color="#C69255" />
        {[[47, 70, 6, 6], [48, 59, 4, 5], [49, 51, 2, 4]].map(([x, y, w, h], i) => <View key={i} style={box(x, y, w, h, DAY)} />)}
      </>
    )
  },
  duas: { sky: SAND, draw: () => <View style={box(34, 28, 32, 32, '#C69255', { borderTopLeftRadius: 30, borderBottomRightRadius: 30, transform: [{ rotate: '-45deg' }] })} /> },
  tasbih: {
    sky: NIGHT,
    draw: () => (
      <>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return <View key={i} style={dot(50 + Math.cos(a) * 22, 44 + Math.sin(a) * 22, 4, MOON)} />;
        })}
        <View style={box(48, 66, 4, 14, MOON, { borderRadius: 2 })} />
      </>
    )
  }
};

/** The arch window of a tile: the scene for `id`, framed with a horseshoe-like top. */
export const ArchScene: React.FC<{ id: string; border: string; dim?: boolean }> = ({ id, border, dim }) => {
  const scene = ARCH_SCENES[id] || ARCH_SCENES.duas;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height: H, alignSelf: 'stretch', borderTopLeftRadius: 44, borderTopRightRadius: 44, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: 'hidden', backgroundColor: scene.sky, borderWidth: 1.5, borderColor: border }}
    >
      <View style={{ position: 'absolute', top: 0, width: W, height: H, left: '50%', marginLeft: -W / 2 }}>{scene.draw()}</View>
      {dim ? <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.22)' }} /> : null}
    </View>
  );
};
