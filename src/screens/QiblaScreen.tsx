import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { computeQiblaBearing, computeDistanceToKaaba } from '../services/qiblaService';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';

export const QiblaScreen: React.FC = () => {
  const { goBack, theme, themeMode, t, currentCity, refreshLocation, triggerHaptic } = useApp();
  const { width: windowWidth } = useWindowDimensions();
  const c = theme;

  const [deviceHeading, setDeviceHeading] = useState(0);
  const [hasMagnetometer, setHasMagnetometer] = useState(true);

  const qiblaTarget = computeQiblaBearing(currentCity.lat, currentCity.lng);
  const distanceKm = computeDistanceToKaaba(currentCity.lat, currentCity.lng);

  // Compass angular difference (-180 to 180)
  let diff = (deviceHeading - qiblaTarget) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;

  const isAligned = Math.abs(diff) <= 4;
  const relativeAngle = ((qiblaTarget - deviceHeading) % 360 + 360) % 360;

  // Sensory haptic feedback on perfect Kaaba alignment
  const wasAlignedRef = useRef(false);
  useEffect(() => {
    if (isAligned && !wasAlignedRef.current) {
      triggerHaptic('success');
    }
    wasAlignedRef.current = isAligned;
  }, [isAligned]);

  useEffect(() => {
    let headingSub: any = null;
    let magSub: any = null;
    let isCancelled = false;

    (async () => {
      try {
        if (Platform.OS !== 'web') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            headingSub = await Location.watchHeadingAsync((data) => {
              if (isCancelled) return;
              const h = data.trueHeading != null && data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
              if (typeof h === 'number' && !isNaN(h)) {
                setDeviceHeading(h);
              }
            });
            return;
          }
        }
      } catch (e) {}

      // Fallback to Magnetometer
      try {
        if (Platform.OS !== 'web') {
          const avail = await Magnetometer.isAvailableAsync();
          setHasMagnetometer(avail);
          if (avail) {
            Magnetometer.setUpdateInterval(100);
            magSub = Magnetometer.addListener((data) => {
              if (isCancelled) return;
              let angle = Math.atan2(data.x, data.y) * (180 / Math.PI);
              if (angle < 0) angle += 360;
              setDeviceHeading(angle);
            });
          }
        }
      } catch (e) {}
    })();

    return () => {
      isCancelled = true;
      if (headingSub && headingSub.remove) headingSub.remove();
      if (magSub && magSub.remove) magSub.remove();
    };
  }, []);

  const compassDiameter = Math.min(windowWidth * 0.76, 300);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Header
        title={t('اتجاه القبلة', 'Qibla Direction')}
        subtitle={t('بوصلة دقيقة نحو الكعبة المشرفة', 'Compass to the Holy Kaaba')}
        onBack={goBack}
      />

      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingVertical: 20,
          paddingHorizontal: 20,
          paddingBottom: 110
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* City & Distance Info Card */}
        <View
          style={{
            width: '100%',
            maxWidth: 360,
            backgroundColor: c.surface,
            borderRadius: 16,
            padding: 14,
            marginBottom: 20,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderWidth: 1,
            borderColor: c.border
          }}
        >
          <View>
            <TextUI variant="caption" color={c.textSecondary}>
              {t('موقعك المباشر', 'Current Location')}
            </TextUI>
            <TextUI variant="h4" color={c.textPrimary}>
              {currentCity.nameAr}
            </TextUI>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <TextUI variant="caption" color={c.textSecondary}>
              {t('المسافة إلى مكة', 'Distance')}
            </TextUI>
            <TextUI variant="h4" color={TOKENS.colors.primary}>
              {toArabicNumber(distanceKm)} {t('كم', 'km')}
            </TextUI>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={refreshLocation}
            style={{
              padding: 8,
              borderRadius: TOKENS.radius.pill,
              backgroundColor: themeMode === 'light' ? TOKENS.colors.primaryLight : '#382A20'
            }}
          >
            <Feather name="navigation" size={16} color={TOKENS.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Alignment Status Banner */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: isAligned ? '#E8F5E9' : (themeMode === 'light' ? '#FFF5EA' : '#382A20'),
            paddingHorizontal: 16,
            paddingVertical: 10,
            borderRadius: TOKENS.radius.pill,
            marginBottom: 28,
            borderWidth: 1,
            borderColor: isAligned ? '#4CAF50' : TOKENS.colors.secondary
          }}
        >
          <Feather
            name={isAligned ? 'check-circle' : 'compass'}
            size={18}
            color={isAligned ? '#2E7D32' : TOKENS.colors.primary}
          />
          <TextUI
            size={14}
            weight="bold"
            color={isAligned ? '#2E7D32' : TOKENS.colors.primaryDark}
          >
            {isAligned
              ? t('محاذاة تامة نحو الكعبة المشرفة 🕋', 'Directly facing the Kaaba')
              : diff < 0
              ? `${t('أدر الهاتف يميناً بمقدار', 'Turn right by')} ${toArabicNumber(Math.abs(Math.round(diff)))}°`
              : `${t('أدر الهاتف يساراً بمقدار', 'Turn left by')} ${toArabicNumber(Math.abs(Math.round(diff)))}°`}
          </TextUI>
        </View>

        {/* Compass Dial Circle */}
        <View
          style={{
            width: compassDiameter,
            height: compassDiameter,
            borderRadius: compassDiameter / 2,
            backgroundColor: c.surface,
            borderWidth: 3.5,
            borderColor: isAligned ? '#4CAF50' : TOKENS.colors.secondary,
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            ...makeShadow(
              isAligned ? '0 8px 32px rgba(76, 175, 80, 0.45)' : '0 8px 30px rgba(0,0,0,0.08)',
              isAligned ? '#4CAF50' : '#000',
              isAligned ? 0.45 : 0.08,
              12
            )
          }}
        >
          {/* North Marker */}
          <View style={{ position: 'absolute', top: 10, alignItems: 'center' }}>
            <TextUI size={12} weight="bold" color="#E53935">ش</TextUI>
          </View>
          {/* South Marker */}
          <View style={{ position: 'absolute', bottom: 10, alignItems: 'center' }}>
            <TextUI size={12} weight="bold" color={c.textSecondary}>ج</TextUI>
          </View>
          {/* East Marker */}
          <View style={{ position: 'absolute', right: 10, alignItems: 'center' }}>
            <TextUI size={12} weight="bold" color={c.textSecondary}>ق</TextUI>
          </View>
          {/* West Marker */}
          <View style={{ position: 'absolute', left: 10, alignItems: 'center' }}>
            <TextUI size={12} weight="bold" color={c.textSecondary}>غ</TextUI>
          </View>

          {/* Rotating Qibla Needle */}
          <View
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ rotate: `${relativeAngle}deg` }]
            }}
          >
            {/* Kaaba Top Pointer */}
            <View style={{ alignItems: 'center', position: 'absolute', top: 22 }}>
              <View
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: isAligned ? '#2E7D32' : TOKENS.colors.primaryDark,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TextUI size={16}>🕋</TextUI>
              </View>
              <View
                style={{
                  width: 4,
                  height: 48,
                  backgroundColor: isAligned ? '#2E7D32' : TOKENS.colors.primary,
                  borderRadius: 2
                }}
              />
            </View>

            {/* Center Pivot */}
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 9,
                backgroundColor: TOKENS.colors.secondary,
                borderWidth: 3,
                borderColor: '#FFFFFF'
              }}
            />
          </View>
        </View>

        {/* Degrees & Calibration Note */}
        <View style={{ marginTop: 28, alignItems: 'center' }}>
          <TextUI size={24} weight="bold" color={TOKENS.colors.primaryDark}>
            {toArabicNumber(qiblaTarget)}°
          </TextUI>
          <TextUI size={13} color={c.textSecondary} style={{ marginTop: 4 }}>
            {t('زاوية القبلة من الشمال الحقيقي', 'Qibla Bearing from True North')}
          </TextUI>
        </View>
      </ScrollView>
    </View>
  );
};
