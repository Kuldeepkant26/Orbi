import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import {
  apiFetchUserStories,
  apiViewStory,
  apiLikeStory,
  apiFetchStoryViewers,
  apiDeleteStory,
  Story,
  StoryViewer,
} from '../api/storiesApi';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import { timeAgo } from '../utils/timeAgo';

// Full-screen story viewer. Plays a user's active stories one by one with a
// progress bar at the top; tap right = next, tap left = previous. You can like a
// story; if it's your own you can see viewers and delete it.

type Props = NativeStackScreenProps<AppStackParamList, 'StoryViewer'>;

const { width, height } = Dimensions.get('window');
const STORY_MS = 15000; // each story plays 15 seconds

export default function StoryViewerScreen({ route, navigation }: Props) {
  const { userId, userName } = route.params;
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [stories, setStories] = useState<Story[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  // Viewers sheet (own stories)
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);

  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  const current = stories[index];

  // Load the user's stories.
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetchUserStories(token!, userId);
        setStories(data);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, userId]);

  const goNext = useCallback(() => {
    // Decide based on the current index without mutating navigation inside the
    // setState updater (that fires during render and triggers a "setState while
    // rendering" warning). Advance, or close past the last story.
    setIndex(i => {
      if (i < stories.length - 1) return i + 1;
      // Defer the goBack to after this render commits.
      requestAnimationFrame(() => navigation.goBack());
      return i;
    });
  }, [stories.length, navigation]);

  const goPrev = () => setIndex(i => Math.max(0, i - 1));

  // Run the progress bar + auto-advance for the current story, and record a view.
  useEffect(() => {
    if (!current) return;
    apiViewStory(token!, current._id);

    progress.setValue(0);
    if (paused) return;
    anim.current = Animated.timing(progress, {
      toValue: 1,
      duration: STORY_MS,
      useNativeDriver: false,
    });
    anim.current.start(({ finished }) => {
      if (finished) goNext();
    });
    return () => anim.current?.stop();
    // `progress` is a stable ref, intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused, goNext, token]);

  const toggleLike = async () => {
    if (!current) return;
    const next = !current.likedByMe;
    setStories(prev =>
      prev.map((s, i) =>
        i === index
          ? { ...s, likedByMe: next, likesCount: s.likesCount + (next ? 1 : -1) }
          : s,
      ),
    );
    apiLikeStory(token!, current._id, next).catch(() => {});
  };

  const openViewers = async () => {
    if (!current) return;
    setPaused(true);
    try {
      const data = await apiFetchStoryViewers(token!, current._id);
      setViewers(data.viewers);
      setViewersOpen(true);
    } catch (e: any) {
      Alert.alert('Error', e.message);
      setPaused(false);
    }
  };

  // Jump to the create-story screen to add another. Pause first so the timer
  // doesn't advance while we're away.
  const addAnotherStory = () => {
    setPaused(true);
    anim.current?.stop();
    navigation.navigate('CreateStory');
  };

  const removeStory = () => {
    if (!current) return;
    setPaused(true);
    Alert.alert('Delete story', 'Remove this story?', [
      { text: 'Cancel', style: 'cancel', onPress: () => setPaused(false) },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await apiDeleteStory(token!, current._id);
            navigation.goBack();
          } catch (e: any) {
            Alert.alert('Error', e.message);
            setPaused(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  if (!current) {
    return (
      <View style={styles.loading}>
        <Text style={styles.noStories}>No active stories.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeFallback}>
          <Text style={styles.closeFallbackText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: current.imageUrl }} style={styles.image} resizeMode="cover" />

      {/* Tap zones: left = prev, right = next. Long-press pauses. */}
      <View style={styles.tapZones}>
        <TouchableWithoutFeedback
          onPress={goPrev}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}>
          <View style={styles.tapZone} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback
          onPress={goNext}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}>
          <View style={styles.tapZone} />
        </TouchableWithoutFeedback>
      </View>

      {/* Top scrim improves contrast for the progress bar + header over bright photos. */}
      <View style={[styles.topScrim, { height: insets.top + 120 }]} pointerEvents="none" />

      {/* Top group: progress + header, pinned to the very top. */}
      <View style={[styles.topGroup, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        {/* Progress bars */}
        <View style={styles.progressRow}>
          {stories.map((s, i) => (
            <View key={s._id} style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width:
                      i < index
                        ? '100%'
                        : i === index
                        ? progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0%', '100%'],
                          })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Avatar uri={current.author.avatarUrl} name={current.author.name} size={36} />
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerName} numberOfLines={1}>
              {current.author.username || userName}
            </Text>
            <Text style={styles.headerTime}>{timeAgo(current.createdAt)}</Text>
          </View>
          {current.isMine && (
            <>
              <TouchableOpacity onPress={addAnotherStory} style={styles.headerBtn} hitSlop={8}>
                <Icon name="add-circle-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={removeStory} style={styles.headerBtn} hitSlop={8}>
                <Icon name="trash-outline" size={22} color="#fff" />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} hitSlop={8}>
            <Icon name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom scrim for caption + footer legibility. */}
      <View style={styles.bottomScrim} pointerEvents="none" />

      {/* Caption */}
      {!!current.caption && (
        <View style={[styles.captionWrap, { bottom: insets.bottom + 92 }]} pointerEvents="none">
          <Text style={styles.caption}>{current.caption}</Text>
        </View>
      )}

      {/* Footer: own → viewers count; others → like, pinned to the bottom. */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]} pointerEvents="box-none">
        {current.isMine ? (
          <TouchableOpacity style={styles.viewersBtn} onPress={openViewers}>
            <Icon name="eye-outline" size={20} color="#fff" />
            <Text style={styles.viewersText}>{current.viewsCount} viewers</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.likeBtn} onPress={toggleLike} hitSlop={8}>
            <Icon
              name={current.likedByMe ? 'heart' : 'heart-outline'}
              size={32}
              color={current.likedByMe ? '#ED4956' : '#fff'}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Viewers sheet */}
      <Modal
        visible={viewersOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setViewersOpen(false);
          setPaused(false);
        }}>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              Viewers · {current.viewsCount}
            </Text>
            <FlatList
              data={viewers}
              keyExtractor={v => v._id}
              renderItem={({ item }) => (
                <View style={styles.viewerRow}>
                  <Avatar uri={item.avatarUrl} name={item.name} size={40} />
                  <Text style={styles.viewerName}>
                    {item.username || item.name}
                  </Text>
                  {item.liked && <Icon name="heart" size={18} color="#ED4956" />}
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.noViewers}>No viewers yet.</Text>
              }
            />
            <TouchableOpacity
              style={styles.sheetClose}
              onPress={() => {
                setViewersOpen(false);
                setPaused(false);
              }}>
              <Text style={styles.sheetCloseText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  noStories: { color: '#fff', fontSize: 15 },
  closeFallback: { marginTop: 16, padding: 10 },
  closeFallbackText: { color: '#fff', fontWeight: '700' },
  image: { position: 'absolute', top: 0, left: 0, width, height },
  tapZones: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  tapZone: { flex: 1 },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, backgroundColor: 'rgba(0,0,0,0.22)' },
  topGroup: { position: 'absolute', top: 0, left: 0, right: 0 },
  progressRow: { flexDirection: 'row', paddingHorizontal: 10, gap: 4 },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
    overflow: 'hidden',
  },
  progressFill: { height: 3, borderRadius: 3, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 14 },
  headerTextWrap: { flex: 1, marginLeft: 10 },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 14.5, letterSpacing: 0.2 },
  headerTime: { color: 'rgba(255,255,255,0.75)', fontSize: 11.5, marginTop: 1 },
  headerBtn: { padding: 6, marginLeft: 4 },
  captionWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
  caption: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    overflow: 'hidden',
  },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, alignItems: 'center' },
  likeBtn: { padding: 8 },
  viewersBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  viewersText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ECECEC',
    alignSelf: 'center',
    marginVertical: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#0A0A0A', marginBottom: 12 },
  viewerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  viewerName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#0A0A0A' },
  noViewers: { color: '#6B6B6B', paddingVertical: 20, textAlign: 'center' },
  sheetClose: { alignItems: 'center', paddingVertical: 14, marginTop: 8 },
  sheetCloseText: { fontSize: 15, fontWeight: '700', color: '#0A0A0A' },
});
