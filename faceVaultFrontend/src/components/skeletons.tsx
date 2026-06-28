import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Skeleton, { SkeletonCircle } from './Skeleton';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// ── Ready-made skeleton layouts ───────────────────────────────────────────────
//
// Each screen shows one of these placeholders while its data loads. The shapes
// roughly match the real content so the transition feels smooth.

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Feed (HomeScreen) ─────────────────────────────────────────────────────────
// A few post-card placeholders: header (avatar + name), image, action row.
function PostCardSkeleton() {
  return (
    <View style={styles.postCard}>
      <View style={styles.postHeader}>
        <SkeletonCircle size={36} />
        <Skeleton width={120} height={12} style={{ marginLeft: spacing.md }} />
      </View>
      <Skeleton width={SCREEN_WIDTH} height={SCREEN_WIDTH} radius={0} />
      <View style={styles.postActions}>
        <Skeleton width={26} height={26} radius={13} />
        <Skeleton width={26} height={26} radius={13} style={{ marginLeft: spacing.lg }} />
      </View>
      <Skeleton width={160} height={12} style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm }} />
      <Skeleton width={220} height={12} style={{ marginHorizontal: spacing.lg, marginTop: spacing.sm }} />
    </View>
  );
}

export function FeedSkeleton() {
  return (
    <View>
      {[0, 1].map(i => (
        <PostCardSkeleton key={i} />
      ))}
    </View>
  );
}

// ── A simple row: avatar + two lines (Search, Users, Notifications, Manage) ────
function RowSkeleton() {
  return (
    <View style={styles.row}>
      <SkeletonCircle size={46} />
      <View style={styles.rowText}>
        <Skeleton width={140} height={12} />
        <Skeleton width={90} height={10} style={{ marginTop: spacing.sm }} />
      </View>
    </View>
  );
}

export function ListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <View style={styles.listPad}>
      {Array.from({ length: rows }).map((_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  );
}

// ── Profile (own + others): header block + 3-col grid ─────────────────────────
const TILE = (SCREEN_WIDTH - 4) / 3;

export function ProfileSkeleton() {
  return (
    <View>
      <View style={styles.profileHeader}>
        <View style={styles.profileTop}>
          <SkeletonCircle size={84} />
          <View style={styles.profileCounts}>
            {[0, 1, 2].map(i => (
              <View key={i} style={styles.profileStat}>
                <Skeleton width={28} height={16} />
                <Skeleton width={44} height={10} style={{ marginTop: spacing.sm }} />
              </View>
            ))}
          </View>
        </View>
        <Skeleton width={140} height={14} style={{ marginTop: spacing.lg }} />
        <Skeleton width={90} height={12} style={{ marginTop: spacing.sm }} />
        <Skeleton width={'100%'} height={38} radius={8} style={{ marginTop: spacing.lg }} />
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} width={TILE} height={TILE} radius={0} style={styles.tile} />
        ))}
      </View>
    </View>
  );
}

// ── Single post (PostDetail): one post-card placeholder ───────────────────────
export function PostDetailSkeleton() {
  return <PostCardSkeleton />;
}

// ── Chat: alternating message bubbles ─────────────────────────────────────────
export function ChatSkeleton() {
  // widths/sides chosen to look like a real conversation
  const bubbles = [
    { mine: false, w: 180 },
    { mine: true, w: 140 },
    { mine: false, w: 220 },
    { mine: true, w: 90 },
    { mine: false, w: 150 },
  ];
  return (
    <View style={styles.chatPad}>
      {bubbles.map((b, i) => (
        <View
          key={i}
          style={[styles.bubbleRow, b.mine ? styles.right : styles.left]}>
          <Skeleton width={b.w} height={40} radius={18} />
        </View>
      ))}
    </View>
  );
}

// ── Comments: avatar + a line ─────────────────────────────────────────────────
export function CommentsSkeleton() {
  return (
    <View style={styles.listPad}>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.commentRow}>
          <SkeletonCircle size={36} />
          <View style={styles.rowText}>
            <Skeleton width={'80%'} height={12} />
            <Skeleton width={50} height={10} style={{ marginTop: spacing.sm }} />
          </View>
        </View>
      ))}
    </View>
  );
}

// ── Manage Posts: card with image + actions ───────────────────────────────────
export function ManagePostsSkeleton() {
  return (
    <View style={styles.listPad}>
      {[0, 1, 2].map(i => (
        <View key={i} style={styles.mpCard}>
          <View style={styles.row}>
            <SkeletonCircle size={36} />
            <Skeleton width={120} height={12} style={{ marginLeft: spacing.md }} />
          </View>
          <Skeleton width={'100%'} height={180} radius={8} style={{ marginTop: spacing.md }} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // post card
  postCard: { paddingBottom: spacing.lg },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  postActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  // generic row
  listPad: { padding: spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md },
  rowText: { marginLeft: spacing.md, flex: 1 },
  // profile
  profileHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  profileTop: { flexDirection: 'row', alignItems: 'center' },
  profileCounts: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginLeft: spacing.lg,
  },
  profileStat: { alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.lg },
  tile: { margin: 1 },
  // chat
  chatPad: { padding: spacing.md },
  bubbleRow: { flexDirection: 'row', marginVertical: 4 },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  // comments
  commentRow: { flexDirection: 'row', marginBottom: spacing.lg },
  // manage posts
  mpCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
});
