const mongoose = require('mongoose');

// A notification tells a user that someone interacted with them:
//   - "follow"  → someone started following you
//   - "like"    → someone liked your post
//   - "comment" → someone commented on your post
const notificationSchema = new mongoose.Schema(
  {
    // Who should SEE this notification (the user being notified).
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true, // we always query "give me MY notifications", so index it
    },
    // Who performed the action (followed/liked/commented).
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // What kind of notification it is.
    type: {
      type: String,
      enum: ['follow', 'like', 'comment'],
      required: true,
    },
    // The related post (for like/comment notifications). Not set for follows.
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
    },
    // Has the recipient seen it yet?
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
