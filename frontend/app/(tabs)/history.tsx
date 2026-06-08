import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHealthStore } from '@/store/healthStore';
import { useHealth } from '@/hooks/useHealth';
import { ConfidenceBadge } from '@/components/ui/ConfidenceBadge';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';
import { HealthRecord } from '@/types/health';
import { getTriageDisplay, formatDate, formatTime } from '@/utils/triage';

type Section = { title: string; data: HealthRecord[] };

function groupByMonth(records: HealthRecord[]): Section[] {
  const map = new Map<string, HealthRecord[]>();
  for (const r of records) {
    const key = new Date(r.submitted_at).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(r);
  }
  return Array.from(map.entries()).map(([title, data]) => ({ title, data }));
}

export default function HistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { records, isLoading } = useHealthStore();
  const { fetchHistory } = useHealth();

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = useCallback(async () => {
    await fetchHistory();
  }, [fetchHistory]);

  const sections = groupByMonth(records);

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.screenTitle}>History</Text>
        <Text style={styles.screenSub}>
          {records.length} {records.length === 1 ? 'entry' : 'entries'} total
        </Text>
      </View>

      {isLoading && records.length === 0 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading your records...</Text>
        </View>
      ) : records.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIcon}>
            <Ionicons name="time-outline" size={36} color={Colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No entries yet</Text>
          <Text style={styles.emptySub}>
            Your health records will appear here after you log your first entry.
          </Text>
          <Pressable onPress={() => router.push('/(tabs)/input')} style={styles.emptyBtn}>
            <Text style={styles.emptyBtnText}>Log first entry</Text>
          </Pressable>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text style={styles.monthHeader}>{section.title}</Text>
          )}
          renderItem={({ item, index, section }) => (
            <RecordItem
              record={item}
              isFirst={index === 0}
              isLast={index === section.data.length - 1}
              onPress={() =>
                router.push({ pathname: '/report/[id]', params: { id: String(item.id) } })
              }
            />
          )}
        />
      )}
    </LinearGradient>
  );
}

function RecordItem({
  record,
  isFirst,
  isLast,
  onPress,
}: {
  record: HealthRecord;
  isFirst: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  const triage = record.triage;
  const display = triage ? getTriageDisplay(triage.level, triage.urgency) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.item,
        isFirst && styles.itemFirst,
        isLast && styles.itemLast,
        pressed && styles.itemPressed,
      ]}
    >
      {/* Triage color stripe */}
      {display && (
        <View style={[styles.triageStripe, { backgroundColor: display.colors.dot }]} />
      )}

      <View style={styles.itemContent}>
        <View style={styles.itemTop}>
          <View style={styles.itemDateBlock}>
            <Text style={styles.itemDate}>{formatDate(record.submitted_at)}</Text>
            <Text style={styles.itemTime}>{formatTime(record.submitted_at)}</Text>
          </View>
          {display && (
            <View style={[styles.triageBadge, { backgroundColor: display.colors.bg, borderColor: display.colors.border }]}>
              <Text style={[styles.triageBadgeText, { color: display.colors.text }]}>
                {display.label}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.vitalsRow}>
          {record.temperature != null && (
            <VitalTag icon="thermometer-outline" label={`${record.temperature}°C`} />
          )}
          {record.heart_rate != null && (
            <VitalTag icon="heart-outline" label={`${record.heart_rate} bpm`} />
          )}
          {record.spo2 != null && (
            <VitalTag icon="fitness-outline" label={`${record.spo2}%`} />
          )}
          {record.systolic_bp != null && (
            <VitalTag
              icon="pulse-outline"
              label={record.diastolic_bp ? `${record.systolic_bp}/${record.diastolic_bp}` : `${record.systolic_bp} sys`}
            />
          )}
          {record.input_mode === 'descriptive' && (
            <VitalTag icon="chatbubble-ellipses-outline" label="Description" />
          )}
        </View>

        <View style={styles.itemFooter}>
          <ConfidenceBadge level={record.input_confidence} showDot={false} />
          <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
        </View>
      </View>
    </Pressable>
  );
}

function VitalTag({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.vitalTag}>
      <Ionicons name={icon} size={11} color={Colors.textTertiary} />
      <Text style={styles.vitalTagText}>{label}</Text>
    </View>
  );
}

const RADIUS = Radius.lg;

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  topBar: {
    paddingHorizontal: Spacing.screenH,
    paddingBottom: 12,
  },
  screenTitle: { ...TextStyles.h1, marginBottom: 2 },
  screenSub: { fontFamily: Font.sans, fontSize: 13, color: Colors.textSecondary },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: Font.sansSemiBold, fontSize: 18, color: Colors.text, marginBottom: 8 },
  emptySub: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
  },
  emptyBtnText: { fontFamily: Font.sansSemiBold, fontSize: 14, color: Colors.primary },

  list: { paddingHorizontal: Spacing.screenH },
  monthHeader: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 8,
  },

  item: {
    backgroundColor: Colors.surface,
    flexDirection: 'row',
    ...Shadows.card,
    marginBottom: 2,
  },
  itemFirst: { borderTopLeftRadius: RADIUS, borderTopRightRadius: RADIUS },
  itemLast: { borderBottomLeftRadius: RADIUS, borderBottomRightRadius: RADIUS, marginBottom: 0 },
  itemPressed: { backgroundColor: Colors.surfaceSecondary },

  triageStripe: { width: 4 },

  itemContent: { flex: 1, padding: 16 },
  itemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemDateBlock: { gap: 2 },
  itemDate: { fontFamily: Font.sansSemiBold, fontSize: 14, color: Colors.text },
  itemTime: { fontFamily: Font.sans, fontSize: 12, color: Colors.textTertiary },

  triageBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  triageBadgeText: { fontFamily: Font.sansMedium, fontSize: 11 },

  vitalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  vitalTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  vitalTagText: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary },

  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
