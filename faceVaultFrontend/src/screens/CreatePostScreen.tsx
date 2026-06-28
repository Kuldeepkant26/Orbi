import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiCreatePost } from '../api/postsApi';
import { uploadImage } from '../api/cloudinaryApi';
import { pickImagesFromGallery, PickedImage } from '../utils/imagePicker';
import { isCloudinaryConfigured } from '../config/cloudinary';
import Icon from '../components/Icon';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// The Create tab. Pick a photo (optional), write a caption, and share it.
// Posting flow: upload the image to Cloudinary → get its URL → save the post
// to our backend with that URL + the caption.

type Nav = NativeStackNavigationProp<AppStackParamList>;

const MAX_IMAGES = 10;

export default function CreatePostScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();

  const [images, setImages] = useState<PickedImage[]>([]);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePickImages = async () => {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) {
      Alert.alert('Limit reached', `You can add up to ${MAX_IMAGES} photos.`);
      return;
    }
    try {
      const picked = await pickImagesFromGallery(remaining);
      if (picked.length) {
        setImages(prev => [...prev, ...picked].slice(0, MAX_IMAGES));
      }
    } catch (e: any) {
      Alert.alert('Could not open gallery', e.message);
    }
  };

  const removeImage = (uri: string) => {
    setImages(prev => prev.filter(img => img.uri !== uri));
  };

  const handleShare = async () => {
    // A post needs at least an image or some caption text.
    if (!images.length && !caption.trim()) {
      Alert.alert('Nothing to share', 'Add a photo or write something first.');
      return;
    }

    setPosting(true);
    try {
      let imageUrls: string[] = [];

      // If the user picked images, upload them all to Cloudinary first.
      if (images.length) {
        if (!isCloudinaryConfigured) {
          Alert.alert(
            'Image upload not set up',
            'Cloudinary is not configured yet. You can still share text-only posts.'
          );
          setPosting(false);
          return;
        }
        imageUrls = await Promise.all(images.map(img => uploadImage(img)));
      }

      const created = await apiCreatePost(token!, {
        imageUrls,
        caption: caption.trim(),
      });

      // Reset the form, then open the new post so the user sees it right away.
      setImages([]);
      setCaption('');
      navigation.navigate('PostDetail', { postId: created._id });
    } catch (e: any) {
      Alert.alert('Could not share post', e.message);
    } finally {
      setPosting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header with a Share button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          onPress={handleShare}
          disabled={posting}
          style={styles.shareBtn}>
          {posting ? (
            <ActivityIndicator color={colors.ink} size="small" />
          ) : (
            <Text style={styles.shareText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled">

          {/* Image picker / previews */}
          {images.length ? (
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.thumbStrip}>
                {images.map((img, i) => (
                  <View key={img.uri} style={styles.thumbWrap}>
                    <Image source={{ uri: img.uri }} style={styles.thumb} />
                    {/* index badge, IG-style */}
                    <View style={styles.thumbBadge}>
                      <Text style={styles.thumbBadgeText}>{i + 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.thumbRemove}
                      onPress={() => removeImage(img.uri)}
                      hitSlop={8}>
                      <Icon name="close" size={16} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < MAX_IMAGES && (
                  <TouchableOpacity
                    style={styles.addMore}
                    activeOpacity={0.8}
                    onPress={handlePickImages}>
                    <Icon name="add" size={28} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </ScrollView>
              <Text style={styles.thumbCount}>
                {images.length} of {MAX_IMAGES} photos
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.picker}
              activeOpacity={0.8}
              onPress={handlePickImages}>
              <Icon name="images-outline" size={40} color={colors.textMuted} />
              <Text style={styles.pickerText}>Add photos</Text>
              <Text style={styles.pickerHint}>(up to {MAX_IMAGES} — or post text only)</Text>
            </TouchableOpacity>
          )}

          {/* Caption */}
          <TextInput
            style={styles.caption}
            placeholder="Write a caption…"
            placeholderTextColor={colors.textFaint}
            value={caption}
            onChangeText={setCaption}
            multiline
            maxLength={2200}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.ink,
  },
  shareBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  shareText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.ink,
  },
  scroll: {
    padding: spacing.lg,
  },
  picker: {
    height: 220,
    borderRadius: radius.lg,
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerText: {
    marginTop: spacing.md,
    fontSize: 15,
    fontWeight: '600',
    color: colors.ink,
  },
  pickerHint: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textMuted,
  },
  thumbStrip: {
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  thumbWrap: {
    width: 150,
    height: 200,
  },
  thumb: {
    width: 150,
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  thumbBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: 'rgba(10,10,10,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbBadgeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  thumbRemove: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(10,10,10,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMore: {
    width: 150,
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbCount: {
    marginTop: spacing.sm,
    fontSize: 12,
    color: colors.textMuted,
  },
  caption: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.ink,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
