import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useHealthStore } from '@/store/healthStore';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDob(dob: string | null): string {
  if (!dob) return 'Not set';
  const d = new Date(dob);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function genderLabel(gender: string): string {
  const map: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    other: 'Other',
    prefer_not_to_say: 'Prefer not to say',
  };
  return map[gender] ?? 'Not set';
}

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { records } = useHealthStore();
  const { logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          await logout();
          setLoggingOut(false);
        },
      },
    ]);
  };

  if (!user) return null;

  const initials = getInitials(user.full_name);
  const joined = new Date(user.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 },
        ]}
      >
        {/* Avatar block */}
        <View style={styles.avatarBlock}>
          <LinearGradient
            colors={['#3B82F6', '#1D4ED8']}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{initials}</Text>
          </LinearGradient>
          <Text style={styles.userName}>{user.full_name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userJoined}>Member since {joined}</Text>

          <Pressable
            onPress={() => router.push('/profile/edit')}
            style={styles.editBtn}
          >
            <Ionicons name="pencil-outline" size={15} color={Colors.primary} />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <StatCard label="Total Logs" value={String(records.length)} icon="document-text-outline" />
          <StatCard
            label="This Month"
            value={String(
              records.filter((r) => {
                const d = new Date(r.submitted_at);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length
            )}
            icon="calendar-outline"
          />
          <StatCard
            label="High Quality"
            value={String(records.filter((r) => r.input_confidence === 'high').length)}
            icon="star-outline"
          />
        </View>

        {/* Health Profile */}
        <Section title="Health Profile">
          <InfoRow label="Full Name" value={user.full_name} icon="person-outline" />
          <InfoRow label="Date of Birth" value={formatDob(user.date_of_birth)} icon="calendar-outline" />
          <InfoRow label="Gender" value={genderLabel(user.gender)} icon="body-outline" last />
        </Section>

        {/* Account */}
        <Section title="Account">
          <InfoRow label="Email" value={user.email} icon="mail-outline" />
          <InfoRow label="Member Since" value={joined} icon="time-outline" last />
        </Section>

        {/* About */}
        <Section title="About">
          <ActionRow
            label="Privacy & Disclaimer"
            icon="shield-checkmark-outline"
            onPress={() => {}}
          />
          <ActionRow label="App Version" icon="information-circle-outline" value="1.0.0" last />
        </Section>

        {/* Logout */}
        <View style={styles.logoutWrap}>
          <Pressable
            onPress={handleLogout}
            disabled={loggingOut}
            style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
            <Text style={styles.logoutText}>
              {loggingOut ? 'Signing out...' : 'Sign Out'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: any }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={Colors.primary} style={styles.statIcon} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  icon,
  last,
}: {
  label: string;
  value: string;
  icon: any;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={17} color={Colors.textSecondary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({
  label,
  icon,
  value,
  onPress,
  last,
}: {
  label: string;
  icon: any;
  value?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={17} color={Colors.textSecondary} />
      </View>
      <Text style={[styles.rowContent, { flex: 1, fontFamily: Font.sans, fontSize: 15, color: Colors.text }]}>
        {label}
      </Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
      {!value && <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screenH },

  avatarBlock: { alignItems: 'center', marginBottom: 28 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    ...Shadows.md,
  },
  avatarText: { fontFamily: Font.serif, fontSize: 30, color: Colors.white },
  userName: { ...TextStyles.h2, marginBottom: 4 },
  userEmail: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary, marginBottom: 4 },
  userJoined: { fontFamily: Font.sans, fontSize: 13, color: Colors.textTertiary, marginBottom: 16 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
  },
  editBtnText: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.primary },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    alignItems: 'center',
    ...Shadows.card,
  },
  statIcon: { marginBottom: 6 },
  statValue: { fontFamily: Font.serif, fontSize: 26, color: Colors.text, lineHeight: 30 },
  statLabel: { fontFamily: Font.sans, fontSize: 11, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },

  sectionWrap: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separatorLight,
  },
  rowPressed: { backgroundColor: Colors.surfaceSecondary },
  rowIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowContent: { flex: 1 },
  rowLabel: { fontFamily: Font.sans, fontSize: 12, color: Colors.textTertiary, marginBottom: 2 },
  rowValue: { fontFamily: Font.sansMedium, fontSize: 14, color: Colors.text },

  logoutWrap: { marginTop: 8, marginBottom: 16 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: Radius.lg,
    backgroundColor: Colors.dangerLight,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
  },
  logoutBtnPressed: { opacity: 0.8 },
  logoutText: { fontFamily: Font.sansSemiBold, fontSize: 15, color: Colors.danger },
});
