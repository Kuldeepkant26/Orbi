const mongoose = require('mongoose');

// A comment on a post. Supports nested replies (a comment can reply to another
// comment via `parent`), likes, and pinning (post owner can pin a comment).
const commentSchema = new mongoose.Schema(
  {
    // Which post this comment belongs to.
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    // Who wrote the comment.
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The comment text.
    text: {
      type: String,
      required: true,
      trim: true,
    },
    // The comment this is a reply to (null = a top-level comment). Supports
    // arbitrarily deep threads.
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment',
      default: null,
    },
    // Users who liked this comment.
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Pinned by the post owner (shows at the top). Only top-level comments.
    isPinned: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
