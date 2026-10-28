import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Modal, FlatList, TextInput, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { TextUI } from '../components/common/TextUI';
import { ScreenHeader } from '../ui/ScreenHeader';
import { Stepper } from '../ui/Stepper';
import { usePalette } from '../theme/palette';
import { StorageService } from '../services/storage';
import { toArabicNumber } from '../services/prayerCalculation';
import { parseSurahVerses, QURAN_RECITERS, getAyahAudioUrl } from '../services/quranParser';
import { normalizeArabic } from '../services/quranSearch';
import { playClip, wait, AyahPlayback } from '../services/ayahPlayer';

const QURAN_DATA: any[] = require('../../assets/quran_complete_114.json');
const SETTINGS_KEY = 'rafeeq_tahfeez_settings_v1';
const PAUSE_LABELS = ['بدون مهلة', 'بطول الآية', 'ضعف الآية'];

interface TahfeezSettings {
  reciterId: string;
  surahId: number;
  fromAyah: number;
  toAyah: number;
  rangeRepeat: number;
  ayahRepeat: number;
  pauseFactor: number; // silence after each ayah, as a multiple of its length
}

const DEFAULTS: TahfeezSettings = {
  reciterId: 'Husary_128kbps',
  surahId: 67,
  fromAyah: 1,
  toAyah: 5,
  rangeRepeat: 3,
  ayahRepeat: 2,
  pauseFactor: 1
};

const times = (n: number) => (n === 1 ? 'مرة' : n === 2 ? 'مرتان' : `${toArabicNumber(n)} مرات`);

