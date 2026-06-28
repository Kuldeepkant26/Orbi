const Story = require('../models/Story');
const User = require('../models/User');

// Allowed story durations (hours). The app sends one of these.
const ALLOWED_HOURS = [8, 16, 24, 48];

// POST /api/stories — create a story. Body: { imageUrl, caption?, durationHours }
const createStory = async (req, res) => {
  try {
    const { imageUrl, caption = '', durationHours = 24 } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ message: 'A story needs an image.' });
    }
    const hours = ALLOWED_HOURS.includes(Number(durationHours))
      ? Number(durationHours)
      : 24;

    const story = await Story.create({
      author: req.userId,
      imageUrl,
      caption,
      expiresAt: new Date(Date.now() + hours * 60 * 60 * 1000),
    });
    res.status(201).json(story);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/stories/feed — the story tray: every author who has an ACTIVE story,
// with whether I've seen all of theirs. Stories are public, so this returns all
// non-expired stories grouped by author. My own stories come first.
const getStoryFeed = async (req, res) => {
  try {
    const now = new Date();
    const stories = await Story.find({ expiresAt: { $gt: now } })
      .sort({ createdAt: 1 })
      .populate('author', 'name username avatarUrl');

    // Group by author.
    const groups = {};
    for (const s of stories) {
      const a = s.author;
      if (!a) continue;
      const key = String(a._id);
      if (!groups[key]) {
        groups[key] = {
          author: { _id: a._id, name: a.name, username: a.username, avatarUrl: a.avatarUrl },
          count: 0,
          // "seen" = I've viewed every one of this author's active stories.
          allSeen: true,
          latestAt: s.createdAt,
        };
      }
      groups[key].count += 1;
      groups[key].latestAt = s.createdAt;
      const seen = s.viewers.some(v => String(v) === String(req.userId));
      if (!seen) groups[key].allSeen = false;
    }

    let list = Object.values(groups);
    // My own ring first, then unseen, then by most recent.
    const myId = String(req.userId);
    list.sort((a, b) => {
      if (String(a.author._id) === myId) return -1;
      if (String(b.author._id) === myId) return 1;
      if (a.allSeen !== b.allSeen) return a.allSeen ? 1 : -1;
      return new Date(b.latestAt) - new Date(a.latestAt);
    });

    res.json(list);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/stories/user/:userId — one author's active stories (for the viewer).
const getUserStories = async (req, res) => {
  try {
    const now = new Date();
    const stories = await Story.find({
      author: req.params.userId,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: 1 })
      .populate('author', 'name username avatarUrl');

    const myId = String(req.userId);
    res.json(
      stories.map(s => ({
        _id: s._id,
        author: s.author,
        imageUrl: s.imageUrl,
        caption: s.caption,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        likesCount: s.likes.length,
        likedByMe: s.likes.some(l => String(l) === myId),
        viewsCount: s.viewers.length,
        isMine: String(s.author._id) === myId,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/stories/:storyId/view — record that I viewed a story.
const viewStory = async (req, res) => {
  try {
    await Story.updateOne(
      { _id: req.params.storyId },
      { $addToSet: { viewers: req.userId } }
    );
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST/DELETE /api/stories/:storyId/like
const likeStory = async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId);
    if (!story) return res.status(404).json({ message: 'Story not found' });

    const liked = story.likes.some(l => String(l) === String(req.userId));
    if (req.method === 'POST' && !liked) story.likes.push(req.userId);
    if (req.method === 'DELETE') {
      story.likes = story.likes.filter(l => String(l) !== String(req.userId));
    }
    await story.save();
    res.json({ likesCount: story.likes.length, likedByMe: req.method === 'POST' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/stories/:storyId/viewers — who viewed my story (author only).
const getStoryViewers = async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate('viewers', 'name username avatarUrl')
      .populate('likes', '_id');
    if (!story) return res.status(404).json({ message: 'Story not found' });
    if (String(story.author) !== String(req.userId)) {
      return res.status(403).json({ message: 'Not your story.' });
    }

    const likedIds = new Set(story.likes.map(l => String(l._id)));
    res.json({
      viewsCount: story.viewers.length,
      viewers: story.viewers.map(v => ({
        _id: v._id,
        name: v.name,
        username: v.username,
        avatarUrl: v.avatarUrl,
        liked: likedIds.has(String(v._id)),
      })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/stories/mine — my own active stories (for adding to highlights).
const getMyStories = async (req, res) => {
  try {
    const stories = await Story.find({
      author: req.userId,
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });
    res.json(stories);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// DELETE /api/stories/:storyId — delete my own story.
const deleteStory = async (req, res) => {
  try {
    const story = await Story.findOne({ _id: req.params.storyId, author: req.userId });
    if (!story) return res.status(404).json({ message: 'Story not found' });
    await story.deleteOne();
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
  createStory,
  getStoryFeed,
  getUserStories,
  viewStory,
  likeStory,
  getStoryViewers,
  getMyStories,
  deleteStory,
};
