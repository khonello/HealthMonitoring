import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Header } from '@/components/common/Header';
import { adminService } from '@/services/adminService';
import { AdminUserSummary } from '@/types/admin';
import { Colors } from '@/constants/colors';
import { Font } from '@/constants/typography';
import { Radius } from '@/constants/radius';
import { Spacing } from '@/constants/spacing';
import { Shadows } from '@/constants/shadows';

export default function AdminUsersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminUserSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const data = await adminService.getUsers(q || undefined);
      setUsers(data.results);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(search); }, []));

  return (
    <LinearGradient colors={['#F0F4FF', '#FFFFFF']} style={styles.gradient}>
      <Header title="Users" showBack />

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.textTertiary} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load(search)}
          placeholder="Search by email or name"
          placeholderTextColor={Colors.placeholder}
          style={styles.searchInput}
          returnKeyType="search"
          autoCapitalize="none"
        />
      </View>

      {loading && users.length === 0 ? (
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 40 }]}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={() => load(search)} tintColor={Colors.primary} />}
        >
          {users.length === 0 ? (
            <Text style={styles.emptyText}>No users found.</Text>
          ) : (
            users.map((u) => (
              <Pressable
                key={u.id}
                onPress={() => router.push(`/admin/users/${u.id}`)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.rowText}>
                  <Text style={styles.rowName}>{u.full_name}</Text>
                  <Text style={styles.rowEmail}>{u.email}</Text>
                </View>
                <View style={styles.rowBadges}>
                  {u.has_recent_critical && (
                    <View style={[styles.badge, styles.criticalBadge]}>
                      <Ionicons name="warning" size={10} color={Colors.critical.text} />
                      <Text style={styles.criticalBadgeText}>Needs attention</Text>
                    </View>
                  )}
                  {u.is_staff && (
                    <View style={[styles.badge, styles.staffBadge]}>
                      <Text style={styles.staffBadgeText}>Staff</Text>
                    </View>
                  )}
                  {!u.is_active && (
                    <View style={[styles.badge, styles.inactiveBadge]}>
                      <Text style={styles.inactiveBadgeText}>Inactive</Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.screenH,
    marginTop: 12,
    marginBottom: 8,
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontFamily: Font.sans, fontSize: 14, color: Colors.text },

  loadingCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.screenH, paddingTop: 8 },
  emptyText: { fontFamily: Font.sans, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginTop: 40 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    ...Shadows.card,
  },
  rowText: { flex: 1 },
  rowName: { fontFamily: Font.sansSemiBold, fontSize: 14, color: Colors.text },
  rowEmail: { fontFamily: Font.sans, fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  rowBadges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, maxWidth: 110 },
  badge: { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  criticalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.critical.bg,
    borderColor: Colors.critical.border,
  },
  criticalBadgeText: { fontFamily: Font.sansMedium, fontSize: 10, color: Colors.critical.text },
  staffBadge: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryMuted },
  staffBadgeText: { fontFamily: Font.sansMedium, fontSize: 10, color: Colors.primary },
  inactiveBadge: { backgroundColor: Colors.dangerLight, borderColor: Colors.dangerBorder },
  inactiveBadgeText: { fontFamily: Font.sansMedium, fontSize: 10, color: Colors.danger },
});
