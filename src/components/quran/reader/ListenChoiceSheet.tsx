import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Switch, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextUI } from '../../common/TextUI';
import { useApp } from '../../../context/AppContext';
import { usePalette } from '../../../theme/palette';

/** How "Listen" starts: ask each time, follow along on the mushaf, or the listen-only screen. */
export type ListenMode = 'ask' | 'mushaf' | 'audio';
export const LISTEN_MODE_KEY = 'quran.listen-mode.v1';

export interface ListenChoiceSheetProps {
  visible: boolean;
  /** Reciter and starting ayah, e.g. "Mishary Alafasy · from ayah 107 of Al-Isra". */
  subtitle: string;
  onClose: () => void;
  onStart: (mode: 'mushaf' | 'audio', remember: boolean) => void;
}

/** Asked when "Listen" is pressed: with the mushaf on screen, or listen only. */
export const ListenChoiceSheet: React.FC<ListenChoiceSheetProps> = ({ visible, subtitle, onClose, onStart }) => {
  const p = usePalette();
  const { t, triggerHaptic } = useApp();
  const [mode, setMode] = useState<'mushaf' | 'audio'>('mushaf');
  const [remember, setRemember] = useState(false);

  const option = (id: 'mushaf' | 'audio', icon: React.ComponentProps<typeof Feather>['name'], title: string, note: string) => {
    const selected = mode === id;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityRole="radio"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${title}. ${note}`}
        onPress={() => { triggerHaptic('light'); setMode(id); }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, borderWidth: selected ? 1.5 : 1, borderColor: selected ? p.accent : p.border, backgroundColor: selected ? p.soft : p.surface }}
      >
        <View style={{ width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? p.primary : p.soft }}>
          <Feather name={icon} size={22} color={selected ? p.onPrimary : p.primary} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <TextUI size={16} weight="bold" color={p.ink}>{title}</TextUI>
          <TextUI size={12.5} color={p.muted}>{note}</TextUI>
        </View>
        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: selected ? 6 : 1.5, borderColor: selected ? p.primary : p.border }} />
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(45,30,22,0.38)', justifyContent: 'flex-end' }}>
        <TouchableOpacity accessibilityLabel={t('إغلاق', 'Close')} activeOpacity={1} onPress={onClose} style={{ flex: 1 }} />
        <View accessibilityLabel={t('طريقة الاستماع', 'How to listen')} style={{ backgroundColor: p.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingTop: 10, paddingHorizontal: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 18, gap: 12 }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: p.border }} />
          <View style={{ gap: 2 }}>
            <TextUI size={19} weight="bold" color={p.ink}>{t('كيف تريد الاستماع؟', 'How would you like to listen?')}</TextUI>
            <TextUI size={13} color={p.muted}>{subtitle}</TextUI>
          </View>

          {option('mushaf', 'book-open', t('مع المصحف', 'With the mushaf'), t('تتبّع الآية على الصفحة، والمشغّل يختفي ويظهر بلمسة', 'Follow the ayah on the page; the player hides and shows with a tap'))}
          {option('audio', 'headphones', t('استماع فقط', 'Listen only'), t('شاشة هادئة بالآية الحالية وأدوات كبيرة، تصلح للسيارة والمشي', 'A calm screen with the current ayah and large controls, for driving or walking'))}

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, minHeight: 44 }}>
            <TextUI size={13.5} color={p.ink} style={{ flex: 1 }}>{t('تذكّر اختياري ولا تسألني مرة أخرى', 'Remember my choice and don’t ask again')}</TextUI>
            <Switch
              accessibilityLabel={t('تذكّر اختياري', 'Remember my choice')}
              value={remember}
              onValueChange={setRemember}
              trackColor={{ false: p.border, true: p.primary }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => { triggerHaptic('light'); onStart(mode, remember); }}
            style={{ height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primary }}
          >
            <TextUI size={16} weight="bold" color={p.onPrimary}>{t('ابدأ الاستماع', 'Start listening')}</TextUI>
          </TouchableOpacity>
          <TextUI size={12} color={p.muted} style={{ textAlign: 'center' }}>{t('يمكن تغيير ذلك لاحقًا من «العرض»', 'You can change this later in “View”')}</TextUI>
        </View>
      </View>
    </Modal>
  );
};
