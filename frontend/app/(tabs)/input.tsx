import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ModeToggle } from '@/components/ui/ModeToggle';
import { HealthInputField } from '@/components/ui/HealthInputField';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { SparseInputNudge } from '@/components/ui/SparseInputNudge';
import { Disclaimer } from '@/components/common/Disclaimer';
import { useHealth } from '@/hooks/useHealth';
import { useHealthStore } from '@/store/healthStore';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import {
  validateTemperature,
  validateHeartRate,
  validateSpO2,
  validateBP,
  parseFloat_,
  parseInt_,
} from '@/utils/validation';
import { InputConfidence } from '@/types/health';

type Mode = 'structured' | 'descriptive';

function tempStatus(v: string) {
  const n = parseFloat(v);
  if (isNaN(n)) return 'default' as const;
  if (n > 40 || n < 35) return 'critical' as const;
  if (n >= 38) return 'caution' as const;
  return 'normal' as const;
}
function hrStatus(v: string) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return 'default' as const;
  if (n < 40 || n > 150) return 'critical' as const;
  if (n < 60 || n > 100) return 'caution' as const;
  return 'normal' as const;
}
function spo2Status(v: string) {
  const n = parseFloat(v);
  if (isNaN(n)) return 'default' as const;
  if (n < 90) return 'critical' as const;
  if (n < 95) return 'caution' as const;
  return 'normal' as const;
}
function bpStatus(v: string) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return 'default' as const;
  if (n > 180) return 'critical' as const;
  if (n >= 140) return 'caution' as const;
  return 'normal' as const;
}

