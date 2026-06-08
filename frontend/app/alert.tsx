import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';

const METRIC_LABELS: Record<string, { label: string; message: string }> = {
  temperature: {
    label: 'Temperature',
    message: 'Your temperature is critically high. This may indicate a severe infection or heat stroke.',
  },
  spo2: {
    label: 'Blood Oxygen (SpO₂)',
    message: 'Your blood oxygen level is critically low. This requires immediate medical attention.',
  },
  heart_rate: {
    label: 'Heart Rate',
    message: 'Your heart rate is outside safe limits. This could indicate a cardiac emergency.',
  },
  systolic_bp: {
    label: 'Blood Pressure',
    message: 'Your blood pressure is critically high. This is a hypertensive crisis risk.',
  },
};

export default function AlertScreen() {
  const { metric, value, recordId } = useLocalSearchParams<{
    metric: string;
    value: string;
    recordId: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const metricInfo = metric ? METRIC_LABELS[metric] ?? { label: metric, message: 'A critical health reading was detected.' } : null;

  return (
    <LinearGradient
      colors={['#7F1D1D', '#B91C1C', '#DC2626']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 32 }]}>
        {/* Icon */}
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: pulseAnim }] }]}>
          <Ionicons name="warning" size={52} color={Colors.white} />
        </Animated.View>

        <Text style={styles.title}>Critical Reading{'\n'}Detected</Text>

        {metricInfo && (
          <>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{metricInfo.label}</Text>
              {value && <Text style={styles.metricValue}>{value}</Text>}
            </View>

            <Text style={styles.message}>{metricInfo.message}</Text>
          </>
        )}

        <Text style={styles.instruction}>
          Do not wait. Go to the nearest emergency room or call emergency services immediately.
        </Text>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.emergencyBtn, pressed && styles.btnPressed]}
            onPress={() => Linking.openURL('tel:911')}
          >
            <Ionicons name="call" size={20} color={Colors.critical.dark} />
            <Text style={styles.emergencyBtnText}>Call Emergency Services</Text>
          </Pressable>

          {recordId && (
            <Pressable
              style={({ pressed }) => [styles.reportBtn, pressed && styles.reportBtnPressed]}
              onPress={() =>
                router.replace({ pathname: '/report/[id]', params: { id: recordId } })
              }
            >
              <Text style={styles.reportBtnText}>View Full Report</Text>
              <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.85)" />
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.7 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.dismissBtnText}>Dismiss</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },

  iconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },

  title: {
    fontFamily: Font.serif,
    fontSize: 36,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 44,
  },

  metricCard: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: Radius.lg,
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  metricLabel: {
    fontFamily: Font.sansMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  metricValue: {
    fontFamily: Font.serif,
    fontSize: 32,
    color: Colors.white,
  },

  message: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 21,
  },

  instruction: {
    fontFamily: Font.sansSemiBold,
    fontSize: 15,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 22,
  },

  actions: { width: '100%', gap: 10, marginTop: 8 },

  emergencyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    height: 56,
  },
  emergencyBtnText: {
    fontFamily: Font.sansSemiBold,
    fontSize: 16,
    color: Colors.critical.dark,
  },
  btnPressed: { opacity: 0.88 },

  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: Radius.md,
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  reportBtnPressed: { opacity: 0.8 },
  reportBtnText: {
    fontFamily: Font.sansMedium,
    fontSize: 15,
    color: Colors.white,
  },

  dismissBtn: { alignItems: 'center', paddingVertical: 10 },
  dismissBtnText: {
    fontFamily: Font.sansMedium,
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
});
