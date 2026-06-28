const express = require('express');
const router = express.Router();
const { authenticate } = require('../utils/middlewares');
const {
  createPost,
  getFeed,
  getUserPosts,
  getPost,
  likePost,
  unlikePost,
  getComments,
  addComment,
  likeComment,
  pinComment,
} = require('../controllers/postController');

// All post routes require a valid JWT.
router.use(authenticate);

router.post('/', createPost);                       // create a post
router.get('/feed', getFeed);                       // my feed (people I follow + me)
router.get('/user/:userId', getUserPosts);          // a user's posts (profile grid)

// Comment like/pin — literal "comments" segment first so these don't collide
// with the "/:postId/..." routes below.
router.post('/comments/:commentId/like', likeComment);   // like a comment
router.delete('/comments/:commentId/like', likeComment); // unlike a comment
router.post('/comments/:commentId/pin', pinComment);     // pin/unpin (owner only)

router.get('/:postId', getPost);                    // single post
router.post('/:postId/like', likePost);             // like a post
router.delete('/:postId/like', unlikePost);         // unlike a post
router.get('/:postId/comments', getComments);       // list comments
router.post('/:postId/comments', addComment);       // add a comment / reply

module.exports = router;
