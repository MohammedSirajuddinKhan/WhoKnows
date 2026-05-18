const onlineUsers = new Map();

function initializeSocket(io) {
  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;
    if (userId) {
      onlineUsers.set(String(userId), socket.id);
      io.emit("presence:update", { userId: String(userId), isOnline: true });
    }

    socket.on("typing:start", ({ roomId, toUserId, groupId }) => {
      if (toUserId) {
        const targetSocket = onlineUsers.get(String(toUserId));
        if (targetSocket) {
          io.to(targetSocket).emit("typing:update", {
            roomId,
            isTyping: true,
            groupId,
          });
        }
      }
    });

    socket.on("typing:stop", ({ roomId, toUserId, groupId }) => {
      if (toUserId) {
        const targetSocket = onlineUsers.get(String(toUserId));
        if (targetSocket) {
          io.to(targetSocket).emit("typing:update", {
            roomId,
            isTyping: false,
            groupId,
          });
        }
      }
    });

    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(String(userId));
        io.emit("presence:update", {
          userId: String(userId),
          isOnline: false,
          lastSeen: new Date(),
        });
      }
    });
  });
}

function emitToUser(io, userId, eventName, payload) {
  const socketId = onlineUsers.get(String(userId));
  if (socketId) {
    io.to(socketId).emit(eventName, payload);
  }
}

function getOnlineUsers() {
  return Array.from(onlineUsers.keys());
}

module.exports = { initializeSocket, emitToUser, getOnlineUsers };
