const express = require('express');
const router = express.Router();
const { authenticate } = require('../utils/middlewares');
const {
  createStory,
  getStoryFeed,
  getUserStories,
  viewStory,
  likeStory,
  getStoryViewers,
  getMyStories,
  deleteStory,
} = require('../controllers/storyController');

router.use(authenticate);

router.post('/', createStory);                  // create a story
router.get('/feed', getStoryFeed);              // story tray (authors with active stories)
router.get('/mine', getMyStories);              // my active stories (for highlights)
router.get('/user/:userId', getUserStories);    // one author's active stories
router.post('/:storyId/view', viewStory);       // mark viewed
router.post('/:storyId/like', likeStory);       // like
router.delete('/:storyId/like', likeStory);     // unlike
router.get('/:storyId/viewers', getStoryViewers); // who viewed (author only)
router.delete('/:storyId', deleteStory);        // delete my story

module.exports = router;
