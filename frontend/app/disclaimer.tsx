import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { configService } from '@/services/configService';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';

/**
 * Shown if the disclaimer cannot be fetched. The screen must never render without
 * a disclaimer, so this mirrors the backend default in apps/reports/assembler.py.
 */
const FALLBACK_DISCLAIMER =
  'This system helps you decide where to seek care. It does not diagnose conditions ' +
  'or replace professional medical advice. If you are experiencing a medical emergency, ' +
  'go to the nearest hospital immediately.';

interface PrivacyPoint {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}

const PRIVACY_POINTS: PrivacyPoint[] = [
  {
    icon: 'lock-closed-outline',
    title: 'What we store',
    body:
      'Your name, email, date of birth and gender, plus every health reading and symptom ' +
      'description you submit and the triage result generated from it.',
  },
  {
    icon: 'key-outline',
    title: 'How your session is kept',
    body:
      'Your sign-in tokens are held in your device’s secure storage, not in ordinary app ' +
      'storage, and are sent over an encrypted connection.',
  },
  {
    icon: 'sparkles-outline',
    title: 'How your data reaches the AI',
    body:
      'Your readings and symptom description are sent to the language model that writes your ' +
      'recommendation. Your name and email are never included in that request.',
  },
  {
    icon: 'eye-outline',
    title: 'Who else can see it',
    body:
      'Staff accounts can view health records to monitor the safety of the triage system. ' +
      'Your data is never sold or shared with advertisers.',
  },
  {
    icon: 'download-outline',
    title: 'Getting your data out',
    body:
      'Settings → Export Health Records gives you every record you have submitted, in full, ' +
      'as a file you can keep or share.',
  },
  {
    icon: 'trash-outline',
    title: 'Deleting everything',
    body:
      'Settings → Delete Account permanently removes your account and every health record ' +
      'attached to it. This cannot be undone.',
  },
];

export default function DisclaimerScreen() {
  const insets = useSafeAreaInsets();
  const [disclaimer, setDisclaimer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const text = await configService.getDisclaimer();
      setDisclaimer(text.trim() || FALLBACK_DISCLAIMER);
    } catch {
      setDisclaimer(FALLBACK_DISCLAIMER);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <Header title="Privacy & Disclaimer" showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Medical disclaimer — the most important text in the app */}
        <View style={styles.disclaimerCard}>
          <View style={styles.disclaimerHeader}>
            <View style={styles.disclaimerIcon}>
              <Ionicons name="medical-outline" size={18} color={Colors.critical.dark} />
            </View>
            <Text style={styles.disclaimerTitle}>Not a medical diagnosis</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.critical.dot} style={styles.loader} />
          ) : (
            <Text style={styles.disclaimerBody}>{disclaimer}</Text>
          )}
        </View>

        <View style={styles.emergencyCard}>
          <Ionicons name="warning-outline" size={18} color={Colors.critical.dark} />
          <Text style={styles.emergencyText}>
            If you are having chest pain, difficulty breathing, severe bleeding, or you feel
            your life is at risk, go to the nearest hospital now. Do not wait for this app.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>WHAT THIS APP DOES</Text>
        <View style={styles.card}>
          <Text style={styles.body}>
            This is a triage and navigation tool. It looks at the readings and symptoms you
            enter and suggests where to seek care — a doctor, a pharmacy, or rest at home.
          </Text>
          <Text style={styles.body}>
            It does not identify diseases, it cannot examine you, and it does not know your
            medical history beyond what you type in. A recommendation to rest at home is not
            a confirmation that nothing is wrong.
          </Text>
          <Text style={styles.bodyLast}>
            Recommendations are generated by an AI language model, with fixed safety rules
            that override it whenever a reading is dangerous. Always follow the advice of a
            qualified health professional over anything shown here.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>YOUR PRIVACY</Text>
        <View style={styles.card}>
          {PRIVACY_POINTS.map((point, index) => (
            <View
              key={point.title}
              style={[styles.point, index === PRIVACY_POINTS.length - 1 && styles.pointLast]}
            >
              <View style={styles.pointIcon}>
                <Ionicons name={point.icon} size={16} color={Colors.primary} />
              </View>
              <View style={styles.pointText}>
                <Text style={styles.pointTitle}>{point.title}</Text>
                <Text style={styles.pointBody}>{point.body}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          This app was built as a final year project at Koforidua Technical University. It is
          not a registered medical device and has not been clinically validated.
        </Text>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screenH, paddingTop: 16 },

  disclaimerCard: {
    backgroundColor: Colors.critical.bg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.critical.border,
    padding: 18,
    marginBottom: 12,
  },
  disclaimerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  disclaimerIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disclaimerTitle: {
    fontFamily: Font.sansSemiBold,
    fontSize: 16,
    color: Colors.critical.dark,
    flex: 1,
  },
  disclaimerBody: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.critical.text,
    lineHeight: 22,
  },
  loader: { alignSelf: 'flex-start', marginVertical: 8 },

  emergencyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.critical.border,
    padding: 14,
    marginBottom: 28,
    ...Shadows.card,
  },
  emergencyText: {
    flex: 1,
    fontFamily: Font.sansMedium,
    fontSize: 13,
    color: Colors.critical.dark,
    lineHeight: 20,
  },

  sectionLabel: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 18,
    marginBottom: 28,
    ...Shadows.card,
  },
  body: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 12,
  },
  bodyLast: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
  },

  point: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  pointLast: { marginBottom: 0 },
  pointIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointText: { flex: 1, gap: 3 },
  pointTitle: { ...TextStyles.h4 },
  pointBody: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  footer: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.textTertiary,
    lineHeight: 19,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
