import React, { useState } from 'react';
import { View, TouchableOpacity, TextInput } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TextUI } from '../common/TextUI';
import { Palette } from '../../theme/palette';
import { toArabicNumber } from '../../services/prayerCalculation';
import { WirdAuto, WirdItem, WIRD_DEFAULTS, MAX_WIRD_ITEMS, MAX_WIRD_LABEL } from '../../services/dailyWird';

export interface WirdRow {
  item: WirdItem;
  label: string;
  done: boolean;
  /** Ticked from the app's own records (cannot be unticked by hand). */
  autoDone: boolean;
  note: string;
}

interface Props {
  p: Palette;
  t: (ar: string, en: string) => string;
  rows: WirdRow[];
  autoLabel: (kind: WirdAuto) => string;
  onToggle: (id: string) => void;
  onOpen: (kind: WirdAuto) => void;
  onAdd: (item: WirdItem) => void;
  onRemove: (id: string) => void;
}

export const DailyWirdCard: React.FC<Props> = ({ p, t, rows, autoLabel, onToggle, onOpen, onAdd, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const doneCount = rows.filter((r) => r.done).length;
  const percent = rows.length ? Math.round((doneCount / rows.length) * 100) : 0;
  const missingDefaults = WIRD_DEFAULTS.filter((d) => !rows.some((r) => r.item.id === d.id));
  const full = rows.length >= MAX_WIRD_ITEMS;

  const submit = () => {
    const label = draft.trim().slice(0, MAX_WIRD_LABEL);
    if (!label || full) return;
    onAdd({ id: `c${Date.now().toString(36)}`, label });
    setDraft('');
  };

  return (
    <View style={{ borderRadius: 20, padding: 16, gap: 10, backgroundColor: p.surface, borderWidth: 1, borderColor: p.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <TextUI size={16} weight="bold" color={p.ink}>{t('وِردي اليوم', 'My daily wird')}</TextUI>
          <TextUI size={12.5} color={p.muted}>
            {rows.length
              ? t(`${toArabicNumber(doneCount)} من ${toArabicNumber(rows.length)} · قائمتك أنت`, `${toArabicNumber(doneCount)} of ${toArabicNumber(rows.length)} · your own list`)
              : t('قائمتك فارغة', 'Your list is empty')}
          </TextUI>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() => { setEditing((e) => !e); setDraft(''); }}
          style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' }}
        >
          <TextUI size={14} weight="bold" color={p.primary}>{editing ? t('تم', 'Done') : t('تعديل', 'Edit')}</TextUI>
        </TouchableOpacity>
      </View>

      {rows.length ? (
        <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: p.track }}>
          <View style={{ width: `${percent}%`, height: '100%', backgroundColor: p.accent }} />
        </View>
      ) : null}

      {editing ? (
        rows.map((r) => (
          <View key={r.item.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t(`إزالة ${r.label}`, `Remove ${r.label}`)}
              onPress={() => onRemove(r.item.id)}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Feather name="minus-circle" size={20} color={p.danger} />
            </TouchableOpacity>
            <TextUI size={15} color={p.ink} style={{ flex: 1 }} numberOfLines={2}>{r.label}</TextUI>
          </View>
        ))
      ) : (
        // Compact chips: tap to tick by hand; items the app ticked open their screen instead.
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {rows.map((r) => (
            <TouchableOpacity
              key={r.item.id}
              role="checkbox"
              aria-checked={r.done}
              accessibilityLabel={r.note ? `${r.label}، ${r.note}` : r.label}
              accessibilityHint={r.autoDone ? t('تمّ تلقائيًا؛ اضغط للفتح', 'Done automatically; tap to open') : undefined}
              onPress={() => (r.autoDone && r.item.auto ? onOpen(r.item.auto) : onToggle(r.item.id))}
              onLongPress={r.item.auto ? () => onOpen(r.item.auto!) : undefined}
              style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: r.done ? p.successBg : 'transparent', borderWidth: 1, borderColor: r.done ? 'transparent' : p.border }}
            >
              <Feather name={r.done ? 'check' : 'circle'} size={r.done ? 14 : 12} color={r.done ? p.successInk : p.muted} />
              <TextUI size={13.5} weight={r.done ? 'medium' : 'regular'} color={r.done ? p.successInk : p.ink} numberOfLines={1}>
                {r.note && !r.done ? `${r.label} · ${r.note}` : r.label}
              </TextUI>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {editing ? (
        <View style={{ gap: 10, paddingTop: 4 }}>
          {missingDefaults.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {missingDefaults.map((d) => (
                <TouchableOpacity
                  key={d.id}
                  accessibilityRole="button"
                  disabled={full}
                  onPress={() => onAdd(d)}
                  style={{ minHeight: 40, paddingHorizontal: 12, borderRadius: 999, justifyContent: 'center', backgroundColor: p.soft, opacity: full ? 0.5 : 1 }}
                >
                  <TextUI size={13.5} color={p.primaryInk}>{`+ ${autoLabel(d.auto!)}`}</TextUI>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={submit}
              editable={!full}
              maxLength={MAX_WIRD_LABEL}
              placeholder={full ? t('اكتملت القائمة', 'The list is full') : t('أضف عملًا من عندك', 'Add your own item')}
              placeholderTextColor={p.muted}
              accessibilityLabel={t('عمل جديد', 'New item')}
              returnKeyType="done"
              style={{ flex: 1, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: p.border, color: p.ink, fontFamily: 'Tajawal_400Regular',fontSize: 15, textAlign: t('right', 'left') as 'right' | 'left' }}
            />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={t('إضافة', 'Add')}
              disabled={!draft.trim() || full}
              onPress={submit}
              style={{ width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primary, opacity: !draft.trim() || full ? 0.5 : 1 }}
            >
              <Feather name="plus" size={20} color={p.onPrimary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};
