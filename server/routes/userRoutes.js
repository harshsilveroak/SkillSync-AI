const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');
const User = require('../models/User');

// @route   GET /api/users/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User profile not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const fields = [
      'name', 'branch', 'semester', 'college', 'avatar', 'skills', 'interests',
      'programmingLanguages', 'frameworks', 'tools', 'github', 'linkedin',
      'portfolio', 'bio', 'availability', 'cgpa', 'experience', 'certificates', 'projects'
    ];

    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    const updatedUser = await user.save();
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   POST /api/users/upload-resume
router.post('/upload-resume', protect, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please attach a valid PDF file' });
    }
    const resumeUrl = `/uploads/${req.file.filename}`;
    await User.findByIdAndUpdate(req.user.id, { resumeUrl });
    res.json({ message: 'Resume uploaded successfully', resumeUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/users/recommended
router.get('/recommended', protect, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    const students = await User.find({ _id: { $ne: req.user.id }, role: 'student' }).select('-password');

    // Calculate skill overlap match percentage
    const recommended = students.map(student => {
      const studentSkills = student.skills || [];
      const userSkills = currentUser.skills || [];
      const overlap = studentSkills.filter(s => userSkills.includes(s)).length;
      const matchScore = userSkills.length > 0 
        ? Math.min(99, Math.round(70 + (overlap / Math.max(1, userSkills.length)) * 29))
        : 85;

      return {
        ...student.toObject(),
        matchScore
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.json(recommended);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/users/candidates
// @desc    Get candidate students for team matching (exclude self)
// @access  Private
router.get('/candidates', protect, async (req, res) => {
  try {
    const { skills, limit = 50 } = req.query;
    let query = { _id: { $ne: req.user.id }, role: 'student' };

    const students = await User.find(query)
      .select('-password -resumeUrl')
      .limit(parseInt(limit))
      .sort({ profileCompletionScore: -1 });

    const currentUser = await User.findById(req.user.id);
    const userSkillNames = (currentUser.skills || []).map(s =>
      (typeof s === 'object' ? s.name : s).toLowerCase()
    );

    const enriched = students.map(student => {
      const studentSkillNames = (student.skills || []).map(s =>
        (typeof s === 'object' ? s.name : s).toLowerCase()
      );

      // Skill overlap score (penalize duplicates, reward complementary)
      const overlap = studentSkillNames.filter(s => userSkillNames.includes(s)).length;
      const complementary = studentSkillNames.filter(s => !userSkillNames.includes(s)).length;

      // Score: base 60, +5 per overlap, +8 per complementary (up to 98)
      const score = Math.min(98, Math.max(62,
        60 + (overlap * 5) + (complementary * 8)
      ));

      return {
        _id: student._id,
        name: student.name,
        email: student.email,
        avatar: student.avatar,
        branch: student.branch,
        semester: student.semester,
        college: student.college,
        skills: student.skills,
        interests: student.interests,
        github: student.github,
        preferredRoles: student.preferredRoles,
        availabilityTime: student.availabilityTime,
        bio: student.bio,
        profileCompletionScore: student.profileCompletionScore,
        matchScore: score,
        overlappingSkills: overlap,
        complementarySkills: complementary
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// @route   GET /api/users/all
// @desc    Get all students (for coordinator view / admin)
// @access  Private
router.get('/all', protect, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' })
      .select('-password -resumeUrl')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

