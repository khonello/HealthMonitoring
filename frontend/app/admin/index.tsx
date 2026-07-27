import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { adminService } from '@/services/adminService';
import { AdminSummary } from '@/types/admin';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';

type TileAccent = 'neutral' | 'critical' | 'caution' | 'alert';

interface Tile {
  key: keyof AdminSummary;
  label: string;
  /** Plain-language gloss — the label alone is not self-explanatory for most tiles. */
  caption: string;
  route: string;
  accentWhenNonZero: TileAccent;
}

const TILES: Tile[] = [
  { key: 'total_users', label: 'Total Users', caption: 'Registered accounts', route: '/admin/users', accentWhenNonZero: 'neutral' },
  { key: 'critical_last_24h', label: 'Urgent Cases', caption: 'Told to see a doctor (24h)', route: '/admin/triage?filter=critical_urgent', accentWhenNonZero: 'critical' },
  { key: 'hard_rule_last_24h', label: 'Safety Net Triggered', caption: 'Vitals breached a safe limit (24h)', route: '/admin/triage?filter=hard_rule', accentWhenNonZero: 'critical' },
  { key: 'low_confidence_last_24h', label: 'Unreliable Results', caption: 'Too little info to judge well (24h)', route: '/admin/triage?filter=low_confidence', accentWhenNonZero: 'caution' },
  { key: 'llm_failures_last_24h', label: 'AI Failures', caption: 'Fell back to rules only (24h)', route: '/admin/llm-health', accentWhenNonZero: 'alert' },
  { key: 'new_feedback', label: 'New Feedback', caption: 'Waiting to be reviewed', route: '/admin/feedback?status=new', accentWhenNonZero: 'caution' },
];

interface AccentPalette {
  text: string;
  bg: string;
  border: string;
  dot: string;
  dark: string;
}

const ACCENT_COLORS: Record<TileAccent, AccentPalette> = {
  neutral: { text: Colors.text, bg: Colors.surface, border: Colors.separator, dot: Colors.primary, dark: Colors.text },
  critical: Colors.critical,
  caution: Colors.caution,
  alert: Colors.alert,
};

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getSummary();
      setSummary(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); } },
    ]);
  };

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      {/* No back button: staff land here via router.replace, so this is the root of
          the stack and there is nothing to go back to. */}
      <Header
        title="Admin Panel"
        subtitle={user?.email}
        rightIcon="log-out-outline"
        onRightPress={handleLogout}
      />

      {loading && !summary ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
        >
          <Text style={styles.intro}>
            Visible only to staff accounts. Tap a stat to see what needs attention.
          </Text>

          <View style={styles.tileGrid}>
            {TILES.map((tile) => {
              const value = summary?.[tile.key] ?? 0;
              const accent = value > 0 ? ACCENT_COLORS[tile.accentWhenNonZero] : ACCENT_COLORS.neutral;
              return (
                <Pressable
                  key={tile.key}
                  onPress={() => router.push(tile.route as any)}
                  style={({ pressed }) => [
                    styles.tile,
                    { backgroundColor: accent.bg, borderColor: accent.border },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Text style={[styles.tileValue, { color: accent.dark }]}>{value}</Text>
                  <Text style={styles.tileLabel}>{tile.label}</Text>
                  <Text style={styles.tileCaption}>{tile.caption}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Browse</Text>
          <Pressable
            onPress={() => router.push('/admin/users')}
            style={({ pressed }) => [styles.navRowWrap, pressed && { opacity: 0.85 }]}
          >
            <GlassCard style={styles.navRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="people-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.navText}>
                <Text style={styles.navTitle}>Users</Text>
                <Text style={styles.navSubtitle}>Search, view history, deactivate accounts</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </GlassCard>
          </Pressable>
          <Pressable
            onPress={() => router.push('/admin/feedback')}
            style={({ pressed }) => [styles.navRowWrap, pressed && { opacity: 0.85 }]}
          >
            <GlassCard style={styles.navRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="chatbubbles-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.navText}>
                <Text style={styles.navTitle}>Feedback</Text>
                <Text style={styles.navSubtitle}>Read what users reported and triage it</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </GlassCard>
          </Pressable>
          <Pressable
            onPress={() => router.push('/admin/config')}
            style={({ pressed }) => [styles.navRowWrap, pressed && { opacity: 0.85 }]}
          >
            <GlassCard style={styles.navRow}>
              <View style={styles.iconWrap}>
                <Ionicons name="settings-outline" size={22} color={Colors.primary} />
              </View>
              <View style={styles.navText}>
                <Text style={styles.navTitle}>Safety Config</Text>
                <Text style={styles.navSubtitle}>Edit the safety net limits and the report disclaimer</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
            </GlassCard>
          </Pressable>
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.screenH, paddingTop: 16 },
  intro: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: 16,
  },

  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  tile: {
    width: '47%',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 14,
  },
  tileValue: { fontFamily: Font.serif, fontSize: 32, lineHeight: 36, marginBottom: 4 },
  tileLabel: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.text },
  tileCaption: {
    fontFamily: Font.sans,
    fontSize: 11,
    lineHeight: 15,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  sectionTitle: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  navRowWrap: { marginBottom: 12 },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navText: { flex: 1, gap: 2 },
  navTitle: { ...TextStyles.h4 },
  navSubtitle: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
});
