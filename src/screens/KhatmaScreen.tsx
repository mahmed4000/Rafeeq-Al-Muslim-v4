import React, { useCallback, useState } from 'react';
import { View, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Stepper } from '../ui/Stepper';
import { usePalette } from '../theme/palette';
import { toArabicNumber } from '../services/prayerCalculation';
import { Khatma, KhatmaService, getKhatmaProgress, MUSHAF_PAGES } from '../services/khatmaService';
import { surahForPage, surahById } from '../services/quranPages';
const DURATIONS = [7, 15, 30, 60];


export const KhatmaScreen: React.FC = () => {
  const { goBack, navigate, setSelectedSurah, readingBookmark, triggerHaptic, t, isRTL, lang } = useApp();
  const isEn = lang === 'en';
  const pagesEn = (n: number) => (n === 1 ? 'page' : 'pages');
  const surahName = (s: any) => (isEn && s?.nameEn ? s.nameEn : s?.nameAr);
  const p = usePalette();

  const [khatma, setKhatma] = useState<Khatma | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [days, setDays] = useState(30);
  const [custom, setCustom] = useState(false);
  const [fromBookmark, setFromBookmark] = useState(false);
  const [name, setName] = useState('');

  // Reload whenever the screen gains focus, e.g. after reading in the mushaf.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      KhatmaService.getActive().then((k) => {
        if (!alive) return;
        setKhatma(k);
        setLoaded(true);
      });
      return () => { alive = false; };
    }, [])
  );

  const startPage = fromBookmark && readingBookmark ? readingBookmark.page : 1;
  const pagesInPlan = MUSHAF_PAGES - startPage + 1;
  const dailyPages = Math.ceil(pagesInPlan / days);

  const openReaderAt = (page: number) => {
    const surah = surahForPage(page);
    setSelectedSurah(surah);
    navigate('quran_reader', { readingMode: 'page', startPage: page, startSurahId: surah.id });
  };

  const create = async () => {
    triggerHaptic('success');
    setKhatma(await KhatmaService.create(name, startPage, days));
  };

  const confirmRemove = () => {
    const doRemove = async () => {
      await KhatmaService.remove();
      setKhatma(null);
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(t('حذف الختمة الحالية؟', 'Delete the current khatma?'))) doRemove();
      return;
    }
    Alert.alert(t('حذف الختمة', 'Delete khatma'), t('سيُحذف تقدّم هذه الختمة من جهازك.', "This khatma's progress will be deleted from your device."), [
      { text: t('إلغاء', 'Cancel'), style: 'cancel' },
      { text: t('حذف', 'Delete'), style: 'destructive', onPress: doRemove }
    ]);
  };

  const card = { borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border } as const;

  const renderActive = (k: Khatma) => {
    const prog = getKhatmaProgress(k);
    const surah = surahForPage(prog.nextPage);
    const leftToday = Math.max(0, prog.todayTarget - prog.readToday);
    return (
      <View style={{ gap: 14 }}>
        <View style={{ borderRadius: 20, padding: 18, gap: 10, backgroundColor: p.hero }}>
          <TextUI size={13} color={p.onHeroMuted}>{`${k.name === 'ختمتي' ? t('ختمتي', 'My Khatma') : k.name} · ${t('اليوم', 'Day')} ${toArabicNumber(prog.dayNumber)} ${t('من', 'of')} ${toArabicNumber(k.totalDays)}`}</TextUI>
          {prog.isComplete ? (
            <TextUI font="amiri" size={30} weight="bold" color={p.onHero}>{t('أتممت الختمة، تقبّل الله منك', 'You have completed the khatma. May Allah accept it from you')}</TextUI>
          ) : (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <TextUI size={42} weight="bold" color={p.onHero} style={{ lineHeight: 50 }}>{toArabicNumber(leftToday)}</TextUI>
                <TextUI size={16} color={p.onHero}>{leftToday === 0 ? t('أتممت وِرد اليوم', "Today's portion is done") : t('صفحة متبقية من وِرد اليوم', `${pagesEn(leftToday)} left in today's portion`)}</TextUI>
              </View>
              <TextUI size={13} color={p.onHeroMuted}>{t(`وِرد اليوم ${toArabicNumber(prog.todayTarget)} صفحة · قرأت ${toArabicNumber(prog.readToday)}`, `Today's portion: ${toArabicNumber(prog.todayTarget)} ${pagesEn(prog.todayTarget)} · Read ${toArabicNumber(prog.readToday)}`)}</TextUI>
            </>
          )}
          <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(250,241,230,0.2)', overflow: 'hidden' }}>
            <View style={{ width: `${prog.percent}%`, height: '100%', backgroundColor: p.accent }} />
          </View>
          <TextUI size={13} color={p.onHeroMuted}>{t(`${toArabicNumber(prog.percent)}٪ · ${toArabicNumber(prog.pagesDone)} من ${toArabicNumber(prog.totalPages)} صفحة`, `${toArabicNumber(prog.percent)}% · ${toArabicNumber(prog.pagesDone)} of ${toArabicNumber(prog.totalPages)} pages`)}</TextUI>
        </View>

        {!prog.isComplete ? (
          <TouchableOpacity
            onPress={() => openReaderAt(prog.nextPage)}
            accessibilityRole="button"
            style={{ minHeight: 52, borderRadius: 14, backgroundColor: p.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <TextUI size={16} weight="bold" color={p.onPrimary}>{t(`أكمل وِردك · ${surah.nameAr} ص ${toArabicNumber(prog.nextPage)}`, `Continue your portion · ${surahName(surah)} p. ${toArabicNumber(prog.nextPage)}`)}</TextUI>
          </TouchableOpacity>
        ) : null}

        <View style={{ ...card, padding: 14, gap: 6 }}>
          <TextUI size={14} color={p.muted} style={{ lineHeight: 22 }}>
            {t('يُحسب التقدّم تلقائيًا حين تقرأ الصفحات بالترتيب في المصحف. إن فاتك يوم يُوزَّع الباقي على الأيام القادمة.', 'Progress is tracked automatically as you read the pages in order in the mushaf. If you miss a day, the rest is spread over the coming days.')}
          </TextUI>
        </View>

        <TouchableOpacity onPress={confirmRemove} accessibilityRole="button" style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
          <TextUI size={15} weight="bold" color="#B34743">{prog.isComplete ? t('بدء ختمة جديدة', 'Start a new khatma') : t('حذف الختمة', 'Delete khatma')}</TextUI>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCreate = () => (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <TextUI size={15} weight="bold" color={p.ink}>{t('أختم خلال', 'Complete within')}</TextUI>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {DURATIONS.map((d) => {
            const active = !custom && d === days;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => { setCustom(false); setDays(d); }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{ flex: 1, minHeight: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: active ? p.accent : p.border, backgroundColor: active ? p.soft : p.surface }}
              >
                <TextUI size={18} weight="bold" color={p.ink}>{toArabicNumber(d)}</TextUI>
                <TextUI size={12} color={p.muted}>{isEn ? 'days' : d <= 10 ? 'أيام' : 'يومًا'}</TextUI>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            onPress={() => setCustom(true)}
            accessibilityRole="button"
            accessibilityState={{ selected: custom }}
            style={{ flex: 1, minHeight: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: custom ? p.accent : p.border, backgroundColor: custom ? p.soft : p.surface }}
          >
            <Feather name="sliders" size={18} color={p.ink} />
            <TextUI size={12} color={p.muted}>{t('مخصص', 'Custom')}</TextUI>
          </TouchableOpacity>
        </View>
        {custom ? (
          <View style={card}>
            <Stepper
              label={t('عدد الأيام', 'Number of days')}
              valueLabel={`${toArabicNumber(days)} ${t('يومًا', 'days')}`}
              onDecrement={() => setDays((d) => Math.max(3, d - 1))}
              onIncrement={() => setDays((d) => Math.min(365, d + 1))}
              canDecrement={days > 3}
              canIncrement={days < 365}
            />
          </View>
        ) : null}
      </View>

      <View style={card}>
        <TouchableOpacity
          onPress={() => setFromBookmark(false)}
          accessibilityRole="radio"
          accessibilityState={{ checked: !fromBookmark }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 52, borderBottomWidth: 1, borderColor: p.divider }}
        >
          <Feather name={!fromBookmark ? 'check-circle' : 'circle'} size={20} color={!fromBookmark ? p.primary : p.muted} />
          <TextUI size={15} color={p.ink} style={{ flex: 1 }}>{t('من البداية · الفاتحة ص ١', `From the beginning · ${surahName(surahById(1))} p. 1`)}</TextUI>
        </TouchableOpacity>
        {readingBookmark ? (
          <TouchableOpacity
            onPress={() => setFromBookmark(true)}
            accessibilityRole="radio"
            accessibilityState={{ checked: fromBookmark }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 52 }}
          >
            <Feather name={fromBookmark ? 'check-circle' : 'circle'} size={20} color={fromBookmark ? p.primary : p.muted} />
            <TextUI size={15} color={p.ink} style={{ flex: 1 }}>{t(`من آخر قراءة · ${readingBookmark.surahName} ص ${toArabicNumber(readingBookmark.page)}`, `From last read · ${surahById(readingBookmark.surahId)?.nameEn || readingBookmark.surahName} p. ${toArabicNumber(readingBookmark.page)}`)}</TextUI>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={{ ...card, paddingHorizontal: 14 }}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={t('اسم الختمة (اختياري)', 'Khatma name (optional)')}
          placeholderTextColor={p.muted}
          accessibilityLabel={t('اسم الختمة', 'Khatma name')}
          style={{ minHeight: 52, fontSize: 15, color: p.ink, textAlign: isRTL ? 'right' : 'left', fontFamily: Platform.OS === 'web' ? 'Tajawal, sans-serif' : 'Tajawal_400Regular' }}
        />
      </View>

      <View style={{ borderRadius: 20, padding: 18, gap: 6, backgroundColor: p.hero }}>
        <TextUI size={13} color={p.onHeroMuted}>{t('وِردك اليومي', 'Your daily portion')}</TextUI>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <TextUI size={42} weight="bold" color={p.onHero} style={{ lineHeight: 50 }}>{toArabicNumber(dailyPages)}</TextUI>
          <TextUI size={16} color={p.onHero}>{t('صفحة تقريبًا', `${pagesEn(dailyPages)} approx.`)}</TextUI>
        </View>
        <TextUI size={13} color={p.onHeroMuted} style={{ lineHeight: 21 }}>
          {t(`${toArabicNumber(pagesInPlan)} صفحة على ${toArabicNumber(days)} يومًا. إن فاتك يوم نوزّع الباقي بلطف على الأيام القادمة.`, `${toArabicNumber(pagesInPlan)} ${pagesEn(pagesInPlan)} over ${toArabicNumber(days)} days. If you miss a day, we gently spread the rest over the coming days.`)}
        </TextUI>
      </View>

      <TextUI size={13} color={p.muted}>{t('الختمة خاصة بك وتُحفظ على جهازك فقط.', 'Your khatma is private and saved only on your device.')}</TextUI>
      <TouchableOpacity
        onPress={create}
        accessibilityRole="button"
        style={{ minHeight: 52, borderRadius: 14, backgroundColor: p.primary, alignItems: 'center', justifyContent: 'center' }}
      >
        <TextUI size={16} weight="bold" color={p.onPrimary}>{t('ابدأ الختمة', 'Start the khatma')}</TextUI>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader title={khatma ? t('ختمتي', 'My Khatma') : t('ختمة جديدة', 'New Khatma')} onBack={goBack} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {!loaded ? null : khatma ? renderActive(khatma) : renderCreate()}
      </ScrollView>
    </View>
  );
};
