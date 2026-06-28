import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiAdminListUsers, AdminUser } from '../api/adminApi';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { ListSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// Superadmin screen: a searchable list of all users. Tapping a user opens the
// detailed management screen (ban / delete / restore).

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function ManagePeopleScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await apiAdminListUsers(token!);
      setUsers(data);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Reload on focus so status changes (after managing a user) reflect here.
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? users.filter(
        u =>
          u.name.toLowerCase().includes(q) ||
          (u.username || '').toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
    : users;

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Icon name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users"
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ListSkeleton rows={8} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('AdminUserDetail', { userId: item._id })
              }>
              <Avatar uri={item.avatarUrl} name={item.name} size={44} />
              <View style={styles.info}>
                <Text style={styles.name}>
                  {item.username ? `@${item.username}` : item.name}
                  {item.role === 'superadmin' && (
                    <Text style={styles.adminTag}>  ADMIN</Text>
                  )}
                </Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {item.name} · {item.email}
                </Text>
                <View style={styles.tags}>
                  {item.isDeleted && <Tag label="Deleted" />}
                  {item.isBanned && <Tag label="Banned" />}
                </View>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  searchInput: { flex: 1, marginLeft: spacing.sm, fontSize: 15, color: colors.ink },
  list: { paddingHorizontal: spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  info: { flex: 1, marginLeft: spacing.md },
  name: { fontSize: 15, fontWeight: '600', color: colors.ink },
  adminTag: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
  sub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  tags: { flexDirection: 'row', marginTop: 4 },
  tag: {
    backgroundColor: '#FEECEC',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: 6,
  },
  tagText: { fontSize: 11, fontWeight: '700', color: colors.danger },
});
