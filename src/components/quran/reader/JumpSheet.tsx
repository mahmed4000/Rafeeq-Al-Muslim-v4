// Quran reader dialogs, moved out of QuranReaderScreen without changing behaviour.
import React from 'react';
import { View, ScrollView, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextUI } from '../../common/TextUI';
import { toArabicNumber } from '../../../services/prayerCalculation';
import { QURAN_JUZ_INDEX } from '../../../data/quranIndex';
import { QURAN_DATA, type JumpType, type ReadingMode } from './readerShared';
import { usePalette } from '../../../theme/palette';

export interface JumpSheetProps {
  jumpModalVisible: boolean;
  setJumpModalVisible: (v: boolean) => void;
  setJumpType: (t: JumpType) => void;
  setJumpValue: (v: string) => void;
  jumpType: JumpType;
  jumpValue: string;
  executeJump: () => void;
  setSelectedSurah: (s: any) => void;
  goToPage: (page: number) => void;
  setReadingMode: (m: ReadingMode) => void;
}

export const JumpSheet: React.FC<JumpSheetProps> = ({ jumpModalVisible, setJumpModalVisible, setJumpType, setJumpValue, jumpType, jumpValue, executeJump, setSelectedSurah, goToPage, setReadingMode }) => {
  const p = usePalette();
  return (
    <Modal visible={jumpModalVisible} transparent animationType="fade" onRequestClose={() => setJumpModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'center', padding: 22 }}>
        <View style={{ backgroundColor: p.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: p.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><TextUI variant="h4" color={p.ink}>الانتقال إلى موضع</TextUI><TouchableOpacity onPress={() => setJumpModalVisible(false)}><Feather name="x" size={20} color={p.ink} /></TouchableOpacity></View>
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>{([{ id: 'surah', label: 'سورة' }, { id: 'juz', label: 'جزء' }, { id: 'page', label: 'صفحة' }] as const).map((item) => <TouchableOpacity key={item.id} onPress={() => { setJumpType(item.id); setJumpValue(''); }} style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 9, backgroundColor: jumpType === item.id ? p.primary : p.bgAlt }}><TextUI variant="badge" color={jumpType === item.id ? p.onPrimary : p.ink}>{item.label}</TextUI></TouchableOpacity>)}</View>
          {jumpType === 'page' ? <View><TextInput value={jumpValue} onChangeText={setJumpValue} keyboardType="number-pad" placeholder="رقم الصفحة ١ – ٦٠٤" placeholderTextColor={p.muted} style={{ marginTop: 13, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: p.border, color: p.ink, textAlign: 'center', fontSize: 16 }} /><TouchableOpacity onPress={executeJump} disabled={!jumpValue.trim()} style={{ marginTop: 11, backgroundColor: p.primary, padding: 12, borderRadius: 10, alignItems: 'center', opacity: jumpValue.trim() ? 1 : 0.45 }}><TextUI variant="badge" color={p.onPrimary}>انتقال للصفحة</TextUI></TouchableOpacity></View> : <ScrollView style={{ maxHeight: 420, marginTop: 9 }} keyboardShouldPersistTaps="handled"><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>{jumpType === 'surah' ? QURAN_DATA.map((surah: any) => <TouchableOpacity key={`surah-${surah.id}`} onPress={() => { setSelectedSurah(surah); goToPage(surah.mushafPageStart || 1); setReadingMode('page'); setJumpModalVisible(false); }} style={{ width: '48%', minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 6, borderRadius: 9, backgroundColor: p.bgAlt, borderWidth: 1, borderColor: p.border }}><TextUI variant="caption" color={p.muted}>{toArabicNumber(surah.id)}</TextUI><TextUI variant="bodyMedium" weight="bold" color={p.ink} numberOfLines={1}>{surah.nameAr}</TextUI></TouchableOpacity>) : QURAN_JUZ_INDEX.map((juz) => <TouchableOpacity key={`juz-${juz.juz}`} onPress={() => { const target = QURAN_DATA.find((surah: any) => surah.id === juz.startSurahId); if (target) setSelectedSurah(target); goToPage(juz.startPage); setReadingMode('page'); setJumpModalVisible(false); }} style={{ width: '48%', minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 6, borderRadius: 9, backgroundColor: p.bgAlt, borderWidth: 1, borderColor: p.border }}><TextUI variant="caption" color={p.muted}>{toArabicNumber(juz.juz)}</TextUI><TextUI variant="bodyMedium" weight="bold" color={p.ink}>الجزء {toArabicNumber(juz.juz)}</TextUI></TouchableOpacity>)}</View></ScrollView>}
        </View>
      </View>
    </Modal>
  );
};
