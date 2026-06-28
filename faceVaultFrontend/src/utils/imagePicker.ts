import { launchImageLibrary } from 'react-native-image-picker';

// ── Pick an image from the phone's gallery ─────────────────────────────────────
//
// Wraps react-native-image-picker so screens get a simple result back:
// either the picked image's { uri, fileName, type } or null if the user
// cancelled. We only allow photos (no video), matching Orbi's posts.
//
// Usage:
//   const image = await pickImageFromGallery();
//   if (image) { const url = await uploadImage(image); }

export type PickedImage = {
  uri: string;
  fileName?: string;
  type?: string;
};

export async function pickImageFromGallery(): Promise<PickedImage | null> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8, // compress a little so uploads are faster
    selectionLimit: 1,
  });

  // User closed the picker without choosing.
  if (result.didCancel) return null;

  // Some error happened (permission denied, etc.).
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'Could not open the photo library.');
  }

  const asset = result.assets?.[0];
  if (!asset?.uri) return null;

  return {
    uri: asset.uri,
    fileName: asset.fileName,
    type: asset.type,
  };
}

// Pick several images at once (for multi-image posts). `limit` caps how many
// can be chosen; returns [] if the user cancelled.
export async function pickImagesFromGallery(limit = 10): Promise<PickedImage[]> {
  const result = await launchImageLibrary({
    mediaType: 'photo',
    quality: 0.8,
    selectionLimit: limit, // 0 would mean unlimited on iOS; we always cap it
  });

  if (result.didCancel) return [];
  if (result.errorCode) {
    throw new Error(result.errorMessage || 'Could not open the photo library.');
  }

  return (result.assets || [])
    .filter(a => !!a.uri)
    .map(a => ({ uri: a.uri!, fileName: a.fileName, type: a.type }));
}
