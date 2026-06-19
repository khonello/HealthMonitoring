import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useHealthStore } from '@/store/healthStore';
import { useHealth } from '@/hooks/useHealth';
import { healthService } from '@/services/healthService';
import { RecordCard } from '@/components/ui/RecordCard';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';
import {
  getGreeting,
  getFirstName,
  isTodayRecord,
  computeStreak,
} from '@/utils/triage';

type Tip = { text: string; category: string; icon: string };

const VITAL_RANGES = [
  {
    icon: 'thermometer-outline',
    label: 'Temperature',
    normal: '36.1 – 37.2°C',
    caution: '37.3 – 38.0°C',
    critical: '> 38.0 or < 35°C',
  },
  {
    icon: 'heart-outline',
    label: 'Heart Rate',
    normal: '60 – 100 bpm',
    caution: '40 – 59 or 101 – 150',
    critical: '< 40 or > 150 bpm',
  },
  {
    icon: 'fitness-outline',
    label: 'Blood Oxygen',
    normal: '≥ 95% SpO₂',
    caution: '90 – 94%',
    critical: '< 90%',
  },
  {
    icon: 'pulse-outline',
    label: 'Blood Pressure',
    normal: '< 120/80 mmHg',
    caution: '120–139 / 80–89',
    critical: '≥ 140/90 or > 180',
  },
];

const RECENT_COUNT = 1;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { records, isLoading } = useHealthStore();
  const { fetchHistory, deleteRecord } = useHealth();

  const [tip, setTip] = useState<Tip | null>(null);
  const [tipLoading, setTipLoading] = useState(true);

  const fetchTip = useCallback(async () => {
    setTipLoading(true);
    try {
      const t = await healthService.getTip();
      setTip(t);
    } catch {
      setTip((prev) => prev ?? {
        text: "Drink at least 8 glasses of water daily. Staying hydrated helps regulate body temperature and supports every organ in your body.",
        category: "Hydration",
        icon: "water-outline",
      });
    } finally {
      setTipLoading(false);
    }
  }, []);

  useEffect(() => { fetchTip(); }, []);

  useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

  const onRefresh = useCallback(async () => {
    await Promise.all([fetchHistory(), fetchTip()]);
  }, [fetchHistory, fetchTip]);

  const today = records.find((r) => isTodayRecord(r.submitted_at));
  const streak = computeStreak(records);
  const recent = records.slice(0, RECENT_COUNT);
  const firstName = user ? getFirstName(user.full_name) : '';

  return (
    <LinearGradient colors={['#EEF4FF', '#F5F8FF', '#FFFFFF']} style={styles.gradient}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Greeting */}
        <View style={styles.identityRow}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}, {firstName}</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </Text>
          </View>
          {streak > 1 && (
            <View style={styles.streakPill}>
              <Text style={styles.streakEmoji}>🔥</Text>
              <Text style={styles.streakCount}>{streak}d</Text>
            </View>
          )}
        </View>

        {/* Check-in CTA */}
        <Pressable
          onPress={() => router.push('/(tabs)/input')}
          accessibilityRole="button"
          accessibilityLabel="Start today's health assessment"
          style={({ pressed }) => [styles.ctaBtn, pressed && { opacity: 0.88 }]}
        >
          <LinearGradient
            colors={today ? ['#64748B', '#475569'] : [Colors.primary, Colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <View style={styles.ctaIconWrap}>
              <Ionicons name={today ? 'checkmark-circle' : 'pulse'} size={24} color={Colors.white} />
            </View>
            <View style={styles.ctaTextBlock}>
              <Text style={styles.ctaTitle}>
                {today ? 'Assessed Today' : "Start Today's Assessment"}
              </Text>
              <Text style={styles.ctaSub}>
                {today
                  ? 'Tap to log another check-in'
                  : 'AI triage · does not replace medical advice'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
          </LinearGradient>
        </Pressable>

        {/* Recent records */}
        {isLoading && records.length === 0 ? (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        ) : records.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Records</Text>
              <Pressable
                onPress={() => router.push('/(tabs)/history')}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="See all health records"
              >
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>

            {recent.map((r) => (
              <RecordCard
                key={r.id}
                record={r}
                onPress={() =>
                  router.push({ pathname: '/report/[id]', params: { id: String(r.id) } })
                }
                onDelete={() => deleteRecord(r.id)}
              />
            ))}
          </View>
        )}

        {/* Health tip */}
        <HealthTipCard tip={tip} loading={tipLoading} />

        {/* Vital reference */}
        <VitalReferenceCard />
      </ScrollView>
    </LinearGradient>
  );
}

// ─── Health Tip Card ──────────────────────────────────────────────────────────

