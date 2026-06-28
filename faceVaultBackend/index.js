require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const Message = require('./models/Message');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const socialRoutes = require('./routes/socialRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const app = express();
const server = http.createServer(app); // wrap express in a raw http server for socket.io

// Allow all origins for dev (tighten this in production)
const io = new Server(server, {
  cors: { origin: '*' },
});

const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ── REST routes ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('Orbi API'));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/notifications', notificationRoutes);

// ── Database ─────────────────────────────────────────────────────────────────
async function dbConnection() {
  try {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('Connected to DB');
  } catch (error) {
    console.log('DB connection error:', error.message);
  }
}
dbConnection();

// ── Socket.IO ─────────────────────────────────────────────────────────────────
// Keep a map of  userId → socketId  so we know where to deliver messages
const onlineUsers = new Map(); // userId -> socketId

// Make the socket server and the online-users map reachable from REST
// controllers (via req.app.get(...)) so they can push live notifications.
app.set('io', io);
app.set('onlineUsers', onlineUsers);

io.use((socket, next) => {
  // Client must send their JWT as a query param: io('url', { query: { token } })
  const token = socket.handshake.query.token;
  if (!token) return next(new Error('Authentication error'));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId; // attach userId to every socket
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;
  onlineUsers.set(userId, socket.id);

  // Tell everyone who just came online
  io.emit('user_online', userId);
  // Send the newly connected user the full online list
  socket.emit('online_users', Array.from(onlineUsers.keys()));

  console.log(`User connected: ${userId}`);

  // ── Send a new message ───────────────────────────────────────────────────
  socket.on('send_message', async ({ receiverId, text }) => {
    try {
      const message = await Message.create({
        sender: userId,
        receiver: receiverId,
        text,
        
      });

      // Deliver to receiver if they are online
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) {
        io.to(receiverSocket).emit('receive_message', message);
      }

      // Echo back to sender so both sides stay in sync
      socket.emit('message_sent', message);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ── Edit a message ───────────────────────────────────────────────────────
  socket.on('edit_message', async ({ messageId, text, receiverId }) => {
    try {
      const message = await Message.findOne({ _id: messageId, sender: userId });
      if (!message) return socket.emit('error', { message: 'Not found' });

      message.text = text;
      message.isEdited = true;
      await message.save();

      // Notify both sides
      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) io.to(receiverSocket).emit('message_edited', message);
      socket.emit('message_edited', message);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ── Delete a message ─────────────────────────────────────────────────────
  socket.on('delete_message', async ({ messageId, receiverId }) => {
    try {
      const message = await Message.findOne({ _id: messageId, sender: userId });
      if (!message) return socket.emit('error', { message: 'Not found' });

      message.isDeleted = true;
      await message.save();

      const receiverSocket = onlineUsers.get(receiverId);
      if (receiverSocket) io.to(receiverSocket).emit('message_deleted', message);
      socket.emit('message_deleted', message);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ── Mark messages as read ────────────────────────────────────────────────
  socket.on('mark_read', async ({ senderId }) => {
    try {
      await Message.updateMany(
        { sender: senderId, receiver: userId, isRead: false },
        { isRead: true }
      );

      // Notify the original sender their messages were read
      const senderSocket = onlineUsers.get(senderId);
      if (senderSocket) {
        io.to(senderSocket).emit('messages_read', { by: userId });
      }
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ── WebRTC Signaling ──────────────────────────────────────────────────────
  // How a call works:
  //   1. Caller  → server: "call_user"       → server → Callee: "incoming_call"
  //   2. Callee  → server: "answer_call"     → server → Caller: "call_answered"
  //   3. Callee  → server: "reject_call"     → server → Caller: "call_rejected"
  //   4. Either  → server: "ice_candidate"   → server → Other:  "ice_candidate"
  //   5. Either  → server: "end_call"        → server → Other:  "call_ended"
  //
  // The server is just a relay — all the SDP/ICE data passes through unchanged.

  socket.on('call_user', ({ to, offer, callerName }) => {
    const toSocket = onlineUsers.get(to);
    if (toSocket) {
      io.to(toSocket).emit('incoming_call', { from: userId, callerName, offer });
    } else {
      // Callee is offline
      socket.emit('call_rejected', { reason: 'User is offline' });
    }
  });

  socket.on('answer_call', ({ to, answer }) => {
    const toSocket = onlineUsers.get(to);
    if (toSocket) io.to(toSocket).emit('call_answered', { answer });
  });

  socket.on('reject_call', ({ to }) => {
    const toSocket = onlineUsers.get(to);
    if (toSocket) io.to(toSocket).emit('call_rejected', { reason: 'User declined' });
  });

  socket.on('ice_candidate', ({ to, candidate }) => {
    const toSocket = onlineUsers.get(to);
    if (toSocket) io.to(toSocket).emit('ice_candidate', { candidate });
  });

  socket.on('end_call', ({ to }) => {
    const toSocket = onlineUsers.get(to);
    if (toSocket) io.to(toSocket).emit('call_ended');
  });

  // ── Typing indicator ─────────────────────────────────────────────────────
  socket.on('typing_start', ({ receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) io.to(receiverSocket).emit('user_typing', { userId });
  });

  socket.on('typing_stop', ({ receiverId }) => {
    const receiverSocket = onlineUsers.get(receiverId);
    if (receiverSocket) io.to(receiverSocket).emit('user_stopped_typing', { userId });
  });

  // ── Disconnect ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    onlineUsers.delete(userId);
    io.emit('user_offline', userId);
    console.log(`User disconnected: ${userId}`);
  });
});

// Use server.listen (not app.listen) so socket.io shares the same port
server.listen(PORT, () => {
  console.log(`Orbi server running on port ${PORT}`);
});
