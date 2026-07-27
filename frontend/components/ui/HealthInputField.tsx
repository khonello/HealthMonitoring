import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Shadows } from '@/constants/shadows';
import { Spacing } from '@/constants/spacing';

type Status = 'normal' | 'caution' | 'critical' | 'default';

const STATUS_COLORS: Record<Status, { dot: string; hint: string }> = {
  normal: { dot: Colors.normal.dot, hint: Colors.normal.text },
  caution: { dot: Colors.caution.dot, hint: Colors.caution.text },
  critical: { dot: Colors.critical.dot, hint: Colors.critical.text },
  default: { dot: Colors.textTertiary, hint: Colors.textTertiary },
};

interface HealthInputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  unit: string;
  placeholder?: string;
  hint?: string;
  status?: Status;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  secondValue?: string;
  secondPlaceholder?: string;
  onSecondChangeText?: (text: string) => void;
  secondUnit?: string;
}

export function HealthInputField({
  label,
  value,
  onChangeText,
  unit,
  placeholder = '—',
  hint,
  status = 'default',
  error,
  icon,
  secondValue,
  secondPlaceholder,
  onSecondChangeText,
  secondUnit,
}: HealthInputFieldProps) {
  const sc = STATUS_COLORS[status];
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable onPress={() => inputRef.current?.focus()} style={styles.card}>
      <View style={styles.inner}>
        <View style={styles.labelRow}>
          {icon && (
            <Ionicons name={icon} size={16} color={error ? Colors.critical.dot : sc.dot} style={styles.icon} />
          )}
          <Text style={styles.label}>{label}</Text>
          {status !== 'default' && !error && (
            <View style={[styles.statusDot, { backgroundColor: sc.dot }]} />
          )}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={Colors.placeholder}
            keyboardType="decimal-pad"
            style={styles.input}
          />
          {/* Paired fields carry one unit at the end — "120 / 80 mmHg" is how a blood
              pressure reading is written and spoken. A unit wedged between the two
              numbers reads as though it applied only to the first. */}
          {secondValue !== undefined && onSecondChangeText ? (
            <>
              <Text style={styles.separator}>/</Text>
              <TextInput
                value={secondValue}
                onChangeText={onSecondChangeText}
                placeholder={secondPlaceholder ?? '—'}
                placeholderTextColor={Colors.placeholder}
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Text style={styles.unit}>{secondUnit ?? unit}</Text>
            </>
          ) : (
            <Text style={styles.unit}>{unit}</Text>
          )}
        </View>

        {(hint || error) && (
          <Text style={[styles.hint, error && styles.hintError]}>
            {error ?? hint}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.cardGap,
    ...Shadows.card,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  icon: {
    marginRight: 2,
  },
  label: {
    fontFamily: Font.sansMedium,
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  input: {
    fontFamily: Font.serif,
    fontSize: 32,
    color: Colors.text,
    // DM Serif Display runs wide: a 4-glyph placeholder like "36.5" needs ~72px at
    // 32px. Anything tighter clips the placeholder, which only shows when empty —
    // once you type, the field scrolls to follow the cursor and hides the crop.
    minWidth: 78,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  unit: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  separator: {
    fontFamily: Font.sansLight,
    fontSize: 24,
    color: Colors.textTertiary,
  },
  hint: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 8,
  },
  hintError: {
    color: Colors.critical.dot,
  },
});
