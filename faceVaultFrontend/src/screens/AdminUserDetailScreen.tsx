import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import {
  apiAdminUserDetail,
  apiAdminBanUser,
  apiAdminUnbanUser,
  apiAdminDeleteUser,
  apiAdminRestoreUser,
  AdminUserDetail,
} from '../api/adminApi';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// Superadmin screen to manage a single user: ban (with duration + reason),
// unban, soft-delete the account, or restore it. Every destructive action has a
// confirmation. Built to grow — add more controls here later.

type Props = NativeStackScreenProps<AppStackParamList, 'AdminUserDetail'>;

const DURATIONS: { label: string; days: number | null }[] = [
  { label: '1 day', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: 'Permanent', days: null },
];

export default function AdminUserDetailScreen({ route }: Props) {
  const { userId } = route.params;
  const { token } = useAuth();

  const [u, setU] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Ban modal
  const [banOpen, setBanOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [durationIdx, setDurationIdx] = useState(1);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiAdminUserDetail(token!, userId);
      setU(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [token, userId]);

  useEffect(() => {
    load();
  }, [load]);

  const submitBan = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason required', 'Please enter a reason.');
      return;
    }
    setBusy(true);
    try {
      await apiAdminBanUser(token!, userId, reason.trim(), DURATIONS[durationIdx].days);
      setBanOpen(false);
      setReason('');
      await load();
    } catch (e: any) {
      Alert.alert('Could not ban', e.message);
    } finally {
      setBusy(false);
    }
  };

  const unban = () =>
    Alert.alert('Unban user', 'Lift the restriction on this user?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unban',
        onPress: async () => {
          try {
            await apiAdminUnbanUser(token!, userId);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);

  const softDelete = () =>
    Alert.alert(
      'Delete account',
      'This deletes the account (soft delete). They cannot log in and disappear from the app. You can restore them later.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiAdminDeleteUser(token!, userId);
              await load();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ],
    );

  const restore = () =>
    Alert.alert('Restore account', 'Restore this deleted account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Restore',
        onPress: async () => {
          try {
            await apiAdminRestoreUser(token!, userId);
            await load();
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);

  if (loading || !u) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.head}>
        <Avatar uri={u.avatarUrl} name={u.name} size={72} />
        <Text style={styles.name}>{u.name}</Text>
        {!!u.username && <Text style={styles.handle}>@{u.username}</Text>}
        <Text style={styles.email}>{u.email}</Text>

        {/* Status chips */}
        <View style={styles.chips}>
          {u.isDeleted && <Chip label="Deleted" danger />}
          {u.isBanned && <Chip label="Banned" danger />}
          {!u.isDeleted && !u.isBanned && <Chip label="Active" />}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <Stat value={u.postsCount} label="Posts" />
        <Stat value={u.followersCount} label="Followers" />
        <Stat value={u.followingCount} label="Following" />
      </View>

      {!!u.bio && <Text style={styles.bio}>{u.bio}</Text>}

      {u.isBanned && !!u.banReason && (
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Ban reason</Text>
          <Text style={styles.infoText}>{u.banReason}</Text>
          <Text style={styles.infoMeta}>
            {u.banExpires
              ? `Until ${new Date(u.banExpires).toLocaleDateString()}`
              : 'Permanent'}
          </Text>
        </View>
      )}

      {/* Actions */}
      <Text style={styles.sectionLabel}>Actions</Text>

      {u.isBanned ? (
        <ActionRow icon="lock-open-outline" label="Unban user" onPress={unban} />
      ) : (
        <ActionRow icon="ban-outline" label="Ban user" onPress={() => setBanOpen(true)} />
      )}

      {u.isDeleted ? (
        <ActionRow icon="refresh-outline" label="Restore account" onPress={restore} />
      ) : (
        <ActionRow
          icon="trash-outline"
          label="Delete account"
          danger
          onPress={softDelete}
        />
      )}

      {/* Ban modal */}
      <Modal visible={banOpen} transparent animationType="fade" onRequestClose={() => setBanOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Restrict {u.name}</Text>

            <Text style={styles.modalLabel}>Duration</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((d, i) => (
                <TouchableOpacity
                  key={d.label}
                  style={[styles.durPill, durationIdx === i && styles.durPillActive]}
                  onPress={() => setDurationIdx(i)}>
                  <Text style={[styles.durText, durationIdx === i && styles.durTextActive]}>
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
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setBanOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={submitBan} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.confirmText}>Ban</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

function Chip({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <View style={[styles.chip, danger && styles.chipDanger]}>
      <Text style={[styles.chipText, danger && styles.chipTextDanger]}>{label}</Text>
    </View>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: any;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.actionRow} activeOpacity={0.7} onPress={onPress}>
      <Icon name={icon} size={22} color={danger ? colors.danger : colors.ink} />
      <Text style={[styles.actionLabel, danger && { color: colors.danger }]}>{label}</Text>
      <Icon name="chevron-forward" size={18} color={colors.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  head: { alignItems: 'center', marginBottom: spacing.lg },
  name: { fontSize: 18, fontWeight: '700', color: colors.ink, marginTop: spacing.md },
  handle: { fontSize: 14, color: colors.textMuted, marginTop: 2 },
  email: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  chips: { flexDirection: 'row', marginTop: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    marginHorizontal: 4,
  },
  chipDanger: { backgroundColor: '#FEECEC' },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
  chipTextDanger: { color: colors.danger },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.ink },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  bio: { fontSize: 14, color: colors.ink, marginTop: spacing.lg, lineHeight: 20 },
  infoBox: {
    backgroundColor: '#FEECEC',
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  infoLabel: { fontSize: 12, fontWeight: '700', color: colors.danger },
  infoText: { fontSize: 14, color: colors.ink, marginTop: 4 },
  infoMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textFaint,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actionLabel: { flex: 1, marginLeft: spacing.md, fontSize: 15, fontWeight: '600', color: colors.ink },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  modalCard: { backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.xl },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: spacing.lg },
  modalLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.sm },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  durPill: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  durPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  durText: { fontSize: 13, fontWeight: '600', color: colors.ink },
  durTextActive: { color: colors.white },
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
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginRight: spacing.sm },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  confirmBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.danger,
    borderRadius: radius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  confirmText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
