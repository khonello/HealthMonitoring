import React, { useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useHealthStore } from '@/store/healthStore';
import { useHealth } from '@/hooks/useHealth';
import { RecordCard } from '@/components/ui/RecordCard';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { HealthRecord } from '@/types/health';

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
  const { records, isLoading, isLoadingMore, nextPageUrl, totalCount } = useHealthStore();
  const { fetchHistory, fetchMoreHistory, deleteRecord } = useHealth();

  useFocusEffect(useCallback(() => { fetchHistory(); }, [fetchHistory]));

  const onRefresh = useCallback(async () => { await fetchHistory(); }, [fetchHistory]);
  const onEndReached = useCallback(() => { if (nextPageUrl) fetchMoreHistory(); }, [nextPageUrl, fetchMoreHistory]);

  const sections = groupByMonth(records);

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <View style={[styles.topBar, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.screenTitle}>Records</Text>
        <Text style={styles.screenSub}>
          {totalCount > 0 ? `${totalCount} ${totalCount === 1 ? 'assessment' : 'assessments'} total` : `${records.length} ${records.length === 1 ? 'assessment' : 'assessments'}`}
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
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMore}>
                <ActivityIndicator color={Colors.primary} size="small" />
              </View>
            ) : null
          }
          renderSectionHeader={({ section }) => (
            <Text style={styles.monthHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <RecordCard
              record={item}
              onPress={() =>
                router.push({ pathname: '/report/[id]', params: { id: String(item.id) } })
              }
              onDelete={() => deleteRecord(item.id)}
            />
          )}
        />
      )}
    </LinearGradient>
  );
}

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
  loadingMore: { paddingVertical: 20, alignItems: 'center' },
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
});
