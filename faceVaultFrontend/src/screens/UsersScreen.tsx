import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { apiFetchUsers, UserItem } from '../api/usersApi';

type Props = NativeStackScreenProps<AppStackParamList, 'Users'>;

// A single coloured circle avatar showing the user's initial
function Avatar({ name, online }: { name: string; online: boolean }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <View style={styles.avatarWrapper}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
      {/* Green dot = online */}
      {online && <View style={styles.onlineDot} />}
    </View>
  );
}

export default function UsersScreen({ navigation }: Props) {
  const { token } = useAuth();
  const { socket } = useSocket();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadUsers = useCallback(async () => {
    try {
      setError('');
      const data = await apiFetchUsers(token!);
      setUsers(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Listen for online/offline events from the socket
  useEffect(() => {
    if (!socket) return;

    socket.on('online_users', (ids: string[]) => setOnlineUsers(ids));
    socket.on('user_online', (id: string) =>
      setOnlineUsers(prev => [...new Set([...prev, id])])
    );
    socket.on('user_offline', (id: string) =>
      setOnlineUsers(prev => prev.filter(uid => uid !== id))
    );

    return () => {
      socket.off('online_users');
      socket.off('user_online');
      socket.off('user_offline');
    };
  }, [socket]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadUsers}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadUsers();
            }}
            tintColor="#4F46E5"
          />
        }
        ListHeaderComponent={
          <Text style={styles.sectionLabel}>
            {users.length} {users.length === 1 ? 'person' : 'people'}
          </Text>
        }
        renderItem={({ item }) => {
          const isOnline = onlineUsers.includes(item._id);
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.75}
              onPress={() =>
                navigation.navigate('Chat', {
                  otherUser: { _id: item._id, name: item.name, email: item.email },
                })
              }>
              <Avatar name={item.name} online={isOnline} />
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.email}>{item.email}</Text>
              </View>
              <View style={styles.chatArrow}>
                <Text style={styles.chatArrowIcon}>›</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No other users yet</Text>
          </View>
        }
      />
    </View>
  );
}

// Avatar colours based on the first letter
const AVATAR_COLORS = [
  '#4F46E5', '#0EA5E9', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#14B8A6',
];
function getColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  list: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    paddingLeft: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: '#64748B',
  },
  chatArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatArrowIcon: {
    fontSize: 20,
    color: '#4F46E5',
    fontWeight: '700',
  },
  separator: {
    height: 10,
  },
  errorText: {
    fontSize: 15,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 15,
  },
});
