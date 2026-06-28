import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../App';
import { useAuth } from '../context/AuthContext';
import { apiUpdateProfile } from '../api/socialApi';
import { uploadImage } from '../api/cloudinaryApi';
import { pickImageFromGallery } from '../utils/imagePicker';
import { isCloudinaryConfigured } from '../config/cloudinary';
import Avatar from '../components/Avatar';
import { colors } from '../theme/colors';
import { spacing, radius } from '../theme/spacing';

// Edit my own profile: change avatar (via Cloudinary), name, and bio. Saving
// updates the backend AND the in-app stored user so the change shows everywhere.

type Props = NativeStackScreenProps<AppStackParamList, 'EditProfile'>;

export default function EditProfileScreen({ navigation }: Props) {
  const { user, token, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Pick a new avatar and upload it right away so we can preview it.
  const handleChangeAvatar = async () => {
    try {
      const picked = await pickImageFromGallery();
      if (!picked) return;

      if (!isCloudinaryConfigured) {
        Alert.alert(
          'Image upload not set up',
          'Cloudinary is not configured yet. You can still edit your name and bio.'
        );
        return;
      }

      setUploading(true);
      const url = await uploadImage(picked);
      setAvatarUrl(url);
    } catch (e: any) {
      Alert.alert('Could not update photo', e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    setSaving(true);
    try {
      await apiUpdateProfile(token!, {
        name: name.trim(),
        bio,
        avatarUrl,
      });
      // Update the stored user so the whole app reflects the change.
      await updateUser({ name: name.trim(), bio, avatarUrl });
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">

      {/* Avatar */}
      <View style={styles.avatarSection}>
        <Avatar uri={avatarUrl} name={name} size={96} />
        <TouchableOpacity onPress={handleChangeAvatar} disabled={uploading}>
          {uploading ? (
            <ActivityIndicator color={colors.ink} style={{ marginTop: spacing.md }} />
          ) : (
            <Text style={styles.changePhoto}>Change photo</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Name */}
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={colors.textFaint}
      />

      {/* Bio */}
      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        value={bio}
        onChangeText={setBio}
        placeholder="Tell people about yourself"
        placeholderTextColor={colors.textFaint}
        multiline
        maxLength={150}
      />

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.saveText}>Save</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  changePhoto: {
    marginTop: spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: colors.ink,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
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
  bioInput: {
    height: 100,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  saveBtn: {
    height: 50,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
