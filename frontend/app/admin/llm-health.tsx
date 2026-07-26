import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { GlassCard } from '@/components/ui/GlassCard';
import { adminService } from '@/services/adminService';
import { LLMFailureLog, LLMStats } from '@/types/admin';
import { formatDate, formatTime } from '@/utils/triage';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';

const SOURCE_LABEL: Record<string, string> = {
  triage: 'Triage',
  retry: 'Retry Triage',
  health_tip: 'Health Tip',
};

export default function AdminLLMHealthScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<LLMStats | null>(null);
  const [failures, setFailures] = useState<LLMFailureLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsData, failuresData] = await Promise.all([
        adminService.getLLMStats(),
        adminService.getLLMFailures(),
      ]);
      setStats(statsData);
      setFailures(failuresData.results);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <Header title="LLM Ops Health" showBack />

      {loading && !stats ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />}
        >
          <View style={styles.statsRow}>
            <StatTile label="Last 24h" value={stats?.last_24h ?? 0} />
            <StatTile label="Last 7d" value={stats?.last_7d ?? 0} />
            <StatTile label="All time" value={stats?.total ?? 0} />
          </View>

          {stats && stats.by_source.length > 0 && (
            <GlassCard style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>By source</Text>
              {stats.by_source.map((row) => (
                <View key={row.source} style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>{SOURCE_LABEL[row.source] ?? row.source}</Text>
                  <Text style={styles.breakdownValue}>{row.count}</Text>
                </View>
              ))}
            </GlassCard>
          )}

          <Text style={styles.sectionTitle}>Recent failures</Text>
          {failures.length === 0 ? (
            <Text style={styles.emptyText}>No LLM failures logged.</Text>
          ) : (
            failures.map((f) => {
              const content = (
                <>
                  <View style={styles.failureHeader}>
                    <View style={styles.sourcePill}>
                      <Text style={styles.sourcePillText}>{SOURCE_LABEL[f.source] ?? f.source}</Text>
                    </View>
                    <Text style={styles.timestamp}>
                      {formatDate(f.occurred_at)} · {formatTime(f.occurred_at)}
                    </Text>
                  </View>
                  <Text style={styles.errorType}>{f.error_type}</Text>
                  <Text style={styles.errorMessage} numberOfLines={3}>{f.error_message}</Text>
                  <View style={styles.failureFooter}>
                    {f.user_email ? (
                      <Text style={styles.userEmail}>{f.user_email}</Text>
                    ) : (
                      <Text style={styles.userEmail}>Not tied to a user</Text>
                    )}
                    {f.user_id !== null && (
                      <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
                    )}
                  </View>
                </>
              );
              return f.user_id !== null ? (
                <Pressable
                  key={f.id}
                  onPress={() => router.push(`/admin/users/${f.user_id}`)}
                  style={({ pressed }) => pressed && { opacity: 0.85 }}
                >
                  <GlassCard style={styles.failureCard}>{content}</GlassCard>
                </Pressable>
              ) : (
                <GlassCard key={f.id} style={styles.failureCard}>{content}</GlassCard>
              );
            })
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.screenH, paddingTop: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statTile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statValue: { fontFamily: Font.serif, fontSize: 28, color: Colors.text },
  statLabel: { fontFamily: Font.sans, fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  breakdownCard: { marginBottom: 20, gap: 8 },
  breakdownTitle: { ...TextStyles.label, marginBottom: 4 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between' },
  breakdownLabel: { fontFamily: Font.sans, fontSize: 13, color: Colors.textSecondary },
  breakdownValue: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.text },

  sectionTitle: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyText: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary, marginTop: 8 },

  failureCard: { marginBottom: 10, gap: 6 },
  failureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourcePill: {
    backgroundColor: Colors.alert.bg,
    borderColor: Colors.alert.border,
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  sourcePillText: { fontFamily: Font.sansMedium, fontSize: 11, color: Colors.alert.text },
  timestamp: { fontFamily: Font.sans, fontSize: 11, color: Colors.textTertiary },
  errorType: { fontFamily: Font.sansSemiBold, fontSize: 14, color: Colors.text },
  errorMessage: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
  failureFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  userEmail: { fontFamily: Font.sans, fontSize: 11, color: Colors.textTertiary },
});
