const mongoose = require('mongoose');

// A profile Highlight: a named, permanent collection of story snapshots. When a
// user adds a story to a highlight we COPY its image into here, so the highlight
// keeps working even after the original story expires.
const highlightSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // The cover image shown as the highlight circle on the profile.
    coverUrl: {
      type: String,
      default: '',
    },
    // The saved story snapshots (image + caption), newest last.
    items: [
      {
        imageUrl: { type: String, required: true },
        caption: { type: String, default: '' },
        addedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Highlight', highlightSchema);
