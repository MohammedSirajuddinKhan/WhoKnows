const { Server } = require("socket.io");
const { initializeSocket } = require("../services/socketService");

function createSocketServer(server) {
  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  initializeSocket(io);
  return io;
}

module.exports = { createSocketServer };
