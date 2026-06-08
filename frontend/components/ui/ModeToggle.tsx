import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  LayoutChangeEvent,
} from 'react-native';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';

type Mode = 'structured' | 'descriptive';

interface ModeToggleProps {
  value: Mode;
  onChange: (mode: Mode) => void;
}

const OPTIONS: { key: Mode; label: string }[] = [
  { key: 'structured', label: 'Structured' },
  { key: 'descriptive', label: 'Descriptive' },
];

export function ModeToggle({ value, onChange }: ModeToggleProps) {
  const slideAnim = useRef(new Animated.Value(value === 'structured' ? 0 : 1)).current;
  const [containerWidth, setContainerWidth] = React.useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: value === 'structured' ? 0 : 1,
      useNativeDriver: false,
      damping: 18,
      stiffness: 260,
    }).start();
  }, [value]);

  const pillLeft = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, containerWidth / 2 - 4],
  });

  const handleLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.track} onLayout={handleLayout}>
      <Animated.View style={[styles.pill, { left: pillLeft, width: containerWidth / 2 - 4 }]} />
      {OPTIONS.map((opt) => (
        <Pressable
          key={opt.key}
          onPress={() => onChange(opt.key)}
          style={styles.option}
        >
          <Text
            style={[
              styles.optionLabel,
              value === opt.key && styles.optionLabelActive,
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceDim,
    borderRadius: Radius.full,
    padding: 4,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    ...{
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
  },
  option: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 9,
    zIndex: 1,
  },
  optionLabel: {
    fontFamily: Font.sansMedium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  optionLabelActive: {
    fontFamily: Font.sansSemiBold,
    color: Colors.text,
  },
});
