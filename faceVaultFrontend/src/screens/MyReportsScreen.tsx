import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiFetchMyReports, MyReport } from '../api/reportsApi';
import { ListSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { timeAgo } from '../utils/timeAgo';

// Shows the current user's submitted reports and any admin reply.

export default function MyReportsScreen() {
  const { token } = useAuth();
  const [reports, setReports] = useState<MyReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiFetchMyReports(token!);
      setReports(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ListSkeleton rows={5} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={reports}
      keyExtractor={item => item._id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.head}>
            <Text style={styles.category}>{item.category.toUpperCase()}</Text>
            <View style={[styles.status, item.status === 'resolved' && styles.statusDone]}>
              <Text style={[styles.statusText, item.status === 'resolved' && styles.statusTextDone]}>
                {item.status}
              </Text>
            </View>
          </View>
          <Text style={styles.message}>{item.message}</Text>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>

          {!!item.adminReply && (
            <View style={styles.reply}>
              <Text style={styles.replyLabel}>Orbi team replied</Text>
              <Text style={styles.replyText}>{item.adminReply}</Text>
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>You haven't submitted any reports yet.</Text>
        </View>
      }
    />
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
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  category: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  status: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  statusDone: { backgroundColor: '#E7F6EC' },
  statusText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  statusTextDone: { color: '#1E9E54' },
  message: { fontSize: 14, color: colors.ink, marginTop: spacing.sm, lineHeight: 20 },
  time: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm },
  reply: {
    backgroundColor: colors.offWhite,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  replyLabel: { fontSize: 12, fontWeight: '700', color: colors.ink },
  replyText: { fontSize: 14, color: colors.ink, marginTop: 4, lineHeight: 20 },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
