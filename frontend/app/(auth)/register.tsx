import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Alert,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { validateEmail, validatePassword, validateFullName } from '@/utils/validation';
import { Gender } from '@/types/auth';

type Step = 1 | 2;

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [step, setStep] = useState<Step>(1);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<Gender>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const toStep2 = () => {
    const e: Record<string, string> = {};
    const nameErr = validateFullName(fullName);
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (nameErr) e.fullName = nameErr;
    if (emailErr) e.email = emailErr;
    if (passErr) e.password = passErr;
    if (password && confirmPassword && password !== confirmPassword)
      e.confirmPassword = 'Passwords do not match';
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep(2);
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 220 }).start();
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        date_of_birth: dob.trim() || null,
        gender: gender || undefined,
      });
    } catch (e: any) {
      const msg =
        e?.response?.data?.email?.[0] ??
        e?.response?.data?.non_field_errors?.[0] ??
        e?.response?.data?.detail ??
        'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  return (
    <LinearGradient colors={['#EEF2FF', '#E0EAFF', '#F0F4FF']} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <Ionicons name="pulse" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.appName}>HealthMonitor</Text>
          </View>

          <View style={styles.stepRow}>
            {[1, 2].map((s) => (
              <View
                key={s}
                style={[styles.stepDot, step >= s && styles.stepDotActive]}
              />
            ))}
          </View>

          <Animated.View style={[styles.card, { transform: [{ translateX }] }]}>
            {step === 1 ? (
              <>
                <Text style={styles.cardTitle}>Create account</Text>
                <Text style={styles.cardSubtitle}>Step 1 of 2 — Basic info</Text>

                <View style={styles.fields}>
                  <Field
                    label="Full name"
                    value={fullName}
                    onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: undefined as any })); }}
                    placeholder="Jane Smith"
                    icon="person-outline"
                    error={errors.fullName}
                    autoCapitalize="words"
                  />
                  <Field
                    label="Email"
                    value={email}
                    onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined as any })); }}
                    placeholder="you@example.com"
                    icon="mail-outline"
                    error={errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <Field
                    label="Password"
                    value={password}
                    onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined as any })); }}
                    placeholder="Minimum 8 characters"
                    icon="lock-closed-outline"
                    error={errors.password}
                    secureTextEntry={!showPassword}
                    showToggle
                    onToggleSecure={() => setShowPassword((v) => !v)}
                    showSecure={showPassword}
                  />
                  <Field
                    label="Confirm password"
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setErrors((e) => ({ ...e, confirmPassword: undefined as any })); }}
                    placeholder="Repeat password"
                    icon="lock-closed-outline"
                    error={errors.confirmPassword}
                    secureTextEntry
                  />
                </View>

                <PrimaryButton label="Continue" onPress={toStep2} style={styles.btn} />
              </>
            ) : (
              <>
                <Pressable onPress={() => setStep(1)} style={styles.backRow}>
                  <Ionicons name="chevron-back" size={18} color={Colors.primary} />
                  <Text style={styles.backText}>Back</Text>
                </Pressable>
                <Text style={styles.cardTitle}>Health profile</Text>
                <Text style={styles.cardSubtitle}>Step 2 of 2 — Optional</Text>

                <View style={styles.fields}>
                  <Field
                    label="Date of birth"
                    value={dob}
                    onChangeText={setDob}
                    placeholder="YYYY-MM-DD"
                    icon="calendar-outline"
                  />

                  <View>
                    <Text style={styles.fieldLabel}>Gender</Text>
                    <View style={styles.genderGrid}>
                      {GENDERS.map((g) => (
                        <Pressable
                          key={g.value}
                          onPress={() => setGender(g.value === gender ? '' : g.value)}
                          style={[
                            styles.genderOption,
                            gender === g.value && styles.genderOptionActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.genderLabel,
                              gender === g.value && styles.genderLabelActive,
                            ]}
                          >
                            {g.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                </View>

                <PrimaryButton
                  label="Create Account"
                  onPress={handleRegister}
                  loading={loading}
                  style={styles.btn}
                />
                <PrimaryButton
                  label="Skip for now"
                  onPress={handleRegister}
                  variant="ghost"
                />
              </>
            )}
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={() => router.replace('/(auth)/login')} hitSlop={8}>
              <Text style={styles.footerLink}> Sign in</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  error,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  showToggle,
  onToggleSecure,
  showSecure,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  keyboardType?: any;
  autoCapitalize?: any;
  secureTextEntry?: boolean;
  showToggle?: boolean;
  onToggleSecure?: () => void;
  showSecure?: boolean;
}) {
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, !!error && styles.inputError]}>
        {icon && (
          <Ionicons name={icon} size={18} color={Colors.textTertiary} style={styles.inputIcon} />
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.placeholder}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
          secureTextEntry={secureTextEntry}
          style={[styles.inputText, { flex: 1 }]}
        />
        {showToggle && (
          <Pressable onPress={onToggleSecure} hitSlop={8} style={styles.eyeBtn}>
            <Ionicons
              name={showSecure ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.textTertiary}
            />
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 24 },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.primaryMuted,
  },
  appName: { ...TextStyles.h2 },
  stepRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 24 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.separator,
  },
  stepDotActive: { backgroundColor: Colors.primary, width: 24, borderRadius: 4 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backText: { fontFamily: Font.sansMedium, fontSize: 14, color: Colors.primary },
  cardTitle: { fontFamily: Font.serif, fontSize: 26, color: Colors.text, marginBottom: 4 },
  cardSubtitle: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary, marginBottom: 28 },
  fields: { gap: 16, marginBottom: 24 },
  fieldLabel: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.textSecondary, marginBottom: 7 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 14,
    height: 52,
  },
  inputError: { borderColor: Colors.critical.dot },
  inputIcon: { marginRight: 10 },
  inputText: { fontFamily: Font.sans, fontSize: 15, color: Colors.text },
  eyeBtn: { padding: 4 },
  errorText: { fontFamily: Font.sans, fontSize: 12, color: Colors.critical.dot, marginTop: 5 },
  btn: { marginBottom: 8 },
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
  },
  genderOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  genderLabel: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.textSecondary },
  genderLabelActive: { color: Colors.primary },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  footerText: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary },
  footerLink: { fontFamily: Font.sansSemiBold, fontSize: 14, color: Colors.primary },
});
