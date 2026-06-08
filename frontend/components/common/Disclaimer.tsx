import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';

interface DisclaimerProps {
  text?: string;
  variant?: 'inline' | 'banner';
}

const DEFAULT_TEXT =
  'This tool helps you decide where to seek care. It does not diagnose conditions or replace professional medical advice. In an emergency, go to the nearest hospital immediately.';

export function Disclaimer({ text = DEFAULT_TEXT, variant = 'inline' }: DisclaimerProps) {
  if (variant === 'banner') {
    return (
      <View style={styles.banner}>
        <Ionicons name="shield-checkmark-outline" size={16} color={Colors.primary} />
        <Text style={styles.bannerText}>{text}</Text>
      </View>
    );
  }

  return (
    <View style={styles.inline}>
      <Ionicons name="information-circle-outline" size={14} color={Colors.textTertiary} />
      <Text style={styles.inlineText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  inline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingHorizontal: 4,
  },
  inlineText: {
    flex: 1,
    fontFamily: Font.sansLight,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    padding: 14,
  },
  bannerText: {
    flex: 1,
    fontFamily: Font.sans,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.primaryText,
  },
});