export const TahfeezScreen: React.FC = () => {
  const { goBack, triggerHaptic, t } = useApp();
  const p = usePalette();

  const [settings, setSettings] = useState<TahfeezSettings>(DEFAULTS);
  const [picker, setPicker] = useState<'surah' | 'reciter' | null>(null);
  const [surahQuery, setSurahQuery] = useState('');
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<{ ayah: number; round: number; rep: number; listening: boolean } | null>(null);
  const [error, setError] = useState('');

  const runIdRef = useRef(0);
  const playbackRef = useRef<AyahPlayback | null>(null);

  useEffect(() => {
    let alive = true;
    StorageService.getObject<TahfeezSettings>(SETTINGS_KEY, DEFAULTS).then((saved) => {
      if (alive) setSettings({ ...DEFAULTS, ...saved });
    });
    return () => {
      alive = false;
      runIdRef.current += 1;
      playbackRef.current?.stop();
    };
  }, []);

  const surah = useMemo(() => QURAN_DATA.find((s) => s.id === settings.surahId) || QURAN_DATA[0], [settings.surahId]);
  const verses = useMemo(() => parseSurahVerses(surah).verses, [surah]);
  const versesCount: number = surah.verses || verses.length;
  const reciter = QURAN_RECITERS.find((r) => r.id === settings.reciterId) || QURAN_RECITERS[0];

  const update = (patch: Partial<TahfeezSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      next.fromAyah = Math.max(1, Math.min(next.fromAyah, versesCount));
      next.toAyah = Math.max(next.fromAyah, Math.min(next.toAyah, versesCount));
      StorageService.setObject(SETTINGS_KEY, next);
      return next;
    });
  };

  const stop = () => {
    runIdRef.current += 1;
    playbackRef.current?.stop();
    playbackRef.current = null;
    setRunning(false);
    setStatus(null);
  };

  const start = async () => {
    triggerHaptic('medium');
    setError('');
    const runId = ++runIdRef.current;
    const alive = () => runIdRef.current === runId;
    const s = settings;
    setRunning(true);
    try {
      for (let round = 1; round <= s.rangeRepeat; round++) {
        for (let ayah = s.fromAyah; ayah <= s.toAyah; ayah++) {
          for (let rep = 1; rep <= s.ayahRepeat; rep++) {
            if (!alive()) return;
            setStatus({ ayah, round, rep, listening: true });
            const playback = playClip(getAyahAudioUrl(s.surahId, ayah, s.reciterId));
            playbackRef.current = playback;
            const secs = await playback.finished;
            if (!alive()) return;
            if (s.pauseFactor > 0) {
              setStatus({ ayah, round, rep, listening: false });
              await wait(Math.max(1500, secs * 1000 * s.pauseFactor));
            }
          }
        }
      }
      if (alive()) {
        triggerHaptic('success');
        setRunning(false);
        setStatus(null);
      }
    } catch (e) {
      if (!alive()) return;
      setError('تعذّر تشغيل التلاوة. تحقق من الاتصال بالإنترنت أو جرّب قارئًا آخر.');
      setRunning(false);
      setStatus(null);
    }
  };

  const ayahCount = settings.toAyah - settings.fromAyah + 1;
  const card = { borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, overflow: 'hidden' as const };
  const filteredSurahs = surahQuery.trim()
    ? QURAN_DATA.filter((s) => normalizeArabic(s.nameAr).includes(normalizeArabic(surahQuery)) || String(s.id) === surahQuery.trim())
    : QURAN_DATA;

  const renderSession = () => {
    const current = status ? verses.find((v) => v.ayahNumber === status.ayah) : null;
    return (
      <View style={{ gap: 16 }}>
        <View style={{ ...card, padding: 20, minHeight: 220, justifyContent: 'center' }}>
          <TextUI font="amiri" size={28} color={p.quranInk} align="center" style={{ lineHeight: 58 }}>
            {current ? `${current.text} ${current.badge}` : '…'}
          </TextUI>
        </View>
        {status ? (
          <View style={{ alignItems: 'center', gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: status.listening ? p.soft : p.successBg }}>
              <Feather name={status.listening ? 'headphones' : 'mic'} size={16} color={status.listening ? p.primaryInk : p.successInk} />
              <TextUI size={15} weight="bold" color={status.listening ? p.primaryInk : p.successInk}>
                {status.listening ? 'استمع' : 'ردّد الآن بصوتك'}
              </TextUI>
            </View>
            <TextUI size={14} color={p.muted} align="center">
              {`الآية ${toArabicNumber(status.ayah)} · التكرار ${toArabicNumber(status.rep)} من ${toArabicNumber(settings.ayahRepeat)} · المقطع ${toArabicNumber(status.round)} من ${toArabicNumber(settings.rangeRepeat)}`}
            </TextUI>
          </View>
        ) : null}
        <TouchableOpacity
          onPress={stop}
          accessibilityRole="button"
          style={{ minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: p.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <TextUI size={16} weight="bold" color={p.primary}>إيقاف الجلسة</TextUI>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSetup = () => (
    <View style={{ gap: 14 }}>
      <TouchableOpacity onPress={() => setPicker('reciter')} accessibilityRole="button" style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 56 }}>
        <Feather name="headphones" size={20} color={p.primary} />
        <View style={{ flex: 1 }}>
          <TextUI size={13} color={p.muted}>القارئ</TextUI>
          <TextUI size={16} weight="bold" color={p.ink}>{reciter.nameAr}</TextUI>
        </View>
        <TextUI size={14} weight="bold" color={p.primary}>تغيير</TextUI>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setPicker('surah')} accessibilityRole="button" style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 56 }}>
        <Feather name="book-open" size={20} color={p.primary} />
        <View style={{ flex: 1 }}>
          <TextUI size={13} color={p.muted}>السورة</TextUI>
          <TextUI font="amiri" size={20} weight="bold" color={p.ink}>{surah.nameAr}</TextUI>
        </View>
        <TextUI size={13} color={p.muted}>{`${toArabicNumber(versesCount)} آية`}</TextUI>
      </TouchableOpacity>

      <View style={card}>
        <Stepper
          label="من الآية"
          valueLabel={toArabicNumber(settings.fromAyah)}
          onDecrement={() => update({ fromAyah: settings.fromAyah - 1 })}
          onIncrement={() => update({ fromAyah: settings.fromAyah + 1, toAyah: Math.max(settings.toAyah, settings.fromAyah + 1) })}
          canDecrement={settings.fromAyah > 1}
          canIncrement={settings.fromAyah < versesCount}
        />
        <Stepper
          label="إلى الآية"
          valueLabel={toArabicNumber(settings.toAyah)}
          onDecrement={() => update({ toAyah: settings.toAyah - 1 })}
          onIncrement={() => update({ toAyah: settings.toAyah + 1 })}
          canDecrement={settings.toAyah > settings.fromAyah}
          canIncrement={settings.toAyah < versesCount}
        />
      </View>

      <View style={card}>
        <Stepper
          label="تكرار المقطع كاملًا"
          sub={`الآيات ${toArabicNumber(settings.fromAyah)}–${toArabicNumber(settings.toAyah)}`}
          valueLabel={times(settings.rangeRepeat)}
          onDecrement={() => update({ rangeRepeat: settings.rangeRepeat - 1 })}
          onIncrement={() => update({ rangeRepeat: settings.rangeRepeat + 1 })}
          canDecrement={settings.rangeRepeat > 1}
          canIncrement={settings.rangeRepeat < 20}
        />
        <Stepper
          label="تكرار كل آية"
          sub="قبل الانتقال للتالية"
          valueLabel={times(settings.ayahRepeat)}
          onDecrement={() => update({ ayahRepeat: settings.ayahRepeat - 1 })}
          onIncrement={() => update({ ayahRepeat: settings.ayahRepeat + 1 })}
          canDecrement={settings.ayahRepeat > 1}
          canIncrement={settings.ayahRepeat < 20}
        />
        <Stepper
          label="مهلة الترديد بعد الآية"
          sub="لتعيدها بصوتك"
          valueLabel={PAUSE_LABELS[settings.pauseFactor]}
          onDecrement={() => update({ pauseFactor: settings.pauseFactor - 1 })}
          onIncrement={() => update({ pauseFactor: settings.pauseFactor + 1 })}
          canDecrement={settings.pauseFactor > 0}
          canIncrement={settings.pauseFactor < PAUSE_LABELS.length - 1}
        />
      </View>

      <TextUI size={13} color={p.muted}>
        {`${toArabicNumber(ayahCount)} آيات × ${toArabicNumber(settings.ayahRepeat * settings.rangeRepeat)} سماع لكل آية. التلاوة تحتاج اتصالًا بالإنترنت.`}
      </TextUI>
      {error ? <TextUI size={14} color="#B34743">{error}</TextUI> : null}
      <TouchableOpacity
        onPress={start}
        accessibilityRole="button"
        style={{ minHeight: 52, borderRadius: 14, backgroundColor: p.primary, alignItems: 'center', justifyContent: 'center' }}
      >
        <TextUI size={16} weight="bold" color={p.onPrimary}>ابدأ الجلسة</TextUI>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <ScreenHeader
        title={t('جلسة الحفظ', 'Memorization')}
        subtitle={running ? `${surah.nameAr} ${toArabicNumber(settings.fromAyah)}–${toArabicNumber(settings.toAyah)}` : undefined}
        onBack={() => { stop(); goBack(); }}
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {running ? renderSession() : renderSetup()}
      </ScrollView>

      <Modal visible={picker !== null} transparent animationType="slide" onRequestClose={() => setPicker(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(45,30,22,0.45)' }}>
          <View style={{ maxHeight: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: p.bg, paddingTop: 10 }}>
            <View style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: p.track, marginBottom: 6 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 }}>
              <TextUI size={18} weight="bold" color={p.ink} style={{ flex: 1 }}>{picker === 'reciter' ? 'اختر القارئ' : 'اختر السورة'}</TextUI>
              <TouchableOpacity onPress={() => setPicker(null)} accessibilityRole="button" accessibilityLabel="إغلاق" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="x" size={20} color={p.muted} />
              </TouchableOpacity>
            </View>
            {picker === 'surah' ? (
              <View style={{ marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: p.border, backgroundColor: p.surface, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="search" size={16} color={p.muted} />
                <TextInput
                  value={surahQuery}
                  onChangeText={setSurahQuery}
                  placeholder="ابحث عن سورة"
                  placeholderTextColor={p.muted}
                  accessibilityLabel="بحث عن سورة"
                  style={{ flex: 1, minHeight: 44, color: p.ink, textAlign: 'right', fontFamily: Platform.OS === 'web' ? 'Tajawal, sans-serif' : 'Tajawal_400Regular' }}
                />
              </View>
            ) : null}
            {picker === 'reciter' ? (
              <FlatList
                data={QURAN_RECITERS}
                keyExtractor={(r) => r.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { update({ reciterId: item.id }); setPicker(null); }}
                    accessibilityRole="button"
                    style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderColor: p.divider, gap: 10 }}
                  >
                    <TextUI size={15} color={p.ink} style={{ flex: 1 }}>{item.nameAr}</TextUI>
                    {item.id === settings.reciterId ? <Feather name="check" size={18} color={p.primary} /> : null}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <FlatList
                data={filteredSurahs}
                keyExtractor={(s) => String(s.id)}
                initialNumToRender={20}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    onPress={() => { update({ surahId: item.id, fromAyah: 1, toAyah: Math.min(5, item.verses) }); setPicker(null); setSurahQuery(''); }}
                    accessibilityRole="button"
                    style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, borderBottomWidth: 1, borderColor: p.divider, gap: 12 }}
                  >
                    <TextUI size={13} weight="bold" color={p.accentInk} style={{ width: 30, textAlign: 'center' }}>{toArabicNumber(item.id)}</TextUI>
                    <TextUI font="amiri" size={19} weight="bold" color={p.ink} style={{ flex: 1 }}>{item.nameAr}</TextUI>
                    <TextUI size={13} color={p.muted}>{`${toArabicNumber(item.verses)} آية`}</TextUI>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};
