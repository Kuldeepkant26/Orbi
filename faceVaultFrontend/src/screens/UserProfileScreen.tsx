import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiFetchProfile, apiToggleFollow, Profile } from '../api/socialApi';
import { apiFetchUserPosts, Post } from '../api/postsApi';
import ProfileView from '../components/ProfileView';
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
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, ps] = await Promise.all([
        apiFetchProfile(token!, userId),
        apiFetchUserPosts(token!, userId),
      ]);
      setProfile(p);
      setPosts(ps);
      setFollowing(p.isFollowedByMe);
      // Show their handle in the header.
      navigation.setOptions({ title: p.username || p.name });
    } catch {
      // ignore; nothing to show
    } finally {
      setLoading(false);
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
      <View style={styles.center}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <ProfileView
      profile={profile}
      posts={posts}
      onOpenPost={p => navigation.navigate('PostDetail', { postId: p._id })}
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
  );
}

const styles = StyleSheet.create({
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
