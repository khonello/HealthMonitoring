import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightPress?: () => void;
  large?: boolean;
  transparent?: boolean;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightIcon,
  onRightPress,
  large = false,
  transparent = false,
}: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + (Platform.OS === 'android' ? 8 : 4) },
        transparent && styles.transparent,
      ]}
    >
      <View style={styles.row}>
        {showBack ? (
          <Pressable onPress={handleBack} style={styles.backButton} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={styles.backButton} />
        )}

        <View style={styles.titleWrap}>
          {large ? (
            <Text style={styles.largeTitle}>{title}</Text>
          ) : (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          )}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>

        {rightIcon ? (
          <Pressable onPress={onRightPress} style={styles.rightButton} hitSlop={8}>
            <Ionicons name={rightIcon} size={22} color={Colors.text} />
          </Pressable>
        ) : (
          <View style={styles.rightButton} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separatorLight,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontFamily: Font.sansSemiBold,
    fontSize: 17,
    color: Colors.text,
  },
  largeTitle: {
    fontFamily: Font.serif,
    fontSize: 26,
    color: Colors.text,
  },
  subtitle: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
