import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
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
  AppNotification,
} from '../api/socialApi';
import Avatar from '../components/Avatar';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { timeAgo } from '../utils/timeAgo';

// The Notifications tab. Shows who followed you, liked your posts, or commented.
// Loads from the backend and also listens for live "new_notification" events
// over the socket so new ones pop in without a refresh.

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

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();
  const { socket } = useSocket();

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetchNotifications(token!);
      setItems(data);
      // Mark them all read once we've shown them.
      apiMarkNotificationsRead(token!).catch(() => {});
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Reload when the tab regains focus.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

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
      navigation.navigate('PostDetail', { postId: n.post });
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
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
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => handlePress(item)}>
              <Avatar
                uri={item.actor.avatarUrl}
                name={item.actor.name}
                size={44}
              />
              <Text style={styles.text}>
                <Text style={styles.actor}>
                  {item.actor.username || item.actor.name}{' '}
                </Text>
                {messageFor(item)}
                <Text style={styles.time}>  {timeAgo(item.createdAt)}</Text>
              </Text>
            </TouchableOpacity>
          )}
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
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
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
