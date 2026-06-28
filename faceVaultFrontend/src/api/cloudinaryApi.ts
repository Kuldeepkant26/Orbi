import {
  CLOUD_NAME,
  UPLOAD_PRESET,
  isCloudinaryConfigured,
} from '../config/cloudinary';

// ── Cloudinary image upload ────────────────────────────────────────────────────
//
// Takes a local image (the file URI you get from the image picker) and uploads
// it straight to Cloudinary. Returns the hosted image URL (a "secure_url") that
// we then save on the post or profile in our own backend.
//
// This uses an UNSIGNED upload preset, so no secret key is needed in the app.
//
// Usage:
//   const url = await uploadImage(localUri);
//   // url -> "https://res.cloudinary.com/.../image/upload/v123/abc.jpg"

type PickedImage = {
  uri: string;
  fileName?: string;
  type?: string; // mime type, e.g. "image/jpeg"
};

export async function uploadImage(image: PickedImage): Promise<string> {
  if (!isCloudinaryConfigured) {
    throw new Error(
      'Image upload is not set up yet. Add your Cloudinary cloud name and upload preset in src/config/cloudinary.ts.'
    );
  }

  // React Native sends files as multipart/form-data. The { uri, name, type }
  // shape is how RN attaches a local file to a request.
  const formData = new FormData();
  formData.append('file', {
    uri: image.uri,
    name: image.fileName || 'upload.jpg',
    type: image.type || 'image/jpeg',
  } as any);
  formData.append('upload_preset', UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  const data = await res.json();
  if (!res.ok || !data.secure_url) {
    throw new Error(data?.error?.message || 'Image upload failed. Please try again.');
  }

  return data.secure_url as string;
}
