import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextUI } from '../components/common/TextUI';
import { usePalette } from '../theme/palette';

export interface SettingsRow {
  key: string;
  label: string;
  value?: string;
  onPress: () => void;
  /** Set only for rows that expand in place (shows an up/down chevron). */
  expanded?: boolean;
}

/** A card of tappable settings rows (label, current value, chevron), with an optional group title. */
export const SettingsList: React.FC<{ title?: string; rows: SettingsRow[]; children?: React.ReactNode }> = ({ title, rows, children }) => {
  const p = usePalette();
  return (
    <View style={{ gap: 8 }}>
      {title ? <TextUI size={13} weight="bold" color={p.accentInk} style={{ paddingHorizontal: 4 }}>{title}</TextUI> : null}
      <View style={{ borderRadius: 20, overflow: 'hidden', backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
        {rows.map((row, i) => (
          <TouchableOpacity
            key={row.key}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={row.expanded === undefined ? undefined : { expanded: row.expanded }}
            accessibilityLabel={row.value ? `${row.label}: ${row.value}` : row.label}
            onPress={row.onPress}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 52, borderTopWidth: i ? 1 : 0, borderColor: p.border }}
          >
            <TextUI size={15} color={p.ink} style={{ flex: 1 }}>{row.label}</TextUI>
            {row.value ? <TextUI size={14} color={p.muted} numberOfLines={1} style={{ flexShrink: 1, maxWidth: '60%' }}>{row.value}</TextUI> : null}
            <Feather name={row.expanded === undefined ? 'chevron-left' : row.expanded ? 'chevron-up' : 'chevron-down'} size={16} color={p.muted} />
          </TouchableOpacity>
        ))}
        {children}
      </View>
    </View>
  );
};
