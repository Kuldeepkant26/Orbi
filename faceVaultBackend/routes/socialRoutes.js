const express = require('express');
const router = express.Router();
const { authenticate } = require('../utils/middlewares');
const { followUser, unfollowUser } = require('../controllers/socialController');

// All social routes require a valid JWT.
router.use(authenticate);

router.post('/follow/:userId', followUser);     // follow a user
router.delete('/follow/:userId', unfollowUser); // unfollow a user

module.exports = router;
