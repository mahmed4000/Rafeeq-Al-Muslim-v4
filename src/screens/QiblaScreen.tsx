import React, { useState, useEffect, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Magnetometer } from 'expo-sensors';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { ScreenHeader } from '../ui/ScreenHeader';
import { usePalette } from '../theme/palette';
import { computeQiblaBearing, computeDistanceToKaaba } from '../services/qiblaService';
import { toArabicNumber } from '../services/prayerCalculation';

const ALIGN_TOLERANCE = 4; // degrees

export const QiblaScreen: React.FC = () => {
  const { goBack, t, currentCity, refreshLocation, triggerHaptic } = useApp();
  const p = usePalette();
  const { width: windowWidth } = useWindowDimensions();

  const [deviceHeading, setDeviceHeading] = useState(0);
  // null until the first reading; false when no sensor is available (e.g. web).
  const [sensorLive, setSensorLive] = useState<boolean | null>(null);
  const [lowAccuracy, setLowAccuracy] = useState(false);

  const qiblaTarget = computeQiblaBearing(currentCity.lat, currentCity.lng);
  const distanceKm = computeDistanceToKaaba(currentCity.lat, currentCity.lng);

  // Signed difference between where the phone points and the Qibla (-180..180).
  let diff = (deviceHeading - qiblaTarget) % 360;
  if (diff < -180) diff += 360;
  if (diff > 180) diff -= 360;

  const isAligned = sensorLive === true && Math.abs(diff) <= ALIGN_TOLERANCE;
  // Without a live sensor, show the bearing with north at the top.
  const needleAngle = sensorLive ? ((qiblaTarget - deviceHeading) % 360 + 360) % 360 : qiblaTarget;

  const wasAlignedRef = useRef(false);
  useEffect(() => {
    if (isAligned && !wasAlignedRef.current) triggerHaptic('success');
    wasAlignedRef.current = isAligned;
  }, [isAligned, triggerHaptic]);

  useEffect(() => {
    let headingSub: any = null;
    let magSub: any = null;
    let isCancelled = false;

    (async () => {
      if (Platform.OS === 'web') {
        setSensorLive(false);
        return;
      }
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          headingSub = await Location.watchHeadingAsync((data) => {
            if (isCancelled) return;
            const h = data.trueHeading != null && data.trueHeading >= 0 ? data.trueHeading : data.magHeading;
            if (typeof h === 'number' && !isNaN(h)) {
              setDeviceHeading(h);
              setSensorLive(true);
              // Android reports 0–3; low values mean the compass needs calibrating.
              setLowAccuracy(typeof data.accuracy === 'number' && data.accuracy < 2);
            }
          });
          return;
        }
      } catch {}

      // Fallback: raw magnetometer (no tilt or declination correction).
      try {
        const avail = await Magnetometer.isAvailableAsync();
        if (!avail) {
          setSensorLive(false);
          return;
        }
        Magnetometer.setUpdateInterval(100);
        magSub = Magnetometer.addListener((data) => {
          if (isCancelled) return;
          let angle = Math.atan2(data.x, data.y) * (180 / Math.PI);
          if (angle < 0) angle += 360;
          setDeviceHeading(angle);
          setSensorLive(true);
        });
      } catch {
        setSensorLive(false);
      }
    })();

    return () => {
      isCancelled = true;
      if (headingSub && headingSub.remove) headingSub.remove();
      if (magSub && magSub.remove) magSub.remove();
    };
  }, []);

  const dial = Math.min(windowWidth - 80, 290);

  const statusChip = () => {
    if (sensorLive === false) {
      return { bg: p.soft, fg: p.primaryInk, icon: 'info' as const, text: 'البوصلة غير متاحة هنا · الاتجاه من الشمال' };
    }
    if (isAligned) return { bg: p.successBg, fg: p.successInk, icon: 'check' as const, text: 'أنت متجه نحو القبلة' };
    const deg = toArabicNumber(Math.abs(Math.round(diff)));
    return {
      bg: p.soft,
      fg: p.primaryInk,
      icon: (diff < 0 ? 'rotate-cw' : 'rotate-ccw') as 'rotate-cw' | 'rotate-ccw',
      text: diff < 0 ? `أدر الهاتف يمينًا ${deg}°` : `أدر الهاتف يسارًا ${deg}°`
    };
  };
  const chip = statusChip();

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader
        title={t('القبلة', 'Qibla')}
        subtitle={`${currentCity.nameAr} · ${currentCity.countryAr}`}
        onBack={goBack}
        right={
          <TouchableOpacity onPress={refreshLocation} accessibilityRole="button" accessibilityLabel="تحديث الموقع" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="navigation" size={18} color={p.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32, gap: 18, alignItems: 'stretch' }}>
        <View accessibilityRole="text" style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: chip.bg }}>
          <Feather name={chip.icon} size={16} color={chip.fg} />
          <TextUI size={15} weight="bold" color={chip.fg}>{chip.text}</TextUI>
        </View>

        <View
          accessibilityRole="image"
          accessibilityLabel={`القبلة على ${toArabicNumber(qiblaTarget)} درجة من الشمال`}
          style={{
            alignSelf: 'center',
            width: dial,
            height: dial,
            borderRadius: dial / 2,
            backgroundColor: p.surface,
            borderWidth: 2,
            borderColor: isAligned ? p.success : p.accent,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <View style={{ position: 'absolute', top: 14, left: 14, right: 14, bottom: 14, borderRadius: dial / 2, borderWidth: 1, borderStyle: 'dashed', borderColor: p.border }} />
          <TextUI size={14} weight="bold" color={p.primary} style={{ position: 'absolute', top: 20 }}>ش</TextUI>
          <TextUI size={14} weight="bold" color={p.muted} style={{ position: 'absolute', bottom: 20 }}>ج</TextUI>
          <TextUI size={14} weight="bold" color={p.muted} style={{ position: 'absolute', right: 22 }}>ق</TextUI>
          <TextUI size={14} weight="bold" color={p.muted} style={{ position: 'absolute', left: 22 }}>غ</TextUI>

          <View style={{ position: 'absolute', width: dial, height: dial, alignItems: 'center', transform: [{ rotate: `${needleAngle}deg` }] }}>
            <View style={{ marginTop: -14, width: 34, height: 34, borderRadius: 9, backgroundColor: '#2D1E16', borderWidth: 2, borderColor: isAligned ? p.success : p.accent }} />
            <View style={{ marginTop: 14, width: 8, height: dial / 2 - 54, borderTopLeftRadius: 4, borderTopRightRadius: 4, backgroundColor: isAligned ? p.success : p.primary }} />
          </View>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: p.accent, borderWidth: 3, borderColor: p.surface }} />
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1, borderRadius: 16, padding: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
            <TextUI size={13} color={p.muted}>الاتجاه من الشمال</TextUI>
            <TextUI size={22} weight="bold" color={p.ink}>{`${toArabicNumber(qiblaTarget)}°`}</TextUI>
          </View>
          <View style={{ flex: 1, borderRadius: 16, padding: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
            <TextUI size={13} color={p.muted}>المسافة إلى الكعبة</TextUI>
            <TextUI size={22} weight="bold" color={p.ink}>{`${toArabicNumber(distanceKm.toLocaleString('en-US').replace(',', '٬'))} كم`}</TextUI>
          </View>
        </View>

        <View style={{ borderRadius: 14, padding: 12, flexDirection: 'row', gap: 10, backgroundColor: lowAccuracy ? '#F7E3DF' : p.soft }}>
          <Feather name="info" size={18} color={lowAccuracy ? '#7A2E2B' : p.primary} />
          <TextUI size={13} color={lowAccuracy ? '#7A2E2B' : p.primaryInk} style={{ flex: 1, lineHeight: 21 }}>
            {lowAccuracy
              ? 'دقة البوصلة منخفضة الآن. حرّك الهاتف على شكل الرقم ٨ عدة مرات.'
              : 'القراءة غير مستقرة؟ ضع الهاتف أفقيًا، وابتعد عن المعادن والمغناطيس، وحرّكه على شكل الرقم ٨.'}
          </TextUI>
        </View>
      </ScrollView>
    </View>
  );
};
