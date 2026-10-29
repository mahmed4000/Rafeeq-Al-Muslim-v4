// Quran reader dialogs, moved out of QuranReaderScreen without changing behaviour.
import React from 'react';
import { View, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextUI } from '../../common/TextUI';
import { toArabicNumber } from '../../../services/prayerCalculation';
import { type QuranVerse, QURAN_RECITERS } from '../../../services/quranParser';
import { QURAN_DATA } from './readerShared';
import { usePalette } from '../../../theme/palette';
import { useApp } from '../../../context/AppContext';

export interface AyahActionSheetProps {
  actionModalVisible: boolean;
  activeAyah: QuranVerse | null;
  currentSurah: any;
  setActionModalVisible: (v: boolean) => void;
  openAyahTafsir: (verse?: QuranVerse | null) => void;
  playAyahAudio: (verse: QuranVerse) => void;
  currentReciterObj: (typeof QURAN_RECITERS)[number];
  setReciterModalVisible: (v: boolean) => void;
  toggleBookmark: (verse: QuranVerse) => void;
  isBookmarked: (verse: QuranVerse) => boolean;
  handleShareAyah: (verse: QuranVerse, withTafsir?: boolean) => void;
  setAyahNoteText: (text: string) => void;
  ayahNotes: Record<string, string>;
  ayahNoteKey: (verse: QuranVerse | null) => string;
  setAyahNoteModalVisible: (v: boolean) => void;
}