export default function InputScreen() {
  const insets = useSafeAreaInsets();
  const { submit } = useHealth();
  const { isLoading, error } = useHealthStore();

  const [mode, setMode] = useState<Mode>('structured');
  const [temperature, setTemperature] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [spo2, setSpo2] = useState('');
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | null>>({});

  const liveConfidence = useMemo((): InputConfidence => {
    const filled = [temperature, heartRate, spo2, systolic].filter((v) => v.trim() !== '').length;
    const words = symptoms.trim().split(/\s+/).filter(Boolean).length;
    if (filled >= 4 && words >= 10) return 'high';
    if (filled >= 2 || words >= 10) return 'medium';
    return 'low';
  }, [temperature, heartRate, spo2, systolic, symptoms]);

  const hasAnyInput =
    temperature.trim() ||
    heartRate.trim() ||
    spo2.trim() ||
    systolic.trim() ||
    symptoms.trim();

  const validate = (): boolean => {
    const e: Record<string, string | null> = {};
    if (temperature.trim()) e.temperature = validateTemperature(temperature);
    if (heartRate.trim()) e.heartRate = validateHeartRate(heartRate);
    if (spo2.trim()) e.spo2 = validateSpO2(spo2);
    if (systolic.trim()) e.systolic = validateBP(systolic);
    if (diastolic.trim()) e.diastolic = validateBP(diastolic);
    const withErrors = Object.fromEntries(Object.entries(e).filter(([, v]) => v !== null));
    setFieldErrors(withErrors);
    return Object.keys(withErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!hasAnyInput) {
      Alert.alert('No data entered', 'Please fill in at least one vital or describe your symptoms.');
      return;
    }
    if (!validate()) return;
    try {
      await submit({
        temperature: temperature.trim() ? parseFloat_(temperature) : null,
        heart_rate: heartRate.trim() ? parseInt_(heartRate) : null,
        spo2: spo2.trim() ? parseFloat_(spo2) : null,
        systolic_bp: systolic.trim() ? parseInt_(systolic) : null,
        diastolic_bp: diastolic.trim() ? parseInt_(diastolic) : null,
        symptom_description: symptoms.trim() || null,
      });
    } catch {
      // error is in store, shown via Alert
      if (error) Alert.alert('Submission Failed', error);
    }
  };

  const showStructured = mode === 'structured';
  const showDescriptive = mode === 'descriptive';

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 110 },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={TextStyles.h1}>Log Vitals</Text>
            <Text style={styles.headerSub}>How are you feeling today?</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.toggleWrap}>
            <ModeToggle value={mode} onChange={setMode} />
          </View>

          {/* Structured inputs */}
          {showStructured && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>VITAL SIGNS</Text>
              <HealthInputField
                label="Temperature"
                value={temperature}
                onChangeText={setTemperature}
                unit="°C"
                placeholder="36.5"
                hint="Normal: 36.1 – 37.2 °C"
                status={tempStatus(temperature)}
                error={fieldErrors.temperature ?? null}
                icon="thermometer-outline"
              />
              <HealthInputField
                label="Heart Rate"
                value={heartRate}
                onChangeText={setHeartRate}
                unit="bpm"
                placeholder="72"
                hint="Normal: 60 – 100 bpm"
                status={hrStatus(heartRate)}
                error={fieldErrors.heartRate ?? null}
                icon="heart-outline"
              />
              <HealthInputField
                label="Blood Oxygen (SpO₂)"
                value={spo2}
                onChangeText={setSpo2}
                unit="%"
                placeholder="98"
                hint="Normal: 95 – 100%"
                status={spo2Status(spo2)}
                error={fieldErrors.spo2 ?? null}
                icon="fitness-outline"
              />
              <HealthInputField
                label="Blood Pressure"
                value={systolic}
                onChangeText={setSystolic}
                unit="mmHg"
                placeholder="120"
                hint="Normal systolic: 90 – 120 mmHg"
                status={bpStatus(systolic)}
                error={fieldErrors.systolic ?? null}
                icon="pulse-outline"
                secondValue={diastolic}
                secondPlaceholder="80"
                onSecondChangeText={setDiastolic}
              />
            </View>
          )}

          {/* Descriptive input */}
          {showDescriptive && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>SYMPTOMS</Text>
              <View style={styles.textAreaCard}>
                <TextInput
                  value={symptoms}
                  onChangeText={setSymptoms}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  placeholder="Describe how you're feeling — any pain, discomfort, fatigue, or other symptoms you've noticed..."
                  placeholderTextColor={Colors.placeholder}
                  style={styles.textArea}
                />
                <Text style={styles.wordCount}>
                  {symptoms.trim().split(/\s+/).filter(Boolean).length} words
                  {symptoms.trim().split(/\s+/).filter(Boolean).length < 10 && (
                    <Text style={styles.wordCountHint}> · aim for 10+</Text>
                  )}
                </Text>
              </View>
            </View>
          )}

          {/* Confidence */}
          <View style={styles.qualityRow}>
            <Text style={styles.qualityLabel}>ENTRY QUALITY</Text>
            <ConfidenceBadge level={liveConfidence} />
          </View>

          {liveConfidence === 'low' && hasAnyInput && (
            <View style={styles.nudge}>
              <SparseInputNudge />
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.disclaimerWrap}>
            <Disclaimer />
          </View>
        </ScrollView>

        {/* Submit button — fixed at bottom */}
        <View
          style={[
            styles.submitBar,
            { paddingBottom: insets.bottom + 10 },
          ]}
        >
          <PrimaryButton
            label="Analyze My Health"
            onPress={handleSubmit}
            loading={isLoading}
            disabled={!hasAnyInput}
          />
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screenH },
  header: { marginBottom: Spacing.lg },
  headerSub: { fontFamily: Font.sans, fontSize: 15, color: Colors.textSecondary, marginTop: 4 },
  toggleWrap: { marginBottom: Spacing.lg },
  section: { marginBottom: Spacing.md },
  sectionLabel: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  textAreaCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  textArea: {
    fontFamily: Font.sans,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
    minHeight: 140,
  },
  wordCount: {
    fontFamily: Font.sansMedium,
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 10,
    textAlign: 'right',
  },
  wordCountHint: { color: Colors.caution.text },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  qualityLabel: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
  },
  nudge: { marginBottom: Spacing.md },
  disclaimerWrap: { marginBottom: Spacing.md },
  submitBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    paddingTop: 12,
    paddingHorizontal: Spacing.screenH,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separatorLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
});
