import React from 'react';
import { View, ViewStyle, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors } from '@/constants/colors';
import { Radius } from '@/constants/radius';
import { Shadows } from '@/constants/shadows';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  variant?: 'white' | 'tinted' | 'glass';
  intensity?: number;
}

export function GlassCard({
  children,
  style,
  padding = 20,
  variant = 'white',
  intensity = 80,
}: GlassCardProps) {
  if (variant === 'glass' && Platform.OS === 'ios') {
    return (
      <BlurView
        intensity={intensity}
        tint="light"
        style={[styles.base, { padding }, style]}
      >
        {children}
      </BlurView>
    );
  }

  return (
    <View
      style={[
        styles.base,
        { padding },
        variant === 'tinted' && styles.tinted,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  tinted: {
    backgroundColor: Colors.surfaceSecondary,
  },
});
