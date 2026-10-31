import React from 'react';
import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { TextUI } from '../../common/TextUI';
import { usePalette } from '../../../theme/palette';

// An eight-pointed star (two overlapping squares) as `count` points around (cx, cy),
// alternating between the outer radius and the inner corner where the squares cross.
const starPoints = (cx: number, cy: number, outer: number) => {
  const inner = outer * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8);
  return Array.from({ length: 16 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + index * Math.PI / 8;
    return `${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');
};

const STAR = 64;
const SMALL = 22;

// A rule that thins out toward the page edge; `side` is the edge it points to.
const TaperedRule = ({ side, color }: { side: 'left' | 'right'; color: string }) => (
  <View style={{ flex: 1, height: 4 }}>
    <Svg width="100%" height="100%" viewBox="0 0 100 4" preserveAspectRatio="none">
      <Polygon points={side === 'left' ? '0,2 100,0.6 100,3.4' : '100,2 0,0.6 0,3.4'} fill={color} />
    </Svg>
  </View>
);

const SmallStar = ({ line, fill }: { line: string; fill: string }) => (
  <Svg width={SMALL} height={SMALL} viewBox={`0 0 ${SMALL} ${SMALL}`}>
    <Polygon points={starPoints(SMALL / 2, SMALL / 2, SMALL / 2 - 1)} fill={fill} stroke={line} strokeWidth={1.4} strokeLinejoin="miter" />
    <Polygon points={starPoints(SMALL / 2, SMALL / 2, SMALL / 2 - 5.5)} fill="none" stroke={line} strokeWidth={0.9} />
  </Svg>
);

// Page number in the geometric-star frame that matches the surah banner.
export const PageNumberStar: React.FC<{ label: string }> = ({ label }) => {
  const p = usePalette();
  const line = p.muted;
  const rule = p.accent;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TaperedRule side="left" color={rule} />
      <View style={{ marginHorizontal: 8 }}><SmallStar line={line} fill={p.bg} /></View>
      <View style={{ width: STAR, height: STAR, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={STAR} height={STAR} viewBox={`0 0 ${STAR} ${STAR}`} style={{ position: 'absolute', top: 0, left: 0 }}>
          <Polygon points={starPoints(STAR / 2, STAR / 2, STAR / 2 - 1.5)} fill={p.soft} stroke={line} strokeWidth={1.8} />
          <Polygon points={starPoints(STAR / 2, STAR / 2, STAR / 2 - 6)} fill="none" stroke={rule} strokeWidth={1.1} />
        </Svg>
        <TextUI quran size={label.length > 2 ? 17 : 20} weight="bold" color={p.ink}>{label}</TextUI>
      </View>
      <View style={{ marginHorizontal: 8 }}><SmallStar line={line} fill={p.bg} /></View>
      <TaperedRule side="right" color={rule} />
    </View>
  );
};
