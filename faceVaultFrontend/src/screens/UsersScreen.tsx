import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiFetchConversations, Conversation } from '../api/usersApi';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { ListSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';
import { timeAgo } from '../utils/timeAgo';

// The DM list reached from the message icon. Shows recent CONVERSATIONS (people
// you've chatted with), newest first, with the last message, a relative time,
// an unread badge, and an online dot. Refreshes on focus and updates live when
// a new message arrives over the socket.

type Props = NativeStackScreenProps<AppStackParamList, 'Users'>;

export default function UsersScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { socket } = useSocket();

  const [convos, setConvos] = useState<Conversation[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetchConversations(token!);
      setConvos(data);
    } catch {
      // ignore — pull to refresh can retry
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Reload whenever this screen regains focus (e.g. after a chat).
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  // Online presence + live refresh when a new message arrives.
  useEffect(() => {
    if (!socket) return;
    const onOnline = (ids: string[]) => setOnlineUsers(ids);
    const onUp = (id: string) => setOnlineUsers(p => [...new Set([...p, id])]);
    const onDown = (id: string) => setOnlineUsers(p => p.filter(x => x !== id));
    const onMessage = () => load(); // re-pull so order + last message update

    socket.on('online_users', onOnline);
    socket.on('user_online', onUp);
    socket.on('user_offline', onDown);
    socket.on('receive_message', onMessage);
    return () => {
      socket.off('online_users', onOnline);
      socket.off('user_online', onUp);
      socket.off('user_offline', onDown);
      socket.off('receive_message', onMessage);
    };
  }, [socket, load]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ListSkeleton rows={8} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={convos}
        keyExtractor={item => item.user._id}
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
          const isOnline = onlineUsers.includes(item.user._id);
          const unread = item.unreadCount > 0;
          const preview =
            (item.lastMessage.fromMe ? 'You: ' : '') + item.lastMessage.text;
          return (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('Chat', {
                  otherUser: {
                    _id: item.user._id,
                    name: item.user.name,
                    email: item.user.email,
                  },
                })
              }>
              <View>
                <Avatar
                  uri={item.user.avatarUrl}
                  name={item.user.name}
                  size={54}
                />
                {isOnline && <View style={styles.onlineDot} />}
              </View>

              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.user.username
                    ? `@${item.user.username}`
                    : item.user.name}
                </Text>
                <Text
                  style={[styles.preview, unread && styles.previewUnread]}
                  numberOfLines={1}>
                  {preview}
                </Text>
              </View>

              <View style={styles.meta}>
                <Text style={styles.time}>
                  {timeAgo(item.lastMessage.createdAt)}
                </Text>
                {unread && (
                  <View style={styles.countWrap}>
                    <View style={styles.count}>
                      <Text style={styles.countText}>
                        {item.unreadCount > 9 ? '9+' : item.unreadCount}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Icon name="chatbubbles-outline" size={40} color={colors.textFaint} />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptyText}>
              Find people to start a conversation.
            </Text>
            <TouchableOpacity
              style={styles.findBtn}
              onPress={() => navigation.navigate('MainTabs')}>
              <Text style={styles.findText}>Find people</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2.5,
    borderColor: colors.background,
  },
  info: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  preview: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
  },
  previewUnread: {
    color: colors.ink,
    fontWeight: '600',
  },
  meta: {
    alignItems: 'flex-end',
    marginLeft: spacing.sm,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
  countWrap: {
    marginTop: 6,
  },
  count: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 54 + spacing.md,
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
    marginTop: spacing.md,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  findBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
  },
  findText: {
    color: colors.white,
    fontWeight: '700',
  },
});
