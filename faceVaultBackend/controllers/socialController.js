const User = require('../models/User');
const Notification = require('../models/Notification');
const { createNotification } = require('../utils/notify');

// POST /api/social/follow/:userId — start following a user.
const followUser = async (req, res) => {
  try {
    const targetId = req.params.userId;
    const myId = req.userId;

    if (String(targetId) === String(myId)) {
      return res.status(400).json({ message: "You can't follow yourself." });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    // Add target to my "following" and add me to their "followers".
    // $addToSet avoids duplicates if the request happens twice.
    await User.findByIdAndUpdate(myId, { $addToSet: { following: targetId } });
    await User.findByIdAndUpdate(targetId, { $addToSet: { followers: myId } });

    // Tell the target someone followed them.
    await createNotification(req, {
      recipient: targetId,
      actor: myId,
      type: 'follow',
    });

    res.json({ following: true });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// DELETE /api/social/follow/:userId — unfollow a user.
const unfollowUser = async (req, res) => {
  try {
    const targetId = req.params.userId;
    const myId = req.userId;

    await User.findByIdAndUpdate(myId, { $pull: { following: targetId } });
    await User.findByIdAndUpdate(targetId, { $pull: { followers: myId } });

    res.json({ following: false });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/notifications — my notifications, newest first.
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('actor', 'name username avatarUrl');

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/notifications/read — mark all my notifications as read.
const markNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.userId, isRead: false },
      { isRead: true }
    );
    res.json({ message: 'All marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
  followUser,
  unfollowUser,
  getNotifications,
  markNotificationsRead,
};
