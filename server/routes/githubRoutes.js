const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { fetchGitHubUserData } = require('../services/githubService');
const User = require('../models/User');

// @route   GET /api/github/sync/:username
router.get('/sync/:username', protect, async (req, res) => {
  try {
    const username = req.params.username;
    const githubData = await fetchGitHubUserData(username);

    // Save to user profile
    await User.findByIdAndUpdate(req.user.id, {
      github: `https://github.com/${username}`,
      avatar: githubData.avatarUrl
    });

    res.json({ message: 'GitHub account successfully connected and synchronized!', githubData });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/github/analysis
router.get('/analysis', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const username = user.github ? user.github.split('/').pop() : 'alexrivera';
    const analysis = await fetchGitHubUserData(username);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
