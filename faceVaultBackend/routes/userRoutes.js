const express = require('express');
const router = express.Router();
const { authenticate } = require('../utils/middlewares');
const {
  getAllUsers,
  getMessages,
  sendMessage,
  editMessage,
  deleteMessage,
} = require('../controllers/userController');

// All routes here require a valid JWT
router.use(authenticate);

router.get('/', getAllUsers);                          // list all users
router.get('/messages/:otherUserId', getMessages);    // get conversation
router.post('/messages', sendMessage);                // send a message
router.put('/messages/:messageId', editMessage);      // edit a message
router.delete('/messages/:messageId', deleteMessage); // delete a message

module.exports = router;
