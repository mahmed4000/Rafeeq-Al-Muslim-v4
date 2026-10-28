import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Share, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { Header } from '../components/common/Header';
import { TextUI } from '../components/common/TextUI';
import { AZKAR_DATABASE } from '../data/azkarData';
import { toArabicNumber } from '../services/prayerCalculation';
import { TOKENS, makeShadow } from '../constants/tokens';
import { StorageService } from '../services/storage';

export const AzkarSessionScreen: React.FC = () => {
  const { goBack, theme, themeMode, t, screenParams, triggerHaptic, isRTL } = useApp();
  const c = theme;

  const category = screenParams?.category || { id: 'morning', titleAr: 'أذكار الصباح' };
  const azkarList = AZKAR_DATABASE[category.id] || AZKAR_DATABASE.morning;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [counter, setCounter] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [fontSize, setFontSize] = useState(22);
  const [showCompletion, setShowCompletion] = useState(false);

  const autoAdvanceTimerRef = useRef<any>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  // Load user preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const savedAuto = await StorageService.getItem('@azkar_auto_advance');
        if (savedAuto !== null) {
          setAutoAdvance(savedAuto === 'true');
        }
        const savedSize = await StorageService.getItem('@azkar_font_size');
        if (savedSize !== null) {
          const parsed = parseInt(savedSize, 10);
          if (!isNaN(parsed) && parsed >= 16 && parsed <= 34) {
            setFontSize(parsed);
          }
        }
      } catch (e) {}
    })();

    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
    };
  }, []);

  const safeIndex = currentIndex % azkarList.length;
  const currentItem = azkarList[safeIndex];
  const target = currentItem?.target || 1;
  const isCompleted = counter >= target;

  const toggleAutoAdvance = async () => {
    triggerHaptic('light');
    const nextVal = !autoAdvance;
    setAutoAdvance(nextVal);
    await StorageService.setItem('@azkar_auto_advance', String(nextVal));
  };

  const changeFontSize = async (delta: number) => {
    triggerHaptic('light');
    setFontSize((prev) => {
      const nextSize = Math.max(16, Math.min(32, prev + delta));
      StorageService.setItem('@azkar_font_size', String(nextSize));
      return nextSize;
    });
  };

  const handleTap = () => {
    if (counter < target) {
      const next = counter + 1;
      setCounter(next);
      triggerHaptic('light');

      if (next >= target) {
        triggerHaptic('success');

        if (autoAdvance) {
          if (autoAdvanceTimerRef.current) {
            clearTimeout(autoAdvanceTimerRef.current);
          }
          autoAdvanceTimerRef.current = setTimeout(() => {
            if (currentIndex + 1 < azkarList.length) {
              setCurrentIndex((prev) => prev + 1);
              setCounter(0);
            } else {
              setShowCompletion(true);
            }
          }, 450);
        }
      }
    }
  };

  const handleNext = () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    triggerHaptic('light');
    if (currentIndex + 1 < azkarList.length) {
      setCurrentIndex((prev) => prev + 1);
      setCounter(0);
    } else {
      setShowCompletion(true);
    }
  };

  const handlePrev = () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    triggerHaptic('light');
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setCounter(0);
      setShowCompletion(false);
    }
  };

  const handleResetCounter = () => {
    if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    triggerHaptic('light');
    setCounter(0);
  };

  const handleShare = async () => {
    try {
      triggerHaptic('light');
      const textToShare = `${currentItem.ar}\n\n✨ الفضل: ${currentItem.virtue}\n\n— من تطبيق المصلى`;
      await Share.share({
        message: textToShare,
        title: category.titleAr
      });
    } catch (err) {}
  };

  const onTouchStart = (e: any) => {
    try {
      const touch = e.nativeEvent?.touches?.[0] || e.nativeEvent;
      touchStartXRef.current = touch?.pageX ?? touch?.clientX ?? 0;
      touchStartYRef.current = touch?.pageY ?? touch?.clientY ?? 0;
    } catch (err) {}
  };

  const onTouchEnd = (e: any) => {
    try {
      const touch = e.nativeEvent?.changedTouches?.[0] || e.nativeEvent;
      const endX = touch?.pageX ?? touch?.clientX ?? 0;
      const endY = touch?.pageY ?? touch?.clientY ?? 0;
      const deltaX = endX - touchStartXRef.current;
      const deltaY = endY - touchStartYRef.current;

      if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
        if (deltaX < 0) {
          isRTL ? handlePrev() : handleNext();
        } else {
          isRTL ? handleNext() : handlePrev();
        }
      }
    } catch (err) {}
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: c.bg }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <Header
        title={category.titleAr}
        subtitle={`الذكر ${toArabicNumber(currentIndex + 1)} من ${toArabicNumber(azkarList.length)}`}
        onBack={goBack}
        rightAction={
          <TouchableOpacity
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              padding: 8,
              borderRadius: TOKENS.radius.pill,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border
            }}
          >
            <Feather name="share-2" size={16} color={TOKENS.colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Linear Progress Bar */}
      <View style={{ height: 4, width: '100%', backgroundColor: c.border }}>
        <View
          style={{
            height: '100%',
            width: `${((currentIndex + 1) / azkarList.length) * 100}%`,
            backgroundColor: TOKENS.colors.primary
          }}
        />
      </View>

      {/* Action Toolbar: Auto-Advance & Font Resizing */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderColor: c.border,
          backgroundColor: c.surface
        }}
      >
        {/* Auto-Advance Toggle Pill */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleAutoAdvance}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 20,
            backgroundColor: autoAdvance
              ? themeMode === 'light' ? '#E8F5E9' : '#1B3820'
              : themeMode === 'light' ? '#F5F5F5' : '#2D2D2D',
            borderWidth: 1,
            borderColor: autoAdvance ? '#4CAF50' : c.border
          }}
        >
          <Feather
            name={autoAdvance ? 'zap' : 'zap-off'}
            size={13}
            color={autoAdvance ? '#2E7D32' : c.textSecondary}
          />
          <TextUI
            size={11}
            weight="bold"
            color={autoAdvance ? '#2E7D32' : c.textSecondary}
          >
            {autoAdvance ? t('انتقال تلقائي: مفعّل', 'Auto-Advance: ON') : t('انتقال تلقائي: معطّل', 'Auto-Advance: OFF')}
          </TextUI>
        </TouchableOpacity>

        {/* Font Zoom Controls & Reset Button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={handleResetCounter}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={{
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: themeMode === 'light' ? '#F0EAE1' : '#332A24'
            }}
          >
            <Feather name="rotate-ccw" size={14} color={TOKENS.colors.primary} />
          </TouchableOpacity>

          <View style={{ width: 1, height: 16, backgroundColor: c.border, marginHorizontal: 2 }} />

          <TouchableOpacity
            onPress={() => changeFontSize(-2)}
            disabled={fontSize <= 16}
            style={{
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: themeMode === 'light' ? '#F5F5F5' : '#2A2A2A',
              borderWidth: 1,
              borderColor: c.border,
              opacity: fontSize <= 16 ? 0.4 : 1
            }}
          >
            <TextUI size={12} weight="bold" color={c.textPrimary}>A-</TextUI>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => changeFontSize(2)}
            disabled={fontSize >= 32}
            style={{
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: 8,
              backgroundColor: themeMode === 'light' ? '#F5F5F5' : '#2A2A2A',
              borderWidth: 1,
              borderColor: c.border,
              opacity: fontSize >= 32 ? 0.4 : 1
            }}
          >
            <TextUI size={12} weight="bold" color={c.textPrimary}>A+</TextUI>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 18, paddingBottom: 110, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {/* Completion Celebration Card */}
        {showCompletion ? (
          <View
            style={{
              width: '100%',
              backgroundColor: c.surface,
              borderRadius: 24,
              padding: 26,
              alignItems: 'center',
              borderWidth: 1.5,
              borderColor: '#4CAF50',
              marginTop: 20,
              ...makeShadow('0 8px 24px rgba(76, 175, 80, 0.15)', '#4CAF50', 0.15, 8)
            }}
          >
            <View
              style={{
                width: 68,
                height: 68,
                borderRadius: 34,
                backgroundColor: themeMode === 'light' ? '#E8F5E9' : '#1E3B24',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16
              }}
            >
              <Feather name="check-circle" size={38} color="#4CAF50" />
            </View>

            <TextUI variant="h3" color={c.textPrimary} style={{ textAlign: 'center', marginBottom: 8 }}>
              {t('تقبل الله طاعتكم', 'May Allah Accept Your Worship')}
            </TextUI>

            <TextUI
              variant="body"
              color={c.textSecondary}
              style={{ textAlign: 'center', lineHeight: 24, marginBottom: 24 }}
            >
              {t('أتممت بحمد الله وتوفيقه جميع أذكار هذا الباب المبارك. جعلك الله من الذاكرين الله كثيراً والذاكرات.', 'You have completed all supplications in this category by the grace of Allah.')}
            </TextUI>

            <View style={{ width: '100%', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('medium');
                  setCurrentIndex(0);
                  setCounter(0);
                  setShowCompletion(false);
                }}
                style={{
                  backgroundColor: TOKENS.colors.primary,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TextUI size={14} weight="bold" color="#FFFFFF">
                  {t('إعادة قراءة الأذكار من البداية', 'Read Again from Beginning')}
                </TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={goBack}
                style={{
                  backgroundColor: c.bg,
                  paddingVertical: 13,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: c.border
                }}
              >
                <TextUI size={13} weight="bold" color={c.textPrimary}>
                  {t('العودة لقائمة الأذكار', 'Back to Categories')}
                </TextUI>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* Zikr Arabic Text Card */}
            <View
              style={{
                width: '100%',
                backgroundColor: c.surface,
                borderRadius: 22,
                padding: 22,
                borderWidth: 1,
                borderColor: isCompleted ? '#4CAF50' : c.border,
                marginBottom: 20,
                ...makeShadow('0 4px 16px rgba(0,0,0,0.03)', '#000', 0.03, 4)
              }}
            >
              <TextUI
                variant="quranVerse"
                size={fontSize}
                color={c.textPrimary}
                style={{
                  lineHeight: fontSize * 1.8,
                  textAlign: 'center',
                  marginBottom: 16
                }}
              >
                {currentItem?.ar || ''}
              </TextUI>

              {/* Virtue & Reward Box */}
              {currentItem?.virtue ? (
                <View
                  style={{
                    backgroundColor: themeMode === 'light' ? TOKENS.colors.secondaryLight : '#382E28',
                    borderRadius: 14,
                    padding: 12,
                    marginTop: 8,
                    borderWidth: 1,
                    borderColor: TOKENS.colors.secondary
                  }}
                >
                  <TextUI
                    variant="caption"
                    color={TOKENS.colors.primaryDark}
                    style={{ textAlign: 'center', lineHeight: 20 }}
                  >
                    ✨ {currentItem.virtue}
                  </TextUI>
                </View>
              ) : null}
            </View>

            {/* Big Interactive Tap Counter */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleTap}
              style={{
                width: 136,
                height: 136,
                borderRadius: 68,
                backgroundColor: isCompleted ? '#4CAF50' : TOKENS.colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 4,
                borderColor: '#FFFFFF',
                marginBottom: 24,
                ...makeShadow(
                  isCompleted ? '0 8px 24px rgba(76, 175, 80, 0.4)' : '0 8px 24px rgba(140, 94, 60, 0.4)',
                  isCompleted ? '#4CAF50' : TOKENS.colors.primary,
                  0.4,
                  10
                )
              }}
            >
              {isCompleted ? (
                <View style={{ alignItems: 'center' }}>
                  <Feather name="check" size={42} color="#FFFFFF" />
                  <TextUI size={12} weight="bold" color="#FFFFFF" style={{ marginTop: 2 }}>
                    {t('اكتمل', 'Done')}
                  </TextUI>
                </View>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <TextUI size={34} weight="bold" color="#FFFFFF">
                    {toArabicNumber(counter)}
                  </TextUI>
                  <TextUI size={12} color="rgba(255,255,255,0.88)">
                    من {toArabicNumber(target)}
                  </TextUI>
                </View>
              )}
            </TouchableOpacity>

            {/* Target & Reset Prompt */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <View
                style={{
                  backgroundColor: themeMode === 'light' ? '#EFEBE6' : '#2D2621',
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 14
                }}
              >
                <TextUI size={12} color={c.textSecondary}>
                  {t('المطلوب:', 'Target:')} <TextUI size={12} weight="bold" color={TOKENS.colors.primary}>{toArabicNumber(target)} {target > 1 ? 'مرات' : 'مرة'}</TextUI>
                </TextUI>
              </View>

              {counter > 0 && !isCompleted && (
                <TouchableOpacity
                  onPress={handleResetCounter}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                    borderRadius: 14,
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border
                  }}
                >
                  <Feather name="rotate-ccw" size={11} color={c.textSecondary} />
                  <TextUI size={11} color={c.textSecondary}>
                    {t('إعادة التصفير', 'Reset')}
                  </TextUI>
                </TouchableOpacity>
              )}
            </View>

            {/* Navigation Buttons (Prev / Next) */}
            <View style={{ flexDirection: 'row', gap: 14, width: '100%', maxWidth: 330 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePrev}
                disabled={currentIndex === 0}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: c.surface,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: c.border,
                  opacity: currentIndex === 0 ? 0.35 : 1
                }}
              >
                <Feather name={isRTL ? 'arrow-right' : 'arrow-left'} size={16} color={c.textPrimary} />
                <TextUI size={13} weight="bold" color={c.textPrimary}>
                  {t('السابق', 'Previous')}
                </TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleNext}
                style={{
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: isCompleted ? TOKENS.colors.primary : c.surface,
                  paddingVertical: 14,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: isCompleted ? TOKENS.colors.primary : c.border
                }}
              >
                <TextUI size={13} weight="bold" color={isCompleted ? '#FFFFFF' : c.textPrimary}>
                  {currentIndex === azkarList.length - 1 ? t('إنهاء الأذكار', 'Finish') : t('التالي', 'Next')}
                </TextUI>
                <Feather
                  name={isRTL ? 'arrow-left' : 'arrow-right'}
                  size={16}
                  color={isCompleted ? '#FFFFFF' : c.textPrimary}
                />
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
};
