import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { InputConfidence } from '@/types/health';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';

const config: Record<
  InputConfidence,
  { label: string; textColor: string; bgColor: string; borderColor: string; dotColor: string }
> = {
  high: {
    label: 'High quality',
    textColor: Colors.normal.text,
    bgColor: Colors.normal.bg,
    borderColor: Colors.normal.border,
    dotColor: Colors.normal.dot,
  },
  medium: {
    label: 'Medium quality',
    textColor: Colors.caution.text,
    bgColor: Colors.caution.bg,
    borderColor: Colors.caution.border,
    dotColor: Colors.caution.dot,
  },
  low: {
    label: 'Low quality',
    textColor: Colors.textSecondary,
    bgColor: Colors.surfaceSecondary,
    borderColor: Colors.separator,
    dotColor: Colors.textTertiary,
  },
};

interface ConfidenceBadgeProps {
  level: InputConfidence;
  showDot?: boolean;
}

export function ConfidenceBadge({ level, showDot = true }: ConfidenceBadgeProps) {
  const c = config[level];
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: c.bgColor, borderColor: c.borderColor },
      ]}
    >
      {showDot && (
        <View style={[styles.dot, { backgroundColor: c.dotColor }]} />
      )}
      <Text style={[styles.label, { color: c.textColor }]}>{c.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: Font.sansMedium,
    fontSize: 12,
  },
});
