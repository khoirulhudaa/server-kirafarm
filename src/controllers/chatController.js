const { ChatMessage } = require('../models');
const { randomUUID } = require('crypto');

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

  res.json({ success: true, data: newMsg });
};