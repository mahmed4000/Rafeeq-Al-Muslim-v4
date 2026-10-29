import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Share, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { AZKAR_CATEGORIES, AZKAR_DATABASE } from '../data/azkarData';
import { useScreenParams } from '../navigation/routes';
import { toArabicNumber } from '../services/prayerCalculation';
import { makeShadow } from '../constants/tokens';
import { StorageService } from '../services/storage';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Stepper } from '../ui/Stepper';
import { usePalette } from '../theme/palette';

// Virtue lines in azkarData have no recorded source yet; they stay hidden until a
// sourced dataset (text, evidence, grading) replaces them. Set to true to show them again.
const SHOW_UNSOURCED_VIRTUES = false;

// Where each session stopped today, so it can be resumed the same day.
const PROGRESS_KEY = 'rafeeq_azkar_progress_v1';
type SessionProgress = Record<string, { day: string; index: number; counter: number }>;
const todayKey = () => new Date().toDateString();

const FONT_MIN = 16;
const FONT_MAX = 34;
const RING_SIZE = 132;
const BEADS = 33;

/** "مرة" / "مرتان" / "٣ مرات" / "١٠٠ مرة" */
function timesAr(n: number): string {
  if (n === 1) return 'مرة واحدة';
  if (n === 2) return 'مرتان';
  const tail = n % 100;
  return `${toArabicNumber(n)} ${tail >= 3 && tail <= 10 ? 'مرات' : 'مرة'}`;
}

/** A ring of beads around the counter that fills as the count grows (no SVG needed). */
const BeadRing: React.FC<{ ratio: number; fill: string; track: string }> = ({ ratio, fill, track }) => {
  const filled = Math.round(Math.min(1, Math.max(0, ratio)) * BEADS);
  const r = RING_SIZE / 2 - 6;
  return (
    <>
      {Array.from({ length: BEADS }, (_, i) => {
        // Start at the top and go clockwise.
        const angle = (i / BEADS) * 2 * Math.PI - Math.PI / 2;
        return (
          <View
            key={i}
            style={{
              position: 'absolute',
              width: 8,
              height: 8,
              borderRadius: 4,
              left: RING_SIZE / 2 + r * Math.cos(angle) - 4,
              top: RING_SIZE / 2 + r * Math.sin(angle) - 4,
              backgroundColor: i < filled ? fill : track
            }}
          />
        );
      })}
    </>
  );
};

/** Icon-and-label button under the counter (48pt tall). */
const SmallAction: React.FC<{ icon: React.ComponentProps<typeof Feather>['name']; label: string; onPress: () => void; disabled?: boolean }> = ({ icon, label, onPress, disabled = false }) => {
  const p = usePalette();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={{ minWidth: 64, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2, opacity: disabled ? 0.35 : 1 }}
    >
      <Feather name={icon} size={20} color={p.muted} />
      <TextUI size={13} color={p.muted}>{label}</TextUI>
    </TouchableOpacity>
  );
};

