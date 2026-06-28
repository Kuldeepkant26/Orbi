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

    const posts = await Post.find({
      author: { $in: authorIds },
      isHidden: { $ne: true }, // exclude moderator-hidden posts
    })
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
    const posts = await Post.find({
      author: req.params.userId,
      isHidden: { $ne: true }, // exclude moderator-hidden posts
    })
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

// GET /api/posts/:postId/likers — the people who liked a post.
const getPostLikers = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).populate(
      'likes',
      'name username avatarUrl bio isBanned isDeleted'
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });

    // Hide banned/deleted users from the list.
    const likers = post.likes
      .filter(u => !u.isBanned && !u.isDeleted)
      .map(u => ({
        _id: u._id,
        name: u.name,
        username: u.username,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
      }));
    res.json(likers);
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

// Shape a comment for the client (likes → count + likedByMe).
function shapeComment(c, myId) {
  return {
    _id: c._id,
    post: c.post,
    author: c.author,
    text: c.text,
    parent: c.parent || null,
    isPinned: c.isPinned,
    likesCount: c.likes.length,
    likedByMe: c.likes.some(id => String(id) === String(myId)),
    createdAt: c.createdAt,
  };
}

// GET /api/posts/:postId/comments — all of a post's comments (flat list; the
// app builds the reply tree from `parent`). Pinned first, then oldest-first.
const getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ isPinned: -1, createdAt: 1 })
      .populate('author', 'name username avatarUrl');

    res.json(comments.map(c => shapeComment(c, req.userId)));
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/posts/:postId/comments — add a comment or reply.
// Body: { text, parentId? }  (parentId set = it's a reply)
const addComment = async (req, res) => {
  try {
    const { text, parentId = null } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment cannot be empty.' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = await Comment.create({
      post: post._id,
      author: req.userId,
      text,
      parent: parentId || null,
    });

    // Keep the post's comment count in sync (replies count too).
    post.commentsCount += 1;
    await post.save();

    // Notify the post's author about a new comment.
    await createNotification(req, {
      recipient: post.author,
      actor: req.userId,
      type: 'comment',
      post: post._id,
    });
    // If it's a reply, also notify the parent comment's author.
    if (parentId) {
      const parent = await Comment.findById(parentId).select('author');
      if (parent) {
        await createNotification(req, {
          recipient: parent.author,
          actor: req.userId,
          type: 'comment',
          post: post._id,
        });
      }
    }

    const populated = await comment.populate('author', 'name username avatarUrl');
    res.status(201).json(shapeComment(populated, req.userId));
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST/DELETE /api/posts/comments/:commentId/like — like / unlike a comment.
const likeComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const liked = comment.likes.some(id => String(id) === String(req.userId));
    if (req.method === 'POST' && !liked) comment.likes.push(req.userId);
    if (req.method === 'DELETE') {
      comment.likes = comment.likes.filter(id => String(id) !== String(req.userId));
    }
    await comment.save();
    res.json({ likesCount: comment.likes.length, likedByMe: req.method === 'POST' });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

// POST /api/posts/comments/:commentId/pin — pin/unpin a comment (post owner only).
// Body: { pin: boolean }
const pinComment = async (req, res) => {
  try {
    const { pin = true } = req.body;
    const comment = await Comment.findById(req.params.commentId).populate('post', 'author');
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    // Only the post's owner can pin comments on it.
    if (String(comment.post.author) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only the post owner can pin comments.' });
    }
    // Only top-level comments can be pinned.
    if (comment.parent) {
      return res.status(400).json({ message: 'You can only pin top-level comments.' });
    }

    // One pinned comment at a time per post: unpin others when pinning.
    if (pin) {
      await Comment.updateMany(
        { post: comment.post._id, isPinned: true },
        { isPinned: false }
      );
    }
    comment.isPinned = !!pin;
    await comment.save();
    res.json({ isPinned: comment.isPinned });
  } catch (error) {
    res.status(500).json({ message: 'Something went wrong', error: error.message });
  }
};

module.exports = {
  createPost,
  getFeed,
  getUserPosts,
  getPost,
  getPostLikers,
  likePost,
  unlikePost,
  getComments,
  addComment,
  likeComment,
  pinComment,
};
