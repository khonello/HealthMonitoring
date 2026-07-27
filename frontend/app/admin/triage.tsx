import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { adminService } from '@/services/adminService';
import { AdminTriageResult, TriageOversightFilter } from '@/types/admin';
import { getTriageDisplay, formatDate, formatTime } from '@/utils/triage';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';

const FILTERS: { key: TriageOversightFilter | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical_urgent', label: 'Urgent' },
  { key: 'hard_rule', label: 'Safety Net' },
  { key: 'low_confidence', label: 'Unreliable' },
];

const FILTER_CAPTIONS: Record<TriageOversightFilter | 'all', string> = {
  all: 'Every assessment the app has produced, newest first.',
  critical_urgent: 'The user was told to see a doctor, or the result was marked high urgency.',
  hard_rule: 'A vital sign breached a safe limit, so the app overrode the AI and escalated.',
  low_confidence: 'The user gave too little information for the result to be trusted.',
};

export default function AdminTriageOversightScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ filter?: TriageOversightFilter }>();
  const [filter, setFilter] = useState<TriageOversightFilter | 'all'>(params.filter ?? 'all');
  const [results, setResults] = useState<AdminTriageResult[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (f: TriageOversightFilter | 'all') => {
    setLoading(true);
    try {
      const data = await adminService.getTriageOversight(f === 'all' ? undefined : f);
      setResults(data.results);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(filter);
    }, [filter, load])
  );

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <Header title="Needs Attention" showBack />

      {/* flexGrow: 0 keeps this row from swallowing the remaining column height —
          without it the chips stretch to fill it. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.key}
            onPress={() => setFilter(f.key)}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
          >
            <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <Text style={styles.filterCaption}>{FILTER_CAPTIONS[filter]}</Text>

      {loading && results.length === 0 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(filter)} tintColor={Colors.primary} />}
        >
          {results.length === 0 ? (
            <Text style={styles.emptyText}>No triage results match this filter.</Text>
          ) : (
            results.map((r) => {
              const display = getTriageDisplay(r.triage_level, r.urgency, r.hard_rule_triggered);
              return (
                <Pressable
                  key={r.id}
                  onPress={() => router.push(`/admin/users/${r.user_id}`)}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
                >
                  <View style={[styles.iconCircle, { backgroundColor: display.colors.dot }]}>
                    <Ionicons name={display.iconName as any} size={16} color={Colors.white} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={styles.userEmail}>{r.user_email}</Text>
                    <Text style={[styles.triageLabel, { color: display.colors.dark }]}>{display.label}</Text>
                    <View style={styles.badgeRow}>
                      {r.hard_rule_triggered && (
                        <View style={[styles.badge, { backgroundColor: Colors.critical.bg, borderColor: Colors.critical.border }]}>
                          <Text style={[styles.badgeText, { color: Colors.critical.text }]}>Safety net</Text>
                        </View>
                      )}
                      {r.confidence_level === 'low' && (
                        <View style={[styles.badge, { backgroundColor: Colors.caution.bg, borderColor: Colors.caution.border }]}>
                          <Text style={[styles.badgeText, { color: Colors.caution.text }]}>Unreliable</Text>
                        </View>
                      )}
                      {r.llm_model_used === null && (
                        <View style={[styles.badge, { backgroundColor: Colors.alert.bg, borderColor: Colors.alert.border }]}>
                          <Text style={[styles.badgeText, { color: Colors.alert.text }]}>AI failed</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.timestamp}>
                      {formatDate(r.generated_at)} · {formatTime(r.generated_at)}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  filterScroll: { flexGrow: 0 },
  filterRow: {
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 12,
    gap: 8,
    alignItems: 'center',
  },
  filterChip: {
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterLabel: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.textSecondary },
  filterLabelActive: { color: Colors.white },
  filterCaption: {
    fontFamily: Font.sans,
    fontSize: 12,
    lineHeight: 17,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 12,
  },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.screenH },
  emptyText: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    ...Shadows.card,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 3 },
  userEmail: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.text },
  triageLabel: { fontFamily: Font.sansMedium, fontSize: 14 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 1 },
  badge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1 },
  badgeText: { fontFamily: Font.sansMedium, fontSize: 10 },
  timestamp: { fontFamily: Font.sans, fontSize: 11, color: Colors.textTertiary, marginTop: 1 },
});
