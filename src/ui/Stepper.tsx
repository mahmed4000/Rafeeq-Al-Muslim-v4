import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { TextUI } from '../components/common/TextUI';
import { usePalette } from '../theme/palette';
import { useApp } from '../context/AppContext';

interface StepperProps {
  label: string;
  sub?: string;
  valueLabel: string;
  onDecrement: () => void;
  onIncrement: () => void;
  canDecrement?: boolean;
  canIncrement?: boolean;
}

/** A settings row with − value + controls (44pt touch targets). */
export const Stepper: React.FC<StepperProps> = ({
  label, sub, valueLabel, onDecrement, onIncrement, canDecrement = true, canIncrement = true
}) => {
  const p = usePalette();
  const { t } = useApp();
  const btn = (text: string, onPress: () => void, enabled: boolean, a11y: string) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={`${a11y} ${label}`}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bgAlt, opacity: enabled ? 1 : 0.4 }}
    >
      <TextUI size={20} weight="bold" color={p.primaryInk}>{text}</TextUI>
    </TouchableOpacity>
  );
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 14, minHeight: 60, borderBottomWidth: 1, borderColor: p.divider }}>
      <View style={{ flex: 1 }}>
        <TextUI size={15} weight="bold" color={p.ink}>{label}</TextUI>
        {sub ? <TextUI size={12.5} color={p.muted}>{sub}</TextUI> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: p.border, overflow: 'hidden' }}>
        {btn('−', onDecrement, canDecrement, t('إنقاص', 'Decrease'))}
        <TextUI size={14} weight="bold" color={p.ink} style={{ minWidth: 72, textAlign: 'center' }}>{valueLabel}</TextUI>
        {btn('+', onIncrement, canIncrement, t('زيادة', 'Increase'))}
      </View>
    </View>
  );
};
