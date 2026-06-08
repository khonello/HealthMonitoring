import { useCallback } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useLayout() {
  const insets = useSafeAreaInsets();

  const dismissKeyboard = useCallback(() => Keyboard.dismiss(), []);

  const screenPaddingBottom = insets.bottom + 16;
  const headerHeight = insets.top + 52;
  const tabBarHeight = insets.bottom + 56;

  return {
    insets,
    dismissKeyboard,
    screenPaddingBottom,
    headerHeight,
    tabBarHeight,
    isIOS: Platform.OS === 'ios',
    isAndroid: Platform.OS === 'android',
  };
}
