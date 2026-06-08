import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/store/authStore';
import { Colors } from '@/constants/colors';

export default function Index() {
  const { isHydrated } = useAuthStore();
  return (
    <View style={styles.container}>
      {!isHydrated && <ActivityIndicator color={Colors.primary} size="large" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
