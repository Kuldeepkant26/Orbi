const express = require('express');
const router = express.Router();
const { authenticate } = require('../utils/middlewares');
const {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationsRead,
} = require('../controllers/socialController');

// All notification routes require a valid JWT.
router.use(authenticate);

router.get('/', getNotifications);                    // my notifications, newest first
router.get('/unread-count', getUnreadNotificationCount); // unread badge count
router.post('/read', markNotificationsRead);          // mark all as read

module.exports = router;
