// Quran reader dialogs, moved out of QuranReaderScreen without changing behaviour.
import React from 'react';
import { View, ScrollView, TouchableOpacity, Modal, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TextUI } from '../../common/TextUI';
import { toArabicNumber } from '../../../services/prayerCalculation';
import { QURAN_RECITERS } from '../../../services/quranParser';
import { AVAILABLE_TAFSIR_EDITIONS, saveSelectedTafsirId } from '../../../services/tafsirService';
import { type ReadingMode } from './readerShared';
import { type ListenMode } from './ListenChoiceSheet';
import { useApp } from '../../../context/AppContext';
import { usePalette } from '../../../theme/palette';

export interface ReadingMenuSheetProps {
  readingMenuVisible: boolean;
  setReadingMenuVisible: (v: boolean) => void;
  readingMode: ReadingMode;
  setReadingMode: (m: ReadingMode) => void;
  setFontSizeModalVisible: (v: boolean) => void;
  currentReciterObj: (typeof QURAN_RECITERS)[number];
  setReciterModalVisible: (v: boolean) => void;
  listenMode: ListenMode;
  setListenMode: (m: ListenMode) => void;
}

const LISTEN_MODES: { id: ListenMode; label: string; labelEn: string }[] = [
  { id: 'ask', label: 'اسألني', labelEn: 'Ask me' },
  { id: 'mushaf', label: 'مع المصحف', labelEn: 'With mushaf' },
  { id: 'audio', label: 'استماع فقط', labelEn: 'Listen only' }
];

const VIEW_MODES: { id: ReadingMode; label: string; labelEn: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { id: 'page', label: 'مصحف', labelEn: 'Mushaf', icon: 'book-open' },
  { id: 'surah', label: 'آيات', labelEn: 'Verses', icon: 'align-right' },
  { id: 'tafsir', label: 'تفسير', labelEn: 'Tafsir', icon: 'book' }
];

