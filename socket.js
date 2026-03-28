const { Server } = require("socket.io");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    // JOIN ROOM BY ORDER ID
    socket.on("join_order", (orderId) => {
      console.log("📦 Join room:", orderId);
      socket.join(orderId);
    });

    socket.on("send_message", (data) => {
      console.log("New Message via Socket:", data);
      // Broadcast ke semua orang di room tersebut termasuk pengirim
      io.to(data.orderId).emit("receive_message", data);
    });

    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
    });
  });

  return io;
};

// biar bisa dipakai di controller juga
const getIO = () => {
  if (!io) throw new Error("Socket.io belum diinisialisasi!");
  return io;
};

module.exports = { initSocket, getIO };