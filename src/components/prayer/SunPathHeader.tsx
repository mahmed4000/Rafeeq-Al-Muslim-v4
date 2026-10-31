import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import type { SkyPhase } from '../home/SkyArch';
import { sceneColors } from '../home/SceneHeader';

export const SUN_PATH_HEIGHT = 300;

// The day's arc in a 390-wide frame (stretched to the screen width): it rises over the east
// edge at Fajr and sets over the west edge at Isha. In Arabic the day runs right to left.
const P0 = { x: 362, y: 262 };
// Peaks near y 80, above the countdown that sits under the arc.
const P1 = { x: 334, y: 18 };
const P2 = { x: 56, y: 18 };
const P3 = { x: 28, y: 262 };

function bezier(u: number, rtl: boolean) {
  const v = 1 - u;
  const x = v * v * v * P0.x + 3 * v * v * u * P1.x + 3 * v * u * u * P2.x + u * u * u * P3.x;
  const y = v * v * v * P0.y + 3 * v * v * u * P1.y + 3 * v * u * u * P2.y + u * u * u * P3.y;
  return { x: rtl ? x : 390 - x, y };
}

/**
 * Prayer tab header: the sky for the time of day, a small skyline, and the sun's path with each
 * prayer as a point on it (passed ones filled). Text goes in `children`, laid out normally.
 */
export const SunPathHeader: React.FC<{
  phase: SkyPhase;
  /** Each time's position in the day, 0 (Fajr) to 1 (Isha). */
  points: { at: number; passed: boolean; next: boolean }[];
  /** Where the sun is now (0–1), or null before Fajr and after Isha. */
  sunAt: number | null;
  rtl: boolean;
  children?: React.ReactNode;
}> = ({ phase, points, sunAt, rtl, children }) => {
  const s = sceneColors(phase);
  const path = rtl
    ? `M${P0.x} ${P0.y} C ${P1.x} ${P1.y}, ${P2.x} ${P2.y}, ${P3.x} ${P3.y}`
    : `M${390 - P0.x} ${P0.y} C ${390 - P1.x} ${P1.y}, ${390 - P2.x} ${P2.y}, ${390 - P3.x} ${P3.y}`;
  const sun = sunAt === null ? null : bezier(Math.max(0, Math.min(1, sunAt)), rtl);
  return (
    <View style={{ height: SUN_PATH_HEIGHT, overflow: 'hidden' }}>
      <LinearGradient colors={s.sky} locations={[0, 0.58, 1]} style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }} />
      <Svg width="100%" height={SUN_PATH_HEIGHT} viewBox={`0 0 390 ${SUN_PATH_HEIGHT}`} preserveAspectRatio="none" style={{ position: 'absolute', top: 0, left: 0 }}>
        {s.stars > 0 ? [[34, 60], [96, 40], [300, 36], [350, 78], [60, 112], [250, 66], [20, 140], [372, 140]].map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={i % 3 ? 1.1 : 1.5} fill="#FFF3DC" opacity={s.stars} />
        )) : null}
        {/* skyline */}
        <Path d="M0 266 Q 90 248 180 260 T 390 254 V300 H0Z" fill={s.hill} opacity={0.65} />
        <G fill={s.build}>
          <Rect x={0} y={266} width={390} height={34} />
          <Rect x={160} y={226} width={70} height={42} />
          <Path d="M168 226 Q195 190 222 226Z" />
          <Rect x={193} y={182} width={3} height={12} />
          <Rect x={128} y={202} width={18} height={66} />
          <Rect x={125} y={198} width={24} height={6} />
          <Path d="M131 198 Q137 186 143 198Z" />
          <Rect x={244} y={238} width={60} height={30} />
          <Rect x={86} y={244} width={40} height={24} />
        </G>
        <G fill={s.window} opacity={0.9}>
          <Path d="M176 242 h10 v16 h-10z M176 242 a5 5 0 0 1 10 0z" />
          <Path d="M190 242 h10 v16 h-10z M190 242 a5 5 0 0 1 10 0z" />
          <Path d="M204 242 h10 v16 h-10z M204 242 a5 5 0 0 1 10 0z" />
          <Path d="M133 216 h8 v12 h-8z M133 216 a4 4 0 0 1 8 0z" />
        </G>
        <Path d="M0 266 H390" stroke="#C69255" strokeWidth={1.2} opacity={0.7} />
        {/* the day's arc and its prayers */}
        <Path d={path} fill="none" stroke="rgba(255,246,234,0.5)" strokeWidth={1.5} strokeDasharray="3 5" />
        {points.map((pt, i) => {
          const { x, y } = bezier(pt.at, rtl);
          return (
            <Circle
              key={i}
              cx={x}
              cy={y}
              r={pt.next ? 6.5 : 4.5}
              fill={pt.passed ? '#F4D9A8' : 'rgba(20,14,10,0.35)'}
              stroke="#F4D9A8"
              strokeWidth={pt.next ? 2.5 : 1.5}
            />
          );
        })}
        {sun ? (
          <>
            <Circle cx={sun.x} cy={sun.y} r={22} fill={s.disk} opacity={0.22} />
            <Circle cx={sun.x} cy={sun.y} r={12} fill={s.disk} />
          </>
        ) : null}
      </Svg>
      {children}
    </View>
  );
};
