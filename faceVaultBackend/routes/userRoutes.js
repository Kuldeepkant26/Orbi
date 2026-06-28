const express = require('express');
const router = express.Router();
const { authenticate } = require('../utils/middlewares');
const {
  getAllUsers,
  getProfile,
  updateMyProfile,
  getUnreadMessageCount,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
} = require('../controllers/userController');

// All routes here require a valid JWT
router.use(authenticate);

router.get('/', getAllUsers);                          // list all users
router.put('/me', updateMyProfile);                    // update my profile (avatar/bio/name)

// Messaging (kept as-is). These literal "messages" paths must be declared
// before the "/:userId/profile" param route so they aren't captured by it.
// "/messages/unread-count" must come BEFORE "/messages/:otherUserId".
router.get('/messages/unread-count', getUnreadMessageCount); // unread DM badge
router.get('/messages/:otherUserId', getMessages);     // get conversation
router.post('/messages', sendMessage);                 // send a message
router.put('/messages/:messageId', editMessage);       // edit a message
router.delete('/messages/:messageId', deleteMessage);  // delete a message

router.get('/:userId/profile', getProfile);            // public profile of a user

module.exports = router;
