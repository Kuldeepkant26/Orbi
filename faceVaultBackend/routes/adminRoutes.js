const express = require('express');
const router = express.Router();
const { authenticate, requireSuperadmin } = require('../utils/middlewares');
const {
  listUsers,
  getUserDetail,
  softDeleteUser,
  restoreUser,
  banUser,
  unbanUser,
  listPosts,
  setPostHidden,
  deletePost,
} = require('../controllers/adminController');
const {
  adminListReports,
  adminReplyReport,
} = require('../controllers/reportController');

// Every admin route requires a valid token AND a superadmin role.
router.use(authenticate);
router.use(requireSuperadmin);

router.get('/users', listUsers);
router.get('/users/:userId', getUserDetail);
router.post('/users/:userId/ban', banUser);
router.post('/users/:userId/unban', unbanUser);
router.post('/users/:userId/delete', softDeleteUser);
router.post('/users/:userId/restore', restoreUser);

router.get('/posts', listPosts);
router.post('/posts/:postId/hide', setPostHidden);
router.delete('/posts/:postId', deletePost);

router.get('/reports', adminListReports);
router.post('/reports/:reportId/reply', adminReplyReport);

module.exports = router;
