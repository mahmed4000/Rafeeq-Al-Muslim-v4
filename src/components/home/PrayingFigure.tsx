import React from 'react';
import { Image, View } from 'react-native';

// Line drawing of a person sitting in prayer (orange-to-green), for the adhkar "now" card.
const W = 96;
const H = 112;

export const PrayingFigure: React.FC = () => (
  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
    <Image source={require('../../../assets/praying-figure.png')} resizeMode="contain" style={{ width: Math.round(104 * 279 / 441), height: 104 }} />
  </View>
);
