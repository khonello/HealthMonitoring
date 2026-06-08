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
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';
import { Gender } from '@/types/auth';
import { validateFullName } from '@/utils/validation';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuthStore();

  const [fullName, setFullName] = useState(user?.full_name ?? '');
  const [dob, setDob] = useState(user?.date_of_birth ?? '');
  const [gender, setGender] = useState<Gender>(user?.gender ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const nameErr = validateFullName(fullName);
    if (nameErr) { setErrors({ fullName: nameErr }); return; }
    setErrors({});
    setLoading(true);
    try {
      const updated = await authService.updateProfile({
        full_name: fullName.trim(),
        date_of_birth: dob.trim() || null,
        gender: gender || undefined,
      });
      setUser(updated);
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.detail ?? 'Could not save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={Colors.text} />
            </Pressable>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <View style={[styles.inputWrap, !!errors.fullName && styles.inputError]}>
                <Ionicons name="person-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  value={fullName}
                  onChangeText={(t) => { setFullName(t); setErrors((e) => ({ ...e, fullName: '' })); }}
                  placeholder="Your full name"
                  placeholderTextColor={Colors.placeholder}
                  autoCapitalize="words"
                  style={styles.inputText}
                />
              </View>
              {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="calendar-outline" size={18} color={Colors.textTertiary} style={styles.inputIcon} />
                <TextInput
                  value={dob}
                  onChangeText={setDob}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.placeholder}
                  style={styles.inputText}
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderGrid}>
                {GENDERS.map((g) => (
                  <Pressable
                    key={g.value}
                    onPress={() => setGender(g.value === gender ? '' : g.value)}
                    style={[styles.genderOption, gender === g.value && styles.genderActive]}
                  >
                    {gender === g.value && (
                      <Ionicons name="checkmark" size={14} color={Colors.primary} />
                    )}
                    <Text style={[styles.genderLabel, gender === g.value && styles.genderLabelActive]}>
                      {g.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.actions}>
            <PrimaryButton label="Save Changes" onPress={handleSave} loading={loading} />
            <PrimaryButton label="Cancel" onPress={() => router.back()} variant="ghost" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  kav: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screenH },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerTitle: { fontFamily: Font.serif, fontSize: 22, color: Colors.text },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: 24,
    gap: 20,
    ...Shadows.card,
    marginBottom: 24,
  },
  field: {},
  fieldLabel: {
    fontFamily: Font.sansMedium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
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
  inputText: { flex: 1, fontFamily: Font.sans, fontSize: 15, color: Colors.text },
  errorText: { fontFamily: Font.sans, fontSize: 12, color: Colors.critical.dot, marginTop: 5 },
  genderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genderOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    backgroundColor: Colors.inputBg,
  },
  genderActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  genderLabel: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.textSecondary },
  genderLabelActive: { color: Colors.primary },
  actions: { gap: 8 },
});
