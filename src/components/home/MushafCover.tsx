import React from 'react';
import { Image, View } from 'react-native';

// Photo of an open mushaf (background cut out) for the "now" card.
const W = 124;
const H = 112;

export const MushafCover: React.FC = () => (
  <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: W, height: H, alignItems: 'center', justifyContent: 'center' }}>
    <Image source={require('../../../assets/mushaf-open.png')} resizeMode="contain" style={{ width: W, height: Math.round(W * 245 / 420) }} />
  </View>
);
