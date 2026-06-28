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
import { SafeAreaView } from 'react-native-safe-area-context';
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
const STORY_MS = 5000; // each story plays 5 seconds

export default function StoryViewerScreen({ route, navigation }: Props) {
  const { userId, userName } = route.params;
  const { token } = useAuth();

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
    setIndex(i => {
      if (i < stories.length - 1) return i + 1;
      navigation.goBack(); // past the last story → close
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

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
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
          <Avatar uri={current.author.avatarUrl} name={current.author.name} size={34} />
          <Text style={styles.headerName}>
            {current.author.username || userName}
          </Text>
          <Text style={styles.headerTime}>{timeAgo(current.createdAt)}</Text>
          <View style={{ flex: 1 }} />
          {current.isMine && (
            <TouchableOpacity onPress={removeStory} style={styles.headerBtn}>
              <Icon name="trash-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Icon name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Caption */}
        {!!current.caption && (
          <View style={styles.captionWrap} pointerEvents="none">
            <Text style={styles.caption}>{current.caption}</Text>
          </View>
        )}

        {/* Footer: own → viewers count; others → like */}
        <View style={styles.footer}>
          {current.isMine ? (
            <TouchableOpacity style={styles.viewersBtn} onPress={openViewers}>
              <Icon name="eye-outline" size={20} color="#fff" />
              <Text style={styles.viewersText}>{current.viewsCount} viewers</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.likeBtn} onPress={toggleLike}>
              <Icon
                name={current.likedByMe ? 'heart' : 'heart-outline'}
                size={30}
                color={current.likedByMe ? '#ED4956' : '#fff'}
              />
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>

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
  overlay: { flex: 1, justifyContent: 'space-between' },
  progressRow: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, gap: 4 },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: { height: 2.5, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10 },
  headerName: { color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 8 },
  headerTime: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginLeft: 8 },
  headerBtn: { padding: 6, marginLeft: 4 },
  captionWrap: { position: 'absolute', bottom: 120, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
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
  footer: { paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center' },
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
