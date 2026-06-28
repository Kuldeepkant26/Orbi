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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiFetchUserHighlights, Highlight } from '../api/highlightsApi';
import Icon from '../components/Icon';

// Plays a highlight's saved items full-screen (like stories, but permanent and
// without likes/viewers). We refetch the owner's highlights and find this one.

type Props = NativeStackScreenProps<AppStackParamList, 'HighlightViewer'>;

const { width, height } = Dimensions.get('window');
const ITEM_MS = 20000; // each highlight item plays for 20 seconds

export default function HighlightViewerScreen({ route, navigation }: Props) {
  const { highlightId, ownerId } = route.params;
  const { token } = useAuth();
  const insets = useSafeAreaInsets();

  const [highlight, setHighlight] = useState<Highlight | null>(null);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);

  // We don't have a "get one highlight" endpoint, so fetch the user's list and
  // pick this one. (Highlights are small.)
  useEffect(() => {
    (async () => {
      try {
        const list = await apiFetchUserHighlights(token!, ownerId);
        setHighlight(list.find(h => h._id === highlightId) || null);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, ownerId, highlightId]);

  const items = highlight?.items || [];
  const current = items[index];

  const goNext = useCallback(() => {
    // Don't call navigation.goBack() inside the setState updater — it runs
    // during render and triggers a "setState while rendering" warning. Defer it.
    setIndex(i => {
      if (i < items.length - 1) return i + 1;
      requestAnimationFrame(() => navigation.goBack());
      return i;
    });
  }, [items.length, navigation]);

  const goPrev = () => setIndex(i => Math.max(0, i - 1));

  useEffect(() => {
    if (!current) return;
    progress.setValue(0);
    if (paused) return;
    anim.current = Animated.timing(progress, {
      toValue: 1,
      duration: ITEM_MS,
      useNativeDriver: false,
    });
    anim.current.start(({ finished }) => finished && goNext());
    return () => anim.current?.stop();
    // `progress` is a stable ref, intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, paused, goNext]);

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
        <Text style={styles.empty}>This highlight is empty.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeFallback}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image source={{ uri: current.imageUrl }} style={styles.image} resizeMode="cover" />

      <View style={styles.tapZones}>
        <TouchableWithoutFeedback onPress={goPrev} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)}>
          <View style={styles.tapZone} />
        </TouchableWithoutFeedback>
        <TouchableWithoutFeedback onPress={goNext} onLongPress={() => setPaused(true)} onPressOut={() => setPaused(false)}>
          <View style={styles.tapZone} />
        </TouchableWithoutFeedback>
      </View>

      {/* Top scrim improves contrast for the progress bar + header over bright photos. */}
      <View style={[styles.topScrim, { height: insets.top + 110 }]} pointerEvents="none" />

      {/* Top bar (progress + header), pinned to the top. */}
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <View style={styles.progressRow}>
          {items.map((it, i) => (
            <View key={i} style={styles.track}>
              <Animated.View
                style={[
                  styles.fill,
                  {
                    width:
                      i < index
                        ? '100%'
                        : i === index
                        ? progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                        : '0%',
                  },
                ]}
              />
            </View>
          ))}
        </View>

        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{highlight?.title}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn} hitSlop={8}>
            <Icon name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {!!current.caption && (
        <>
          <View style={styles.bottomScrim} pointerEvents="none" />
          <View style={[styles.captionWrap, { bottom: insets.bottom + 70 }]} pointerEvents="none">
            <Text style={styles.caption}>{current.caption}</Text>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  loading: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  empty: { color: '#fff', fontSize: 15 },
  closeFallback: { marginTop: 16, padding: 10 },
  closeText: { color: '#fff', fontWeight: '700' },
  image: { position: 'absolute', top: 0, left: 0, width, height },
  tapZones: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row' },
  tapZone: { flex: 1 },
  topScrim: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.28)' },
  bottomScrim: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 150, backgroundColor: 'rgba(0,0,0,0.22)' },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  progressRow: { flexDirection: 'row', paddingHorizontal: 10, gap: 4 },
  track: { flex: 1, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)', overflow: 'hidden' },
  fill: { height: 3, borderRadius: 3, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 14, paddingBottom: 4 },
  title: { color: '#fff', fontWeight: '700', fontSize: 15.5, letterSpacing: 0.2 },
  closeBtn: { padding: 6, marginLeft: 4 },
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
});
