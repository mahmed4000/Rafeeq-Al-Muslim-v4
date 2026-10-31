import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';
import { TextUI } from '../common/TextUI';

// The Haramain lessons banner: a warm dusk panel with a mosque silhouette on the left,
// shared by the library's featured card and the banner near the end of Home.
export const HaramainBanner: React.FC<{
  eyebrow: string;
  title: string;
  subtitle: string;
  cta: string;
  onPress: () => void;
  height?: number;
}> = ({ eyebrow, title, subtitle, cta, onPress, height = 170 }) => (
  <TouchableOpacity activeOpacity={0.88} accessibilityRole="button" accessibilityLabel={`${eyebrow}: ${title}`} onPress={onPress} style={{ borderRadius: 24, overflow: 'hidden', minHeight: height, backgroundColor: '#5D3A22' }}>
    <Svg width="100%" height="100%" viewBox="0 0 358 170" preserveAspectRatio="xMinYMax slice" style={{ position: 'absolute', top: 0, left: 0 }}>
      <Path d="M0 0 H358 V170 H0Z" fill="#7A4E2F" />
      <Path d="M200 0 H358 V170 H160Z" fill="#A86A3E" opacity={0.55} />
      <G fill="#2D1E16" opacity={0.55}>
        <Rect x={20} y={70} width={14} height={100} />
        <Path d="M20 70 Q27 56 34 70Z" />
        <Rect x={40} y={110} width={110} height={60} />
        <Path d="M60 110 Q95 66 130 110Z" />
        <Rect x={156} y={82} width={12} height={88} />
        <Path d="M156 82 Q162 70 168 82Z" />
      </G>
      <G fill="#F2C98D" opacity={0.8}>
        <Path d="M58 128 h10 v18 h-10z M58 128 a5 5 0 0 1 10 0z" />
        <Path d="M82 128 h10 v18 h-10z M82 128 a5 5 0 0 1 10 0z" />
        <Path d="M106 128 h10 v18 h-10z M106 128 a5 5 0 0 1 10 0z" />
      </G>
    </Svg>
    <View style={{ width: '52%', alignSelf: 'flex-start', padding: 18, gap: 4, justifyContent: 'center', minHeight: height }}>
      <TextUI size={12.5} weight="bold" color="#F4D9A8">{eyebrow}</TextUI>
      <TextUI size={18} weight="bold" color="#FFFDF9" numberOfLines={2}>{title}</TextUI>
      <TextUI size={12.5} color="#F1DCC0" numberOfLines={2}>{subtitle}</TextUI>
      <View style={{ alignSelf: 'flex-start', marginTop: 6, minHeight: 38, paddingHorizontal: 16, borderRadius: 12, justifyContent: 'center', backgroundColor: '#F4D9A8' }}>
        <TextUI size={14} weight="bold" color="#2D1E16">{cta}</TextUI>
      </View>
    </View>
  </TouchableOpacity>
);
