const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Group = require('../models/Group');
const JoinRequest = require('../models/JoinRequest');

// @route   GET /api/admin/students
router.get('/students', protect, adminOnly, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password').sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/admin/groups
router.get('/groups', protect, adminOnly, async (req, res) => {
  try {
    const groups = await Group.find()
      .populate('leader', 'name email')
      .populate('members', 'name email');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/admin/groups/:id/approve
router.put('/groups/:id/approve', protect, adminOnly, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    group.status = 'Approved';
    await group.save();
    res.json({ message: 'Group approved successfully', group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   DELETE /api/admin/groups/:id
router.delete('/groups/:id', protect, adminOnly, async (req, res) => {
  try {
    await Group.findByIdAndDelete(req.params.id);
    res.json({ message: 'Group deleted by administrator' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/admin/reports
router.get('/reports', protect, adminOnly, async (req, res) => {
  try {
    const studentCount = await User.countDocuments({ role: 'student' });
    const groupCount = await Group.countDocuments();
    const requestCount = await JoinRequest.countDocuments();

    res.json({
      totalStudents: studentCount,
      totalGroups: groupCount,
      totalRequests: requestCount,
      systemHealth: '100% Operational (MongoDB Connected)'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
