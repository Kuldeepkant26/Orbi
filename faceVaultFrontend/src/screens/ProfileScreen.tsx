import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiFetchProfile, Profile } from '../api/socialApi';
import { apiFetchUserPosts, Post } from '../api/postsApi';
import ProfileView from '../components/ProfileView';
import Icon from '../components/Icon';
import { ProfileSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// The Profile tab = MY OWN profile. Shows my info + post grid, an "Edit Profile"
// button, and a logout option in the top bar.

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, token, logout } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [p, ps] = await Promise.all([
        apiFetchProfile(token!, user.id),
        apiFetchUserPosts(token!, user.id),
      ]);
      setProfile(p);
      setPosts(ps);
    } catch {
      // Keep whatever we had; pull-to-refresh / re-focus can retry.
    } finally {
      setLoading(false);
    }
  }, [token, user]);

  // Refresh whenever the tab regains focus (e.g. after editing the profile or
  // creating a post).
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Top bar: my username + logout */}
      <View style={styles.topBar}>
        <Text style={styles.handle}>
          {profile?.username || user?.username || user?.name}
        </Text>
        <TouchableOpacity onPress={confirmLogout} style={styles.iconBtn}>
          <Icon name="log-out-outline" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {loading || !profile ? (
        <ProfileSkeleton />
      ) : (
        <ProfileView
          profile={profile}
          posts={posts}
          onOpenPost={p => navigation.navigate('PostDetail', { postId: p._id })}
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
