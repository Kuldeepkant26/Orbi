import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  apiFetchNotifications,
  apiMarkNotificationsRead,
  apiToggleFollow,
  AppNotification,
} from '../api/socialApi';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import OrbiHeader from '../components/OrbiHeader';
import { ListSkeleton } from '../components/skeletons';
import { useBadges } from '../context/BadgeContext';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { timeAgo } from '../utils/timeAgo';

// The Notifications tab. Shows who followed you, liked your posts, or commented.
// Loads from the backend and also listens for live "new_notification" events
// over the socket so new ones pop in without a refresh. Unread items stay
// visually marked while the screen is open and are only marked read once the
// user navigates away, so the unread state is actually visible.

type Nav = NativeStackNavigationProp<AppStackParamList>;

// The text shown for each notification type.
function messageFor(n: AppNotification): string {
  switch (n.type) {
    case 'follow':
      return 'started following you';
    case 'like':
      return 'liked your post';
    case 'comment':
      return 'commented on your post';
    default:
      return '';
  }
}

// Per-type icon badge so rows are scannable at a glance, Instagram-style.
function iconFor(type: AppNotification['type']): { name: any; color: string } {
  switch (type) {
    case 'like':
      return { name: 'heart', color: colors.accentLike };
    case 'comment':
      return { name: 'chatbubble', color: colors.ink };
    case 'follow':
      return { name: 'person-add', color: colors.ink };
    default:
      return { name: 'notifications', color: colors.ink };
  }
}

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const { socket } = useSocket();
  const { clearNotifCount } = useBadges();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Actor ids we've optimistically followed back, so the button flips
  // immediately without waiting on the next fetch.
  const [followedBack, setFollowedBack] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const data = await apiFetchNotifications(token!);
      setItems(data);
      clearNotifCount();
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, clearNotifCount]);

  // Reload when the tab regains focus; mark everything read when leaving so
  // the unread indicator is visible for the duration of the visit.
  useEffect(() => {
    const unsubFocus = navigation.addListener('focus', load);
    const unsubBlur = navigation.addListener('blur', () => {
      apiMarkNotificationsRead(token!).catch(() => {});
    });
    return () => {
      unsubFocus();
      unsubBlur();
    };
  }, [navigation, load, token]);

  // Live updates: when the server pushes a new notification, prepend it.
  useEffect(() => {
    if (!socket) return;
    const handler = (n: AppNotification) => {
      setItems(prev => [n, ...prev]);
    };
    socket.on('new_notification', handler);
    return () => {
      socket.off('new_notification', handler);
    };
  }, [socket]);

  // Tapping a notification: follow → open the actor's profile; like/comment →
  // open the related post.
  const handlePress = (n: AppNotification) => {
    if (n.type === 'follow') {
      navigation.navigate('UserProfile', { userId: n.actor._id });
    } else if (n.post) {
      navigation.navigate('PostDetail', { postId: n.post._id });
    }
  };

  const handleFollowBack = async (actorId: string) => {
    setFollowedBack(prev => new Set(prev).add(actorId));
    try {
      await apiToggleFollow(token!, actorId, true);
    } catch {
      setFollowedBack(prev => {
        const next = new Set(prev);
        next.delete(actorId);
        return next;
      });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OrbiHeader title="Notifications" />

      {loading ? (
        <ListSkeleton rows={7} />
      ) : (
        <FlatList
          data={items}
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
          renderItem={({ item }) => {
            const icon = iconFor(item.type);
            const isFollowing = followedBack.has(item.actor._id) || item.isFollowingActor;
            return (
              <TouchableOpacity
                style={[styles.row, !item.isRead && styles.rowUnread]}
                activeOpacity={0.7}
                onPress={() => handlePress(item)}>
                {!item.isRead && <View style={styles.unreadDot} />}

                <View style={styles.avatarWrap}>
                  <Avatar
                    uri={item.actor.avatarUrl}
                    name={item.actor.name}
                    size={44}
                  />
                  <View style={[styles.badge, { backgroundColor: icon.color }]}>
                    <Icon name={icon.name} size={11} color={colors.white} />
                  </View>
                </View>

                <Text style={styles.text}>
                  <Text style={styles.actor}>
                    {item.actor.username || item.actor.name}{' '}
                  </Text>
                  {messageFor(item)}
                  <Text style={styles.time}>  {timeAgo(item.createdAt)}</Text>
                </Text>

                {item.type === 'follow' ? (
                  <TouchableOpacity
                    style={[styles.followBtn, isFollowing && styles.followingBtn]}
                    activeOpacity={0.8}
                    onPress={() => handleFollowBack(item.actor._id)}
                    disabled={isFollowing}>
                    <Text
                      style={[
                        styles.followText,
                        isFollowing && styles.followingText,
                      ]}>
                      {isFollowing ? 'Following' : 'Follow back'}
                    </Text>
                  </TouchableOpacity>
                ) : item.post?.imageUrl ? (
                  <Image
                    source={{ uri: item.post.imageUrl }}
                    style={styles.thumb}
                  />
                ) : null}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No notifications yet</Text>
              <Text style={styles.emptyText}>
                When people follow you or interact with your posts, you'll see it here.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
  },
  rowUnread: {
    backgroundColor: colors.offWhite,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.accentLike,
    marginRight: spacing.sm,
  },
  avatarWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  text: {
    flex: 1,
    marginLeft: spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  actor: {
    fontWeight: '600',
  },
  time: {
    color: colors.textMuted,
    fontSize: 12,
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    marginLeft: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  followBtn: {
    height: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  followingBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.white,
  },
  followingText: {
    color: colors.ink,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
