import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
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

  // The images to show: prefer the imageUrls array, fall back to the single one.
  const images =
    post.imageUrls && post.imageUrls.length
      ? post.imageUrls
      : post.imageUrl
      ? [post.imageUrl]
      : [];
  const [activeImage, setActiveImage] = useState(0);

  const onCarouselScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (i !== activeImage) setActiveImage(i);
  };

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

      {/* Image carousel, or a text-only card when there's no image */}
      {images.length > 1 ? (
        <View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onCarouselScroll}
            scrollEventThrottle={16}>
            {images.map((uri, i) => (
              <Image
                key={`${uri}-${i}`}
                source={{ uri }}
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
          {/* "2/5" counter */}
          <View style={styles.counter}>
            <Text style={styles.counterText}>
              {activeImage + 1}/{images.length}
            </Text>
          </View>
          {/* dot indicators */}
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === activeImage && styles.dotActive]}
              />
            ))}
          </View>
        </View>
      ) : images.length === 1 ? (
        <Image
          source={{ uri: images[0] }}
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
      {images.length > 0 && !!post.caption && (
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
  counter: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(10,10,10,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  counterText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  dots: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  dotActive: {
    backgroundColor: colors.white,
    width: 7,
    height: 7,
    borderRadius: 3.5,
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
