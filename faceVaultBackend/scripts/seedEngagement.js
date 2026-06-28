// ── Seed likes + threaded comments on the bot posts ───────────────────────────
//
//   node scripts/seedEngagement.js
//
// Adds realistic likes and a small comment thread (with a reply and a pinned
// comment) to each bot's posts, so the feed and the comments sheet look alive.
// Idempotent: skips a post that already has comments.

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// A pool of believable comments + replies to sprinkle around.
const COMMENTS = [
  'This is amazing! 🔥',
  'Love this 😍',
  'Goals honestly',
  'Where is this?? 👀',
  'So good 👏',
  'Obsessed with this',
  'Need to try this',
  'Incredible shot 📸',
  'You never miss 🙌',
];
const REPLIES = [
  'Right?! 😄',
  'Thank you! 🙏',
  'Haha appreciate it',
  'You should!',
  'Means a lot 🤍',
];

const rand = arr => arr[Math.floor(Math.random() * arr.length)];

async function run() {
  await mongoose.connect(process.env.MONGO_URL);
  console.log('Connected to DB');

  const bots = await User.find({ email: /@orbi\.test$/ });
  if (bots.length < 2) {
    console.log('Not enough bots found. Run seedBots.js first.');
    return mongoose.disconnect();
  }
  const botIds = bots.map(b => b._id);

  const posts = await Post.find({ author: { $in: botIds } });
  console.log(`Found ${posts.length} bot posts.`);

  let likesAdded = 0;
  let commentsAdded = 0;

  for (const post of posts) {
    // ── Likes: a random subset of other bots like this post ──────────────────
    const likers = botIds.filter(
      id => String(id) !== String(post.author)
    );
    // like with ~60% of the others
    const chosen = likers.filter(() => Math.random() < 0.6);
    post.likes = [...new Set([...post.likes.map(String), ...chosen.map(String)])];

    // ── Comments: skip if this post already has some ─────────────────────────
    const existing = await Comment.countDocuments({ post: post._id });
    if (existing === 0) {
      const commenters = likers.filter(() => Math.random() < 0.5).slice(0, 3);
      let first = null;
      for (let i = 0; i < commenters.length; i++) {
        const c = await Comment.create({
          post: post._id,
          author: commenters[i],
          text: rand(COMMENTS),
          isPinned: i === 0, // pin the first comment (by the post owner's choice)
        });
        commentsAdded += 1;
        if (i === 0) first = c;

        // The post author replies to the first comment.
        if (i === 0) {
          await Comment.create({
            post: post._id,
            author: post.author,
            text: rand(REPLIES),
            parent: c._id,
          });
          commentsAdded += 1;
        }
      }
      // A reply-to-the-reply (deep thread) on the first comment, occasionally.
      if (first && Math.random() < 0.5 && commenters[1]) {
        await Comment.create({
          post: post._id,
          author: commenters[1],
          text: rand(REPLIES),
          parent: first._id,
        });
        commentsAdded += 1;
      }
    }

    // Keep the post's commentsCount in sync with reality.
    post.commentsCount = await Comment.countDocuments({ post: post._id });
    await post.save();
    likesAdded += chosen.length;
  }

  console.log(`Added ~${likesAdded} likes and ${commentsAdded} comments.`);
  await mongoose.disconnect();
  console.log('Done.');
}

run().catch(err => {
  console.error('Seed failed:', err);
  process.exit(1);
});
