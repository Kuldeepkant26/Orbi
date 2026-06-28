import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiFetchFeed, apiLikePost, apiFetchPostLikers, Post } from '../api/postsApi';
import PostCard from '../components/PostCard';
import OrbiHeader from '../components/OrbiHeader';
import StoryTray from '../components/StoryTray';
import CommentsSheet from '../components/CommentsSheet';
import UserListSheet, { SheetUser } from '../components/UserListSheet';
import { FeedSkeleton } from '../components/skeletons';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// The Home tab = the FEED. Top bar with the Orbi logo and a DM (messages) icon
// on the right, then a scrollable list of posts from people you follow + your
// own posts.

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  // Bumped on pull-to-refresh so the story tray reloads too.
  const [storyKey, setStoryKey] = useState(0);
  // The post whose comments sheet is open (null = closed).
  const [commentsFor, setCommentsFor] = useState<{ postId: string; authorId: string } | null>(null);
  // The likers bottom sheet ({ title, fetcher } when open).
  const [likersFor, setLikersFor] = useState<{ postId: string } | null>(null);

  // Load the first page (or reload on pull-to-refresh).
  const loadFeed = useCallback(async () => {
    try {
      setError('');
      const data = await apiFetchFeed(token!, 1);
      setPosts(data);
      setPage(1);
      setHasMore(data.length > 0);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Load the next page when the user scrolls near the bottom.
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await apiFetchFeed(token!, next);
      if (data.length === 0) {
        setHasMore(false);
      } else {
        setPosts(prev => [...prev, ...data]);
        setPage(next);
      }
    } catch {
      // Silently ignore pagination errors; pull-to-refresh can recover.
    } finally {
      setLoadingMore(false);
    }
  }, [token, page, hasMore, loadingMore, loading]);

  // Reload the feed every time the Home tab comes into focus, so new posts
  // (e.g. one you just created) show up.
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadFeed);
    return unsubscribe;
  }, [navigation, loadFeed]);

  // Like / unlike. PostCard updates its heart instantly; here we just fire the
  // network request.
  const handleToggleLike = (post: Post, nextLiked: boolean) => {
    apiLikePost(token!, post._id, nextLiked).catch(() => {
      // If it fails, a refresh will resync the real state.
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <OrbiHeader />
        <FeedSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <OrbiHeader />

      <FlatList
        data={posts}
        keyExtractor={item => item._id}
        ListHeaderComponent={<StoryTray refreshKey={storyKey} />}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            onToggleLike={handleToggleLike}
            onOpenComments={p =>
              setCommentsFor({ postId: p._id, authorId: p.author._id })
            }
            onOpenLikers={p => setLikersFor({ postId: p._id })}
            onOpenProfile={userId => navigation.navigate('UserProfile', { userId })}
            onMessage={p =>
              navigation.navigate('Chat', {
                otherUser: { _id: p.author._id, name: p.author.name, email: '' },
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setStoryKey(k => k + 1);
              loadFeed();
            }}
            tintColor={colors.ink}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator
              color={colors.textMuted}
              style={{ marginVertical: spacing.lg }}
            />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            {error ? (
              <>
                <Text style={styles.emptyText}>{error}</Text>
                <TouchableOpacity onPress={loadFeed} style={styles.retryBtn}>
                  <Text style={styles.retryText}>Try again</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.emptyTitle}>Your feed is empty</Text>
                <Text style={styles.emptyText}>
                  Follow people or create your first post to get started.
                </Text>
              </>
            )}
          </View>
        }
      />

      {/* Comments bottom sheet */}
      <CommentsSheet
        visible={!!commentsFor}
        postId={commentsFor?.postId || null}
        postAuthorId={commentsFor?.authorId}
        onClose={() => setCommentsFor(null)}
        onCountChange={(pid, total) =>
          setPosts(prev =>
            prev.map(p => (p._id === pid ? { ...p, commentsCount: total } : p)),
          )
        }
      />

      {/* Likers bottom sheet */}
      <UserListSheet
        visible={!!likersFor}
        title="Likes"
        fetcher={
          likersFor
            ? () =>
                apiFetchPostLikers(token!, likersFor.postId) as Promise<SheetUser[]>
            : null
        }
        onClose={() => setLikersFor(null)}
        onOpenUser={userId => {
          setLikersFor(null);
          navigation.navigate('UserProfile', { userId });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  empty: {
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: 12,
  },
  retryText: {
    color: colors.white,
    fontWeight: '700',
  },
});
