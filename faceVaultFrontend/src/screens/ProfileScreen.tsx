import React, { useState, useCallback, useEffect } from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiFetchProfile, apiFetchConnections, Profile } from '../api/socialApi';
import { apiFetchUserPosts, Post } from '../api/postsApi';
import { apiFetchUserHighlights, Highlight } from '../api/highlightsApi';
import ProfileView from '../components/ProfileView';
import HighlightsRow from '../components/HighlightsRow';
import OrbiHeader from '../components/OrbiHeader';
import UserListSheet, { SheetUser } from '../components/UserListSheet';
import { ProfileSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// The Profile tab = MY OWN profile. Shows my info + post grid, an "Edit Profile"
// button, and a logout option in the top bar.

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, token } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Followers/Following bottom sheet.
  const [listSheet, setListSheet] = useState<{
    title: string;
    kind: 'followers' | 'following';
  } | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [p, ps, hs] = await Promise.all([
        apiFetchProfile(token!, user.id),
        apiFetchUserPosts(token!, user.id),
        apiFetchUserHighlights(token!, user.id),
      ]);
      setProfile(p);
      setPosts(ps);
      setHighlights(hs);
    } catch {
      // Keep whatever we had; pull-to-refresh / re-focus can retry.
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, user]);

  // Refresh whenever the tab regains focus (e.g. after editing the profile or
  // creating a post).
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OrbiHeader />

      {loading || !profile ? (
        <ProfileSkeleton />
      ) : (
        <ProfileView
          profile={profile}
          posts={posts}
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          onOpenPost={p => navigation.navigate('PostDetail', { postId: p._id })}
          onOpenAvatar={() =>
            navigation.navigate('StoryViewer', {
              userId: user!.id,
              userName: user!.name,
            })
          }
          onOpenFollowers={() =>
            setListSheet({ title: 'Followers', kind: 'followers' })
          }
          onOpenFollowing={() =>
            setListSheet({ title: 'Following', kind: 'following' })
          }
          highlights={
            <HighlightsRow
              highlights={highlights}
              isMe
              onOpen={h =>
                navigation.navigate('HighlightViewer', {
                  highlightId: h._id,
                  ownerId: user!.id,
                })
              }
              onCreate={() => navigation.navigate('CreateHighlight')}
            />
          }
          actions={
            <TouchableOpacity
              style={styles.editBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('EditProfile')}>
              <Text style={styles.editText}>Edit Profile</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Followers / Following bottom sheet */}
      <UserListSheet
        visible={!!listSheet}
        title={listSheet?.title || ''}
        fetcher={
          listSheet && user
            ? () =>
                apiFetchConnections(token!, user.id, listSheet.kind) as Promise<
                  SheetUser[]
                >
            : null
        }
        onClose={() => setListSheet(null)}
        onOpenUser={userId => {
          setListSheet(null);
          navigation.navigate('UserProfile', { userId });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  handle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  iconBtn: {
    padding: spacing.xs,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
});