function HealthTipCard({ tip, loading }: { tip: Tip | null; loading: boolean }) {
  return (
    <View style={styles.tipCard}>
      <LinearGradient
        colors={['#1E3A8A', '#1D4ED8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.tipGradient}
      >
        {/* Header */}
        <View style={styles.tipHeader}>
          <View style={styles.tipIconWrap}>
            {tip
              ? <Ionicons name={tip.icon as any} size={18} color="#93C5FD" />
              : <ActivityIndicator size="small" color="#93C5FD" />
            }
          </View>
          <View style={styles.tipHeaderText}>
            <Text style={styles.tipOverline}>HEALTH TIP</Text>
            <Text style={styles.tipCategory}>{tip?.category ?? '...'}</Text>
          </View>
          {loading && tip && <ActivityIndicator size="small" color="rgba(147,197,253,0.6)" />}
        </View>

        {/* Tip body */}
        {tip
          ? <Text style={styles.tipText}>{tip.text}</Text>
          : (
            <View style={styles.tipSkeleton}>
              <View style={styles.tipSkeletonLine} />
              <View style={[styles.tipSkeletonLine, { width: '80%' }]} />
              <View style={[styles.tipSkeletonLine, { width: '60%' }]} />
            </View>
          )
        }

        {/* Footer note */}
        <View style={styles.tipFooter}>
          <Ionicons name="sparkles-outline" size={11} color="rgba(147,197,253,0.7)" />
          <Text style={styles.tipFooterText}>AI-generated · refreshes on reload</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Vital Reference Card ─────────────────────────────────────────────────────

function VitalReferenceCard() {
  return (
    <View style={[styles.refCard, Shadows.card]}>
      {/* Header */}
      <View style={styles.refHeader}>
        <View style={styles.refIconWrap}>
          <Ionicons name="stats-chart-outline" size={17} color={Colors.primary} />
        </View>
        <View style={styles.refHeaderText}>
          <Text style={styles.refTitle}>Know Your Numbers</Text>
          <Text style={styles.refSub}>Normal vital sign ranges at a glance</Text>
        </View>
      </View>

      {/* Ranges */}
      {VITAL_RANGES.map((v, i) => (
        <View
          key={v.label}
          style={[styles.refRow, i < VITAL_RANGES.length - 1 && styles.refRowBorder]}
        >
          <View style={styles.refRowLeft}>
            <View style={styles.refVitalIcon}>
              <Ionicons name={v.icon as any} size={15} color={Colors.textSecondary} />
            </View>
            <Text style={styles.refVitalLabel}>{v.label}</Text>
          </View>

          <View style={styles.refRanges}>
            <View style={styles.refRange}>
              <View style={[styles.rangeDot, { backgroundColor: Colors.normal.dot }]} />
              <Text style={styles.refRangeText}>{v.normal}</Text>
            </View>
            <View style={styles.refRange}>
              <View style={[styles.rangeDot, { backgroundColor: Colors.caution.dot }]} />
              <Text style={[styles.refRangeText, styles.refRangeSmall]}>{v.caution}</Text>
            </View>
          </View>
        </View>
      ))}

      {/* Disclaimer strip */}
      <View style={styles.refDisclaimer}>
        <Ionicons name="information-circle-outline" size={12} color={Colors.textTertiary} />
        <Text style={styles.refDisclaimerText}>
          Ranges are general guidelines · consult a clinician for personal baselines
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screenH },

  identityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  greeting: { fontFamily: Font.sansSemiBold, fontSize: 16, color: Colors.text, marginBottom: 2 },
  dateText: { fontFamily: Font.sans, fontSize: 12, color: Colors.textTertiary },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...Shadows.sm,
  },
  streakEmoji: { fontSize: 14 },
  streakCount: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.text },

  ctaBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18 },
  ctaIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaTextBlock: { flex: 1 },
  ctaTitle: { fontFamily: Font.sansBold, fontSize: 15, color: Colors.white, marginBottom: 2 },
  ctaSub: { fontFamily: Font.sans, fontSize: 12, color: 'rgba(255,255,255,0.72)' },

  section: { marginBottom: Spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: Font.sansSemiBold, fontSize: 14, color: Colors.text },
  seeAll: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.primary },

  loadingCenter: { alignItems: 'center', marginTop: 60 },

  // ── Health Tip ──
  tipCard: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  tipGradient: { padding: 20 },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  tipIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipHeaderText: { flex: 1 },
  tipOverline: {
    fontFamily: Font.sansSemiBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: 'rgba(147,197,253,0.85)',
    marginBottom: 2,
  },
  tipCategory: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.white },
  tipText: {
    fontFamily: Font.sans,
    fontSize: 15,
    lineHeight: 23,
    color: 'rgba(255,255,255,0.92)',
    marginBottom: 16,
  },
  tipSkeleton: {
    gap: 8,
    marginBottom: 16,
  },
  tipSkeletonLine: {
    height: 14,
    width: '100%',
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  tipFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tipFooterText: {
    fontFamily: Font.sans,
    fontSize: 11,
    color: 'rgba(147,197,253,0.7)',
  },

  // ── Vital Reference ──
  refCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  refHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separatorLight,
  },
  refIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refHeaderText: { flex: 1 },
  refTitle: { fontFamily: Font.sansSemiBold, fontSize: 15, color: Colors.text, marginBottom: 2 },
  refSub: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary },

  refRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    gap: 12,
  },
  refRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separatorLight,
  },
  refRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    width: 118,
  },
  refVitalIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refVitalLabel: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.text },

  refRanges: { flex: 1, gap: 5 },
  refRange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rangeDot: { width: 6, height: 6, borderRadius: 3 },
  refRangeText: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary },
  refRangeSmall: { color: Colors.textTertiary, fontSize: 11 },

  refDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separatorLight,
    backgroundColor: Colors.surfaceSecondary,
  },
  refDisclaimerText: {
    fontFamily: Font.sans,
    fontSize: 11,
    color: Colors.textTertiary,
    flex: 1,
    lineHeight: 16,
  },
});
