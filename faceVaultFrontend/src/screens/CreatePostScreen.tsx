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
import { pickImageFromGallery, PickedImage } from '../utils/imagePicker';
import { isCloudinaryConfigured } from '../config/cloudinary';
import Icon from '../components/Icon';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// The Create tab. Pick a photo (optional), write a caption, and share it.
// Posting flow: upload the image to Cloudinary → get its URL → save the post
// to our backend with that URL + the caption.

type Nav = NativeStackNavigationProp<AppStackParamList>;

export default function CreatePostScreen() {
  const navigation = useNavigation<Nav>();
  const { token } = useAuth();

  const [image, setImage] = useState<PickedImage | null>(null);
  const [caption, setCaption] = useState('');
  const [posting, setPosting] = useState(false);

  const handlePickImage = async () => {
    try {
      const picked = await pickImageFromGallery();
      if (picked) setImage(picked);
    } catch (e: any) {
      Alert.alert('Could not open gallery', e.message);
    }
  };

  const handleShare = async () => {
    // A post needs at least an image or some caption text.
    if (!image && !caption.trim()) {
      Alert.alert('Nothing to share', 'Add a photo or write something first.');
      return;
    }

    setPosting(true);
    try {
      let imageUrl = '';

      // If the user picked an image, upload it to Cloudinary first.
      if (image) {
        if (!isCloudinaryConfigured) {
          Alert.alert(
            'Image upload not set up',
            'Cloudinary is not configured yet. You can still share text-only posts.'
          );
          setPosting(false);
          return;
        }
        imageUrl = await uploadImage(image);
      }

      await apiCreatePost(token!, { imageUrl, caption: caption.trim() });

      // Reset and jump to the feed to see it.
      setImage(null);
      setCaption('');
      navigation.navigate('MainTabs');
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

          {/* Image picker / preview */}
          {image ? (
            <TouchableOpacity activeOpacity={0.9} onPress={handlePickImage}>
              <Image source={{ uri: image.uri }} style={styles.preview} />
              <View style={styles.changeOverlay}>
                <Text style={styles.changeText}>Tap to change</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.picker}
              activeOpacity={0.8}
              onPress={handlePickImage}>
              <Icon name="image-outline" size={40} color={colors.textMuted} />
              <Text style={styles.pickerText}>Add a photo</Text>
              <Text style={styles.pickerHint}>(optional — you can post text only)</Text>
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
  preview: {
    width: '100%',
    height: 320,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  changeOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(10,10,10,0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  changeText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '600',
  },
  caption: {
    marginTop: spacing.lg,
    fontSize: 16,
    color: colors.ink,
    minHeight: 100,
    textAlignVertical: 'top',
  },
});
