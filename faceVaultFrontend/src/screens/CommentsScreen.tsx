import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import {
  apiFetchComments,
  apiAddComment,
  Comment,
} from '../api/postsApi';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { timeAgo } from '../utils/timeAgo';

// Lists all comments on a post and lets you add one.

type Props = NativeStackScreenProps<AppStackParamList, 'Comments'>;

export default function CommentsScreen({ route }: Props) {
  const { postId } = route.params;
  const { token } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
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
    load();
  }, [load]);

  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const newComment = await apiAddComment(token!, postId, trimmed);
      setComments(prev => [...prev, newComment]);
      setText('');
    } catch {
      // ignore — user can retry
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : (
        <FlatList
          data={comments}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.commentRow}>
              <Avatar
                uri={item.author.avatarUrl}
                name={item.author.name}
                size={36}
              />
              <View style={styles.commentBody}>
                <Text style={styles.commentText}>
                  <Text style={styles.commentUser}>
                    {item.author.username || item.author.name}{' '}
                  </Text>
                  {item.text}
                </Text>
                <Text style={styles.commentTime}>{timeAgo(item.createdAt)}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No comments yet</Text>
              <Text style={styles.emptySub}>Be the first to comment.</Text>
            </View>
          }
        />
      )}

      {/* Add-comment input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          placeholder="Add a comment…"
          placeholderTextColor={colors.textFaint}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={styles.sendBtn}
          onPress={handleSend}
          disabled={!text.trim() || sending}>
          {sending ? (
            <ActivityIndicator color={colors.ink} size="small" />
          ) : (
            <Icon
              name="arrow-up-circle"
              size={32}
              color={text.trim() ? colors.ink : colors.textFaint}
            />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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
  },
  list: {
    padding: spacing.lg,
  },
  commentRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  commentBody: {
    flex: 1,
    marginLeft: spacing.md,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: colors.ink,
  },
  commentUser: {
    fontWeight: '600',
  },
  commentTime: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ink,
  },
  emptySub: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.ink,
    marginRight: spacing.sm,
  },
  sendBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
