import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import {
  apiFetchComments,
  apiAddComment,
  apiLikeComment,
  apiPinComment,
  Comment,
} from '../api/postsApi';
import Avatar from './Avatar';
import Icon from './Icon';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { timeAgo } from '../utils/timeAgo';

// ── CommentsSheet ─────────────────────────────────────────────────────────────
//
// An Instagram-style bottom sheet (slides up to ~75% of the screen) showing a
// post's comments instead of navigating to a separate page. Supports nested
// replies (collapsible), liking comments, replying, and pinning (post owner).
//
// Props:
//   visible     → show/hide the sheet
//   postId      → which post's comments
//   postAuthorId→ the post owner's id (so we know if "you" can pin)
//   onClose     → close handler
//   onCountChange → called with the new total when a comment is added

type Props = {
  visible: boolean;
  postId: string | null;
  postAuthorId?: string;
  onClose: () => void;
  onCountChange?: (postId: string, total: number) => void;
};

// A comment plus its nested replies (built from the flat list by `parent`).
type ThreadNode = Comment & { replies: ThreadNode[] };

export default function CommentsSheet({
  visible,
  postId,
  postAuthorId,
  onClose,
  onCountChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // Which comment we're replying to (null = a top-level comment).
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  // Which top-level comments have their replies expanded.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const isPostOwner = !!postAuthorId && postAuthorId === user?.id;

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await apiFetchComments(token!, postId);
      setComments(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token, postId]);

  useEffect(() => {
    if (visible && postId) {
      setReplyTo(null);
      setText('');
      load();
    }
  }, [visible, postId, load]);

  // Build the reply tree from the flat list. Pinned top-level comments first.
  const threads = useMemo<ThreadNode[]>(() => {
    const byId: Record<string, ThreadNode> = {};
    comments.forEach(c => {
      byId[c._id] = { ...c, replies: [] };
    });
    const roots: ThreadNode[] = [];
    comments.forEach(c => {
      const node = byId[c._id];
      if (c.parent && byId[c.parent]) byId[c.parent].replies.push(node);
      else if (!c.parent) roots.push(node);
    });
    // pinned first, then oldest-first (the API already sorts, but keep stable)
    roots.sort((a, b) => Number(b.isPinned) - Number(a.isPinned));
    return roots;
  }, [comments]);

  const send = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending || !postId) return;
    setSending(true);
    try {
      const created = await apiAddComment(token!, postId, trimmed, replyTo?._id);
      setComments(prev => [...prev, created]);
      setText('');
      // Make sure the parent's replies are expanded so the new reply shows.
      if (replyTo) setExpanded(prev => new Set(prev).add(replyTo._id));
      setReplyTo(null);
      onCountChange?.(postId, comments.length + 1);
    } catch (e: any) {
      Alert.alert('Could not comment', e.message);
    } finally {
      setSending(false);
    }
  };

  const toggleLike = (c: Comment) => {
    const next = !c.likedByMe;
    setComments(prev =>
      prev.map(x =>
        x._id === c._id
          ? { ...x, likedByMe: next, likesCount: x.likesCount + (next ? 1 : -1) }
          : x,
      ),
    );
    apiLikeComment(token!, c._id, next).catch(() => {});
  };

  // Pin / unpin (owner only) — long-press a top-level comment.
  const handlePin = (c: ThreadNode) => {
    if (!isPostOwner || c.parent) return;
    const next = !c.isPinned;
    Alert.alert(next ? 'Pin comment' : 'Unpin comment', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: next ? 'Pin' : 'Unpin',
        onPress: async () => {
          try {
            await apiPinComment(token!, c._id, next);
            // Only one pinned at a time → reflect locally.
            setComments(prev =>
              prev.map(x => ({
                ...x,
                isPinned: x._id === c._id ? next : next ? false : x.isPinned,
              })),
            );
          } catch (e: any) {
            Alert.alert('Error', e.message);
          }
        },
      },
    ]);
  };

  const renderComment = (node: ThreadNode, isReply = false) => (
    <View key={node._id} style={[styles.commentRow, isReply && styles.replyRow]}>
      <Avatar uri={node.author.avatarUrl} name={node.author.name} size={isReply ? 28 : 34} />
      <View style={styles.commentBody}>
        <TouchableOpacity activeOpacity={0.9} onLongPress={() => handlePin(node)}>
          {node.isPinned && (
            <View style={styles.pinTag}>
              <Icon name="pin" size={11} color={colors.textMuted} />
              <Text style={styles.pinText}>Pinned</Text>
            </View>
          )}
          <Text style={styles.commentText}>
            <Text style={styles.commentUser}>
              {node.author.username || node.author.name}{' '}
            </Text>
            {node.text}
          </Text>
        </TouchableOpacity>

        <View style={styles.commentMeta}>
          <Text style={styles.metaText}>{timeAgo(node.createdAt)}</Text>
          {node.likesCount > 0 && (
            <Text style={styles.metaText}>
              {node.likesCount} {node.likesCount === 1 ? 'like' : 'likes'}
            </Text>
          )}
          <TouchableOpacity onPress={() => setReplyTo(node)}>
            <Text style={styles.replyBtn}>Reply</Text>
          </TouchableOpacity>
        </View>

        {/* View / hide replies */}
        {!isReply && node.replies.length > 0 && (
          <TouchableOpacity
            style={styles.viewReplies}
            onPress={() =>
              setExpanded(prev => {
                const n = new Set(prev);
                n.has(node._id) ? n.delete(node._id) : n.add(node._id);
                return n;
              })
            }>
            <View style={styles.replyLine} />
            <Text style={styles.viewRepliesText}>
              {expanded.has(node._id)
                ? 'Hide replies'
                : `View ${node.replies.length} ${node.replies.length === 1 ? 'reply' : 'replies'}`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Nested replies (recursive) */}
        {!isReply &&
          expanded.has(node._id) &&
          node.replies.map(r => renderComment(r, true))}
      </View>

      {/* Like heart */}
      <TouchableOpacity style={styles.likeBtn} onPress={() => toggleLike(node)}>
        <Icon
          name={node.likedByMe ? 'heart' : 'heart-outline'}
          size={16}
          color={node.likedByMe ? colors.accentLike : colors.textMuted}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}>
        {/* Tap the top area to dismiss; the sheet fills the lower part. */}
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>Comments</Text>

          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.ink} />
            </View>
          ) : (
            <FlatList
              style={styles.flex}
              data={threads}
              keyExtractor={item => item._id}
              renderItem={({ item }) => renderComment(item)}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyTitle}>No comments yet</Text>
                  <Text style={styles.emptySub}>Start the conversation.</Text>
                </View>
              }
            />
          )}

          {/* Reply banner */}
          {replyTo && (
            <View style={styles.replyBanner}>
              <Text style={styles.replyBannerText}>
                Replying to {replyTo.author.username || replyTo.author.name}
              </Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Icon name="close" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputBar}>
            <Avatar uri={user?.avatarUrl} name={user?.name} size={32} />
            <TextInput
              style={styles.input}
              placeholder={replyTo ? 'Add a reply…' : 'Add a comment…'}
              placeholderTextColor={colors.textFaint}
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity onPress={send} disabled={!text.trim() || sending}>
              {sending ? (
                <ActivityIndicator color={colors.ink} size="small" />
              ) : (
                <Text
                  style={[styles.post, !text.trim() && styles.postOff]}>
                  Post
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const SHEET_HEIGHT = Math.round(Dimensions.get('window').height * 0.8);

const styles = StyleSheet.create({
  // Full-screen column: a tappable backdrop on top, the sheet pinned to bottom.
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SHEET_HEIGHT,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  flex: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing.lg, flexGrow: 1 },
  commentRow: { flexDirection: 'row', marginBottom: spacing.lg },
  replyRow: { marginTop: spacing.md, marginBottom: 0 },
  commentBody: { flex: 1, marginLeft: spacing.md },
  commentText: { fontSize: 14, lineHeight: 19, color: colors.ink },
  commentUser: { fontWeight: '600' },
  pinTag: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  pinText: { fontSize: 11, color: colors.textMuted, marginLeft: 3, fontWeight: '600' },
  commentMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 4 },
  metaText: { fontSize: 12, color: colors.textMuted },
  replyBtn: { fontSize: 12, color: colors.textMuted, fontWeight: '700' },
  viewReplies: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  replyLine: { width: 24, height: 1, backgroundColor: colors.border, marginRight: spacing.sm },
  viewRepliesText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  likeBtn: { paddingLeft: spacing.sm, paddingTop: 2 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.ink },
  emptySub: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  replyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceAlt,
  },
  replyBannerText: { fontSize: 12, color: colors.textMuted },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    color: colors.ink,
    paddingVertical: spacing.sm,
  },
  post: { fontSize: 14, fontWeight: '700', color: colors.ink },
  postOff: { color: colors.textFaint },
});
