import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';

interface DateFieldProps {
  label: string;
  /** Stored value in ISO `YYYY-MM-DD` form, or '' / null when unset. */
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  /** Latest selectable date. Defaults to today (no future dates of birth). */
  maximumDate?: Date;
  minimumDate?: Date;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const pad = (n: number) => String(n).padStart(2, '0');

/** `YYYY-MM-DD` -> local Date (noon avoids UTC off-by-one), or null if unparseable. */
function parseISODate(value: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d), 12, 0, 0);
  return isNaN(date.getTime()) ? null : date;
}

/** Local Date -> `YYYY-MM-DD` (no timezone shift). */
function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local Date -> display string, e.g. "12 Jul 1998". */
function formatDisplay(date: Date): string {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function DateField({
  label,
  value,
  onChange,
  placeholder = 'Select date',
  error,
  maximumDate,
  minimumDate,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseISODate(value);
  const maxDate = maximumDate ?? new Date();
  // Sensible starting point for a birthday when nothing is set yet.
  const initial = selected ?? new Date(new Date().getFullYear() - 25, 0, 1);
  // iOS spinner holds a draft until the user taps Done; Android commits immediately.
  const [draft, setDraft] = useState<Date>(initial);

  const openPicker = () => {
    setDraft(selected ?? initial);
    setOpen(true);
  };

  const handleAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    setOpen(false);
    if (event.type === 'set' && date) {
      onChange(toISODate(date));
    }
  };

  const confirmIOS = () => {
    onChange(toISODate(draft));
    setOpen(false);
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={openPicker}
        style={[styles.inputWrap, !!error && styles.inputError]}
        accessibilityRole="button"
        accessibilityLabel={
          selected ? `${label}: ${formatDisplay(selected)}` : `${label}: not set`
        }
        accessibilityHint="Opens a date picker"
      >
        <Ionicons
          name="calendar-outline"
          size={18}
          color={Colors.textTertiary}
          style={styles.icon}
        />
        <Text style={[styles.valueText, !selected && styles.placeholderText]}>
          {selected ? formatDisplay(selected) : placeholder}
        </Text>
        {selected && (
          <Pressable
            onPress={() => onChange('')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
          >
            <Ionicons name="close-circle" size={18} color={Colors.textTertiary} />
          </Pressable>
        )}
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {open && Platform.OS === 'android' && (
        <DateTimePicker
          value={selected ?? initial}
          mode="date"
          display="default"
          maximumDate={maxDate}
          minimumDate={minimumDate}
          onChange={handleAndroidChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal
          visible={open}
          transparent
          animationType="slide"
          onRequestClose={() => setOpen(false)}
        >
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Pressable onPress={() => setOpen(false)} hitSlop={8}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Text style={styles.sheetTitle}>{label}</Text>
              <Pressable onPress={confirmIOS} hitSlop={8}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
            <DateTimePicker
              value={draft}
              mode="date"
              display="spinner"
              maximumDate={maxDate}
              minimumDate={minimumDate}
              onChange={(_, date) => date && setDraft(date)}
              style={styles.iosPicker}
            />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: Font.sansMedium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 7,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: { borderColor: Colors.critical.dot },
  icon: { marginRight: 10 },
  valueText: {
    flex: 1,
    fontFamily: Font.sans,
    fontSize: 15,
    color: Colors.text,
  },
  placeholderText: { color: Colors.placeholder },
  errorText: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.critical.dot,
    marginTop: 5,
  },
  backdrop: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.separatorLight,
  },
  sheetTitle: { fontFamily: Font.sansSemiBold, fontSize: 15, color: Colors.text },
  cancelText: { fontFamily: Font.sansMedium, fontSize: 15, color: Colors.textSecondary },
  doneText: { fontFamily: Font.sansSemiBold, fontSize: 15, color: Colors.primary },
  iosPicker: { alignSelf: 'center' },
});
