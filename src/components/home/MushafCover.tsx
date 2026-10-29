import React from 'react';
import { Image, View } from 'react-native';

// Photo of a closed mushaf (gold-tooled cover, background cut out) for the "now" card.
const W = 96;
const H = 112;

export const MushafCover: React.FC = () => (
  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
    <Image source={require('../../../assets/mushaf-cover.png')} resizeMode="contain" style={{ width: Math.round(H * 200 / 360), height: H }} />
  </View>
);
