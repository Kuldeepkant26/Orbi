const mongoose = require('mongoose');

// A user-submitted issue or suggestion ("Report an issue" in the sidebar).
// Superadmins can read these and reply; the reporter sees the reply in their
// own "My Reports" view.
const reportSchema = new mongoose.Schema(
  {
    // Who submitted it.
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // What kind of report.
    category: {
      type: String,
      enum: ['bug', 'suggestion', 'abuse', 'other'],
      default: 'other',
    },
    // The body of the report.
    message: {
      type: String,
      required: true,
      trim: true,
    },
    // 'open' until an admin replies/resolves it.
    status: {
      type: String,
      enum: ['open', 'resolved'],
      default: 'open',
    },
    // The superadmin's reply (empty until they respond).
    adminReply: {
      type: String,
      default: '',
      trim: true,
    },
    // Has the reporter seen the admin's reply yet?
    replySeen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', reportSchema);
