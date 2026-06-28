const mongoose = require('mongoose');

// A single post in the feed. Like an Instagram post but photos + text only
// (no video). The image is optional so users can also share text-only posts.
const postSchema = new mongoose.Schema(
  {
    // Who created the post.
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Cloudinary image URL. Empty = a text-only post.
    // Kept for backward compatibility / single-image posts; for multi-image
    // posts this holds the first image so older clients still render something.
    imageUrl: {
      type: String,
      default: '',
    },
    // All Cloudinary image URLs for the post (carousel). For a single-image
    // post this has one entry; empty for text-only posts.
    imageUrls: {
      type: [String],
      default: [],
    },
    // The caption / text body.
    caption: {
      type: String,
      default: '',
      trim: true,
    },
    // Array of user ids who liked this post. We store the ids (not just a count)
    // so we can tell whether the current user has already liked it.
    likes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    // Running count of comments (kept in sync when comments are added) so the
    // feed doesn't have to count Comment documents on every render.
    commentsCount: {
      type: Number,
      default: 0,
    },
    // Moderation: a superadmin can hide a post. Hidden posts are excluded from
    // feeds and profile grids but kept in the database.
    isHidden: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
