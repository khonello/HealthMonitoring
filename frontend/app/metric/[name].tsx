import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHealthStore } from '@/store/healthStore';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';
import { formatDateShort } from '@/utils/triage';
import { HealthRecord } from '@/types/health';

type MetricKey = 'temperature' | 'heart_rate' | 'spo2' | 'systolic_bp';

const META: Record<MetricKey, {
  label: string;
  unit: string;
  icon: any;
  normal: [number, number];
  caution: [number, number];
  hint: string;
}> = {
  temperature: {
    label: 'Temperature',
    unit: '°C',
    icon: 'thermometer-outline',
    normal: [36.1, 37.2],
    caution: [37.2, 38.0],
    hint: 'Normal: 36.1 – 37.2 °C',
  },
  heart_rate: {
    label: 'Heart Rate',
    unit: 'bpm',
    icon: 'heart-outline',
    normal: [60, 100],
    caution: [50, 110],
    hint: 'Normal: 60 – 100 bpm',
  },
  spo2: {
    label: 'Blood Oxygen',
    unit: '%',
    icon: 'fitness-outline',
    normal: [95, 100],
    caution: [90, 95],
    hint: 'Normal: ≥ 95%',
  },
  systolic_bp: {
    label: 'Systolic BP',
    unit: 'mmHg',
    icon: 'pulse-outline',
    normal: [90, 120],
    caution: [120, 140],
    hint: 'Normal: 90 – 120 mmHg',
  },
};

function getBarColor(value: number, meta: typeof META[MetricKey]): string {
  const [nMin, nMax] = meta.normal;
  if (value >= nMin && value <= nMax) return Colors.normal.dot;
  const [cMin, cMax] = meta.caution;
  if (value >= cMin && value <= cMax) return Colors.caution.dot;
  return Colors.critical.dot;
}

export default function MetricDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { records } = useHealthStore();

  const metricKey = name as MetricKey;
  const meta = META[metricKey];

  const dataPoints = useMemo(() => {
    return records
      .filter((r) => r[metricKey] != null)
      .slice(0, 14)
      .reverse()
      .map((r) => ({
        value: r[metricKey] as number,
        date: r.submitted_at,
        recordId: r.id,
      }));
  }, [records, metricKey]);

  const values = dataPoints.map((d) => d.value);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  const chartMin = Math.min(min * 0.95, meta.normal[0] * 0.95);
  const chartMax = Math.max(max * 1.05, meta.caution[1] * 1.05);
  const range = chartMax - chartMin;

  if (!meta) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Unknown metric</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.back} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>{meta.label}</Text>
            <Text style={styles.headerHint}>{meta.hint}</Text>
          </View>
        </View>

        {dataPoints.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name={meta.icon} size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>No data yet</Text>
            <Text style={styles.emptySub}>Log some entries with {meta.label.toLowerCase()} readings to see your trend.</Text>
          </View>
        ) : (
          <>
            {/* Stats row */}
            <View style={styles.statsRow}>
              <StatCard label="Average" value={avg.toFixed(1)} unit={meta.unit} color={Colors.primary} />
              <StatCard label="Lowest" value={String(min)} unit={meta.unit} color={Colors.normal.dot} />
              <StatCard label="Highest" value={String(max)} unit={meta.unit} color={Colors.caution.dot} />
            </View>

            {/* Chart */}
            <View style={styles.chartWrap}>
              <Text style={styles.sectionLabel}>LAST {dataPoints.length} READINGS</Text>
              <View style={styles.chart}>
                {dataPoints.map((point, i) => {
                  const heightPct = range > 0 ? ((point.value - chartMin) / range) * 100 : 50;
                  const barColor = getBarColor(point.value, meta);
                  return (
                    <Pressable
                      key={i}
                      onPress={() =>
                        router.push({ pathname: '/report/[id]', params: { id: String(point.recordId) } })
                      }
                      style={styles.barWrap}
                    >
                      <Text style={styles.barValue}>
                        {Number.isInteger(point.value) ? point.value : point.value.toFixed(1)}
                      </Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${Math.max(heightPct, 8)}%` as any,
                              backgroundColor: barColor,
                            },
                          ]}
                        />
                      </View>
                      <Text style={styles.barDate}>
                        {new Date(point.date).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Legend */}
              <View style={styles.legend}>
                <LegendItem color={Colors.normal.dot} label={`Normal (${meta.normal[0]} – ${meta.normal[1]})`} />
                <LegendItem color={Colors.caution.dot} label="Caution" />
                <LegendItem color={Colors.critical.dot} label="Critical" />
              </View>
            </View>

            {/* Data table */}
            <View style={styles.sectionWrap}>
              <Text style={styles.sectionLabel}>ALL READINGS</Text>
              <View style={styles.table}>
                {[...dataPoints].reverse().map((point, i, arr) => {
                  const barColor = getBarColor(point.value, meta);
                  return (
                    <Pressable
                      key={i}
                      onPress={() =>
                        router.push({ pathname: '/report/[id]', params: { id: String(point.recordId) } })
                      }
                      style={({ pressed }) => [
                        styles.tableRow,
                        i < arr.length - 1 && styles.tableRowBorder,
                        pressed && styles.tableRowPressed,
                      ]}
                    >
                      <View style={[styles.tableColorDot, { backgroundColor: barColor }]} />
                      <Text style={styles.tableDate}>{formatDateShort(point.date)}</Text>
                      <Text style={styles.tableValue}>
                        {Number.isInteger(point.value) ? point.value : point.value.toFixed(1)}{' '}
                        <Text style={styles.tableUnit}>{meta.unit}</Text>
                      </Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.textTertiary} />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statDot, { backgroundColor: color }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statUnit}>{unit}</Text>
    </View>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.screenH },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: Font.sans, fontSize: 15, color: Colors.textSecondary },

  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  headerText: { flex: 1 },
  headerTitle: { fontFamily: Font.serif, fontSize: 26, color: Colors.text },
  headerHint: { fontFamily: Font.sans, fontSize: 13, color: Colors.textSecondary },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 14,
    alignItems: 'center',
    gap: 3,
    ...Shadows.card,
  },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontFamily: Font.sans, fontSize: 11, color: Colors.textTertiary },
  statValue: { fontFamily: Font.serif, fontSize: 24, color: Colors.text },
  statUnit: { fontFamily: Font.sans, fontSize: 11, color: Colors.textSecondary },

  chartWrap: { marginBottom: 24 },
  sectionLabel: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    height: 160,
    ...Shadows.card,
  },
  barWrap: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barValue: { fontFamily: Font.sansMedium, fontSize: 9, color: Colors.textTertiary, marginBottom: 2 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 6 },
  barDate: { fontFamily: Font.sans, fontSize: 9, color: Colors.textTertiary, marginTop: 4 },

  legend: { flexDirection: 'row', gap: 16, marginTop: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontFamily: Font.sans, fontSize: 11, color: Colors.textTertiary },

  sectionWrap: { marginBottom: 20 },
  table: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  tableRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separatorLight,
  },
  tableRowPressed: { backgroundColor: Colors.surfaceSecondary },
  tableColorDot: { width: 8, height: 8, borderRadius: 4 },
  tableDate: { flex: 1, fontFamily: Font.sansMedium, fontSize: 14, color: Colors.text },
  tableValue: { fontFamily: Font.serif, fontSize: 20, color: Colors.text },
  tableUnit: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontFamily: Font.sansSemiBold, fontSize: 18, color: Colors.text },
  emptySub: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
