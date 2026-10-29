// Quran reader dialogs, moved out of QuranReaderScreen without changing behaviour.
import React from 'react';
import { View, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextUI } from '../../common/TextUI';
import { toArabicNumber } from '../../../services/prayerCalculation';
import { type PlaybackSettings } from './readerShared';
import { usePalette } from '../../../theme/palette';
import { useApp } from '../../../context/AppContext';

export interface PlaybackSettingsSheetProps {
  playbackSettingsVisible: boolean;
  setPlaybackSettingsVisible: (v: boolean) => void;
  playbackSettings: PlaybackSettings;
  updatePlaybackSettings: (patch: Partial<PlaybackSettings>) => void;
  audioPlayerRef: React.MutableRefObject<any>;
  webAudioRef: React.MutableRefObject<any>;
}

export const PlaybackSettingsSheet: React.FC<PlaybackSettingsSheetProps> = ({ playbackSettingsVisible, setPlaybackSettingsVisible, playbackSettings, updatePlaybackSettings, audioPlayerRef, webAudioRef }) => {
  const p = usePalette();
  const { t } = useApp();
  return (
    <Modal visible={playbackSettingsVisible} animationType="slide" transparent onRequestClose={() => setPlaybackSettingsVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '88%', backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 18, paddingTop: 18, paddingBottom: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}><View><TextUI size={18} weight="bold" color={p.ink}>{t('إعدادات التلاوة', 'Recitation settings')}</TextUI><TextUI size={11} color={p.muted} style={{ marginTop: 3 }}>{t('اختر النطاق وطريقة التكرار والسرعة', 'Choose the range, repetition and speed')}</TextUI></View><TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={() => setPlaybackSettingsVisible(false)}><Feather name="x" size={21} color={p.ink} /></TouchableOpacity></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border, marginBottom: 10 }}>
              <TextUI size={14} weight="bold" color={p.ink}>{t('نطاق التلاوة', 'Recitation range')}</TextUI>
              <TextUI size={11} color={p.muted} style={{ marginTop: 3, marginBottom: 11 }}>{t('يبدأ من الآية المحددة ويتابع حتى نهاية النطاق.', 'Starts from the selected verse and continues to the end of the range.')}</TextUI>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                {([{ id: 'page', label: 'الصفحة', labelEn: 'Page' }, { id: 'surah', label: 'السورة', labelEn: 'Surah' }, { id: 'juz', label: 'الجزء', labelEn: 'Juz' }, { id: 'quran', label: 'القرآن كاملًا', labelEn: 'Whole Quran' }] as const).map((item) => {
                  const active = playbackSettings.range === item.id;
                  return <TouchableOpacity key={item.id} onPress={() => updatePlaybackSettings({ range: item.id })} style={{ paddingHorizontal: 13, paddingVertical: 9, borderRadius: 11, backgroundColor: active ? p.primary : p.bgAlt }}><TextUI size={12} weight="bold" color={active ? p.onPrimary : p.ink}>{t(item.label, item.labelEn)}</TextUI></TouchableOpacity>;
                })}
              </View>
            </View>

            {([
              { key: 'rangeRepeats' as const, label: t('تكرار النطاق', 'Repeat range'), helper: t('عدد مرات تشغيل النطاق بما فيها المرة الأولى', 'How many times the range plays, including the first') },
              { key: 'ayahRepeats' as const, label: t('تكرار كل آية', 'Repeat each verse'), helper: t('عدد مرات تشغيل الآية قبل الانتقال', 'How many times each verse plays before moving on') }
            ]).map((item) => <View key={item.key} style={{ backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}><TextUI size={13} weight="bold" color={p.ink}>{item.label}</TextUI><TextUI size={10} color={p.muted} style={{ marginTop: 3 }}>{item.helper}</TextUI></View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><TouchableOpacity onPress={() => updatePlaybackSettings({ [item.key]: Math.max(1, playbackSettings[item.key] - 1) })} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: p.bgAlt, alignItems: 'center', justifyContent: 'center' }}><Feather name="minus" size={15} color={p.ink} /></TouchableOpacity><TextUI size={13} weight="bold" color={p.primary}>{toArabicNumber(playbackSettings[item.key])}×</TextUI><TouchableOpacity onPress={() => updatePlaybackSettings({ [item.key]: Math.min(10, playbackSettings[item.key] + 1) })} style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: p.bgAlt, alignItems: 'center', justifyContent: 'center' }}><Feather name="plus" size={15} color={p.ink} /></TouchableOpacity></View>
            </View>)}

            <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border, marginBottom: 10 }}>
              <TextUI size={13} weight="bold" color={p.ink}>{t('الوقف بين الآيات', 'Pause between verses')}</TextUI>
              <View style={{ flexDirection: 'row', gap: 7, marginTop: 10 }}>{([0, 2, 5, 10] as const).map((seconds) => <TouchableOpacity key={seconds} onPress={() => updatePlaybackSettings({ pauseSeconds: seconds })} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10, backgroundColor: playbackSettings.pauseSeconds === seconds ? p.primary : p.bgAlt }}><TextUI size={11} weight="bold" color={playbackSettings.pauseSeconds === seconds ? p.onPrimary : p.ink}>{seconds === 0 ? t('بدون', 'None') : t(`${seconds} ث`, `${seconds} s`)}</TextUI></TouchableOpacity>)}</View>
            </View>

            <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border, marginBottom: 10 }}>
              <TextUI size={13} weight="bold" color={p.ink}>{t('سرعة التشغيل', 'Playback speed')}</TextUI>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>{([0.75, 1, 1.25, 1.5, 2] as const).map((speed) => <TouchableOpacity key={speed} onPress={() => { updatePlaybackSettings({ speed }); audioPlayerRef.current?.setPlaybackRate(speed); if (webAudioRef.current) webAudioRef.current.playbackRate = speed; }} style={{ minWidth: 52, alignItems: 'center', paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, backgroundColor: playbackSettings.speed === speed ? p.primary : p.bgAlt }}><TextUI size={11} weight="bold" color={playbackSettings.speed === speed ? p.onPrimary : p.ink}>{speed}×</TextUI></TouchableOpacity>)}</View>
            </View>

            <TouchableOpacity onPress={() => updatePlaybackSettings({ stopAtRangeEnd: !playbackSettings.stopAtRangeEnd })} style={{ backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><View style={{ flex: 1 }}><TextUI size={13} weight="bold" color={p.ink}>{t('التوقف بعد نهاية النطاق', 'Stop at end of range')}</TextUI><TextUI size={10} color={p.muted} style={{ marginTop: 3 }}>{t('أوقف التلاوة عند نهاية الصفحة أو السورة أو الجزء', 'Stop recitation at the end of the page, surah or juz')}</TextUI></View><View style={{ width: 43, height: 25, borderRadius: 13, backgroundColor: playbackSettings.stopAtRangeEnd ? p.success : p.border, padding: 3, justifyContent: 'center', alignItems: playbackSettings.stopAtRangeEnd ? 'flex-end' : 'flex-start' }}><View style={{ width: 19, height: 19, borderRadius: 10, backgroundColor: p.onPrimary }} /></View></TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
