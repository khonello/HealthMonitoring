import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useReportStore } from '@/store/reportStore';
import { useHealthStore } from '@/store/healthStore';
import { reportService } from '@/services/reportService';
import { TriageResultCard } from '@/components/ui/TriageResultCard';
import { Disclaimer } from '@/components/common/Disclaimer';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';
import {
  getTriageDisplay,
  getReadingStatusColors,
  readingStatusLabel,
  formatDate,
  formatTime,
} from '@/utils/triage';
import { pickAccent } from '@/utils/cardAccents';
import { HealthReport, ReadingsSummary } from '@/types/report';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { reports, setReport } = useReportStore();
  const { lastSubmit } = useHealthStore();

  const reportId = parseInt(id ?? '0', 10);
  const cached = reports[reportId];

  const [report, setLocalReport] = useState<HealthReport | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const bannerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!loading && report) {
      Animated.spring(bannerAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
      }).start();
    }
  }, [loading, report]);

  useEffect(() => {
    if (cached) { setLocalReport(cached); return; }

    // If we just submitted and the ID matches, use submit response to build a partial view
    // then fetch the full report
    setLoading(true);
    reportService
      .getById(reportId)
      .then((r) => {
        setReport(r);
        setLocalReport(r);
      })
      .catch(() => setError('Could not load report.'))
      .finally(() => setLoading(false));
  }, [reportId]);

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError(null);
    try {
      const updated = await reportService.retryTriage(reportId);
      setReport(updated);
      setLocalReport(updated);
    } catch {
      setRetryError('Analysis failed again. Please try later.');
    } finally {
      setRetrying(false);
    }
  };

  const triage = report?.triage;
  const llmFailed = triage ? triage.llm_model_used === null : false;
  const display = triage
    ? getTriageDisplay(triage.triage_level, triage.urgency, triage.hard_rule_triggered)
    : null;
  const accent = pickAccent(triage?.triage_level, triage?.urgency);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={accent.dot} size="large" />
        <Text style={styles.loaderText}>Preparing your report...</Text>
      </View>
    );
  }

  if (error || !report) {
    return (
      <View style={styles.errorState}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorTitle}>Report unavailable</Text>
        <Text style={styles.errorSub}>{error ?? 'This report could not be found.'}</Text>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: accent.bg, borderColor: accent.border }]}>
          <Text style={[styles.backBtnText, { color: accent.dot }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* Urgency banner — animates in on load */}
        {display && (
          <Animated.View
            style={{
              opacity: bannerAnim,
              transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
            }}
          >
          <LinearGradient
            colors={[accent.dot + 'EE', accent.dark + 'DD']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.urgencyBanner, { paddingTop: insets.top + 16 }]}
          >
            <Pressable onPress={() => router.back()} style={styles.bannerBack} hitSlop={10}>
              <Ionicons name="chevron-back" size={22} color={Colors.white} />
            </Pressable>

            <View style={styles.bannerContent}>
              <View style={styles.bannerIconWrap}>
                <Ionicons name={display.iconName as any} size={32} color={Colors.white} />
              </View>
              <Text style={styles.bannerTitle}>{display.label}</Text>
              <Text style={styles.bannerSublabel}>{display.sublabel}</Text>
              <Text style={styles.bannerDate}>
                {formatDate(report.generated_at)} · {formatTime(report.generated_at)}
              </Text>
            </View>

            {triage?.hard_rule_triggered && (
              <View style={styles.criticalStrip}>
                <Ionicons name="warning" size={14} color={Colors.white} />
                <Text style={styles.criticalStripText}>Critical reading detected</Text>
              </View>
            )}
          </LinearGradient>
          </Animated.View>
        )}

        <View style={styles.body}>
          {/* Recommendation */}
          {triage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>RECOMMENDATION</Text>
              <TriageResultCard
                level={triage.triage_level}
                urgency={triage.urgency}
                hardRuleTriggered={triage.hard_rule_triggered}
                hardRuleMetric={triage.hard_rule_metric}
                recommendation={triage.recommendation_text}
                followUpFlag={triage.follow_up_flag}
                followUpHours={triage.follow_up_hours}
                accent={accent}
              />
              {llmFailed && (
                <View style={styles.retryBanner}>
                  <View style={styles.retryBannerTop}>
                    <Ionicons name="warning-outline" size={16} color={Colors.textSecondary} />
                    <Text style={styles.retryBannerText}>
                      AI analysis was unavailable. The recommendation above is a fallback.
                    </Text>
                  </View>
                  {retryError && (
                    <Text style={styles.retryErrorText}>{retryError}</Text>
                  )}
                  <Pressable
                    onPress={handleRetry}
                    disabled={retrying}
                    style={[styles.retryBtn, { backgroundColor: accent.bg, borderColor: accent.border }]}
                  >
                    {retrying
                      ? <ActivityIndicator size="small" color={accent.dot} />
                      : (
                        <>
                          <Ionicons name="refresh-outline" size={15} color={accent.dot} />
                          <Text style={[styles.retryBtnText, { color: accent.dark }]}>Retry AI analysis</Text>
                        </>
                      )
                    }
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Symptom description */}
          {report.symptom_description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>YOUR DESCRIPTION</Text>
              <View style={[styles.descriptionCard, { backgroundColor: accent.bg, borderColor: accent.border }]}>
                <View style={[styles.descriptionIconWrap, { backgroundColor: accent.dot + '20' }]}>
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={accent.dot} />
                </View>
                <Text style={[styles.descriptionText, { color: accent.dark }]}>
                  {report.symptom_description}
                </Text>
              </View>
            </View>
          )}

          {/* Readings summary */}
          {Object.keys(report.readings_summary).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>VITALS BREAKDOWN</Text>
              <ReadingsSummaryCard summary={report.readings_summary} />
            </View>
          )}

          {/* Analysis quality */}
          {triage && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ANALYSIS QUALITY</Text>
              <View style={styles.qualityCard}>
                <View style={styles.qualityRow}>
                  <Text style={styles.qualityLabel}>Input quality</Text>
                  <View style={[styles.accentPill, { backgroundColor: accent.bg, borderColor: accent.border }]}>
                    <View style={[styles.accentPillDot, { backgroundColor: accent.dot }]} />
                    <Text style={[styles.accentPillText, { color: accent.dark }]}>
                      {triage.confidence_level === 'high' ? 'High quality' : triage.confidence_level === 'medium' ? 'Medium quality' : 'Low quality'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.qualityRow, styles.qualityRowBorder]}>
                  <Text style={styles.qualityLabel}>Generated</Text>
                  <Text style={styles.qualityValue}>{formatDate(triage.generated_at)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Disclaimer */}
          <View style={styles.section}>
            <Disclaimer text={report.disclaimer_text} variant="banner" />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ReadingsSummaryCard({ summary }: { summary: ReadingsSummary }) {
  const entries = Object.entries(summary) as [
    keyof ReadingsSummary,
    NonNullable<ReadingsSummary[keyof ReadingsSummary]>
  ][];

  const labels: Record<string, string> = {
    temperature: 'Temperature',
    heart_rate: 'Heart Rate',
    spo2: 'Blood Oxygen',
    blood_pressure: 'Blood Pressure',
  };

  const icons: Record<string, any> = {
    temperature: 'thermometer-outline',
    heart_rate: 'heart-outline',
    spo2: 'fitness-outline',
    blood_pressure: 'pulse-outline',
  };

  return (
    <View style={styles.readingsCard}>
      {entries.map(([key, item], i) => {
        const colors = getReadingStatusColors(item.status);
        return (
          <View
            key={key}
            style={[styles.readingRow, i < entries.length - 1 && styles.readingRowBorder]}
          >
            <View style={styles.readingLeft}>
              <View style={[styles.readingIconWrap, { backgroundColor: colors.bg }]}>
                <Ionicons name={icons[key]} size={16} color={colors.dot} />
              </View>
              <View>
                <Text style={styles.readingLabel}>{labels[key] ?? key}</Text>
                <Text style={[styles.readingStatusText, { color: colors.text }]}>
                  {readingStatusLabel(item.status)}
                </Text>
              </View>
            </View>
            <View style={styles.readingRight}>
              <Text style={styles.readingValue}>{String(item.value)}</Text>
              <Text style={styles.readingUnit}>{item.unit}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: {},

  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: Colors.background },
  loaderText: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary },

  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, backgroundColor: Colors.background, gap: 10 },
  errorTitle: { fontFamily: Font.sansSemiBold, fontSize: 18, color: Colors.text },
  errorSub: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  backBtn: {
    marginTop: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backBtnText: { fontFamily: Font.sansSemiBold, fontSize: 14, color: Colors.primary },

  retryBanner: {
    marginTop: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.separatorLight,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 10,
    ...Shadows.card,
  },
  retryBannerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  retryBannerText: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 19,
  },
  retryErrorText: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: '#C0392B',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  retryBtnText: { fontFamily: Font.sansSemiBold, fontSize: 13 },

  urgencyBanner: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  bannerBack: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bannerContent: { alignItems: 'flex-start', gap: 4 },
  bannerIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  bannerTitle: { fontFamily: Font.serif, fontSize: 28, color: Colors.white, lineHeight: 34 },
  bannerSublabel: { fontFamily: Font.sans, fontSize: 14, color: 'rgba(255,255,255,0.85)' },
  bannerDate: { fontFamily: Font.sans, fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  criticalStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 14,
  },
  criticalStripText: { fontFamily: Font.sansSemiBold, fontSize: 12, color: Colors.white },

  body: { padding: Spacing.screenH },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  descriptionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    ...Shadows.card,
  },
  descriptionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  descriptionText: {
    fontFamily: Font.sans,
    fontSize: 15,
    lineHeight: 23,
  },

  qualityCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  qualityRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.separatorLight,
  },
  qualityLabel: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary },
  qualityValue: { fontFamily: Font.sansMedium, fontSize: 14, color: Colors.text },

  accentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  accentPillDot: { width: 6, height: 6, borderRadius: 3 },
  accentPillText: { fontFamily: Font.sansMedium, fontSize: 12 },

  readingsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.card,
  },
  readingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  readingRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.separatorLight,
  },
  readingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  readingIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readingLabel: { fontFamily: Font.sansMedium, fontSize: 14, color: Colors.text, marginBottom: 2 },
  readingStatusText: { fontFamily: Font.sans, fontSize: 12 },
  readingRight: { alignItems: 'flex-end' },
  readingValue: { fontFamily: Font.serif, fontSize: 22, color: Colors.text, lineHeight: 26 },
  readingUnit: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary },
});
