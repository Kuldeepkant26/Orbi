const express = require('express');
const router = express.Router();
const { authenticate } = require('../utils/middlewares');
const {
  createHighlight,
  addToHighlight,
  getUserHighlights,
  deleteHighlight,
} = require('../controllers/highlightController');

router.use(authenticate);

router.post('/', createHighlight);                 // create a highlight
router.post('/:id/items', addToHighlight);         // add a story snapshot
router.get('/user/:userId', getUserHighlights);    // a user's highlights
router.delete('/:id', deleteHighlight);            // delete my highlight

module.exports = router;
