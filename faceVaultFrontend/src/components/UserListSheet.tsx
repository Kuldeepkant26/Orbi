import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from './Avatar';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// ── UserListSheet ─────────────────────────────────────────────────────────────
//
// A reusable modal bottom sheet that shows a list of people (avatar + username).
// Used for: who liked a post, a user's followers, a user's following.
//
// It's "data-source agnostic": the parent passes a `fetcher` that returns the
// people. Tapping someone calls `onOpenUser` (the parent navigates to the
// profile and usually closes the sheet).
//
// This is the same bottom-sheet pattern as CommentsSheet (tappable backdrop +
// a fixed-height sheet pinned to the bottom, with a drag handle).

export type SheetUser = {
  _id: string;
  name: string;
  username?: string;
  avatarUrl?: string;
};

type Props = {
  visible: boolean;
  title: string;
  // Returns the list of users to show. Re-run on open + pull-to-refresh.
  fetcher: (() => Promise<SheetUser[]>) | null;
  onClose: () => void;
  onOpenUser: (userId: string) => void;
};

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.7);

export default function UserListSheet({
  visible,
  title,
  fetcher,
  onClose,
  onOpenUser,
}: Props) {
  const insets = useSafeAreaInsets();
  const [people, setPeople] = useState<SheetUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!fetcher) return;
    try {
      const data = await fetcher();
      setPeople(data);
    } catch {
      // ignore — pull-to-refresh can retry
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetcher]);

  useEffect(() => {
    if (visible) {
      setLoading(true);
      load();
    }
  }, [visible, load]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : (
            <FlatList
              style={styles.flex}
              data={people}
              keyExtractor={item => item._id}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => {
                    setRefreshing(true);
                    load();
                  }}
                  tintColor={colors.ink}
                />
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  activeOpacity={0.7}
                  onPress={() => onOpenUser(item._id)}>
                  <Avatar uri={item.avatarUrl} name={item.name} size={44} />
                  <View style={styles.info}>
                    <Text style={styles.username}>
                      {item.username || item.name}
                    </Text>
                    <Text style={styles.name}>{item.name}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyText}>Nobody here yet.</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SHEET_HEIGHT,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: spacing.lg, flexGrow: 1 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  info: { marginLeft: spacing.md },
  username: { fontSize: 15, fontWeight: '600', color: colors.ink },
  name: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
