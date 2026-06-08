import React, { useState } from 'react';
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
import { validateEmail, validatePassword } from '@/utils/validation';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: typeof errors = {};
    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);
    if (emailErr) e.email = emailErr;
    if (passErr) e.password = passErr;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (e: any) {
      const msg =
        e?.response?.data?.non_field_errors?.[0] ??
        e?.response?.data?.detail ??
        'Login failed. Please check your credentials.';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#EEF2FF', '#E0EAFF', '#F0F4FF']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <View style={styles.logoMark}>
              <Ionicons name="pulse" size={28} color={Colors.primary} />
            </View>
            <Text style={styles.appName}>HealthMonitor</Text>
            <Text style={styles.tagline}>Your health, clearly understood</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome back</Text>
            <Text style={styles.cardSubtitle}>Sign in to continue</Text>

            <View style={styles.fields}>
              <View>
                <Text style={styles.fieldLabel}>Email</Text>
                <View style={[styles.inputWrap, errors.email && styles.inputError]}>
                  <Ionicons name="mail-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    value={email}
                    onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.placeholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.inputText}
                  />
                </View>
                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
              </View>

              <View>
                <Text style={styles.fieldLabel}>Password</Text>
                <View style={[styles.inputWrap, errors.password && styles.inputError]}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                  <TextInput
                    value={password}
                    onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.placeholder}
                    secureTextEntry={!showPassword}
                    style={[styles.inputText, { flex: 1 }]}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={Colors.textTertiary}
                    />
                  </Pressable>
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
              </View>
            </View>

            <PrimaryButton
              label="Sign In"
              onPress={handleLogin}
              loading={loading}
              style={styles.btn}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account?</Text>
            <Pressable onPress={() => router.push('/(auth)/register')} hitSlop={8}>
              <Text style={styles.footerLink}> Create one</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 40 },
  logoMark: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: Colors.primaryMuted,
  },
  appName: { ...TextStyles.h2, marginBottom: 4 },
  tagline: { ...TextStyles.bodySmall, color: Colors.textSecondary, textAlign: 'center' },
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
  inputText: {
    flex: 1,
    fontFamily: Font.sans,
    fontSize: 15,
    color: Colors.text,
  },
  eyeBtn: { padding: 4 },
  errorText: { fontFamily: Font.sans, fontSize: 12, color: Colors.critical.dot, marginTop: 5 },
  btn: { marginTop: 4 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary },
  footerLink: { fontFamily: Font.sansSemiBold, fontSize: 14, color: Colors.primary },
});
