// Quran reader dialogs, moved out of QuranReaderScreen without changing behaviour.
import React from 'react';
import { View, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextUI } from '../../common/TextUI';
import { toArabicNumber } from '../../../services/prayerCalculation';
import { type QuranVerse, type parseSurahVerses } from '../../../services/quranParser';
import { AVAILABLE_TAFSIR_EDITIONS } from '../../../services/tafsirService';
import { QURAN_DATA } from './readerShared';
import { usePalette } from '../../../theme/palette';

export interface AyahTafsirSheetProps {
  tafsirModalVisible: boolean;
  setTafsirModalVisible: (v: boolean) => void;
  activeAyah: QuranVerse | null;
  currentSurah: any;
  activePage: number;
  handleChangeTafsirFontSize: (delta: number) => void;
  renderAyahMarker: (arabicNumber: string, isPlaying?: boolean, verse?: QuranVerse, customFontSize?: number) => React.ReactNode;
  playingAyahNum: number | null;
  playingSurahId: number | null;
  stopAudio: () => void;
  playAyahAudio: (verse: QuranVerse) => void;
  toggleBookmark: (verse: QuranVerse) => void;
  isBookmarked: (verse: QuranVerse) => boolean;
  handleShareAyah: (verse: QuranVerse, withTafsir?: boolean) => void;
  setAyahNoteText: (text: string) => void;
  ayahNotes: Record<string, string>;
  ayahNoteKey: (verse: QuranVerse | null) => string;
  setAyahNoteModalVisible: (v: boolean) => void;
  setActionModalVisible: (v: boolean) => void;
  tafsirEditions: typeof AVAILABLE_TAFSIR_EDITIONS;
  selectedTafsirId: number;
  handleSelectTafsir: (editionId: number) => void;
  tafsirLoading: boolean;
  tafsirError: string;
  loadAyahTafsir: (editionId: number, verse?: QuranVerse | null) => void;
  activeTafsirText: string;
  tafsirFontSize: number;
  handleNavigateAyahTafsir: (direction: 'next' | 'prev') => void;
  parsedSurah: ReturnType<typeof parseSurahVerses>;
}

