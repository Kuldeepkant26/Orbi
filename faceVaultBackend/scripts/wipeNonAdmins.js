// ── One-time cleanup: delete all non-admin users and their data ───────────────
//
//   node scripts/wipeNonAdmins.js
//
// Removes every user whose role is NOT 'superadmin', plus everything they own:
// posts, comments, messages, notifications, reports. Also strips them out of any
// remaining followers/following arrays. IRREVERSIBLE — run intentionally.

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Message = require('../models/Message');
const Notification = require('../models/Notification');
const Report = require('../models/Report');

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to DB');

  // The accounts we KEEP.
  const admins = await User.find({ role: 'superadmin' }).select('_id');
  const adminIds = admins.map(a => a._id);
  console.log(`Keeping ${adminIds.length} admin account(s).`);

  // The users to delete (everyone who isn't an admin).
  const victims = await User.find({ role: { $ne: 'superadmin' } }).select('_id');
  const victimIds = victims.map(v => v._id);
  console.log(`Deleting ${victimIds.length} user(s) and their data...`);

  if (victimIds.length > 0) {
    // Their content.
    const posts = await Post.deleteMany({ author: { $in: victimIds } });
    const comments = await Comment.deleteMany({ author: { $in: victimIds } });
    const messages = await Message.deleteMany({
      $or: [{ sender: { $in: victimIds } }, { receiver: { $in: victimIds } }],
    });
    const notifs = await Notification.deleteMany({
      $or: [{ recipient: { $in: victimIds } }, { actor: { $in: victimIds } }],
    });
    const reports = await Report.deleteMany({ reporter: { $in: victimIds } });

    // The user docs themselves.
    const users = await User.deleteMany({ _id: { $in: victimIds } });

    // Clean any references to deleted users out of the admins' follow arrays.
    await User.updateMany(
      {},
      {
        $pull: {
          followers: { $in: victimIds },
          following: { $in: victimIds },
        },
      }
    );

    console.log('Deleted:', {
      users: users.deletedCount,
      posts: posts.deletedCount,
      comments: comments.deletedCount,
      messages: messages.deletedCount,
      notifications: notifs.deletedCount,
      reports: reports.deletedCount,
    });
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Wipe failed:', err);
  process.exit(1);
});
