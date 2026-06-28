const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    // Who sent the message
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Who receives the message
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // The message text
    text: {
      type: String,
      required: true,
      trim: true,
    },
    // Has the receiver seen it?
    isRead: {
      type: Boolean,
      default: false,
    },
    // Was it edited?
    isEdited: {
      type: Boolean,
      default: false,
    },
    // Was it deleted? (soft delete — we keep the record but hide text)
    isDeleted: {
      type: Boolean,
      default: false,
    },
    // Emoji reactions. Each entry is one user's single reaction to this message
    // (a user reacting again replaces their previous emoji).
    reactions: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
