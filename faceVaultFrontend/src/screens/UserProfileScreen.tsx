import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import {
  apiFetchProfile,
  apiToggleFollow,
  apiFetchConnections,
  Profile,
} from '../api/socialApi';
import { apiFetchUserPosts, Post } from '../api/postsApi';
import { apiFetchUserHighlights, Highlight } from '../api/highlightsApi';
import ProfileView from '../components/ProfileView';
import HighlightsRow from '../components/HighlightsRow';
import UserListSheet, { SheetUser } from '../components/UserListSheet';
import { ProfileSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// Another user's profile. Shows their info + post grid with Follow/Unfollow and
// Message buttons. (If it's somehow my own id, we just show Edit Profile-less
// view — normally you reach your own profile via the Profile tab.)

type Props = NativeStackScreenProps<AppStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const { token } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listSheet, setListSheet] = useState<{
    title: string;
    kind: 'followers' | 'following';
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, ps, hs] = await Promise.all([
        apiFetchProfile(token!, userId),
        apiFetchUserPosts(token!, userId),
        apiFetchUserHighlights(token!, userId),
      ]);
      setProfile(p);
      setPosts(ps);
      setHighlights(hs);
      setFollowing(p.isFollowedByMe);
      // Show their handle in the header.
      navigation.setOptions({ title: p.username || p.name });
    } catch {
      // ignore; nothing to show
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, userId, navigation]);

  useEffect(() => {
    load();
  }, [load]);

  // Follow / unfollow with an instant (optimistic) button + count update.
  const handleFollow = async () => {
    if (busy || !profile) return;
    const next = !following;
    setFollowing(next);
    setProfile(prev =>
      prev
        ? { ...prev, followersCount: prev.followersCount + (next ? 1 : -1) }
        : prev
    );
    setBusy(true);
    try {
      await apiToggleFollow(token!, userId, next);
    } catch {
      // Revert on failure.
      setFollowing(!next);
      setProfile(prev =>
        prev
          ? { ...prev, followersCount: prev.followersCount + (next ? -1 : 1) }
          : prev
      );
    } finally {
      setBusy(false);
    }
  };

  const openChat = () => {
    if (!profile) return;
    navigation.navigate('Chat', {
      otherUser: { _id: profile._id, name: profile.name, email: profile.email },
    });
  };

  if (loading || !profile) {
    return (
      <View style={styles.container}>
        <ProfileSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          userId: profile._id,
          userName: profile.name,
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
          isMe={false}
          onOpen={h =>
            navigation.navigate('HighlightViewer', {
              highlightId: h._id,
              ownerId: profile._id,
            })
          }
        />
      }
      actions={
        <>
          <TouchableOpacity
            style={[styles.followBtn, following && styles.followingBtn]}
            activeOpacity={0.8}
            onPress={handleFollow}>
            <Text style={[styles.followText, following && styles.followingText]}>
              {following ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.messageBtn}
            activeOpacity={0.8}
            onPress={openChat}>
            <Text style={styles.messageText}>Message</Text>
          </TouchableOpacity>
        </>
      }
    />

      {/* Followers / Following bottom sheet */}
      <UserListSheet
        visible={!!listSheet}
        title={listSheet?.title || ''}
        fetcher={
          listSheet
            ? () =>
                apiFetchConnections(token!, profile._id, listSheet.kind) as Promise<
                  SheetUser[]
                >
            : null
        }
        onClose={() => setListSheet(null)}
        onOpenUser={userId => {
          setListSheet(null);
          navigation.push('UserProfile', { userId });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  followBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  followingBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  followText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  followingText: {
    color: colors.ink,
  },
  messageBtn: {
    flex: 1,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
});
