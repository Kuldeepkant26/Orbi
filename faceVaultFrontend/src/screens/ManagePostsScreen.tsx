import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import {
  apiAdminListPosts,
  apiAdminSetPostHidden,
  apiAdminDeletePost,
  AdminPost,
} from '../api/adminApi';
import Avatar from '../components/Avatar';
import { ManagePostsSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { timeAgo } from '../utils/timeAgo';

// Superadmin screen to moderate posts: hide/show or permanently delete any post.

export default function ManagePostsScreen() {
  const { token } = useAuth();

  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiAdminListPosts(token!);
      setPosts(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleHidden = async (post: AdminPost) => {
    try {
      await apiAdminSetPostHidden(token!, post._id, !post.isHidden);
      // Update locally so the button flips instantly.
      setPosts(prev =>
        prev.map(p =>
          p._id === post._id ? { ...p, isHidden: !post.isHidden } : p,
        ),
      );
    } catch (e: any) {
      Alert.alert('Could not update', e.message);
    }
  };

  const remove = (post: AdminPost) => {
    Alert.alert('Delete post', 'This permanently deletes the post.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiAdminDeletePost(token!, post._id);
            setPosts(prev => prev.filter(p => p._id !== post._id));
          } catch (e: any) {
            Alert.alert('Could not delete', e.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ManagePostsSkeleton />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={posts}
      keyExtractor={item => item._id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card}>
          {/* Author + time */}
          <View style={styles.head}>
            <Avatar
              uri={item.author?.avatarUrl}
              name={item.author?.name || '?'}
              size={36}
            />
            <View style={styles.headText}>
              <Text style={styles.author}>
                {item.author?.username
                  ? `@${item.author.username}`
                  : item.author?.name}
              </Text>
              <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
            </View>
            {item.isHidden && <Text style={styles.hiddenTag}>HIDDEN</Text>}
          </View>

          {/* Image / text */}
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.image} />
          ) : null}
          {!!item.caption && (
            <Text style={styles.caption} numberOfLines={3}>
              {item.caption}
            </Text>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => toggleHidden(item)}>
              <Text style={styles.actionText}>
                {item.isHidden ? 'Show' : 'Hide'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => remove(item)}>
              <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.empty}>No posts</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    backgroundColor: colors.background,
  },
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
  author: { fontSize: 14, fontWeight: '600', color: colors.ink },
  time: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  hiddenTag: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.danger,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: radius.sm,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
  },
  caption: {
    fontSize: 14,
    color: colors.ink,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.md,
  },
  actionBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginLeft: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.ink },
  deleteText: { color: colors.danger },
  empty: { fontSize: 14, color: colors.textMuted },
});
