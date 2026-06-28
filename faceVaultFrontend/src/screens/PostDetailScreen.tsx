import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiFetchPost, apiLikePost, Post } from '../api/postsApi';
import PostCard from '../components/PostCard';
import CommentsSheet from '../components/CommentsSheet';
import { PostDetailSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';

// Shows a single post on its own screen (reached by tapping a profile grid tile
// or a notification). Reuses the same PostCard as the feed.

type Props = NativeStackScreenProps<AppStackParamList, 'PostDetail'>;

export default function PostDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { token } = useAuth();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetchPost(token!, postId);
      setPost(data);
    } catch {
      // ignore — leave the spinner / empty
    } finally {
      setLoading(false);
    }
  }, [token, postId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggleLike = (p: Post, nextLiked: boolean) => {
    apiLikePost(token!, p._id, nextLiked).catch(() => {});
  };

  if (loading || !post) {
    return (
      <View style={styles.container}>
        <PostDetailSkeleton />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        <PostCard
          post={post}
          onToggleLike={handleToggleLike}
          onOpenComments={() => setCommentsOpen(true)}
          onOpenProfile={userId => navigation.navigate('UserProfile', { userId })}
          onMessage={p =>
            navigation.navigate('Chat', {
              otherUser: { _id: p.author._id, name: p.author.name, email: '' },
            })
          }
        />
      </ScrollView>

      <CommentsSheet
        visible={commentsOpen}
        postId={post._id}
        postAuthorId={post.author._id}
        onClose={() => setCommentsOpen(false)}
        onCountChange={(_pid, total) =>
          setPost(prev => (prev ? { ...prev, commentsCount: total } : prev))
        }
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
});
