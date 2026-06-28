import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Avatar from './Avatar';
import Icon from './Icon';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { timeAgo } from '../utils/timeAgo';
import { Post } from '../api/postsApi';

// ── PostCard ──────────────────────────────────────────────────────────────────
//
// One post in the feed. Instagram-inspired but with Orbi's premium black/white
// styling. Shows: author header, image (or a text-only card), action row
// (like / comment / message), like count, caption, and a "view comments" link.
//
// The parent screen owns the data and tells us what to do on each action:
//   onToggleLike  → like/unlike (we update the heart instantly = optimistic)
//   onOpenComments→ go to the comments screen
//   onOpenProfile → go to the author's profile
//   onMessage     → open a chat with the author (optional)

const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = {
  post: Post;
  onToggleLike: (post: Post, nextLiked: boolean) => void;
  onOpenComments: (post: Post) => void;
  onOpenProfile: (userId: string) => void;
  onMessage?: (post: Post) => void;
  // Tapping the like count → the list of people who liked it.
  onOpenLikers?: (post: Post) => void;
};

export default function PostCard({
  post,
  onToggleLike,
  onOpenComments,
  onOpenProfile,
  onMessage,
  onOpenLikers,
}: Props) {
  // We keep a local copy of the like state so tapping the heart feels instant
  // (optimistic update). The parent does the real network call.
  const [liked, setLiked] = useState(post.likedByMe);
  const [likesCount, setLikesCount] = useState(post.likesCount);

  const handleLike = () => {
    const next = !liked;
    setLiked(next);
    setLikesCount(c => c + (next ? 1 : -1));
    onToggleLike(post, next);
  };

  return (
    <View style={styles.card}>
      {/* Header: avatar + username + timestamp */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          activeOpacity={0.7}
          onPress={() => onOpenProfile(post.author._id)}>
          <Avatar
            uri={post.author.avatarUrl}
            name={post.author.name}
            size={36}
          />
          <View style={styles.headerText}>
            <Text style={styles.username}>
              {post.author.username || post.author.name}
            </Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.time}>{timeAgo(post.createdAt)}</Text>
      </View>

      {/* Image, or a text-only card when there's no image */}
      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.textPost}>
          <Text style={styles.textPostText}>{post.caption}</Text>
        </View>
      )}

      {/* Action row */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={handleLike} style={styles.actionBtn}>
          <Icon
            name={liked ? 'heart' : 'heart-outline'}
            size={26}
            color={liked ? colors.accentLike : colors.ink}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onOpenComments(post)}
          style={styles.actionBtn}>
          <Icon name="chatbubble-outline" size={24} color={colors.ink} />
        </TouchableOpacity>
        {onMessage && (
          <TouchableOpacity
            onPress={() => onMessage(post)}
            style={styles.actionBtn}>
            <Icon name="paper-plane-outline" size={24} color={colors.ink} />
          </TouchableOpacity>
        )}
      </View>

      {/* Like count — tap to see who liked it */}
      {likesCount > 0 && (
        <TouchableOpacity
          activeOpacity={0.6}
          disabled={!onOpenLikers}
          onPress={() => onOpenLikers?.(post)}>
          <Text style={styles.likes}>
            {likesCount} {likesCount === 1 ? 'like' : 'likes'}
          </Text>
        </TouchableOpacity>
      )}

      {/* Caption (only shown here if the post has an image; text-only posts
          already show their text in the card above). */}
      {!!post.imageUrl && !!post.caption && (
        <Text style={styles.caption}>
          <Text style={styles.username}>
            {post.author.username || post.author.name}{' '}
          </Text>
          {post.caption}
        </Text>
      )}

      {/* View comments link */}
      {post.commentsCount > 0 && (
        <TouchableOpacity onPress={() => onOpenComments(post)}>
          <Text style={styles.viewComments}>
            View {post.commentsCount === 1 ? 'comment' : `all ${post.commentsCount} comments`}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: spacing.md,
  },
  username: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  time: {
    fontSize: 12,
    color: colors.textMuted,
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH, // square, like Instagram
    backgroundColor: colors.surfaceAlt,
  },
  textPost: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.offWhite,
    borderRadius: 16,
    padding: spacing.xl,
    minHeight: 120,
    justifyContent: 'center',
  },
  textPostText: {
    fontSize: 18,
    lineHeight: 26,
    color: colors.ink,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  actionBtn: {
    marginRight: spacing.lg,
  },
  likes: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  viewComments: {
    fontSize: 14,
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
});
