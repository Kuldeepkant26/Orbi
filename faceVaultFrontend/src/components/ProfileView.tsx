import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  RefreshControl,
} from 'react-native';
import Avatar from './Avatar';
import Icon from './Icon';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { Profile } from '../api/socialApi';
import { Post } from '../api/postsApi';

// ── ProfileView ───────────────────────────────────────────────────────────────
//
// The shared profile UI used by BOTH your own profile and other users'
// profiles. It renders the header (avatar, name, bio, counts), an action area
// (the parent decides what buttons go there), and a 3-column grid of the user's
// posts.
//
// The post grid is the FlatList itself; the header (profile info + buttons) is
// passed as ListHeaderComponent so everything scrolls together.

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GAP = 2;
const TILE_SIZE = (SCREEN_WIDTH - GRID_GAP * 2) / 3; // 3 columns

type Props = {
  profile: Profile;
  posts: Post[];
  // The buttons row (Follow/Message or Edit Profile) — built by the parent.
  actions: React.ReactNode;
  onOpenPost: (post: Post) => void;
  // Optional: tapping the follower/following counts.
  onOpenFollowers?: () => void;
  onOpenFollowing?: () => void;
  // Optional: a node rendered below the buttons (the highlights row).
  highlights?: React.ReactNode;
  // Optional: tapping the avatar (e.g. to view this user's story).
  onOpenAvatar?: () => void;
  // Pull-to-refresh.
  refreshing?: boolean;
  onRefresh?: () => void;
};

export default function ProfileView({
  profile,
  posts,
  actions,
  onOpenPost,
  onOpenFollowers,
  onOpenFollowing,
  highlights,
  onOpenAvatar,
  refreshing,
  onRefresh,
}: Props) {
  return (
    <FlatList
      data={posts}
      keyExtractor={item => item._id}
      numColumns={3}
      columnWrapperStyle={styles.gridRow}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.ink}
          />
        ) : undefined
      }
      ListHeaderComponent={
        <View style={styles.header}>
          {/* Avatar + counts */}
          <View style={styles.topRow}>
            <TouchableOpacity activeOpacity={0.8} onPress={onOpenAvatar} disabled={!onOpenAvatar}>
              <Avatar uri={profile.avatarUrl} name={profile.name} size={84} />
            </TouchableOpacity>
            <View style={styles.counts}>
              <Stat label="Posts" value={profile.postsCount} />
              <Stat label="Followers" value={profile.followersCount} onPress={onOpenFollowers} />
              <Stat label="Following" value={profile.followingCount} onPress={onOpenFollowing} />
            </View>
          </View>

          {/* Name + username + bio */}
          <Text style={styles.name}>{profile.name}</Text>
          {!!profile.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Action buttons (parent-provided) */}
          <View style={styles.actions}>{actions}</View>

          {/* Highlights row (parent-provided) */}
          {highlights}
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => onOpenPost(item)}
          style={styles.tile}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.tileImage} />
          ) : (
            // Text-only post tile: show a snippet on a soft background.
            <View style={styles.textTile}>
              <Text numberOfLines={4} style={styles.textTileText}>
                {item.caption}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      )}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Icon name="camera-outline" size={36} color={colors.textFaint} />
          <Text style={styles.emptyText}>No posts yet</Text>
        </View>
      }
    />
  );
}

// A single stat (number on top, label under). Tappable if onPress is given.
function Stat({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={styles.stat} onPress={onPress} disabled={!onPress} activeOpacity={0.6}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counts: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: spacing.lg,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
    marginTop: spacing.lg,
  },
  username: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
  },
  tileImage: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceAlt,
  },
  textTile: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.offWhite,
    padding: spacing.sm,
    justifyContent: 'center',
  },
  textTileText: {
    fontSize: 12,
    color: colors.ink,
    lineHeight: 16,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textMuted,
  },
});
