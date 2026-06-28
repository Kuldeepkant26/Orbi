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
} = require('../controllers/postController');

// All post routes require a valid JWT.
router.use(authenticate);

router.post('/', createPost);                       // create a post
router.get('/feed', getFeed);                       // my feed (people I follow + me)
router.get('/user/:userId', getUserPosts);          // a user's posts (profile grid)

router.get('/:postId', getPost);                    // single post
router.post('/:postId/like', likePost);             // like a post
router.delete('/:postId/like', unlikePost);         // unlike a post
router.get('/:postId/comments', getComments);       // list comments
router.post('/:postId/comments', addComment);       // add a comment

module.exports = router;
