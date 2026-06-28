import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiFetchMyStories, Story } from '../api/storiesApi';
import { apiCreateHighlight } from '../api/highlightsApi';
import Icon from '../components/Icon';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// Create a highlight: give it a title and pick which of your active stories to
// save into it. (Stories are copied, so the highlight survives after they
// expire.)

type Props = NativeStackScreenProps<AppStackParamList, 'CreateHighlight'>;

export default function CreateHighlightScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [title, setTitle] = useState('');
  const [stories, setStories] = useState<Story[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await apiFetchMyStories(token!);
      setStories(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const save = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give your highlight a name.');
      return;
    }
    if (selected.size === 0) {
      Alert.alert('Pick stories', 'Select at least one story to add.');
      return;
    }
    setSaving(true);
    try {
      const items = stories
        .filter(s => selected.has(s._id))
        .map(s => ({ imageUrl: s.imageUrl, caption: s.caption }));
      await apiCreateHighlight(token!, title.trim(), items);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not create', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Travel, Food, 2026"
        placeholderTextColor={colors.textFaint}
        value={title}
        onChangeText={setTitle}
        maxLength={30}
      />

      <Text style={styles.label}>Choose stories</Text>
      {loading ? (
        <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.lg }} />
      ) : stories.length === 0 ? (
        <Text style={styles.empty}>
          You have no active stories to add. Post a story first, then create a
          highlight from it.
        </Text>
      ) : (
        <View style={styles.grid}>
          {stories.map(s => {
            const on = selected.has(s._id);
            return (
              <TouchableOpacity key={s._id} onPress={() => toggle(s._id)} activeOpacity={0.85}>
                <Image source={{ uri: s.imageUrl }} style={styles.thumb} />
                {on && (
                  <View style={styles.check}>
                    <Icon name="checkmark-circle" size={24} color={colors.ink} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveOff]}
        onPress={save}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.saveText}>Create highlight</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const THUMB = 96;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.md },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.offWhite,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumb: { width: THUMB, height: THUMB, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: colors.white,
    borderRadius: 12,
  },
  empty: { fontSize: 14, color: colors.textMuted, marginTop: spacing.md, lineHeight: 20 },
  saveBtn: {
    height: 52,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  saveOff: { opacity: 0.6 },
  saveText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
