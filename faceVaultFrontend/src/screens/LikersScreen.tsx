import React, { useState, useEffect, useCallback } from 'react';
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
import { apiFetchPostLikers, Liker } from '../api/postsApi';
import Avatar from '../components/Avatar';
import { ListSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// Lists the people who liked a post (reached by tapping the like count). Tap a
// person to open their profile. Pull to refresh.

type Props = NativeStackScreenProps<AppStackParamList, 'Likers'>;

export default function LikersScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { token } = useAuth();

  const [people, setPeople] = useState<Liker[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetchPostLikers(token!, postId);
      setPeople(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, postId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ListSkeleton rows={8} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
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
          onPress={() => navigation.navigate('UserProfile', { userId: item._id })}>
          <Avatar uri={item.avatarUrl} name={item.name} size={48} />
          <View style={styles.info}>
            <Text style={styles.username}>{item.username || item.name}</Text>
            <Text style={styles.name}>{item.name}</Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No likes yet.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingHorizontal: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  info: { marginLeft: spacing.md },
  username: { fontSize: 15, fontWeight: '600', color: colors.ink },
  name: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 14, color: colors.textMuted },
});
