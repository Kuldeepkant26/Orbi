const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { createNotification } = require('../utils/notify');

// How many posts we return per "page" of the feed.
const PAGE_SIZE = 10;

// Helper: turn a raw post (with author populated) into the exact shape the app
// wants — including whether *I* liked it and how many likes there are. This
// keeps the heavy `likes` array off the wire.
function shapePost(post, myId) {
  return {
    _id: post._id,
    author: post.author, // already populated with {_id, name, username, avatarUrl}
    imageUrl: post.imageUrl,
    caption: post.caption,
    likesCount: post.likes.length,
    likedByMe: post.likes.some((id) => String(id) === String(myId)),
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
  };
}

// POST /api/posts — create a new post.
const createPost = async (req, res) => {
  try {
    const { imageUrl = '', caption = '' } = req.body;

    // A post must have at least an image or some caption text.
    if (!imageUrl && !caption.trim()) {
      return res.status(400).json({ message: 'Post needs an image or some text.' });
    }

    const post = await Post.create({
      author: req.userId,
      imageUrl,
      caption,
    });

    // Keep the author's running post count in sync.
    await User.findByIdAndUpdate(req.userId, { $inc: { postsCount: 1 } });

    const populated = await post.populate('author', 'name username avatarUrl');
    res.status(201).json(shapePost(populated, req.userId));
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/posts/feed?page=1 — posts from people I follow + my own, newest first.
const getFeed = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);

    // Build the list of authors whose posts I should see: me + everyone I follow.
    const me = await User.findById(req.userId).select('following');
    const authorIds = [req.userId, ...(me?.following || [])];

    const posts = await Post.find({ author: { $in: authorIds } })
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .populate('author', 'name username avatarUrl');

    res.json(posts.map((p) => shapePost(p, req.userId)));
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/posts/user/:userId — all posts by one user (for their profile grid).
const getUserPosts = async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
      .sort({ createdAt: -1 })
      .populate('author', 'name username avatarUrl');

    res.json(posts.map((p) => shapePost(p, req.userId)));
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/posts/:postId — a single post.
const getPost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate(
      'author',
      'name username avatarUrl'
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });

    res.json(shapePost(post, req.userId));
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/posts/:postId/like — like a post.
const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const alreadyLiked = post.likes.some((id) => String(id) === String(req.userId));
    if (!alreadyLiked) {
      post.likes.push(req.userId);
      await post.save();

      // Notify the post's author (unless they liked their own post).
      await createNotification(req, {
        recipient: post.author,
        actor: req.userId,
        type: 'like',
        post: post._id,
      });
    }

    res.json({ likesCount: post.likes.length, likedByMe: true });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// DELETE /api/posts/:postId/like — unlike a post.
const unlikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.likes = post.likes.filter((id) => String(id) !== String(req.userId));
    await post.save();

    res.json({ likesCount: post.likes.length, likedByMe: false });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// GET /api/posts/:postId/comments — list a post's comments (oldest first).
const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })
      .populate('author', 'name username avatarUrl');

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/posts/:postId/comments — add a comment.
const addComment = async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment cannot be empty.' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({
      post: post._id,
      author: req.userId,
      text,
    });

    // Keep the post's comment count in sync.
    post.commentsCount += 1;
    await post.save();

    // Notify the post's author.
    await createNotification(req, {
      recipient: post.author,
      actor: req.userId,
      type: 'comment',
      post: post._id,
    });

    const populated = await comment.populate('author', 'name username avatarUrl');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
  createPost,
  getFeed,
  getUserPosts,
  getPost,
  likePost,
  unlikePost,
  getComments,
  addComment,
};
