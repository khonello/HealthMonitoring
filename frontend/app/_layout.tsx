import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  DMSerifDisplay_400Regular,
  DMSerifDisplay_400Regular_Italic,
} from '@expo-google-fonts/dm-serif-display';
import { StatusBar } from 'expo-status-bar';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';
import { Colors } from '@/constants/colors';

function RootLayoutNav() {
  const { user, isHydrated } = useAuthStore();
  const { completed: onboardingDone } = useOnboardingStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated) return;
    const inAuth = segments[0] === '(auth)';
    const inTabs = segments[0] === '(tabs)';
    const inOnboarding = segments[0] === 'onboarding';
    const inAdmin = segments[0] === 'admin';
    const inApp = inTabs || segments[0] === 'report' || segments[0] === 'metric' || segments[0] === 'alert' || segments[0] === 'profile' || segments[0] === 'feedback' || inAdmin;

    if (!user) {
      // Signed out: show the informational onboarding first (every cold start,
      // since the store is session-scoped), then fall through to sign-in.
      if (!onboardingDone && !inOnboarding) {
        router.replace('/onboarding');
      } else if (onboardingDone && !inAuth) {
        router.replace('/(auth)/login');
      }
    } else if (user.is_staff) {
      // Admins live entirely in the admin app — never the regular tabs.
      if (!inAdmin) router.replace('/admin');
    } else if (inAdmin || !inApp) {
      // Regular signed-in user: kept out of admin, landed in the tabs.
      router.replace('/(tabs)');
    }
  }, [user, isHydrated, onboardingDone, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen
        name="report/[id]"
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen
        name="metric/[name]"
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen
        name="alert"
        options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="profile/edit"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen
        name="feedback"
        options={{ animation: 'slide_from_right', gestureEnabled: true }}
      />
      <Stack.Screen name="admin" options={{ animation: 'fade' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
    DMSerifDisplay_400Regular_Italic,
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <RootLayoutNav />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
