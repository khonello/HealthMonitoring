import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/common/Header';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { adminService } from '@/services/adminService';
import { SafetyThreshold, SystemConfig } from '@/types/admin';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';

const OPERATOR_LABEL: Record<string, string> = {
  gt: 'greater than',
  lt: 'less than',
  outside_range: 'outside the range',
};

export default function AdminConfigScreen() {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [thresholds, setThresholds] = useState<SafetyThreshold[]>([]);
  const [edits, setEdits] = useState<Record<number, { value: string; value_high: string }>>({});
  const [disclaimer, setDisclaimer] = useState<SystemConfig | null>(null);
  const [disclaimerText, setDisclaimerText] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [savingDisclaimer, setSavingDisclaimer] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [thresholdData, disclaimerData] = await Promise.all([
        adminService.getThresholds(),
        adminService.getDisclaimer(),
      ]);
      setThresholds(thresholdData.results);
      setEdits(
        Object.fromEntries(
          thresholdData.results.map((t) => [
            t.id,
            { value: String(t.value), value_high: t.value_high !== null ? String(t.value_high) : '' },
          ])
        )
      );
      setDisclaimer(disclaimerData);
      setDisclaimerText(disclaimerData.value);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const saveThreshold = async (t: SafetyThreshold) => {
    const edit = edits[t.id];
    const value = parseFloat(edit.value);
    if (Number.isNaN(value)) {
      Alert.alert('Invalid value', 'Enter a number for the threshold value.');
      return;
    }
    const value_high = t.operator === 'outside_range' ? parseFloat(edit.value_high) : null;
    if (t.operator === 'outside_range' && Number.isNaN(value_high as number)) {
      Alert.alert('Invalid value', 'Enter a number for the high bound.');
      return;
    }
    setSavingId(t.id);
    try {
      const updated = await adminService.updateThreshold(t.id, { value, value_high });
      setThresholds((prev) => prev.map((row) => (row.id === t.id ? updated : row)));
    } finally {
      setSavingId(null);
    }
  };

  const saveDisclaimer = async () => {
    setSavingDisclaimer(true);
    try {
      const updated = await adminService.updateDisclaimer(disclaimerText);
      setDisclaimer(updated);
      Alert.alert('Saved', 'Disclaimer text updated.');
    } finally {
      setSavingDisclaimer(false);
    }
  };

  if (loading && thresholds.length === 0) {
    return (
      <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
        <Header title="Safety Config" showBack />
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <Header title="Safety Config" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.kav}
      >
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        >
          <Text style={styles.sectionTitle}>Safety Net Limits</Text>
          <Text style={styles.sectionHint}>
            When a vital sign crosses one of these limits, the app overrides the AI and tells the
            user to see a doctor. Editing them changes who gets escalated — take care.
          </Text>
          {thresholds.map((t) => (
            <GlassCard key={t.id} style={styles.thresholdCard}>
              <Text style={styles.metricName}>{t.metric.replace(/_/g, ' ')}</Text>
              <Text style={styles.metricDesc}>{t.description}</Text>
              <Text style={styles.operatorLabel}>Triggers when {OPERATOR_LABEL[t.operator] ?? t.operator}:</Text>
              <View style={styles.valueRow}>
                <TextInput
                  value={edits[t.id]?.value ?? ''}
                  onChangeText={(text) => setEdits((prev) => ({ ...prev, [t.id]: { ...prev[t.id], value: text } }))}
                  keyboardType="numeric"
                  style={styles.valueInput}
                />
                {t.operator === 'outside_range' && (
                  <>
                    <Text style={styles.rangeDash}>–</Text>
                    <TextInput
                      value={edits[t.id]?.value_high ?? ''}
                      onChangeText={(text) => setEdits((prev) => ({ ...prev, [t.id]: { ...prev[t.id], value_high: text } }))}
                      keyboardType="numeric"
                      style={styles.valueInput}
                    />
                  </>
                )}
              </View>
              <PrimaryButton
                label={savingId === t.id ? 'Saving...' : 'Save'}
                onPress={() => saveThreshold(t)}
                loading={savingId === t.id}
                variant="secondary"
                style={styles.saveBtn}
              />
            </GlassCard>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Report Disclaimer</Text>
          <Text style={styles.sectionHint}>Shown on every generated health report.</Text>
          <GlassCard style={styles.disclaimerCard}>
            <TextInput
              value={disclaimerText}
              onChangeText={setDisclaimerText}
              multiline
              style={styles.disclaimerInput}
              textAlignVertical="top"
              // The disclaimer sits at the very bottom of the page, so focusing it puts
              // it behind the keyboard. Scroll it into view once the keyboard settles.
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 250)}
            />
          </GlassCard>
          <PrimaryButton
            label={savingDisclaimer ? 'Saving...' : 'Save Disclaimer'}
            onPress={saveDisclaimer}
            loading={savingDisclaimer}
            disabled={!disclaimer || disclaimerText === disclaimer.value}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  kav: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.screenH, paddingTop: 16 },

  sectionTitle: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionHint: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary, marginBottom: 12, lineHeight: 17 },

  thresholdCard: { marginBottom: 12, gap: 8 },
  metricName: { ...TextStyles.h4, textTransform: 'capitalize' },
  metricDesc: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  operatorLabel: { fontFamily: Font.sansMedium, fontSize: 12, color: Colors.textTertiary, marginTop: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  valueInput: {
    fontFamily: Font.serif,
    fontSize: 24,
    color: Colors.text,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 80,
  },
  rangeDash: { fontFamily: Font.sansLight, fontSize: 18, color: Colors.textTertiary },
  saveBtn: { marginTop: 4 },

  disclaimerCard: { marginBottom: 16, padding: 12 },
  disclaimerInput: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    minHeight: 120,
  },
});
