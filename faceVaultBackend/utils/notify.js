const Notification = require('../models/Notification');

// Creates a notification document and, if the recipient is currently online,
// pushes it to them in real time over Socket.IO.
//
// `req` is the Express request — we use it to reach the socket helpers that
// index.js attaches to the app (req.app.get('io') and req.app.get('onlineUsers')).
//
// We never notify a user about their own action (e.g. liking your own post),
// so callers should skip self-actions, but we double-check here too.
async function createNotification(req, { recipient, actor, type, post }) {
  // Don't notify yourself.
  if (String(recipient) === String(actor)) return null;

  const notification = await Notification.create({
    recipient,
    actor,
    type,
    post,
  });

  // Try to deliver it live if the recipient is online.
  try {
    const io = req.app.get('io');
    const onlineUsers = req.app.get('onlineUsers');
    const recipientSocket = onlineUsers?.get(String(recipient));

    if (io && recipientSocket) {
      // Populate the actor so the client can show their name/avatar instantly.
      const populated = await notification.populate('actor', 'name username avatarUrl');
      io.to(recipientSocket).emit('new_notification', populated);
    }
  } catch (err) {
    // Real-time delivery is best-effort; the REST list is the source of truth.
    console.log('notify error:', err.message);
  }

  return notification;
}

module.exports = { createNotification };
