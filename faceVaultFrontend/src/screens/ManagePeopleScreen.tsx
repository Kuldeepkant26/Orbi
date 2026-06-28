import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  apiAdminListUsers,
  apiAdminBanUser,
  apiAdminUnbanUser,
  AdminUser,
} from '../api/adminApi';
import Avatar from '../components/Avatar';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// Superadmin screen to view all users and ban/unban them. Banning opens a modal
// to choose a duration (1d / 7d / 30d / Permanent) and a reason.

// The ban duration choices. `null` = permanent.
const DURATIONS: { label: string; days: number | null }[] = [
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'Permanent', days: null },
];

export default function ManagePeopleScreen() {
  const { token } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Ban modal state.
  const [banTarget, setBanTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');
  const [durationIdx, setDurationIdx] = useState(1); // default 7 days
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiAdminListUsers(token!);
      setUsers(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openBan = (u: AdminUser) => {
    setBanTarget(u);
    setReason('');
    setDurationIdx(1);
  };

  const submitBan = async () => {
    if (!banTarget) return;
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Please enter a reason for the ban.');
      return;
    }
    setSubmitting(true);
    try {
      await apiAdminBanUser(
        token!,
        banTarget._id,
        reason.trim(),
        DURATIONS[durationIdx].days,
      );
      setBanTarget(null);
      await load();
    } catch (e: any) {
      Alert.alert('Could not ban', e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const unban = (u: AdminUser) => {
    Alert.alert('Unban user', `Lift the restriction on ${u.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unban',
        onPress: async () => {
          try {
            await apiAdminUnbanUser(token!, u._id);
            await load();
          } catch (e: any) {
            Alert.alert('Could not unban', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.avatarUrl} name={item.name} size={44} />
            <View style={styles.info}>
              <Text style={styles.name}>
                {item.username ? `@${item.username}` : item.name}
                {item.role === 'superadmin' && (
                  <Text style={styles.adminTag}>  ADMIN</Text>
                )}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {item.name} · {item.email}
              </Text>
              {item.isBanned && (
                <Text style={styles.bannedTag}>
                  Banned{item.banReason ? ` — ${item.banReason}` : ''}
                </Text>
              )}
            </View>

            {/* Action: only normal users can be banned/unbanned */}
            {item.role !== 'superadmin' &&
              (item.isBanned ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.unbanBtn]}
                  onPress={() => unban(item)}>
                  <Text style={styles.unbanText}>Unban</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.banBtn]}
                  onPress={() => openBan(item)}>
                  <Text style={styles.banText}>Ban</Text>
                </TouchableOpacity>
              ))}
          </View>
        )}
      />

      {/* Ban modal */}
      <Modal
        visible={!!banTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setBanTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Restrict {banTarget?.name}
            </Text>

            <Text style={styles.modalLabel}>Duration</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((d, i) => (
                <TouchableOpacity
                  key={d.label}
                  style={[
                    styles.durationPill,
                    durationIdx === i && styles.durationPillActive,
                  ]}
                  onPress={() => setDurationIdx(i)}>
                  <Text
                    style={[
                      styles.durationPillText,
                      durationIdx === i && styles.durationPillTextActive,
                    ]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Reason</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Why is this user being restricted?"
              placeholderTextColor={colors.textFaint}
              value={reason}
              onChangeText={setReason}
              multiline
              maxLength={200}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setBanTarget(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={submitBan}
                disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Ban</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  list: { padding: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  adminTag: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  bannedTag: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '600',
  },
  actionBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  banBtn: { backgroundColor: colors.ink },
  banText: { color: colors.white, fontWeight: '700', fontSize: 13 },
  unbanBtn: { borderWidth: 1, borderColor: colors.border },
  unbanText: { color: colors.ink, fontWeight: '700', fontSize: 13 },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.lg,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durationPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  durationPillText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  durationPillTextActive: { color: colors.white },
  reasonInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 70,
    textAlignVertical: 'top',
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.offWhite,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.lg,
  },
  modalCancel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  modalConfirm: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
