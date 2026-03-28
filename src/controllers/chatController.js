const { ChatMessage } = require('../models');
const { randomUUID } = require('crypto');
const { getIO } = require('../../socket'); // <--- PASTIKAN PATH INI BENAR

exports.getMessages = async (req, res) => {
  const { orderId } = req.params;

  const messages = await ChatMessage.findAll({
    where: { orderId },
    order: [['createdAt', 'ASC']]
  });

  res.json({ success: true, data: messages });
};

exports.sendMessage = async (req, res) => {
  const { orderId, sender, message } = req.body;

  const newMsg = await ChatMessage.create({
    id: randomUUID(),
    orderId,
    sender,
    message
  });

  const io = getIO();
  io.to(orderId).emit("receive_message", newMsg); // Kirim ke semua orang di room orderId

  res.json({ success: true, data: newMsg });
};

exports.deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const msg = await ChatMessage.findByPk(id);
    if (!msg) return res.status(404).json({ success: false });

    const orderId = msg.orderId;
    await msg.destroy();

    // Broadcast ke socket bahwa pesan ini dihapus
    getIO().to(orderId).emit("message_deleted", id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

exports.editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const msg = await ChatMessage.findByPk(id);
    
    await msg.update({ message });

    // Broadcast ke socket bahwa pesan ini diedit
    getIO().to(msg.orderId).emit("message_edited", { id, message });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};