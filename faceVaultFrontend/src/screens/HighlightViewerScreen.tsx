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
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiFetchUserHighlights, Highlight } from '../api/highlightsApi';
import Icon from '../components/Icon';

// Plays a highlight's saved items full-screen (like stories, but permanent and
// without likes/viewers). We refetch the owner's highlights and find this one.

type Props = NativeStackScreenProps<AppStackParamList, 'HighlightViewer'>;

const { width, height } = Dimensions.get('window');
const ITEM_MS = 4000;

export default function HighlightViewerScreen({ route, navigation }: Props) {
  const { highlightId, ownerId } = route.params;
  const { token } = useAuth();

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
    setIndex(i => {
      if (i < items.length - 1) return i + 1;
      navigation.goBack();
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

      {/* Top bar (progress + header), pinned to the top. */}
      <SafeAreaView style={styles.topBar} edges={['top']} pointerEvents="box-none">
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
          <Text style={styles.title}>{highlight?.title}</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
            <Icon name="close" size={26} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {!!current.caption && (
        <View style={styles.captionWrap} pointerEvents="none">
          <Text style={styles.caption}>{current.caption}</Text>
        </View>
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
  topBar: { position: 'absolute', top: 0, left: 0, right: 0 },
  progressRow: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, gap: 4 },
  track: { flex: 1, height: 2.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)', overflow: 'hidden' },
  fill: { height: 2.5, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10 },
  title: { color: '#fff', fontWeight: '700', fontSize: 15 },
  closeBtn: { padding: 6 },
  captionWrap: { position: 'absolute', bottom: 80, left: 0, right: 0, alignItems: 'center', paddingHorizontal: 24 },
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
