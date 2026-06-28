// ── Cloudinary configuration ──────────────────────────────────────────────────
//
// Orbi uploads images (post photos and profile pictures) directly to Cloudinary
// using an "unsigned" upload preset. This keeps your secret API key OUT of the
// mobile app — only the public cloud name and the preset name live here.
//
// 👉 TO ENABLE IMAGE UPLOADS, fill in the two values below:
//
//   1. CLOUD_NAME    — from your Cloudinary Dashboard ("Cloud name").
//   2. UPLOAD_PRESET — Settings → Upload → Add upload preset →
//                      set "Signing Mode" to "Unsigned" → copy its name.
//
// Until these are set, image uploads will fail with a friendly message and the
// rest of the app keeps working (you can still create text-only posts).

export const CLOUD_NAME = 'dje2ljyce'; // Cloudinary cloud name
export const UPLOAD_PRESET = 'orbi_unsigned'; // unsigned preset (uploads land in the "orbi" folder)

// True only once both values have been filled in. The upload code checks this
// so it can show a clear "configure Cloudinary" message instead of a raw error.
export const isCloudinaryConfigured =
  CLOUD_NAME !== 'YOUR_CLOUD_NAME' && UPLOAD_PRESET !== 'YOUR_UNSIGNED_PRESET';