/** The reader's "View" sheet (bottom toolbar): the view mode as a switch, then font size and reciter. */
export const ReadingMenuSheet: React.FC<ReadingMenuSheetProps> = ({ readingMenuVisible, setReadingMenuVisible, readingMode, setReadingMode, setFontSizeModalVisible, currentReciterObj, setReciterModalVisible, listenMode, setListenMode }) => {
  const p = usePalette();
  const { quranFontSize, triggerHaptic, t, isRTL, lang } = useApp();
  return (
    <Modal visible={readingMenuVisible} animationType="slide" transparent onRequestClose={() => setReadingMenuVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableOpacity accessibilityLabel={t('إغلاق', 'Close')} activeOpacity={1} onPress={() => setReadingMenuVisible(false)} style={{ flex: 1 }} />
        <View style={{ backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 14 }}>
          <View style={{ width: 44, height: 4.5, borderRadius: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 6 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
            <TextUI size={18} weight="bold" color={p.ink}>{t('العرض', 'View')}</TextUI>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={() => setReadingMenuVisible(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={20} color={p.ink} />
            </TouchableOpacity>
          </View>

          {/* View mode */}
          <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 4, marginHorizontal: 20, marginBottom: 12, padding: 4, borderRadius: 14, backgroundColor: p.bgAlt }}>
            {VIEW_MODES.map((mode) => {
              const selected = readingMode === mode.id;
              return (
                <TouchableOpacity
                  key={mode.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => { triggerHaptic('light'); setReadingMode(mode.id); setReadingMenuVisible(false); }}
                  style={{ flex: 1, minHeight: 48, borderRadius: 11, alignItems: 'center', justifyContent: 'center', gap: 2, backgroundColor: selected ? p.surface : 'transparent', borderWidth: selected ? 1 : 0, borderColor: p.border }}
                >
                  <Feather name={mode.icon} size={16} color={selected ? p.primary : p.muted} />
                  <TextUI size={13} weight={selected ? 'bold' : 'medium'} color={selected ? p.ink : p.muted}>{t(mode.label, mode.labelEn)}</TextUI>
                </TouchableOpacity>
              );
            })}
          </View>

          {[
            { key: 'font', icon: 'type' as const, label: t('حجم الخط', 'Font size'), value: toArabicNumber(quranFontSize), open: () => setFontSizeModalVisible(true) },
            { key: 'reciter', icon: 'mic' as const, label: t('القارئ', 'Reciter'), value: lang === 'en' ? currentReciterObj.nameEn : currentReciterObj.nameAr, open: () => setReciterModalVisible(true) }
          ].map((row) => (
            <TouchableOpacity
              key={row.key}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={row.value ? `${row.label}: ${row.value}` : row.label}
              onPress={() => {
                triggerHaptic('light');
                setReadingMenuVisible(false);
                row.open();
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 20, borderTopWidth: 1, borderColor: p.border }}
            >
              <Feather name={row.icon} size={18} color={p.primary} />
              <TextUI size={15} color={p.ink} style={{ flex: 1 }}>{row.label}</TextUI>
              {row.value ? <TextUI size={14} color={p.muted} numberOfLines={1} style={{ maxWidth: '50%' }}>{row.value}</TextUI> : null}
              <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color={p.muted} />
            </TouchableOpacity>
          ))}

          {/* What "Listen" does: ask each time, or the remembered choice */}
          <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderColor: p.border, gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Feather name="headphones" size={18} color={p.primary} />
              <TextUI size={15} color={p.ink}>{t('طريقة الاستماع المفضّلة', 'Preferred way to listen')}</TextUI>
            </View>
            <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', gap: 4, padding: 4, borderRadius: 14, backgroundColor: p.bgAlt }}>
              {LISTEN_MODES.map((mode) => {
                const selected = listenMode === mode.id;
                return (
                  <TouchableOpacity
                    key={mode.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => { triggerHaptic('light'); setListenMode(mode.id); }}
                    style={{ flex: 1, minHeight: 44, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? p.surface : 'transparent', borderWidth: selected ? 1 : 0, borderColor: p.border }}
                  >
                    <TextUI size={13} weight={selected ? 'bold' : 'medium'} color={selected ? p.ink : p.muted}>{t(mode.label, mode.labelEn)}</TextUI>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export interface ReaderMoreSheetProps {
  visible: boolean;
  onClose: () => void;
  onBookmarks: () => void;
  onPlaybackSettings: () => void;
  onKhatma: () => void;
}

/** The top bar's "⋯": bookmarks, recitation settings, and the khatma. */
export const ReaderMoreSheet: React.FC<ReaderMoreSheetProps> = ({ visible, onClose, onBookmarks, onPlaybackSettings, onKhatma }) => {
  const p = usePalette();
  const { triggerHaptic, t, isRTL } = useApp();
  const rows: { key: string; icon: React.ComponentProps<typeof Feather>['name']; label: string; note: string; open: () => void }[] = [
    { key: 'bookmarks', icon: 'bookmark', label: t('العلامات', 'Bookmarks'), note: t('الآيات التي وضعت عليها علامة', 'The verses you bookmarked'), open: onBookmarks },
    { key: 'playback', icon: 'repeat', label: t('إعدادات التلاوة والتكرار', 'Recitation and repeat settings'), note: t('نطاق التلاوة والتكرار والسرعة', 'Range, repeats and speed'), open: onPlaybackSettings },
    { key: 'khatma', icon: 'target', label: t('ختمتي', 'My khatma'), note: t('ورد اليوم والتقدّم', "Today's portion and progress"), open: onKhatma }
  ];
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <TouchableOpacity accessibilityLabel={t('إغلاق', 'Close')} activeOpacity={1} onPress={onClose} style={{ flex: 1 }} />
        <View style={{ backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 30 : 14 }}>
          <View style={{ width: 44, height: 4.5, borderRadius: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 6 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
            <TextUI size={18} weight="bold" color={p.ink}>{t('المزيد', 'More')}</TextUI>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={onClose} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={20} color={p.ink} />
            </TouchableOpacity>
          </View>
          {rows.map((row) => (
            <TouchableOpacity
              key={row.key}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`${row.label}. ${row.note}`}
              // Act once the sheet has closed: leaving the reader at once froze it with the sheet still showing.
              onPress={() => { triggerHaptic('light'); onClose(); setTimeout(row.open, 300); }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 20, borderTopWidth: 1, borderColor: p.border }}
            >
              <Feather name={row.icon} size={18} color={p.primary} />
              <View style={{ flex: 1 }}>
                <TextUI size={15} color={p.ink}>{row.label}</TextUI>
                <TextUI size={12.5} color={p.muted}>{row.note}</TextUI>
              </View>
              <Feather name={isRTL ? 'chevron-left' : 'chevron-right'} size={16} color={p.muted} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Modal>
  );
};

export interface ReciterSheetProps {
  reciterModalVisible: boolean;
  setReciterModalVisible: (v: boolean) => void;
  stopAudio: () => void;
  setSelectedReciter: (id: string) => void;
  selectedReciter: string;
}

export const ReciterSheet: React.FC<ReciterSheetProps> = ({ reciterModalVisible, setReciterModalVisible, stopAudio, setSelectedReciter, selectedReciter }) => {
  const p = usePalette();
  const { triggerHaptic, t, lang } = useApp();
  return (
    <Modal visible={reciterModalVisible} animationType="fade" transparent onRequestClose={() => setReciterModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: p.bg, borderRadius: 20, padding: 20, maxHeight: '82%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <TextUI size={17} weight="bold" color={p.ink}>
              {t('اختر القارئ', 'Choose a reciter')}
            </TextUI>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={() => setReciterModalVisible(false)}>
              <Feather name="x" size={20} color={p.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
          {QURAN_RECITERS.map((r) => (
            <TouchableOpacity
              key={r.id}
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                stopAudio();
                setSelectedReciter(r.id);
                AsyncStorage.setItem('quran.selected-reciter', r.id).catch(() => {});
                setReciterModalVisible(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderColor: p.border
              }}
            >
              <View>
                <TextUI size={14} weight="bold" color={r.id === selectedReciter ? p.primary : p.ink}>
                  {lang === 'en' ? r.nameEn : r.nameAr}
                </TextUI>
                <TextUI size={11} color={p.muted}>
                  {lang === 'en' ? r.nameAr : r.nameEn}
                </TextUI>
              </View>
              {r.id === selectedReciter && (
                <Feather name="check" size={18} color={p.primary} />
              )}
            </TouchableOpacity>
          ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

export interface FontSizeSheetProps {
  fontSizeModalVisible: boolean;
  setFontSizeModalVisible: (v: boolean) => void;
  tafsirFontSize: number;
  tafsirCardBgColor: string;
  tafsirBorderColor: string;
  handleChangeTafsirFontSize: (delta: number) => void;
}

export const FontSizeSheet: React.FC<FontSizeSheetProps> = ({ fontSizeModalVisible, setFontSizeModalVisible, tafsirFontSize, tafsirCardBgColor, tafsirBorderColor, handleChangeTafsirFontSize }) => {
  const p = usePalette();
  const { quranFontSize, triggerHaptic, setQuranFontSize, t } = useApp();
  return (
    <Modal visible={fontSizeModalVisible} animationType="slide" transparent onRequestClose={() => setFontSizeModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
          <View style={{ width: 44, height: 4.5, borderRadius: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="type" size={18} color={p.primary} />
              <TextUI size={17} weight="bold" color={p.ink}>{t('إعدادات حجم الخط', 'Font size settings')}</TextUI>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={() => setFontSizeModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={p.ink} />
            </TouchableOpacity>
          </View>

          {/* Quran Font Size Section */}
          <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <TextUI size={14} weight="bold" color={p.ink}>{t('خط آيات المصحف الشريف', 'Mushaf verse font')}</TextUI>
              <TextUI size={12} weight="bold" color={p.primary}>{toArabicNumber(quranFontSize)} {t('نقطة', 'pt')}</TextUI>
            </View>

            <View style={{ backgroundColor: p.bgAlt, borderRadius: 10, padding: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12, minHeight: 65, borderWidth: 1, borderColor: p.border }}>
              <TextUI quran size={quranFontSize} color={p.ink} align="center">
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </TextUI>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  setQuranFontSize(Math.max(18, quranFontSize - 2));
                }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: p.bgAlt, borderWidth: 1, borderColor: p.border }}
              >
                <Feather name="minus" size={16} color={p.ink} />
                <TextUI size={13} weight="bold" color={p.ink}>{t('تصغير (A-)', 'Smaller (A-)')}</TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  setQuranFontSize(Math.min(44, quranFontSize + 2));
                }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: p.primary }}
              >
                <Feather name="plus" size={16} color={p.onPrimary} />
                <TextUI size={13} weight="bold" color={p.onPrimary}>{t('تكبير (A+)', 'Larger (A+)')}</TextUI>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tafsir Font Size Section */}
          <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <TextUI size={14} weight="bold" color={p.ink}>{t('خط نصوص التفسير والتدبر', 'Tafsir and reflection text font')}</TextUI>
              <TextUI size={12} weight="bold" color={p.primary}>{toArabicNumber(tafsirFontSize)} {t('نقطة', 'pt')}</TextUI>
            </View>

            <View style={{ backgroundColor: tafsirCardBgColor, borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: tafsirBorderColor }}>
              <TextUI size={tafsirFontSize} color={p.ink} style={{ lineHeight: Math.round(tafsirFontSize * 1.6), textAlign: 'right' }}>
                تفسير واضح وميسر لآيات الذكر الحكيم يعين على التدبر والفهم.
              </TextUI>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  handleChangeTafsirFontSize(-1);
                }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: p.bgAlt, borderWidth: 1, borderColor: p.border }}
              >
                <Feather name="minus" size={16} color={p.ink} />
                <TextUI size={13} weight="bold" color={p.ink}>{t('تصغير (A-)', 'Smaller (A-)')}</TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  handleChangeTafsirFontSize(1);
                }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: p.primary }}
              >
                <Feather name="plus" size={16} color={p.onPrimary} />
                <TextUI size={13} weight="bold" color={p.onPrimary}>{t('تكبير (A+)', 'Larger (A+)')}</TextUI>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export interface TafsirPickerSheetProps {
  tafsirPickerVisible: boolean;
  setTafsirPickerVisible: (v: boolean) => void;
  selectedTafsirId: number;
  setSelectedTafsirId: (id: number) => void;
}

export const TafsirPickerSheet: React.FC<TafsirPickerSheetProps> = ({ tafsirPickerVisible, setTafsirPickerVisible, selectedTafsirId, setSelectedTafsirId }) => {
  const p = usePalette();
  const { triggerHaptic, t } = useApp();
  return (
    <Modal visible={tafsirPickerVisible} animationType="slide" transparent onRequestClose={() => setTafsirPickerVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '85%', backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
          <View style={{ width: 44, height: 4.5, borderRadius: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View>
              <TextUI size={18} weight="bold" color={p.ink}>{t('اختيار كتاب التفسير', 'Choose a tafsir')}</TextUI>
              <TextUI size={11} color={p.muted} style={{ marginTop: 2 }}>
                {t('اختر من بين ٧ تفاسير معتمدة ومحققة', 'Choose from 7 approved, verified tafsirs')}
              </TextUI>
            </View>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('إغلاق', 'Close')} onPress={() => setTafsirPickerVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={p.ink} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
            {AVAILABLE_TAFSIR_EDITIONS.map((edition) => {
              const isSelected = selectedTafsirId === edition.id;
              return (
                <TouchableOpacity
                  key={`tafsir-edition-${edition.id}`}
                  activeOpacity={0.8}
                  onPress={() => {
                    triggerHaptic('light');
                    setSelectedTafsirId(edition.id);
                    saveSelectedTafsirId(edition.id);
                    setTafsirPickerVisible(false);
                  }}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: isSelected ? p.soft : p.surface,
                    borderWidth: 1.5,
                    borderColor: isSelected ? p.primary : p.border
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <TextUI size={14} weight="bold" color={isSelected ? p.primaryInk : p.ink}>
                        {t(edition.name, edition.nameEn)}
                      </TextUI>
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: p.bgAlt }}>
                        <TextUI size={10} weight="bold" color={p.primary}>
                          {t(edition.badge, edition.badgeEn)}
                        </TextUI>
                      </View>
                    </View>
                    {isSelected && (
                      <Feather name="check-circle" size={18} color={p.primary} />
                    )}
                  </View>
                  <TextUI size={11} color={p.muted} style={{ marginBottom: 4 }}>
                    {t(edition.author, edition.authorEn)}
                  </TextUI>
                  <TextUI size={10.5} color={p.muted} numberOfLines={2}>
                    {t(edition.description, edition.descriptionEn)}
                  </TextUI>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
