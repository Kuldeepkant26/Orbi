const mongoose = require('mongoose');

// A comment on a post.
const commentSchema = new mongoose.Schema(
  {
    // Which post this comment belongs to.
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