export const AyahTafsirSheet: React.FC<AyahTafsirSheetProps> = ({ tafsirModalVisible, setTafsirModalVisible, activeAyah, currentSurah, activePage, handleChangeTafsirFontSize, renderAyahMarker, playingAyahNum, playingSurahId, stopAudio, playAyahAudio, toggleBookmark, isBookmarked, handleShareAyah, setAyahNoteText, ayahNotes, ayahNoteKey, setAyahNoteModalVisible, setActionModalVisible, tafsirEditions, selectedTafsirId, handleSelectTafsir, tafsirLoading, tafsirError, loadAyahTafsir, activeTafsirText, tafsirFontSize, handleNavigateAyahTafsir, parsedSurah }) => {
  const p = usePalette();
  return (
    <Modal visible={tafsirModalVisible} animationType="slide" transparent onRequestClose={() => setTafsirModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '90%', backgroundColor: p.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 18 }}>
          {/* Grab handle */}
          <View style={{ width: 44, height: 4.5, borderRadius: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 12 }} />

          {/* Header Title & Controls */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ alignItems: 'flex-end', flex: 1 }}>
              <View style={{ flexDirection: 'row-reverse', alignItems: 'center', gap: 6 }}>
                <Feather name="book-open" size={17} color={p.primary} />
                <TextUI size={17} weight="bold" color={p.ink}>تفسير الآية الكريمة</TextUI>
              </View>
              <TextUI size={11} color={p.muted} style={{ marginTop: 2 }}>
                سورة {QURAN_DATA.find((item) => item.id === activeAyah?.surahId)?.nameAr || currentSurah.nameAr} • الآية {toArabicNumber(Number(activeAyah?.ayahNumber) || 1)} • صفحة {toArabicNumber(activeAyah?.pageNum || activePage)} • جزء {toArabicNumber(activeAyah?.juzNum || currentSurah.juz || 1)}
              </TextUI>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* Font Size decrease / increase */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleChangeTafsirFontSize(-1)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, alignItems: 'center', justifyContent: 'center' }}
                accessibilityLabel="تصغير خط التفسير"
              >
                <TextUI size={12} weight="bold" color={p.ink}>-A</TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleChangeTafsirFontSize(1)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, alignItems: 'center', justifyContent: 'center' }}
                accessibilityLabel="تكبير خط التفسير"
              >
                <TextUI size={12} weight="bold" color={p.ink}>+A</TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setTafsirModalVisible(false)}
                style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border, alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}
                accessibilityLabel="إغلاق التفسير"
              >
                <Feather name="x" size={18} color={p.ink} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ayah Card */}
          <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border, marginBottom: 10 }}>
            <TextUI quran size={18} color={p.ink} style={{ textAlign: 'center', lineHeight: 32 }}>
              {activeAyah?.text}{' '}
              {activeAyah ? renderAyahMarker(toArabicNumber(activeAyah.ayahNumber), false, activeAyah, 18) : null}
            </TextUI>

            {/* Action Toolbar */}
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: p.border }}>
              {/* Audio Listen */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  if (activeAyah) {
                    if (playingAyahNum === activeAyah.ayahNumber && playingSurahId === activeAyah.surahId) {
                      stopAudio();
                    } else {
                      playAyahAudio(activeAyah);
                    }
                  }
                }}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: playingAyahNum === activeAyah?.ayahNumber && playingSurahId === activeAyah?.surahId ? p.primary : p.bg,
                  borderWidth: 1,
                  borderColor: playingAyahNum === activeAyah?.ayahNumber && playingSurahId === activeAyah?.surahId ? p.primary : p.border
                }}
              >
                <Feather
                  name={playingAyahNum === activeAyah?.ayahNumber && playingSurahId === activeAyah?.surahId ? 'square' : 'volume-2'}
                  size={13}
                  color={playingAyahNum === activeAyah?.ayahNumber && playingSurahId === activeAyah?.surahId ? p.onPrimary : p.primary}
                />
                <TextUI
                  size={11}
                  weight="bold"
                  color={playingAyahNum === activeAyah?.ayahNumber && playingSurahId === activeAyah?.surahId ? p.onPrimary : p.ink}
                >
                  {playingAyahNum === activeAyah?.ayahNumber && playingSurahId === activeAyah?.surahId ? 'إيقاف' : 'استماع'}
                </TextUI>
              </TouchableOpacity>

              {/* Bookmark */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => activeAyah && toggleBookmark(activeAyah)}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: (activeAyah && isBookmarked(activeAyah)) ? 'rgba(212, 163, 115, 0.25)' : p.bg,
                  borderWidth: 1,
                  borderColor: (activeAyah && isBookmarked(activeAyah)) ? p.primary : p.border
                }}
              >
                <Feather
                  name="bookmark"
                  size={13}
                  color={(activeAyah && isBookmarked(activeAyah)) ? p.primaryInk : p.muted}
                />
                <TextUI
                  size={11}
                  weight="medium"
                  color={(activeAyah && isBookmarked(activeAyah)) ? p.primaryInk : p.ink}
                >
                  {(activeAyah && isBookmarked(activeAyah)) ? 'محفوظة' : 'علامة'}
                </TextUI>
              </TouchableOpacity>

              {/* Share Ayah & Tafsir */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => activeAyah && handleShareAyah(activeAyah, true)}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: p.bg,
                  borderWidth: 1,
                  borderColor: p.border
                }}
              >
                <Feather name="share-2" size={13} color={p.primary} />
                <TextUI size={11} weight="medium" color={p.ink}>مشاركة</TextUI>
              </TouchableOpacity>

              {/* Note */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  setAyahNoteText(activeAyah ? ayahNotes[ayahNoteKey(activeAyah)] || '' : '');
                  setAyahNoteModalVisible(true);
                }}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: activeAyah && ayahNotes[ayahNoteKey(activeAyah)] ? 'rgba(74, 158, 107, 0.2)' : p.bg,
                  borderWidth: 1,
                  borderColor: activeAyah && ayahNotes[ayahNoteKey(activeAyah)] ? p.success : p.border
                }}
              >
                <Feather
                  name="edit-3"
                  size={13}
                  color={activeAyah && ayahNotes[ayahNoteKey(activeAyah)] ? p.success : p.muted}
                />
                <TextUI
                  size={11}
                  weight="medium"
                  color={activeAyah && ayahNotes[ayahNoteKey(activeAyah)] ? p.success : p.ink}
                >
                  تدبر
                </TextUI>
              </TouchableOpacity>

              {/* More options button */}
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={() => {
                  setTafsirModalVisible(false);
                  setActionModalVisible(true);
                }}
                style={{
                  flexDirection: 'row-reverse',
                  alignItems: 'center',
                  gap: 4,
                  paddingHorizontal: 9,
                  paddingVertical: 6,
                  borderRadius: 10,
                  backgroundColor: p.bg,
                  borderWidth: 1,
                  borderColor: p.border
                }}
              >
                <Feather name="more-horizontal" size={13} color={p.muted} />
                <TextUI size={11} weight="medium" color={p.muted}>المزيد</TextUI>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tafsir Selector Horizontal Bar */}
          <View style={{ marginBottom: 6 }}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
              <TextUI size={12} weight="bold" color={p.muted}>اختر كتاب التفسير ({toArabicNumber(tafsirEditions.length)} تفاسير):</TextUI>
              <TextUI size={11} color={p.primary} weight="bold">
                {tafsirEditions.find((e) => e.id === selectedTafsirId)?.badge}
              </TextUI>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ flexDirection: 'row-reverse', gap: 8, paddingVertical: 3 }}
            >
              {tafsirEditions.map((edition) => {
                const selected = edition.id === selectedTafsirId;
                return (
                  <TouchableOpacity
                    key={edition.id}
                    activeOpacity={0.75}
                    onPress={() => handleSelectTafsir(edition.id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 12,
                      backgroundColor: selected ? p.primary : p.surface,
                      borderWidth: 1,
                      borderColor: selected ? p.primary : p.border,
                      flexDirection: 'row-reverse',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    {selected && <Feather name="check" size={13} color={p.onPrimary} />}
                    <TextUI size={12} weight="bold" color={selected ? p.onPrimary : p.ink}>
                      {edition.name}
                    </TextUI>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Selected Book Info */}
          <View style={{ paddingHorizontal: 2, marginBottom: 8, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' }}>
            <TextUI size={11} color={p.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
              المؤلف: {tafsirEditions.find((e) => e.id === selectedTafsirId)?.author}
            </TextUI>
          </View>

          {/* Tafsir Content Body */}
          <ScrollView
            style={{
              minHeight: 140,
              maxHeight: 290,
              backgroundColor: p.surface,
              borderRadius: 14,
              padding: 12,
              borderWidth: 1,
              borderColor: p.border
            }}
            showsVerticalScrollIndicator
          >
            {tafsirLoading ? (
              <View style={{ paddingVertical: 36, alignItems: 'center', gap: 10 }}>
                <ActivityIndicator color={p.primary} size="small" />
                <TextUI size={12} color={p.muted}>جارٍ جلب التفسير من المصدر المعتمد...</TextUI>
              </View>
            ) : tafsirError ? (
              <View style={{ alignItems: 'center', paddingVertical: 24, gap: 10 }}>
                <Feather name="alert-circle" size={24} color={p.danger} />
                <TextUI size={12} color={p.muted} align="center" style={{ lineHeight: 20 }}>
                  {tafsirError}
                </TextUI>
                <TouchableOpacity
                  onPress={() => loadAyahTafsir(selectedTafsirId)}
                  style={{ backgroundColor: p.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 }}
                >
                  <TextUI size={12} weight="bold" color={p.onPrimary}>إعادة المحاولة</TextUI>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ width: '100%', alignItems: 'stretch' }}>
                {activeTafsirText.split('\n\n').filter(Boolean).map((paragraph, pIdx) => (
                  <TextUI
                    key={`tafsir-p-${pIdx}`}
                    align="right"
                    size={tafsirFontSize}
                    color={p.ink}
                    style={{
                      width: '100%',
                      alignSelf: 'stretch',
                      lineHeight: Math.round(tafsirFontSize * 1.95),
                      writingDirection: 'rtl',
                      marginBottom: 10
                    }}
                  >
                    {paragraph.trim()}
                  </TextUI>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Ayah Navigation Footer */}
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <TouchableOpacity
              disabled={activeAyah ? activeAyah.ayahNumber <= 1 : true}
              onPress={() => handleNavigateAyahTafsir('prev')}
              style={{
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: p.surface,
                borderWidth: 1,
                borderColor: p.border,
                opacity: (activeAyah ? activeAyah.ayahNumber <= 1 : true) ? 0.35 : 1
              }}
            >
              <Feather name="chevron-right" size={16} color={p.ink} />
              <TextUI size={11} weight="medium" color={p.ink}>الآية السابقة</TextUI>
            </TouchableOpacity>

            <TextUI size={11} color={p.muted}>
              الآية {toArabicNumber(activeAyah?.ayahNumber || 1)} من {toArabicNumber(parsedSurah.verses.length)}
            </TextUI>

            <TouchableOpacity
              disabled={activeAyah ? activeAyah.ayahNumber >= parsedSurah.verses.length : true}
              onPress={() => handleNavigateAyahTafsir('next')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 10,
                backgroundColor: p.surface,
                borderWidth: 1,
                borderColor: p.border,
                opacity: (activeAyah ? activeAyah.ayahNumber >= parsedSurah.verses.length : true) ? 0.35 : 1
              }}
            >
              <Feather name="chevron-left" size={16} color={p.ink} />
              <TextUI size={11} weight="medium" color={p.ink}>الآية التالية</TextUI>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