export const AzkarSessionScreen: React.FC = () => {
  const { goBack, t, triggerHaptic, isRTL } = useApp();
  const screenParams = useScreenParams();
  const p = usePalette();

  const category: any = AZKAR_CATEGORIES.find((cat) => cat.id === screenParams?.categoryId) ||
    { id: 'morning', titleAr: 'أذكار الصباح' };
  const azkarList = AZKAR_DATABASE[category.id] || AZKAR_DATABASE.morning;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [counter, setCounter] = useState(0);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [fontSize, setFontSize] = useState(26);
  const [showCompletion, setShowCompletion] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [progressLoaded, setProgressLoaded] = useState(false);

  const autoAdvanceTimerRef = useRef<any>(null);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  // Load preferences and today's position in this session.
  useEffect(() => {
    (async () => {
      try {
        const savedAuto = await StorageService.getItem('@azkar_auto_advance');
        if (savedAuto !== null) setAutoAdvance(savedAuto === 'true');
        const parsed = parseInt((await StorageService.getItem('@azkar_font_size')) || '', 10);
        if (!isNaN(parsed) && parsed >= FONT_MIN && parsed <= FONT_MAX) setFontSize(parsed);
        const progress = await StorageService.getObject<SessionProgress>(PROGRESS_KEY, {});
        const saved = progress[category.id];
        if (saved && saved.day === todayKey() && saved.index >= 0 && saved.index < azkarList.length) {
          setCurrentIndex(saved.index);
          setCounter(Math.max(0, saved.counter || 0));
        }
      } catch (e) {}
      setProgressLoaded(true);
    })();

    return () => {
      if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Remember where the session is (cleared from use the next day).
  useEffect(() => {
    if (!progressLoaded) return;
    (async () => {
      const progress = await StorageService.getObject<SessionProgress>(PROGRESS_KEY, {});
      progress[category.id] = { day: todayKey(), index: showCompletion ? 0 : currentIndex, counter: showCompletion ? 0 : counter };
      await StorageService.setObject(PROGRESS_KEY, progress);
    })().catch(() => {});
  }, [progressLoaded, category.id, currentIndex, counter, showCompletion]);

  const safeIndex = currentIndex % azkarList.length;
  const currentItem = azkarList[safeIndex];
  const target = currentItem?.target || 1;
  const isCompleted = counter >= target;
  const remaining = Math.max(0, target - counter);

  const toggleAutoAdvance = async () => {
    triggerHaptic('light');
    const nextVal = !autoAdvance;
    setAutoAdvance(nextVal);
    await StorageService.setItem('@azkar_auto_advance', String(nextVal));
  };

  const changeFontSize = (delta: number) => {
    triggerHaptic('light');
    setFontSize((prev) => {
      const nextSize = Math.max(FONT_MIN, Math.min(FONT_MAX, prev + delta));
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
          if (autoAdvanceTimerRef.current) clearTimeout(autoAdvanceTimerRef.current);
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
      await Share.share({
        message: `${currentItem.ar}\n\n— من تطبيق رفيق المسلم`,
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
    <View style={{ flex: 1, backgroundColor: p.bg }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <ScreenHeader
        title={category.titleAr}
        subtitle={`${toArabicNumber(Math.min(currentIndex + 1, azkarList.length))} من ${toArabicNumber(azkarList.length)}`}
        onBack={goBack}
        right={
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="إعدادات الجلسة"
            onPress={() => { triggerHaptic('light'); setSettingsVisible(true); }}
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Feather name="type" size={20} color={p.muted} />
          </TouchableOpacity>
        }
      />

      {/* Session progress */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ height: 3, marginHorizontal: 16, borderRadius: 2, overflow: 'hidden', backgroundColor: p.border }}>
        <View style={{ height: 3, backgroundColor: p.accent, width: `${((showCompletion ? azkarList.length : currentIndex + 1) / azkarList.length) * 100}%` }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16, alignItems: 'center' }}
        showsVerticalScrollIndicator={false}
      >
        {showCompletion ? (
          /* Completion card */
          <View style={{ width: '100%', backgroundColor: p.surface, borderRadius: 24, padding: 26, alignItems: 'center', borderWidth: 1.5, borderColor: p.success, marginTop: 20, ...makeShadow('0 8px 24px rgba(78, 125, 91, 0.15)', p.success, 0.15, 8) }}>
            <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: p.successBg, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Feather name="check-circle" size={38} color={p.success} />
            </View>
            <TextUI variant="h3" color={p.ink} style={{ textAlign: 'center', marginBottom: 8 }}>
              {t('تقبل الله طاعتكم', 'May Allah Accept Your Worship')}
            </TextUI>
            <TextUI variant="body" color={p.muted} style={{ textAlign: 'center', lineHeight: 24, marginBottom: 24 }}>
              {t('أتممت بحمد الله وتوفيقه جميع أذكار هذا الباب المبارك. جعلك الله من الذاكرين الله كثيراً والذاكرات.', 'You have completed all supplications in this category by the grace of Allah.')}
            </TextUI>
            <View style={{ width: '100%', gap: 10 }}>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => {
                  triggerHaptic('medium');
                  setCurrentIndex(0);
                  setCounter(0);
                  setShowCompletion(false);
                }}
                style={{ backgroundColor: p.primary, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
              >
                <TextUI size={14} weight="bold" color={p.onPrimary}>{t('إعادة قراءة الأذكار من البداية', 'Read Again from Beginning')}</TextUI>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={goBack}
                style={{ backgroundColor: p.bg, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: p.border }}
              >
                <TextUI size={14} weight="bold" color={p.ink}>{t('العودة لقائمة الأذكار', 'Back to Categories')}</TextUI>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* The dhikr */}
            <View style={{ width: '100%', borderRadius: 20, paddingVertical: 22, paddingHorizontal: 18, gap: 14, backgroundColor: p.surface, borderWidth: 1, borderColor: isCompleted ? p.success : p.border }}>
              <TextUI variant="quranVerse" size={fontSize} color={p.quranInk} style={{ lineHeight: Math.round(fontSize * 1.8), textAlign: 'center' }}>
                {currentItem?.ar || ''}
              </TextUI>
              <View style={{ alignItems: 'center' }}>
                <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: p.soft }}>
                  <TextUI size={13} weight="bold" color={p.primaryInk}>{`التكرار: ${timesAr(target)}`}</TextUI>
                </View>
              </View>
              {SHOW_UNSOURCED_VIRTUES && currentItem?.virtue ? (
                <View style={{ borderTopWidth: 1, borderColor: p.border, paddingTop: 12 }}>
                  <TextUI size={15} color={p.muted} style={{ lineHeight: 26 }}>{currentItem.virtue}</TextUI>
                </View>
              ) : null}
            </View>

            {/* Counter */}
            <TouchableOpacity
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={isCompleted ? 'اكتمل هذا الذكر' : `تسبيحة، المتبقي ${toArabicNumber(remaining)}`}
              onPress={handleTap}
              style={{ width: RING_SIZE, height: RING_SIZE, marginTop: 8, borderRadius: RING_SIZE / 2, alignItems: 'center', justifyContent: 'center', ...makeShadow('0 8px 24px rgba(93,58,34,0.16)', '#5D3A22', 0.16, 8) }}
            >
              <BeadRing ratio={counter / target} fill={isCompleted ? p.success : p.accent} track={p.border} />
              <View style={{ width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: p.surface }}>
                {isCompleted ? (
                  <>
                    <Feather name="check" size={36} color={p.success} />
                    <TextUI size={13} weight="bold" color={p.successInk}>{t('اكتمل', 'Done')}</TextUI>
                  </>
                ) : (
                  <>
                    <TextUI size={40} weight="bold" color={p.ink} style={{ lineHeight: 46 }}>{toArabicNumber(remaining)}</TextUI>
                    <TextUI size={13} color={p.muted}>متبقٍ</TextUI>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Previous · reset · share · next */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
              <SmallAction icon={isRTL ? 'chevron-right' : 'chevron-left'} label="السابق" onPress={handlePrev} disabled={currentIndex === 0} />
              <SmallAction icon="rotate-ccw" label="إعادة" onPress={handleResetCounter} disabled={counter === 0} />
              <SmallAction icon="share-2" label="مشاركة" onPress={handleShare} />
              <SmallAction icon={isRTL ? 'chevron-left' : 'chevron-right'} label="التالي" onPress={handleNext} />
            </View>
            <TextUI size={12.5} color={p.muted} style={{ textAlign: 'center' }}>اسحب للذكر التالي · المس الحلقة للعدّ</TextUI>
          </>
        )}
      </ScrollView>

      {/* Session settings: font size and auto-advance */}
      <Modal visible={settingsVisible} animationType="fade" transparent onRequestClose={() => setSettingsVisible(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: p.bg, borderRadius: 20, paddingVertical: 12, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
              <TextUI size={18} weight="bold" color={p.ink}>إعدادات الجلسة</TextUI>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setSettingsVisible(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={20} color={p.ink} />
              </TouchableOpacity>
            </View>
            <View style={{ borderTopWidth: 1, borderColor: p.divider }}>
              <Stepper
                label="حجم الخط"
                valueLabel={toArabicNumber(fontSize)}
                onDecrement={() => changeFontSize(-2)}
                onIncrement={() => changeFontSize(2)}
                canDecrement={fontSize > FONT_MIN}
                canIncrement={fontSize < FONT_MAX}
              />
              <TouchableOpacity
                accessibilityRole="switch"
                accessibilityState={{ checked: autoAdvance }}
                onPress={toggleAutoAdvance}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 14 }}
              >
                <View style={{ flex: 1 }}>
                  <TextUI size={15} weight="bold" color={p.ink}>الانتقال التلقائي</TextUI>
                  <TextUI size={12.5} color={p.muted}>الانتقال للذكر التالي عند إتمام العدد</TextUI>
                </View>
                <View style={{ minWidth: 64, minHeight: 32, paddingHorizontal: 10, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: autoAdvance ? p.successBg : p.bgAlt, borderWidth: 1, borderColor: autoAdvance ? p.success : p.border }}>
                  <TextUI size={13} weight="bold" color={autoAdvance ? p.successInk : p.muted}>{autoAdvance ? 'مفعّل' : 'متوقف'}</TextUI>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};
