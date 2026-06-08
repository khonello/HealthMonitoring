import React, { useEffect, useCallback } from 'react';
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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/authStore';
import { useHealthStore } from '@/store/healthStore';
import { useHealth } from '@/hooks/useHealth';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { GlassCard } from '@/components/ui/GlassCard';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';
import {
  getGreeting,
  getFirstName,
  isTodayRecord,
  computeStreak,
  formatDateShort,
  formatTime,
  getTriageDisplay,
} from '@/utils/triage';
import { HealthRecord } from '@/types/health';

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { records, isLoading } = useHealthStore();
  const { fetchHistory } = useHealth();

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  const today = records.find((r) => isTodayRecord(r.submitted_at));
  const recent = records.slice(0, 4);
  const streak = computeStreak(records);
  const criticalRecord = records.find(
    (r) => r.triage?.level === 'see_doctor' && r.triage?.urgency === 'high'
  );

  const firstName = user ? getFirstName(user.full_name) : '';
  const greeting = getGreeting();

  return (
    <LinearGradient colors={['#F0F4FF', '#F8FAFF', '#FFFFFF']} style={styles.gradient}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingBlock}>
          <Text style={styles.greetingLabel}>{greeting},</Text>
          <Text style={styles.greetingName}>{firstName}</Text>
          <Text style={styles.greetingDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Today's card */}
        <View style={styles.section}>
          {today ? (
            <TodayCard record={today} onViewReport={() =>
              router.push({ pathname: '/report/[id]', params: { id: String(today.id) } })
            } />
          ) : (
            <Pressable
              onPress={() => router.push('/(tabs)/input')}
              style={({ pressed }) => [styles.logCta, pressed && styles.ctaPressed]}
            >
              <LinearGradient
                colors={['#3B82F6', '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.logCtaGradient}
              >
                <View style={styles.logCtaIcon}>
                  <Ionicons name="add" size={28} color={Colors.white} />
                </View>
                <View style={styles.logCtaText}>
                  <Text style={styles.logCtaTitle}>Log Today's Vitals</Text>
                  <Text style={styles.logCtaSubtitle}>Tap to track how you're feeling</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.7)" />
              </LinearGradient>
            </Pressable>
          )}
        </View>

        {/* Critical alert banner */}
        {criticalRecord && !isTodayRecord(criticalRecord.submitted_at) && (
          <View style={styles.section}>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/report/[id]', params: { id: String(criticalRecord.id) } })
              }
              style={styles.alertBanner}
            >
              <Ionicons name="warning" size={18} color={Colors.critical.dot} />
              <Text style={styles.alertBannerText}>
                A recent entry flagged a critical reading
              </Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.critical.text} />
            </Pressable>
          </View>
        )}

        {/* Streak */}
        {streak > 1 && (
          <View style={styles.section}>
            <GlassCard style={styles.streakCard} padding={16}>
              <View style={styles.streakRow}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <View>
                  <Text style={styles.streakCount}>{streak}-day streak</Text>
                  <Text style={styles.streakSub}>Keep tracking daily</Text>
                </View>
                <View style={styles.streakBadge}>
                  <Text style={styles.streakBadgeText}>Active</Text>
                </View>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Recent entries */}
        {recent.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Entries</Text>
              <Pressable onPress={() => router.push('/(tabs)/history')} hitSlop={8}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.recentList}>
              {recent.map((r) => (
                <RecordRow
                  key={r.id}
                  record={r}
                  onPress={() =>
                    router.push({ pathname: '/report/[id]', params: { id: String(r.id) } })
                  }
                />
              ))}
            </View>
          </View>
        )}

        {isLoading && records.length === 0 && (
          <View style={styles.loadingCenter}>
            <ActivityIndicator color={Colors.primary} />
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function TodayCard({
  record,
  onViewReport,
}: {
  record: HealthRecord;
  onViewReport: () => void;
}) {
  const triage = record.triage;
  const display = triage ? getTriageDisplay(triage.level, triage.urgency) : null;

  return (
    <GlassCard style={styles.todayCard} padding={0}>
      <View style={styles.todayTop}>
        <View>
          <Text style={styles.todayLabel}>Today's entry</Text>
          <Text style={styles.todayTime}>{formatTime(record.submitted_at)}</Text>
        </View>
        {triage && display && (
          <View style={[styles.triagePill, { backgroundColor: display.colors.bg, borderColor: display.colors.border }]}>
            <View style={[styles.triageDot, { backgroundColor: display.colors.dot }]} />
            <Text style={[styles.triagePillText, { color: display.colors.text }]}>
              {display.label}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.vitalsGrid}>
        {record.temperature != null && (
          <VitalChip icon="thermometer-outline" value={`${record.temperature}`} unit="°C" />
        )}
        {record.heart_rate != null && (
          <VitalChip icon="heart-outline" value={`${record.heart_rate}`} unit="bpm" />
        )}
        {record.spo2 != null && (
          <VitalChip icon="fitness-outline" value={`${record.spo2}`} unit="%" />
        )}
        {record.systolic_bp != null && (
          <VitalChip
            icon="pulse-outline"
            value={record.diastolic_bp ? `${record.systolic_bp}/${record.diastolic_bp}` : `${record.systolic_bp}`}
            unit="mmHg"
          />
        )}
      </View>

      <View style={styles.todayFooter}>
        <ConfidenceBadge level={record.input_confidence} />
        <Pressable onPress={onViewReport} style={styles.viewReportBtn} hitSlop={8}>
          <Text style={styles.viewReportText}>View analysis</Text>
          <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
        </Pressable>
      </View>
    </GlassCard>
  );
}

function VitalChip({ icon, value, unit }: { icon: any; value: string; unit: string }) {
  return (
    <View style={styles.vitalChip}>
      <Ionicons name={icon} size={13} color={Colors.textTertiary} />
      <Text style={styles.vitalChipValue}>{value}</Text>
      <Text style={styles.vitalChipUnit}>{unit}</Text>
    </View>
  );
}

function RecordRow({ record, onPress }: { record: HealthRecord; onPress: () => void }) {
  const triage = record.triage;
  const display = triage ? getTriageDisplay(triage.level, triage.urgency) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.recordRow, pressed && styles.rowPressed]}
    >
      <View style={styles.recordDate}>
        <Text style={styles.recordDateMain}>
          {new Date(record.submitted_at).toLocaleDateString('en-US', { weekday: 'short' })}
        </Text>
        <Text style={styles.recordDateSub}>
          {new Date(record.submitted_at).getDate()}
        </Text>
      </View>

      <View style={styles.recordMid}>
        <Text style={styles.recordDateFull}>{formatDateShort(record.submitted_at)}</Text>
        <View style={styles.recordVitals}>
          {record.temperature != null && (
            <Text style={styles.recordVital}>{record.temperature}°C</Text>
          )}
          {record.heart_rate != null && (
            <Text style={styles.recordVital}>{record.heart_rate} bpm</Text>
          )}
          {record.spo2 != null && (
            <Text style={styles.recordVital}>{record.spo2}% SpO₂</Text>
          )}
        </View>
      </View>

      <View style={styles.recordRight}>
        {display && (
          <View style={[styles.smallTriageDot, { backgroundColor: display.colors.dot }]} />
        )}
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screenH },

  greetingBlock: { marginBottom: Spacing.lg },
  greetingLabel: { fontFamily: Font.sansMedium, fontSize: 14, color: Colors.textSecondary },
  greetingName: { ...TextStyles.h1, marginBottom: 2 },
  greetingDate: { fontFamily: Font.sans, fontSize: 14, color: Colors.textTertiary },

  section: { marginBottom: Spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontFamily: Font.sansSemiBold, fontSize: 15, color: Colors.text },
  seeAll: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.primary },

  logCta: { borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.lg },
  ctaPressed: { opacity: 0.88 },
  logCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    gap: 14,
  },
  logCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logCtaText: { flex: 1 },
  logCtaTitle: { fontFamily: Font.sansSemiBold, fontSize: 17, color: Colors.white, marginBottom: 2 },
  logCtaSubtitle: { fontFamily: Font.sans, fontSize: 13, color: 'rgba(255,255,255,0.75)' },

  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.critical.bg,
    borderRadius: Radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.critical.border,
  },
  alertBannerText: {
    flex: 1,
    fontFamily: Font.sansMedium,
    fontSize: 13,
    color: Colors.critical.text,
  },

  streakCard: {},
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  streakEmoji: { fontSize: 28 },
  streakCount: { fontFamily: Font.sansSemiBold, fontSize: 16, color: Colors.text },
  streakSub: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary },
  streakBadge: {
    marginLeft: 'auto',
    backgroundColor: Colors.normal.bg,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.normal.border,
  },
  streakBadgeText: { fontFamily: Font.sansMedium, fontSize: 12, color: Colors.normal.text },

  todayCard: { overflow: 'visible' },
  todayTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 14,
  },
  todayLabel: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.textSecondary, marginBottom: 2 },
  todayTime: { fontFamily: Font.sansSemiBold, fontSize: 15, color: Colors.text },
  triagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  triageDot: { width: 6, height: 6, borderRadius: 3 },
  triagePillText: { fontFamily: Font.sansMedium, fontSize: 12 },

  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  vitalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  vitalChipValue: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.text },
  vitalChipUnit: { fontFamily: Font.sans, fontSize: 11, color: Colors.textTertiary },

  todayFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separatorLight,
  },
  viewReportBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewReportText: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.primary },

  recentList: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separatorLight,
    gap: 12,
  },
  rowPressed: { backgroundColor: Colors.surfaceSecondary },
  recordDate: { alignItems: 'center', width: 36 },
  recordDateMain: { fontFamily: Font.sansMedium, fontSize: 11, color: Colors.textTertiary, textTransform: 'uppercase' },
  recordDateSub: { fontFamily: Font.serif, fontSize: 22, color: Colors.text, lineHeight: 26 },
  recordMid: { flex: 1 },
  recordDateFull: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.text, marginBottom: 3 },
  recordVitals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recordVital: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary },
  recordRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  smallTriageDot: { width: 8, height: 8, borderRadius: 4 },

  loadingCenter: { alignItems: 'center', marginTop: 40 },
});
