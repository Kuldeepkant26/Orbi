import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiFetchUsers, UserItem } from '../api/usersApi';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { ListSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// The Search tab. Lists everyone you can find and lets you filter by name or
// username. Tapping a person opens their profile.

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [query, setQuery] = useState('');
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

  // Filter the list as the user types (case-insensitive, name or username).
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      u =>
        u.name.toLowerCase().includes(q) ||
        (u.username || '').toLowerCase().includes(q)
    );
  }, [users, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search box */}
      <View style={styles.searchBar}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search people"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <ListSkeleton rows={8} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadUsers();
              }}
              tintColor={colors.ink}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('UserProfile', { userId: item._id })
              }>
              <Avatar uri={item.avatarUrl} name={item.name} size={48} />
              <View style={styles.info}>
                <Text style={styles.username}>
                  {item.username || item.name}
                </Text>
                <Text style={styles.name}>{item.name}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>
                {error || 'No people found'}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    height: 44,
    borderRadius: radius.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: 15,
    color: colors.ink,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  list: {
    paddingHorizontal: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  info: {
    marginLeft: spacing.md,
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  name: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
