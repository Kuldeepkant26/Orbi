const User = require('../models/User');
const Message = require('../models/Message');

// GET /api/users — return all users except the logged-in one
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({
      _id: { $ne: req.userId },
      isBanned: { $ne: true }, // hide banned users from search
      isDeleted: { $ne: true }, // hide deleted accounts
    }).select('firstName lastName name username email avatarUrl bio');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/users/messages/unread-count — total unread messages sent TO me,
// plus a per-sender breakdown so the messages list can show per-chat badges.
const getUnreadMessageCount = async (req, res) => {
  try {
    const myId = req.userId;
    const unread = await Message.find({
      receiver: myId,
      isRead: false,
      isDeleted: { $ne: true },
    }).select('sender');

    // Count per sender.
    const bySender = {};
    for (const m of unread) {
      const s = String(m.sender);
      bySender[s] = (bySender[s] || 0) + 1;
    }

    res.json({ count: unread.length, bySender });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/users/conversations — the people I've chatted with, newest first.
// For each conversation partner returns their basic info, the last message, and
// how many messages from them I haven't read (for the DM list / badges).
const getConversations = async (req, res) => {
  try {
    const mongoose = require('mongoose');
    const myId = new mongoose.Types.ObjectId(req.userId);

    // Group every message into a conversation keyed by "the other person", and
    // keep the most recent message + a running unread count.
    const convos = await Message.aggregate([
      { $match: { $or: [{ sender: myId }, { receiver: myId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$sender', myId] }, '$receiver', '$sender'],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', myId] },
                    { $eq: ['$isRead', false] },
                    { $ne: ['$isDeleted', true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { 'lastMessage.createdAt': -1 } },
    ]);

    // Attach the other user's public info (skip banned/deleted users).
    const otherIds = convos.map(c => c._id);
    const users = await User.find({
      _id: { $in: otherIds },
      isBanned: { $ne: true },
      isDeleted: { $ne: true },
    }).select('firstName lastName name username email avatarUrl');

    const userMap = {};
    users.forEach(u => {
      userMap[String(u._id)] = u;
    });

    const result = convos
      .filter(c => userMap[String(c._id)]) // drop convos with gone users
      .map(c => {
        const u = userMap[String(c._id)];
        const lm = c.lastMessage;
        return {
          user: {
            _id: u._id,
            name: u.name,
            username: u.username,
            email: u.email,
            avatarUrl: u.avatarUrl,
          },
          lastMessage: {
            text: lm.isDeleted ? 'Message deleted' : lm.text,
            createdAt: lm.createdAt,
            fromMe: String(lm.sender) === String(req.userId),
          },
          unreadCount: c.unreadCount,
        };
      });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/users/:userId/followers — the list of a user's followers.
// GET /api/users/:userId/following — the list of who a user follows.
// `kind` (from the route) is 'followers' or 'following'.
const getConnections = (kind) => async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(kind);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const people = await User.find({
      _id: { $in: user[kind] },
      isBanned: { $ne: true },
      isDeleted: { $ne: true },
    }).select('name username avatarUrl bio');

    res.json(people);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/users/:userId/profile — public profile of a user (for the profile screen).
// Returns their basic info, follower/following/post counts, and whether *I*
// currently follow them (so the app can show "Follow" vs "Following").
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    // A deleted account is invisible to everyone (admins use the admin endpoint).
    if (user.isDeleted) return res.status(404).json({ message: 'User not found' });

    const isFollowedByMe = user.followers.some(
      (id) => String(id) === String(req.userId)
    );

    res.json({
      _id: user._id,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      name: user.name,
      username: user.username || '',
      email: user.email,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      postsCount: user.postsCount,
      followersCount: user.followers.length,
      followingCount: user.following.length,
      isFollowedByMe,
      isMe: String(user._id) === String(req.userId),
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// PUT /api/users/me — update my own profile (avatar + bio + first/last name).
const updateMyProfile = async (req, res) => {
  try {
    const { firstName, lastName, bio, avatarUrl } = req.body;

    // Load the doc so the pre-save hook recomputes the derived `name`.
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (typeof firstName === 'string' && firstName.trim()) {
      user.firstName = firstName.trim();
    }
    if (typeof lastName === 'string') user.lastName = lastName.trim();
    if (typeof bio === 'string') user.bio = bio;
    if (typeof avatarUrl === 'string') user.avatarUrl = avatarUrl;

    await user.save();

    const safe = user.toObject();
    delete safe.password;
    res.json(safe);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/users/messages/:otherUserId — fetch conversation between two users
const getMessages = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const myId = req.userId;

    const messages = await Message.find({
      $or: [
        { sender: myId, receiver: otherUserId },
        { sender: otherUserId, receiver: myId },
      ],
    }).sort({ createdAt: 1 }); // oldest first

    // Mark all unread messages (sent to me) as read
    await Message.updateMany(
      { sender: otherUserId, receiver: myId, isRead: false },
      { isRead: true }
    );

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/users/messages — send a new message
const sendMessage = async (req, res) => {
  try {
    const { receiverId, text } = req.body;

    const message = await Message.create({
      sender: req.userId,
      receiver: receiverId,
      text,
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// PUT /api/users/messages/:messageId — edit a message
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await Message.findOne({
      _id: messageId,
      sender: req.userId, // only the sender can edit
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or not yours' });
    }

    message.text = text;
    message.isEdited = true;
    await message.save();

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// DELETE /api/users/messages/:messageId — soft-delete a message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findOne({
      _id: messageId,
      sender: req.userId, // only the sender can delete
    });

    if (!message) {
      return res.status(404).json({ message: 'Message not found or not yours' });
    }

    message.isDeleted = true;
    await message.save();

    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
  getAllUsers,
  getProfile,
  updateMyProfile,
  getUnreadMessageCount,
  getConversations,
  getConnections,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
};
