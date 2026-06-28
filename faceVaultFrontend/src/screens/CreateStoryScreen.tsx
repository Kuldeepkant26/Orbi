import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiCreateStory } from '../api/storiesApi';
import { uploadImage } from '../api/cloudinaryApi';
import { pickImageFromGallery, PickedImage } from '../utils/imagePicker';
import { isCloudinaryConfigured } from '../config/cloudinary';
import Icon from '../components/Icon';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// Create a story: pick an image, choose how long it lasts, add an optional
// caption, and post it.

type Props = NativeStackScreenProps<AppStackParamList, 'CreateStory'>;

const DURATIONS = [8, 16, 24, 48]; // hours

export default function CreateStoryScreen({ navigation }: Props) {
  const { user, token } = useAuth();
  const [image, setImage] = useState<PickedImage | null>(null);
  const [caption, setCaption] = useState('');
  const [hours, setHours] = useState(24);
  const [posting, setPosting] = useState(false);

  const pick = async () => {
    try {
      const picked = await pickImageFromGallery();
      if (picked) setImage(picked);
    } catch (e: any) {
      Alert.alert('Could not open gallery', e.message);
    }
  };

  const share = async () => {
    if (!image) {
      Alert.alert('Add a photo', 'A story needs an image.');
      return;
    }
    if (!isCloudinaryConfigured) {
      Alert.alert('Image upload not set up', 'Cloudinary is not configured yet.');
      return;
    }
    setPosting(true);
    try {
      const imageUrl = await uploadImage(image);
      await apiCreateStory(token!, { imageUrl, caption: caption.trim(), durationHours: hours });
      // Jump straight into viewing my own story.
      navigation.replace('StoryViewer', { userId: user!.id, userName: user!.name });
    } catch (e: any) {
      Alert.alert('Could not post story', e.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {image ? (
        <TouchableOpacity activeOpacity={0.9} onPress={pick}>
          <Image source={{ uri: image.uri }} style={styles.preview} />
          <View style={styles.change}>
            <Text style={styles.changeText}>Tap to change</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.picker} activeOpacity={0.8} onPress={pick}>
          <Icon name="image-outline" size={40} color={colors.textMuted} />
          <Text style={styles.pickerText}>Add a photo</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Story duration</Text>
      <View style={styles.durations}>
        {DURATIONS.map(h => (
          <TouchableOpacity
            key={h}
            style={[styles.durPill, hours === h && styles.durPillActive]}
            onPress={() => setHours(h)}>
            <Text style={[styles.durText, hours === h && styles.durTextActive]}>
              {h}h
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Caption (optional)</Text>
      <TextInput
        style={styles.caption}
        placeholder="Say something…"
        placeholderTextColor={colors.textFaint}
        value={caption}
        onChangeText={setCaption}
        maxLength={200}
      />

      <TouchableOpacity
        style={[styles.shareBtn, posting && styles.shareOff]}
        onPress={share}
        disabled={posting}>
        {posting ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.shareText}>Share to story</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  picker: {
    height: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerText: { marginTop: spacing.md, fontSize: 15, fontWeight: '600', color: colors.ink },
  preview: { width: '100%', height: 360, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt },
  change: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(10,10,10,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  changeText: { color: colors.white, fontSize: 12, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: colors.textMuted, marginTop: spacing.xl, marginBottom: spacing.sm },
  durations: { flexDirection: 'row', gap: spacing.sm },
  durPill: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  durPillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  durText: { fontSize: 14, fontWeight: '700', color: colors.ink },
  durTextActive: { color: colors.white },
  caption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.offWhite,
  },
  shareBtn: {
    height: 52,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  shareOff: { opacity: 0.6 },
  shareText: { color: colors.white, fontSize: 16, fontWeight: '700' },
});
