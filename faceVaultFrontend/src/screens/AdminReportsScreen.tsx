import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  apiAdminListReports,
  apiAdminReplyReport,
  AdminReport,
} from '../api/adminApi';
import Avatar from '../components/Avatar';
import { ListSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { timeAgo } from '../utils/timeAgo';

// Superadmin screen: view all user reports and reply to them.

export default function AdminReportsScreen() {
  const { token } = useAuth();
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Reply modal
  const [target, setTarget] = useState<AdminReport | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiAdminListReports(token!);
      setReports(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const openReply = (r: AdminReport) => {
    setTarget(r);
    setReply(r.adminReply || '');
  };

  const submitReply = async () => {
    if (!target) return;
    if (!reply.trim()) {
      Alert.alert('Empty', 'Please write a reply.');
      return;
    }
    setBusy(true);
    try {
      await apiAdminReplyReport(token!, target._id, reply.trim());
      setTarget(null);
      await load();
    } catch (e: any) {
      Alert.alert('Could not reply', e.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ListSkeleton rows={6} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={reports}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.head}>
              <Avatar
                uri={item.reporter?.avatarUrl}
                name={item.reporter?.name || '?'}
                size={36}
              />
              <View style={styles.headText}>
                <Text style={styles.reporter}>
                  {item.reporter?.username
                    ? `@${item.reporter.username}`
                    : item.reporter?.name || 'Unknown'}
                </Text>
                <Text style={styles.meta}>
                  {item.category} · {timeAgo(item.createdAt)}
                </Text>
              </View>
              <View style={[styles.status, item.status === 'resolved' && styles.statusDone]}>
                <Text style={[styles.statusText, item.status === 'resolved' && styles.statusTextDone]}>
                  {item.status}
                </Text>
              </View>
            </View>

            <Text style={styles.message}>{item.message}</Text>

            {!!item.adminReply && (
              <View style={styles.replyBox}>
                <Text style={styles.replyLabel}>Your reply</Text>
                <Text style={styles.replyText}>{item.adminReply}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.replyBtn} onPress={() => openReply(item)}>
              <Text style={styles.replyBtnText}>
                {item.adminReply ? 'Edit reply' : 'Reply'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No reports yet.</Text>
          </View>
        }
      />

      {/* Reply modal */}
      <Modal visible={!!target} transparent animationType="fade" onRequestClose={() => setTarget(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reply to report</Text>
            <Text style={styles.modalMessage}>{target?.message}</Text>
            <TextInput
              style={styles.replyInput}
              placeholder="Write your reply…"
              placeholderTextColor={colors.textFaint}
              value={reply}
              onChangeText={setReply}
              multiline
              maxLength={1000}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTarget(null)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={submitReply} disabled={busy}>
                {busy ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Text style={styles.sendText}>Send</Text>
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
  list: { padding: spacing.lg },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center' },
  headText: { flex: 1, marginLeft: spacing.md },
  reporter: { fontSize: 14, fontWeight: '600', color: colors.ink },
  meta: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  status: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusDone: { backgroundColor: '#E7F6EC' },
  statusText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  statusTextDone: { color: '#1E9E54' },
  message: { fontSize: 14, color: colors.ink, marginTop: spacing.md, lineHeight: 20 },
  replyBox: {
    backgroundColor: colors.offWhite,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  replyLabel: { fontSize: 12, fontWeight: '700', color: colors.ink },
  replyText: { fontSize: 14, color: colors.ink, marginTop: 4, lineHeight: 20 },
  replyBtn: { alignSelf: 'flex-start', marginTop: spacing.md },
  replyBtnText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 14, color: colors.textMuted },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: spacing.xl },
  modalCard: { backgroundColor: colors.background, borderRadius: radius.lg, padding: spacing.xl },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.ink },
  modalMessage: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 20 },
  replyInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 90,
    textAlignVertical: 'top',
    fontSize: 14,
    color: colors.ink,
    backgroundColor: colors.offWhite,
    marginTop: spacing.md,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.lg },
  cancelBtn: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginRight: spacing.sm },
  cancelText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  sendBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: radius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  sendText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
