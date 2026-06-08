import { StyleSheet } from 'react-native';
import { Colors } from './colors';

export const Font = {
  serif: 'DMSerifDisplay_400Regular',
  serifItalic: 'DMSerifDisplay_400Italic',
  sans: 'DMSans_400Regular',
  sansLight: 'DMSans_300Light',
  sansMedium: 'DMSans_500Medium',
  sansSemiBold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
} as const;

export const TextStyles = StyleSheet.create({
  display: {
    fontFamily: Font.serif,
    fontSize: 48,
    lineHeight: 54,
    color: Colors.text,
  },
  h1: {
    fontFamily: Font.serif,
    fontSize: 34,
    lineHeight: 40,
    color: Colors.text,
  },
  h2: {
    fontFamily: Font.serif,
    fontSize: 28,
    lineHeight: 34,
    color: Colors.text,
  },
  h3: {
    fontFamily: Font.sansBold,
    fontSize: 22,
    lineHeight: 28,
    color: Colors.text,
  },
  h4: {
    fontFamily: Font.sansSemiBold,
    fontSize: 18,
    lineHeight: 24,
    color: Colors.text,
  },
  bodyLarge: {
    fontFamily: Font.sans,
    fontSize: 17,
    lineHeight: 26,
    color: Colors.text,
  },
  body: {
    fontFamily: Font.sans,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  bodySmall: {
    fontFamily: Font.sans,
    fontSize: 13,
    lineHeight: 20,
    color: Colors.text,
  },
  labelLarge: {
    fontFamily: Font.sansMedium,
    fontSize: 15,
    lineHeight: 20,
    color: Colors.text,
  },
  label: {
    fontFamily: Font.sansMedium,
    fontSize: 13,
    lineHeight: 18,
    color: Colors.text,
  },
  labelSmall: {
    fontFamily: Font.sansMedium,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 0.5,
    color: Colors.textSecondary,
  },
  caption: {
    fontFamily: Font.sansLight,
    fontSize: 12,
    lineHeight: 16,
    color: Colors.textTertiary,
  },
  vitalNumber: {
    fontFamily: Font.serif,
    fontSize: 38,
    lineHeight: 44,
    color: Colors.text,
  },
  vitalUnit: {
    fontFamily: Font.sans,
    fontSize: 14,
    lineHeight: 18,
    color: Colors.textSecondary,
  },
  overline: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textTertiary,
  },
});
