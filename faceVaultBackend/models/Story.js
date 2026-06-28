const mongoose = require('mongoose');

// A story: a single image (with optional caption) that expires after a chosen
// duration (8 / 16 / 24 / 48 hours). We track who viewed it and who liked it.
//
// A TTL index on `expiresAt` makes MongoDB auto-delete the document once it
// expires — so old stories clean themselves up. (Stories added to a Highlight
// are COPIED there, so the highlight survives even after the story expires.)
const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Cloudinary image URL (stories are image-only).
    imageUrl: {
      type: String,
      required: true,
    },
    caption: {
      type: String,
      default: '',
      trim: true,
    },
    // When this story expires and disappears.
    expiresAt: {
      type: Date,
      required: true,
    },
    // Users who have viewed this story (each id appears once).
    viewers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Users who liked the story.
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

// Auto-delete the document at expiresAt (TTL index).
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Story', storySchema);
