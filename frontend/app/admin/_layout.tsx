import React from 'react';
import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="triage" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="llm-health" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="users/index" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="users/[id]" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="config" options={{ animation: 'slide_from_right' }} />
      <Stack.Screen name="feedback" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
