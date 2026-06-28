const User = require('../models/User');
const Post = require('../models/Post');

// All handlers here are protected by requireSuperadmin (see adminRoutes.js),
// so we can assume the caller is a superadmin.

// GET /api/admin/users — every user, with moderation-relevant fields.
const listUsers = async (req, res) => {
  try {
    const users = await User.find({})
      .select('firstName lastName name username email avatarUrl role isBanned banReason banExpires createdAt')
      .sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/admin/users/:userId/ban — ban a user.
// Body: { reason: string, durationDays: number | null }
//   durationDays = null  → permanent ban
//   durationDays = 1/7/30 → ban that long from now
const banUser = async (req, res) => {
  try {
    const { reason = '', durationDays = null } = req.body;
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Don't allow banning another superadmin (or yourself).
    if (user.role === 'superadmin') {
      return res.status(400).json({ message: 'You cannot ban an admin.' });
    }

    user.isBanned = true;
    user.banReason = reason;
    user.banExpires =
      durationDays != null
        ? new Date(Date.now() + Number(durationDays) * 24 * 60 * 60 * 1000)
        : null; // permanent
    await user.save();

    res.json({
      message: 'User banned',
      isBanned: true,
      banReason: user.banReason,
      banExpires: user.banExpires,
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/admin/users/:userId/unban — lift a ban.
const unbanUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBanned = false;
    user.banReason = '';
    user.banExpires = null;
    await user.save();

    res.json({ message: 'User unbanned', isBanned: false });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/admin/posts — all posts (including hidden) for moderation.
const listPosts = async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('author', 'firstName lastName name username avatarUrl');
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/admin/posts/:postId/hide  (body: { hidden: boolean }) — hide/unhide.
const setPostHidden = async (req, res) => {
  try {
    const { hidden = true } = req.body;
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      { isHidden: !!hidden },
      { new: true }
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ message: hidden ? 'Post hidden' : 'Post shown', isHidden: post.isHidden });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// DELETE /api/admin/posts/:postId — permanently delete a post.
const deletePost = async (req, res) => {
  try {
    const post = await Post.findByIdAndDelete(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Keep the author's post count in sync (don't go below 0).
    await User.findByIdAndUpdate(post.author, { $inc: { postsCount: -1 } });
    await User.updateOne(
      { _id: post.author, postsCount: { $lt: 0 } },
      { postsCount: 0 }
    );

    res.json({ message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
  listUsers,
  banUser,
  unbanUser,
  listPosts,
  setPostHidden,
  deletePost,
};
