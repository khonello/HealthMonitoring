import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Header } from '@/components/common/Header';
import { GlassCard } from '@/components/ui/GlassCard';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { adminService } from '@/services/adminService';
import { AdminUserDetail } from '@/types/admin';
import { getTriageDisplay, formatDate, formatTime } from '@/utils/triage';
import { Colors } from '@/constants/colors';
import { Font, TextStyles } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';

const SOURCE_LABEL: Record<string, string> = {
  triage: 'Triage',
  retry: 'Retry Triage',
  health_tip: 'Health Tip',
};

export default function AdminUserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminService.getUserDetail(Number(id));
      setUser(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleToggleActive = () => {
    if (!user) return;
    const action = user.is_active ? 'Deactivate' : 'Reactivate';
    Alert.alert(`${action} account?`, `This will ${user.is_active ? 'block' : 'restore'} sign-in for ${user.email}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: action,
        style: user.is_active ? 'destructive' : 'default',
        onPress: async () => {
          setToggling(true);
          try {
            const updated = await adminService.deactivateUser(user.id);
            setUser({ ...user, is_active: updated.is_active });
          } finally {
            setToggling(false);
          }
        },
      },
    ]);
  };

  if (loading && !user) {
    return (
      <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
        <Header title="User" showBack />
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </LinearGradient>
    );
  }

  if (!user) return null;

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <Header title={user.full_name} showBack />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}>
        <GlassCard style={styles.infoCard}>
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Status" value={user.is_active ? 'Active' : 'Deactivated'} />
          <InfoRow label="Role" value={user.is_staff ? 'Staff' : 'Standard'} />
          <InfoRow label="Joined" value={formatDate(user.created_at)} last />
        </GlassCard>

        <PrimaryButton
          label={toggling ? 'Updating...' : user.is_active ? 'Deactivate Account' : 'Reactivate Account'}
          onPress={handleToggleActive}
          loading={toggling}
          variant={user.is_active ? 'danger' : 'primary'}
          style={styles.toggleBtn}
        />

        <Text style={styles.sectionTitle}>Health Records ({user.health_records.length})</Text>
        {user.health_records.length === 0 ? (
          <Text style={styles.emptyText}>No health records submitted.</Text>
        ) : (
          user.health_records.map((r) => {
            const t = r.triage;
            const display = t ? getTriageDisplay(t.triage_level, t.urgency, t.hard_rule_triggered) : null;
            return (
              <View key={r.id} style={styles.recordRow}>
                <View style={styles.recordTop}>
                  <View style={styles.recordMeta}>
                    <Text style={styles.recordDate}>
                      {formatDate(r.submitted_at)} · {formatTime(r.submitted_at)}
                    </Text>
                    <Text style={styles.recordMode}>{r.input_mode}</Text>
                  </View>
                  <Text style={[styles.recordTriage, { color: display?.colors.dark ?? Colors.text }]}>
                    {display?.label ?? 'Pending'}
                  </Text>
                </View>
                {t && (t.hard_rule_triggered || t.confidence_level === 'low' || t.llm_model_used === null) && (
                  <View style={styles.recordBadgeRow}>
                    {t.hard_rule_triggered && (
                      <View style={[styles.recordBadge, { backgroundColor: Colors.critical.bg, borderColor: Colors.critical.border }]}>
                        <Text style={[styles.recordBadgeText, { color: Colors.critical.text }]}>Hard-rule</Text>
                      </View>
                    )}
                    {t.confidence_level === 'low' && (
                      <View style={[styles.recordBadge, { backgroundColor: Colors.caution.bg, borderColor: Colors.caution.border }]}>
                        <Text style={[styles.recordBadgeText, { color: Colors.caution.text }]}>Low confidence</Text>
                      </View>
                    )}
                    {t.llm_model_used === null && (
                      <View style={[styles.recordBadge, { backgroundColor: Colors.alert.bg, borderColor: Colors.alert.border }]}>
                        <Text style={[styles.recordBadgeText, { color: Colors.alert.text }]}>LLM failed</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>LLM Failures ({user.llm_failures.length})</Text>
        {user.llm_failures.length === 0 ? (
          <Text style={styles.emptyText}>No LLM failures logged for this user.</Text>
        ) : (
          user.llm_failures.map((f) => (
            <View key={f.id} style={styles.failureRow}>
              <View style={styles.failureTop}>
                <Text style={styles.failureSource}>{SOURCE_LABEL[f.source] ?? f.source}</Text>
                <Text style={styles.recordDate}>
                  {formatDate(f.occurred_at)} · {formatTime(f.occurred_at)}
                </Text>
              </View>
              <Text style={styles.failureType}>{f.error_type}</Text>
              <Text style={styles.failureMessage} numberOfLines={2}>{f.error_message}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: Spacing.screenH, paddingTop: 16 },

  infoCard: { marginBottom: 16, gap: 0, padding: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.separatorLight },
  infoLabel: { fontFamily: Font.sans, fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.text },

  toggleBtn: { marginBottom: 24 },

  sectionTitle: {
    fontFamily: Font.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.1,
    color: Colors.textTertiary,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  emptyText: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary },

  recordRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 8,
  },
  recordTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recordMeta: {},
  recordDate: { fontFamily: Font.sansMedium, fontSize: 13, color: Colors.text },
  recordMode: { fontFamily: Font.sans, fontSize: 11, color: Colors.textTertiary, marginTop: 1, textTransform: 'capitalize' },
  recordTriage: { fontFamily: Font.sansSemiBold, fontSize: 13 },
  recordBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  recordBadge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  recordBadgeText: { fontFamily: Font.sansMedium, fontSize: 10 },

  failureRow: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 4,
  },
  failureTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  failureSource: { fontFamily: Font.sansSemiBold, fontSize: 12, color: Colors.alert.text },
  failureType: { fontFamily: Font.sansSemiBold, fontSize: 13, color: Colors.text },
  failureMessage: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },
});
