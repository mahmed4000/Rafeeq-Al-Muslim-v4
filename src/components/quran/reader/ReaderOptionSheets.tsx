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
import { useApp } from '../../../context/AppContext';
import { usePalette } from '../../../theme/palette';

export interface ReadingMenuSheetProps {
  readingMenuVisible: boolean;
  setReadingMenuVisible: (v: boolean) => void;
  readingMode: ReadingMode;
  setModeModalVisible: (v: boolean) => void;
  setFontSizeModalVisible: (v: boolean) => void;
  currentReciterObj: (typeof QURAN_RECITERS)[number];
  setReciterModalVisible: (v: boolean) => void;
  setIsImmersive: (v: boolean) => void;
  autoScroll: boolean;
  setAutoScroll: (v: boolean) => void;
}

export const ReadingMenuSheet: React.FC<ReadingMenuSheetProps> = ({ readingMenuVisible, setReadingMenuVisible, readingMode, setModeModalVisible, setFontSizeModalVisible, currentReciterObj, setReciterModalVisible, setIsImmersive, autoScroll, setAutoScroll }) => {
  const p = usePalette();
  const { quranFontSize, triggerHaptic } = useApp();
  return (
    <Modal visible={readingMenuVisible} animationType="fade" transparent onRequestClose={() => setReadingMenuVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: p.bg, borderRadius: 20, paddingVertical: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 }}>
            <TextUI size={18} weight="bold" color={p.ink}>إعدادات القراءة</TextUI>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="إغلاق" onPress={() => setReadingMenuVisible(false)} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="x" size={20} color={p.ink} />
            </TouchableOpacity>
          </View>
          {[
            { key: 'mode', icon: 'layout' as const, label: 'طريقة العرض', value: readingMode === 'tafsir' ? 'التفسير' : readingMode === 'surah' ? 'عرض السورة' : 'صفحات المصحف', open: () => setModeModalVisible(true) },
            { key: 'font', icon: 'type' as const, label: 'حجم الخط', value: toArabicNumber(quranFontSize), open: () => setFontSizeModalVisible(true) },
            { key: 'reciter', icon: 'mic' as const, label: 'القارئ', value: currentReciterObj.nameAr, open: () => setReciterModalVisible(true) },
            { key: 'immersive', icon: 'maximize-2' as const, label: 'قراءة دون مشتتات', value: '', open: () => setIsImmersive(true) },
            { key: 'autoscroll', icon: 'chevrons-down' as const, label: 'تمرير تلقائي', value: autoScroll ? 'يعمل' : 'متوقف', open: () => setAutoScroll(!autoScroll) }
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
              <Feather name="chevron-left" size={16} color={p.muted} />
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
  const { triggerHaptic } = useApp();
  return (
    <Modal visible={reciterModalVisible} animationType="fade" transparent onRequestClose={() => setReciterModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: p.bg, borderRadius: 20, padding: 20, maxHeight: '82%' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <TextUI size={17} weight="bold" color={p.ink}>
              اختر القارئ
            </TextUI>
            <TouchableOpacity onPress={() => setReciterModalVisible(false)}>
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
                  {r.nameAr}
                </TextUI>
                <TextUI size={11} color={p.muted}>
                  {r.nameEn}
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

export interface ReadingModeSheetProps {
  modeModalVisible: boolean;
  setModeModalVisible: (v: boolean) => void;
  setReadingMode: (m: ReadingMode) => void;
  readingMode: ReadingMode;
}

export const ReadingModeSheet: React.FC<ReadingModeSheetProps> = ({ modeModalVisible, setModeModalVisible, setReadingMode, readingMode }) => {
  const p = usePalette();
  const { triggerHaptic } = useApp();
  return (
    <Modal visible={modeModalVisible} animationType="slide" transparent onRequestClose={() => setModeModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
          <View style={{ width: 44, height: 4.5, borderRadius: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <TextUI size={18} weight="bold" color={p.ink}>طريقة عرض المصحف</TextUI>
            <TouchableOpacity onPress={() => setModeModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={p.ink} />
            </TouchableOpacity>
          </View>

          <View style={{ gap: 10 }}>
            {/* Option 1: Mushaf Page Mode */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                setReadingMode('page');
                setModeModalVisible(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderRadius: 16,
                backgroundColor: readingMode === 'page' ? p.soft : p.surface,
                borderWidth: 1.5,
                borderColor: readingMode === 'page' ? p.primary : p.border
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: p.bgAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <TextUI size={20}>📖</TextUI>
              </View>
              <View style={{ flex: 1 }}>
                <TextUI size={14} weight="bold" color={readingMode === 'page' ? p.primaryInk : p.ink}>
                  المصحف الشريف (صفحات مصورة)
                </TextUI>
                <TextUI size={11} color={p.muted} style={{ marginTop: 2 }}>
                  عرض صفحات المصحف المعتمدة والمطابقة للمصحف الورقي، مثالية للحفظ والمراجعة
                </TextUI>
              </View>
              {readingMode === 'page' && (
                <Feather name="check-circle" size={20} color={p.primary} />
              )}
            </TouchableOpacity>

            {/* Option 2: Tafsir & Tadabbur Stream Mode */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                setReadingMode('tafsir');
                setModeModalVisible(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderRadius: 16,
                backgroundColor: readingMode === 'tafsir' ? p.soft : p.surface,
                borderWidth: 1.5,
                borderColor: readingMode === 'tafsir' ? p.primary : p.border
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: p.bgAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <TextUI size={20}>📚</TextUI>
              </View>
              <View style={{ flex: 1 }}>
                <TextUI size={14} weight="bold" color={readingMode === 'tafsir' ? p.primaryInk : p.ink}>
                  التفسير والتدبر (عرض عمودي)
                </TextUI>
                <TextUI size={11} color={p.muted} style={{ marginTop: 2 }}>
                  عرض كل آية مع بطاقة تفسيرها مباشرة ومشاركتها مع ٧ تفاسير معتمدة
                </TextUI>
              </View>
              {readingMode === 'tafsir' && (
                <Feather name="check-circle" size={20} color={p.primary} />
              )}
            </TouchableOpacity>

            {/* Option 3: Continuous Surah Mode */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                triggerHaptic('light');
                setReadingMode('surah');
                setModeModalVisible(false);
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 14,
                borderRadius: 16,
                backgroundColor: readingMode === 'surah' ? p.soft : p.surface,
                borderWidth: 1.5,
                borderColor: readingMode === 'surah' ? p.primary : p.border
              }}
            >
              <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: p.bgAlt, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <TextUI size={20}>📜</TextUI>
              </View>
              <View style={{ flex: 1 }}>
                <TextUI size={14} weight="bold" color={readingMode === 'surah' ? p.primaryInk : p.ink}>
                  عرض السورة المتتابع
                </TextUI>
                <TextUI size={11} color={p.muted} style={{ marginTop: 2 }}>
                  قراءة متصلة لآيات السورة كاملة في تدفق واحد مع بيان المقاصد
                </TextUI>
              </View>
              {readingMode === 'surah' && (
                <Feather name="check-circle" size={20} color={p.primary} />
              )}
            </TouchableOpacity>
          </View>
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
  const { quranFontSize, triggerHaptic, setQuranFontSize } = useApp();
  return (
    <Modal visible={fontSizeModalVisible} animationType="slide" transparent onRequestClose={() => setFontSizeModalVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
          <View style={{ width: 44, height: 4.5, borderRadius: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Feather name="type" size={18} color={p.primary} />
              <TextUI size={17} weight="bold" color={p.ink}>إعدادات حجم الخط</TextUI>
            </View>
            <TouchableOpacity onPress={() => setFontSizeModalVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={20} color={p.ink} />
            </TouchableOpacity>
          </View>

          {/* Quran Font Size Section */}
          <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border, marginBottom: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <TextUI size={14} weight="bold" color={p.ink}>خط آيات المصحف الشريف</TextUI>
              <TextUI size={12} weight="bold" color={p.primary}>{toArabicNumber(quranFontSize)} نقطة</TextUI>
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
                <TextUI size={13} weight="bold" color={p.ink}>تصغير (A-)</TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  setQuranFontSize(Math.min(44, quranFontSize + 2));
                }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: p.primary }}
              >
                <Feather name="plus" size={16} color={p.onPrimary} />
                <TextUI size={13} weight="bold" color={p.onPrimary}>تكبير (A+)</TextUI>
              </TouchableOpacity>
            </View>
          </View>

          {/* Tafsir Font Size Section */}
          <View style={{ backgroundColor: p.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <TextUI size={14} weight="bold" color={p.ink}>خط نصوص التفسير والتدبر</TextUI>
              <TextUI size={12} weight="bold" color={p.primary}>{toArabicNumber(tafsirFontSize)} نقطة</TextUI>
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
                <TextUI size={13} weight="bold" color={p.ink}>تصغير (A-)</TextUI>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  triggerHaptic('light');
                  handleChangeTafsirFontSize(1);
                }}
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, backgroundColor: p.primary }}
              >
                <Feather name="plus" size={16} color={p.onPrimary} />
                <TextUI size={13} weight="bold" color={p.onPrimary}>تكبير (A+)</TextUI>
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
  const { triggerHaptic } = useApp();
  return (
    <Modal visible={tafsirPickerVisible} animationType="slide" transparent onRequestClose={() => setTafsirPickerVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
        <View style={{ maxHeight: '85%', backgroundColor: p.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: Platform.OS === 'ios' ? 34 : 20 }}>
          <View style={{ width: 44, height: 4.5, borderRadius: 3, backgroundColor: p.border, alignSelf: 'center', marginBottom: 14 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <View>
              <TextUI size={18} weight="bold" color={p.ink}>اختيار كتاب التفسير</TextUI>
              <TextUI size={11} color={p.muted} style={{ marginTop: 2 }}>
                اختر من بين ٧ تفاسير معتمدة ومحققة
              </TextUI>
            </View>
            <TouchableOpacity onPress={() => setTafsirPickerVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
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
                        {edition.name}
                      </TextUI>
                      <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: p.bgAlt }}>
                        <TextUI size={10} weight="bold" color={p.primary}>
                          {edition.badge}
                        </TextUI>
                      </View>
                    </View>
                    {isSelected && (
                      <Feather name="check-circle" size={18} color={p.primary} />
                    )}
                  </View>
                  <TextUI size={11} color={p.muted} style={{ marginBottom: 4 }}>
                    {edition.author}
                  </TextUI>
                  <TextUI size={10.5} color={p.muted} numberOfLines={2}>
                    {edition.description}
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
