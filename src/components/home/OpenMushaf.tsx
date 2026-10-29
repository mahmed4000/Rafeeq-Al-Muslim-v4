import React from 'react';
import { View, ViewStyle } from 'react-native';

// An open mushaf on a rahl (folding stand), drawn from plain views for the "now" card.
const W = 96;
const H = 112;
const GOLD = '#C69255';
const PAGE = '#FBF3E8';
const LINE = '#D8BE95';

const box = (left: number, top: number, width: number, height: number, backgroundColor: string, extra?: ViewStyle): ViewStyle => ({
  position: 'absolute', left, top, width, height, backgroundColor, ...extra
});

const Page: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  const left = side === 'left';
  return (
    <View
      style={box(left ? 6 : 49, 26, 41, 54, PAGE, {
        borderWidth: 1.5,
        borderColor: GOLD,
        borderTopLeftRadius: left ? 10 : 2,
        borderBottomLeftRadius: left ? 6 : 2,
        borderTopRightRadius: left ? 2 : 10,
        borderBottomRightRadius: left ? 2 : 6,
        transform: [{ rotate: left ? '-7deg' : '7deg' }]
      })}
    >
      {/* Ornamented frame and lines of text */}
      <View style={box(5, 5, 28, 4, GOLD, { borderRadius: 2, opacity: 0.8 })} />
      {[14, 21, 28, 35, 42].map((y) => <View key={y} style={box(5, y, 28, 2, LINE, { borderRadius: 1 })} />)}
    </View>
  );
};

export const OpenMushaf: React.FC = () => (
  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: W, height: H }}>
    {/* Rahl: two crossed boards */}
    <View style={box(18, 74, 60, 8, '#8C5E3C', { borderRadius: 4, transform: [{ rotate: '28deg' }] })} />
    <View style={box(18, 74, 60, 8, '#A87444', { borderRadius: 4, transform: [{ rotate: '-28deg' }] })} />
    <Page side="left" />
    <Page side="right" />
    {/* Spine */}
    <View style={box(46, 24, 4, 58, GOLD, { borderRadius: 2 })} />
  </View>
);
