const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = (io) => {
  // Authentication middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      if (!token) return next(new Error('Authentication error'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.companyId = user.company?.toString();
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.userId}`);
    onlineUsers.set(socket.userId, socket.id);

    // Join company room
    if (socket.companyId) {
      socket.join(`company:${socket.companyId}`);
    }

    // Join user-specific room
    socket.join(`user:${socket.userId}`);

    // Broadcast online status
    io.to(`company:${socket.companyId}`).emit('user:online', {
      userId: socket.userId,
      onlineUsers: Array.from(onlineUsers.keys())
    });

    // Chat message
    socket.on('chat:message', (data) => {
      const { to, message, type = 'text' } = data;
      const targetSocket = onlineUsers.get(to);

      const msg = {
        from: socket.userId,
        to,
        message,
        type,
        timestamp: new Date()
      };

      if (targetSocket) {
        io.to(targetSocket).emit('chat:message', msg);
      }
      socket.emit('chat:message', msg);
    });

    // Chat typing indicator
    socket.on('chat:typing', (data) => {
      const targetSocket = onlineUsers.get(data.to);
      if (targetSocket) {
        io.to(targetSocket).emit('chat:typing', { from: socket.userId });
      }
    });

    // Notification
    socket.on('notification:send', (data) => {
      if (data.userId) {
        io.to(`user:${data.userId}`).emit('notification:new', data);
      } else if (data.companyId) {
        io.to(`company:${data.companyId}`).emit('notification:new', data);
      }
    });

    // Dashboard update
    socket.on('dashboard:refresh', () => {
      io.to(`company:${socket.companyId}`).emit('dashboard:update');
    });

    // Attendance update
    socket.on('attendance:update', (data) => {
      io.to(`company:${socket.companyId}`).emit('attendance:updated', data);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.userId}`);
      onlineUsers.delete(socket.userId);

      io.to(`company:${socket.companyId}`).emit('user:offline', {
        userId: socket.userId,
        onlineUsers: Array.from(onlineUsers.keys())
      });
    });
  });

  return io;
};
