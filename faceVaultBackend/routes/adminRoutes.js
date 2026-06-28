const express = require('express');
const router = express.Router();
const { authenticate, requireSuperadmin } = require('../utils/middlewares');
const {
  listUsers,
  banUser,
  unbanUser,
  listPosts,
  setPostHidden,
  deletePost,
} = require('../controllers/adminController');

// Every admin route requires a valid token AND a superadmin role.
router.use(authenticate);
router.use(requireSuperadmin);

router.get('/users', listUsers);
router.post('/users/:userId/ban', banUser);
router.post('/users/:userId/unban', unbanUser);

router.get('/posts', listPosts);
router.post('/posts/:postId/hide', setPostHidden);
router.delete('/posts/:postId', deletePost);

module.exports = router;
