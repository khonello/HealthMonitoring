import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { feedbackService } from '@/services/feedbackService';
import {
  AdminFeedback,
  FeedbackStatus,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_STATUS_LABELS,
} from '@/types/feedback';
import { Colors, Palette } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';

const STATUS_PALETTES: Record<FeedbackStatus, Palette> = {
  new: {
    text: Colors.primaryText,
    bg: Colors.primaryLight,
    border: Colors.primaryMuted,
    dot: Colors.primary,
    dark: Colors.primaryText,
  },
  reviewed: Colors.caution,
  resolved: Colors.normal,
};

const FILTERS: { key: FeedbackStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'resolved', label: 'Resolved' },
];

const NEXT_STATUS: Record<FeedbackStatus, FeedbackStatus> = {
  new: 'reviewed',
  reviewed: 'resolved',
  resolved: 'new',
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function AdminFeedbackScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ status?: string }>();

  const initialFilter = (
    params.status && FILTERS.some((f) => f.key === params.status) ? params.status : 'all'
  ) as FeedbackStatus | 'all';

  const [filter, setFilter] = useState<FeedbackStatus | 'all'>(initialFilter);
  const [items, setItems] = useState<AdminFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await feedbackService.getAll(filter === 'all' ? undefined : { status: filter });
      setItems(data.results);
    } catch {
      Alert.alert('Could not load', 'Feedback could not be fetched. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const applyUpdate = async (
    item: AdminFeedback,
    patch: { status?: FeedbackStatus; admin_note?: string }
  ) => {
    setSavingId(item.id);
    try {
      const updated = await feedbackService.update(item.id, patch);
      // Drop rows that no longer match the active filter, otherwise patch in place.
      setItems((prev) =>
        filter !== 'all' && updated.status !== filter
          ? prev.filter((row) => row.id !== item.id)
          : prev.map((row) => (row.id === item.id ? updated : row))
      );
    } catch {
      Alert.alert('Update failed', 'The change was not saved. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <Header title="Feedback" showBack />

      <View style={styles.filterBar}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => [
                styles.filterChip,
                active && styles.filterChipActive,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading && items.length === 0 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.primary} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {items.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="chatbubbles-outline" size={26} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>
                {filter === 'all'
                  ? 'No feedback has been submitted yet.'
                  : `No ${FEEDBACK_STATUS_LABELS[filter as FeedbackStatus].toLowerCase()} feedback.`}
              </Text>
            </View>
          ) : (
            items.map((item) => {
              const palette = STATUS_PALETTES[item.status];
              const draft = noteDrafts[item.id] ?? item.admin_note;
              const noteChanged = draft.trim() !== item.admin_note;
              const busy = savingId === item.id;

              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderText}>
                      <Text style={styles.category}>{FEEDBACK_CATEGORY_LABELS[item.category]}</Text>
                      <Pressable
                        onPress={() => router.push(`/admin/users/${item.user_id}`)}
                        accessibilityRole="link"
                        accessibilityLabel={`Open ${item.user_email}`}
                      >
                        <Text style={styles.userLink}>
                          {item.user_full_name} · {item.user_email}
                        </Text>
                      </Pressable>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: palette.bg, borderColor: palette.border },
                      ]}
                    >
                      <View style={[styles.statusDot, { backgroundColor: palette.dot }]} />
                      <Text style={[styles.statusText, { color: palette.dark }]}>
                        {FEEDBACK_STATUS_LABELS[item.status]}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.message}>{item.message}</Text>

                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>{formatDateTime(item.created_at)}</Text>
                    {item.rating != null && (
                      <Text style={styles.meta}>· rated {item.rating}/5</Text>
                    )}
                    {!!item.platform && <Text style={styles.meta}>· {item.platform}</Text>}
                    {!!item.app_version && <Text style={styles.meta}>· v{item.app_version}</Text>}
                    {item.health_record != null && (
                      <Text style={styles.meta}>· record #{item.health_record}</Text>
                    )}
                  </View>

                  <TextInput
                    value={draft}
                    onChangeText={(text) =>
                      setNoteDrafts((prev) => ({ ...prev, [item.id]: text }))
                    }
                    multiline
                    textAlignVertical="top"
                    placeholder="Internal note (not shown to the user)"
                    placeholderTextColor={Colors.placeholder}
                    style={styles.noteInput}
                    accessibilityLabel="Internal note"
                  />

                  <View style={styles.actions}>
                    <Pressable
                      onPress={() => applyUpdate(item, { status: NEXT_STATUS[item.status] })}
                      disabled={busy}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark as ${FEEDBACK_STATUS_LABELS[NEXT_STATUS[item.status]]}`}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        pressed && { opacity: 0.8 },
                        busy && { opacity: 0.5 },
                      ]}
                    >
                      <Ionicons name="arrow-forward-circle-outline" size={16} color={Colors.primary} />
                      <Text style={styles.actionText}>
                        Mark {FEEDBACK_STATUS_LABELS[NEXT_STATUS[item.status]]}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => applyUpdate(item, { admin_note: draft.trim() })}
                      disabled={!noteChanged || busy}
                      accessibilityRole="button"
                      accessibilityLabel="Save internal note"
                      style={({ pressed }) => [
                        styles.actionBtn,
                        styles.actionBtnMuted,
                        pressed && { opacity: 0.8 },
                        (!noteChanged || busy) && { opacity: 0.4 },
                      ]}
                    >
                      {busy ? (
                        <ActivityIndicator size="small" color={Colors.textSecondary} />
                      ) : (
                        <>
                          <Ionicons name="save-outline" size={16} color={Colors.textSecondary} />
                          <Text style={styles.actionTextMuted}>Save note</Text>
                        </>
                      )}
                    </Pressable>
                  </View>
                </View>
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
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.screenH, paddingTop: 4 },

  filterBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: Spacing.screenH,
    paddingVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.separator,
  },
  filterChipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  filterText: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.textSecondary },
  filterTextActive: { color: Colors.primary },

  emptyCard: {
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.separator,
    paddingVertical: 36,
    paddingHorizontal: 20,
    marginTop: 12,
  },
  emptyText: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 16,
    marginBottom: 12,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 10,
  },
  cardHeaderText: { flex: 1, gap: 2 },
  category: { ...TextStyles.h4 },
  userLink: {
    fontFamily: Font.sans,
    fontSize: 12,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: Font.sansSemiBold, fontSize: 11 },

  message: {
    fontFamily: Font.sans,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    marginBottom: 10,
  },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 12 },
  meta: { fontFamily: Font.sans, fontSize: 11, color: Colors.textTertiary },

  noteInput: {
    fontFamily: Font.sans,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 20,
    minHeight: 62,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    padding: 12,
    marginBottom: 12,
  },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: Colors.primaryMuted,
  },
  actionBtnMuted: {
    backgroundColor: Colors.surfaceSecondary,
    borderColor: Colors.separator,
  },
  actionText: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.primary },
  actionTextMuted: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.textSecondary },
});
