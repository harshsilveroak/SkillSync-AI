const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const Group = require('../models/Group');
const User = require('../models/User');

// @route   GET /api/chat/:groupId/messages
router.get('/:groupId/messages', protect, async (req, res) => {
  try {
    const messages = await Message.find({ group: req.params.groupId })
      .sort({ createdAt: 1 })
      .populate('sender', 'name avatar');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/chat/:groupId/messages
router.post('/:groupId/messages', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Message text cannot be empty' });

    const user = await User.findById(req.user.id);
    const message = await Message.create({
      group: req.params.groupId,
      sender: req.user.id,
      senderName: user.name,
      senderAvatar: user.avatar,
      text
    });

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
