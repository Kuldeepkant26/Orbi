import React from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Icon from './Icon';
import { Highlight } from '../api/highlightsApi';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';

// The row of highlight circles on a profile. On your own profile, the first
// circle is a "New" button to create a highlight.

type Props = {
  highlights: Highlight[];
  isMe: boolean;
  onOpen: (h: Highlight) => void;
  onCreate?: () => void;
};

export default function HighlightsRow({ highlights, isMe, onOpen, onCreate }: Props) {
  if (highlights.length === 0 && !isMe) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {isMe && (
        <TouchableOpacity style={styles.item} onPress={onCreate} activeOpacity={0.8}>
          <View style={[styles.circle, styles.newCircle]}>
            <Icon name="add" size={26} color={colors.ink} />
          </View>
          <Text style={styles.label}>New</Text>
        </TouchableOpacity>
      )}

      {highlights.map(h => (
        <TouchableOpacity
          key={h._id}
          style={styles.item}
          onPress={() => onOpen(h)}
          activeOpacity={0.8}>
          <View style={styles.circle}>
            {h.coverUrl ? (
              <Image source={{ uri: h.coverUrl }} style={styles.cover} />
            ) : (
              <Icon name="bookmark-outline" size={22} color={colors.textMuted} />
            )}
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {h.title}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { paddingTop: spacing.lg, gap: spacing.lg },
  item: { alignItems: 'center', width: 68 },
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  newCircle: { borderStyle: 'dashed' },
  cover: { width: '100%', height: '100%' },
  label: { fontSize: 12, color: colors.ink, marginTop: 5, maxWidth: 66 },
});