export const AyahActionSheet: React.FC<AyahActionSheetProps> = ({ actionModalVisible, activeAyah, currentSurah, setActionModalVisible, openAyahTafsir, playAyahAudio, currentReciterObj, setReciterModalVisible, toggleBookmark, isBookmarked, handleShareAyah, setAyahNoteText, ayahNotes, ayahNoteKey, setAyahNoteModalVisible }) => {
  const p = usePalette();
  const { t, isRTL, lang } = useApp();
  const en = lang === 'en';
  const activeSurahData = QURAN_DATA.find((item) => item.id === activeAyah?.surahId) || currentSurah;
  const reciterName = en ? currentReciterObj.nameEn : currentReciterObj.nameAr;
  return (
    <Modal visible={actionModalVisible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View
          style={{
            backgroundColor: p.bg,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            padding: 20
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <TextUI size={16} weight="bold" color={p.ink}>
              {en
                ? `Verse ${toArabicNumber(activeAyah?.ayahNumber || 1)} options • Surah ${activeSurahData?.nameEn || ''}`
                : <>خيارات الآية {toArabicNumber(activeAyah?.ayahNumber || 1)} • سورة {QURAN_DATA.find((item) => item.id === activeAyah?.surahId)?.nameAr || currentSurah.nameAr}</>}
            </TextUI>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={() => setActionModalVisible(false)}>
              <Feather name="x" size={20} color={p.ink} />
            </TouchableOpacity>
          </View>

          {/* Verse text snippet */}
          <View
            style={{
              backgroundColor: p.surface,
              borderRadius: 14,
              padding: 14,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: p.border
            }}
          >
            <TextUI quran size={16} color={p.ink} style={{ textAlign: 'center', lineHeight: 26 }}>
              ﴿ {activeAyah?.text} ﴾
            </TextUI>
          </View>

          {/* Action Buttons */}
          <View style={{ gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openAyahTafsir()}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: p.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: p.border }}
            >
              <Feather name="book-open" size={18} color={p.primary} />
              <TextUI size={14} weight="bold" color={p.ink}>{t('تفسير الآية • اختر من عدة تفاسير', 'Verse tafsir • choose from several tafsirs')}</TextUI>
              <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color={p.muted} />
            </TouchableOpacity>

            {/* Play Audio */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setActionModalVisible(false);
                if (activeAyah) playAyahAudio(activeAyah);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: p.primary,
                padding: 14,
                borderRadius: 14
              }}
            >
              <Feather name="play" size={18} color={p.onPrimary} />
              <TextUI size={14} weight="bold" color={p.onPrimary}>
                {en ? `Listen to the verse by ${reciterName}` : <>استمع للآية بصوت {currentReciterObj.nameAr}</>}
              </TextUI>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => { setActionModalVisible(false); setReciterModalVisible(true); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: p.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: p.border }}
            >
              <Feather name="mic" size={18} color={p.primary} />
              <TextUI size={14} weight="medium" color={p.ink}>{en ? `Change reciter • current: ${reciterName}` : <>تغيير القارئ • الحالي: {currentReciterObj.nameAr}</>}</TextUI>
              <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color={p.muted} />
            </TouchableOpacity>

            {/* Set Bookmark */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => activeAyah && toggleBookmark(activeAyah)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: p.surface,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: p.border
              }}
            >
              <Feather name="bookmark" size={18} color={p.primary} />
              <TextUI size={14} weight="medium" color={p.ink}>
                {activeAyah && isBookmarked(activeAyah) ? t('إزالة العلامة عن هذه الآية', 'Remove bookmark from this verse') : t('إضافة علامة عند هذه الآية', 'Bookmark this verse')}
              </TextUI>
            </TouchableOpacity>

            {/* Share Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => activeAyah && handleShareAyah(activeAyah)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: p.surface,
                padding: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: p.border
              }}
            >
              <Feather name="share-2" size={18} color={p.primary} />
              <TextUI size={14} weight="medium" color={p.ink}>
                {t('مشاركة الآية الكريمة', 'Share the verse')}
              </TextUI>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setAyahNoteText(activeAyah ? ayahNotes[ayahNoteKey(activeAyah)] || '' : '');
                setActionModalVisible(false);
                setAyahNoteModalVisible(true);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: p.surface, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: p.border }}
            >
              <Feather name="edit-3" size={18} color={p.primary} />
              <TextUI size={14} weight="medium" color={p.ink}>{activeAyah && ayahNotes[ayahNoteKey(activeAyah)] ? t('عرض أو تعديل ملاحظتي على الآية', 'View or edit my note on the verse') : t('إضافة ملاحظة على الآية', 'Add a note on the verse')}</TextUI>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export interface AyahNoteSheetProps {
  ayahNoteModalVisible: boolean;
  setAyahNoteModalVisible: (v: boolean) => void;
  activeAyah: QuranVerse | null;
  ayahNoteText: string;
  setAyahNoteText: (text: string) => void;
  saveAyahNote: () => void;
}

export const AyahNoteSheet: React.FC<AyahNoteSheetProps> = ({ ayahNoteModalVisible, setAyahNoteModalVisible, activeAyah, ayahNoteText, setAyahNoteText, saveAyahNote }) => {
  const p = usePalette();
  const { t, isRTL } = useApp();
  return (
    <Modal visible={ayahNoteModalVisible} animationType="fade" transparent onRequestClose={() => setAyahNoteModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 22 }}>
        <View style={{ backgroundColor: p.surface, borderRadius: 20, padding: 18 }}>
          <TextUI size={16} weight="bold" color={p.ink}>{t('ملاحظة على الآية', 'Note on verse')} {toArabicNumber(activeAyah?.ayahNumber || 1)}</TextUI>
          <TextInput value={ayahNoteText} onChangeText={setAyahNoteText} placeholder={t('اكتب فائدة أو تدبرًا أو مرجعًا', 'Write a benefit, a reflection or a reference')} placeholderTextColor={p.muted} multiline textAlign={isRTL ? 'right' : 'left'} style={{ minHeight: 110, marginTop: 14, padding: 12, borderWidth: 1, borderColor: p.border, borderRadius: 12, color: p.ink, textAlignVertical: 'top' }} />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 18, marginTop: 14 }}>
            <TouchableOpacity onPress={() => setAyahNoteModalVisible(false)}><TextUI size={13} color={p.muted}>{t('إلغاء', 'Cancel')}</TextUI></TouchableOpacity>
            <TouchableOpacity onPress={saveAyahNote}><TextUI size={13} weight="bold" color={p.primary}>{t('حفظ الملاحظة', 'Save note')}</TextUI></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
