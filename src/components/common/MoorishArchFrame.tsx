import React from 'react';
import { View, Platform, ViewStyle } from 'react-native';

interface MoorishArchFrameProps {
  width?: ViewStyle['width'];
  height?: number;
  color?: string;
  opacity?: number;
}

export const MoorishArchFrame: React.FC<MoorishArchFrameProps> = ({
  width = '100%',
  height = 32,
  color = '#C69255',
  opacity = 0.85
}) => {
  if (Platform.OS === 'web') {
    return (
      <View style={{ width, height, opacity, alignItems: 'center', justifyContent: 'center' }}>
        <svg
          viewBox="0 0 300 36"
          preserveAspectRatio="none"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            pointerEvents: 'none'
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="archGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={color} stopOpacity="0.05" />
              <stop offset="25%" stopColor={color} stopOpacity="0.75" />
              <stop offset="50%" stopColor="#FFF2D6" stopOpacity="1" />
              <stop offset="75%" stopColor={color} stopOpacity="0.75" />
              <stop offset="100%" stopColor={color} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M 6 34 L 94 34 C 112 34 120 25 132 15 C 141 8 147 4 150 2 C 153 4 159 8 168 15 C 180 25 188 34 206 34 L 294 34"
            stroke="url(#archGrad)"
            strokeWidth="1.6"
            fill="none"
          />
        </svg>
      </View>
    );
  }

  // Native View-based authentic Moorish Arch representation
  return (
    <View
      style={{
        width,
        height,
        opacity,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: 16
      }}
    >
      <View style={{ height: 1.5, flex: 1, backgroundColor: color, opacity: 0.4 }} />
      <View
        style={{
          width: 32,
          height: 16,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderWidth: 1.5,
          borderBottomWidth: 0,
          borderColor: color,
          marginHorizontal: 8,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />
      </View>
      <View style={{ height: 1.5, flex: 1, backgroundColor: color, opacity: 0.4 }} />
    </View>
  );
};
