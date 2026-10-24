const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Group = require('../models/Group');
const JoinRequest = require('../models/JoinRequest');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @route   POST /api/groups/create
router.post('/create', protect, async (req, res) => {
  try {
    const { name, domain, title, description, requiredSkills, maxMembers, semester, branch, visibility } = req.body;

    if (!name || !domain || !title || !description) {
      return res.status(400).json({ message: 'Name, domain, title, and description are required' });
    }

    const group = await Group.create({
      name,
      domain,
      title,
      description,
      requiredSkills: requiredSkills || [],
      maxMembers: maxMembers || 4,
      semester: semester || '7th Semester',
      branch: branch || 'Computer Science Engineering',
      visibility: visibility || 'Public',
      leader: req.user.id,
      members: [req.user.id]
    });

    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/groups/search
router.get('/search', async (req, res) => {
  try {
    const { branch, semester, domain, skill } = req.query;
    let query = { visibility: 'Public', status: 'Approved' };

    if (branch) query.branch = branch;
    if (semester) query.semester = semester;
    if (domain) query.domain = domain;
    if (skill) query.requiredSkills = { $in: [skill] };

    const groups = await Group.find(query)
      .populate('leader', 'name email avatar branch semester')
      .populate('members', 'name email avatar');

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/groups/:id
router.get('/:id', async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('leader', 'name email avatar branch semester github linkedin')
      .populate('members', 'name email avatar branch semester skills');

    if (!group) return res.status(404).json({ message: 'Group not found' });
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/groups/:id/join
router.post('/:id/join', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });

    if (group.members.includes(req.user.id)) {
      return res.status(400).json({ message: 'You are already a member of this group' });
    }

    const existingRequest = await JoinRequest.findOne({ group: group._id, user: req.user.id, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({ message: 'Join request already pending' });
    }

    const joinRequest = await JoinRequest.create({
      group: group._id,
      user: req.user.id,
      message: req.body.message || 'Interested in contributing to this project group.'
    });

    const currentUser = await User.findById(req.user.id);
    await Notification.create({
      recipient: group.leader,
      sender: req.user.id,
      group: group._id,
      type: 'Join Request',
      message: `${currentUser.name} requested to join your group "${group.name}".`
    });

    res.status(201).json({ message: 'Join request transmitted to group leader', joinRequest });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/groups/request/:requestId/respond
router.post('/request/:requestId/respond', protect, async (req, res) => {
  try {
    const { action } = req.body; // 'accepted' or 'rejected'
    const joinRequest = await JoinRequest.findById(req.params.requestId).populate('group');

    if (!joinRequest) return res.status(404).json({ message: 'Request not found' });

    const group = await Group.findById(joinRequest.group._id);
    if (group.leader.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the group leader can accept or reject requests' });
    }

    joinRequest.status = action;
    await joinRequest.save();

    if (action === 'accepted') {
      if (!group.members.includes(joinRequest.user)) {
        group.members.push(joinRequest.user);
        await group.save();
      }
    }

    await Notification.create({
      recipient: joinRequest.user,
      sender: req.user.id,
      group: group._id,
      type: action === 'accepted' ? 'Accepted' : 'Rejected',
      message: `Your request to join "${group.name}" was ${action}.`
    });

    res.json({ message: `Request successfully ${action}`, group });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/groups/my
// @desc    Get all groups where the authenticated user is leader or member
// @access  Private
router.get('/my', protect, async (req, res) => {
  try {
    const groups = await Group.find({
      $or: [
        { leader: req.user.id },
        { members: req.user.id }
      ]
    })
      .populate('leader', 'name email avatar branch semester github')
      .populate('members', 'name email avatar branch semester skills')
      .sort({ createdAt: -1 });

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/groups/public
// @desc    Get public approved groups for discover page
// @access  Public
router.get('/public', async (req, res) => {
  try {
    const { branch, semester, domain, skill, search } = req.query;
    let query = { visibility: 'Public', status: 'Approved' };

    if (branch) query.branch = branch;
    if (semester) query.semester = semester;
    if (domain) query.domain = domain;
    if (skill) query.requiredSkills = { $in: [skill] };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { requiredSkills: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const groups = await Group.find(query)
      .populate('leader', 'name email avatar branch semester')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/groups/:id/join-requests
// @desc    Get pending join requests for a group (leader only)
// @access  Private
router.get('/:id/join-requests', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Group not found' });
    if (group.leader.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the group leader can view join requests' });
    }

    const requests = await JoinRequest.find({ group: req.params.id, status: 'pending' })
      .populate('user', 'name email avatar branch semester skills github')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

