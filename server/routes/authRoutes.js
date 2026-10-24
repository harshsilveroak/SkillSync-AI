const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const { sendPasswordResetEmail } = require('../services/emailService');

const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET || 'skillsync_secret_key_2026',
    {
      expiresIn: '30d',
    }
  );
};

// Email Regex Validator
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Calculate Profile Completion Score Percentage
 */
function calculateCompletionScore(user) {
  let score = 15;

  if (user.name && user.name !== 'New Student') score += 10;
  if (user.college && user.branch) score += 15;
  if (user.city && user.state) score += 10;
  if (user.skills && user.skills.length > 0) score += 20;
  if (user.interests && user.interests.length > 0) score += 10;
  if (user.projects && user.projects.length > 0) score += 10;
  if (user.preferredRoles && user.preferredRoles.length > 0) score += 5;
  if (user.github) score += 5;

  return Math.min(100, score);
};


// ============================================================
// 1. POST /api/auth/signup
// Create Account with Email + Password
// ============================================================
router.post('/signup', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      confirmPassword
    } = req.body;

    // Validate email
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({
        message: 'Please enter a valid email address.'
      });
    }

    // Validate password
    if (!password || password.length < 8) {
      return res.status(400).json({
        message: 'Password must contain at least 8 characters.'
      });
    }

    // Confirm password
    if (
      confirmPassword !== undefined &&
      password !== confirmPassword
    ) {
      return res.status(400).json({
        message: 'Password confirmation does not match.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check existing user
    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        message:
          'An account with this email address already exists. Please sign in.'
      });
    }

    // Create user
    const user = await User.create({
      email: normalizedEmail,
      password: password,

      // Use name entered during signup
      // If name is empty, use email username
      name:
        name && name.trim()
          ? name.trim()
          : normalizedEmail.split('@')[0],

      role: 'student',

      onboardingCompleted: false,

      profileCompletionScore: 15
    });

    const token = generateToken(
      user._id,
      user.role
    );

    res.status(201).json({
      success: true,

      message:
        'Account created successfully! Please complete your SkillSync profile.',

      isNewUser: true,

      token,

      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        onboardingCompleted:
          user.onboardingCompleted,
        profileCompletionScore:
          user.profileCompletionScore
      }
    });

  } catch (error) {
    console.error('Signup error:', error);

    res.status(500).json({
      message:
        error.message ||
        'Server error during account creation.'
    });
  }
});


// ============================================================
// 2. POST /api/auth/login
// Sign In with Email + Password
// ============================================================
router.post('/login', async (req, res) => {
  try {
    const {
      email,
      password
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          'Please enter your email address and password.'
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail
    });

    // Validate credentials
    if (
      !user ||
      !(await user.matchPassword(password))
    ) {
      return res.status(401).json({
        message: 'Invalid email or password.'
      });
    }

    const token = generateToken(
      user._id,
      user.role
    );

    // Remove password from response
    const userPayload =
      user.toObject();

    delete userPayload.password;

    res.json({
      success: true,

      message:
        `Welcome back, ${user.name}!`,

      isNewUser:
        !user.onboardingCompleted,

      token,

      user: userPayload
    });

  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      message:
        error.message ||
        'Server error during sign in.'
    });
  }
});


// ============================================================
// 3. GET /api/auth/me
// Get Currently Authenticated User
// ============================================================
router.get('/me', protect, async (req, res) => {
  try {

    const user =
      await User.findById(
        req.user.id
      ).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User profile not found.'
      });
    }

    res.json(user);

  } catch (error) {

    console.error(
      'Get current user error:',
      error
    );

    res.status(500).json({
      message: error.message
    });
  }
});


// ============================================================
// 4. POST /api/auth/complete-onboarding
// Save Multi-Step Profile Setup
// ============================================================
router.post(
  '/complete-onboarding',
  protect,
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user.id
        );

      if (!user) {
        return res.status(404).json({
          message: 'User profile not found.'
        });
      }

      const {
        name,
        avatar,
        college,
        branch,
        degree,
        semester,
        country,
        state,
        city,
        skills,
        interests,
        projects,
        github,
        linkedin,
        portfolio,
        preferredRoles,
        preferredTeamSize,
        preferredExperience,
        availabilityTime,
        collaborationStyle,
        bio
      } = req.body;


      if (name)
        user.name = name;

      if (avatar)
        user.avatar = avatar;

      if (college)
        user.college = college;

      if (branch)
        user.branch = branch;

      if (degree)
        user.degree = degree;

      if (semester)
        user.semester = semester;

      if (country)
        user.country = country;

      if (state)
        user.state = state;

      if (city)
        user.city = city;

      if (skills)
        user.skills = skills;

      if (interests)
        user.interests = interests;

      if (projects)
        user.projects = projects;

      if (github)
        user.github = github;

      if (linkedin)
        user.linkedin = linkedin;

      if (portfolio)
        user.portfolio = portfolio;

      if (preferredRoles)
        user.preferredRoles =
          preferredRoles;

      if (preferredTeamSize)
        user.preferredTeamSize =
          preferredTeamSize;

      if (preferredExperience)
        user.preferredExperience =
          preferredExperience;

      if (availabilityTime)
        user.availabilityTime =
          availabilityTime;

      if (collaborationStyle)
        user.collaborationStyle =
          collaborationStyle;

      if (bio)
        user.bio = bio;


      // Mark onboarding completed
      user.onboardingCompleted = true;

      // Calculate profile completion
      user.profileCompletionScore =
        calculateCompletionScore(user);

      await user.save();


      // Remove password
      const userPayload =
        user.toObject();

      delete userPayload.password;


      res.json({
        success: true,

        message:
          'Profile setup completed successfully!',

        user: userPayload
      });

    } catch (error) {

      console.error(
        'Onboarding error:',
        error
      );

      res.status(500).json({
        message: error.message
      });
    }
  }
);


// ============================================================
// 5. POST /api/auth/change-password
// Change Password
// ============================================================
router.post(
  '/change-password',
  protect,
  async (req, res) => {

    try {

      const {
        currentPassword,
        newPassword,
        confirmNewPassword
      } = req.body;


      const user =
        await User.findById(
          req.user.id
        );


      if (!user) {
        return res.status(404).json({
          message: 'User not found.'
        });
      }


      // Check current password
      if (
        !currentPassword ||
        !(await user.matchPassword(
          currentPassword
        ))
      ) {
        return res.status(400).json({
          message:
            'Current password is incorrect.'
        });
      }


      // Validate new password
      if (
        !newPassword ||
        newPassword.length < 8
      ) {
        return res.status(400).json({
          message:
            'New password must be at least 8 characters long.'
        });
      }


      // Confirm new password
      if (
        newPassword !==
        confirmNewPassword
      ) {
        return res.status(400).json({
          message:
            'New password confirmation does not match.'
        });
      }


      user.password =
        newPassword;

      await user.save();


      res.json({
        success: true,

        message:
          'Password updated successfully!'
      });

    } catch (error) {

      console.error(
        'Change password error:',
        error
      );

      res.status(500).json({
        message: error.message
      });
    }
  }
);


// ============================================================
// 6. POST /api/auth/forgot-password
// Password Reset
// ============================================================
router.post(
  '/forgot-password',
  async (req, res) => {

    try {

      const {
        email,
        newPassword
      } = req.body;


      if (
        !email ||
        !EMAIL_REGEX.test(
          email.trim()
        )
      ) {
        return res.status(400).json({
          message:
            'Please enter a valid email address.'
        });
      }


      const normalizedEmail =
        email.trim().toLowerCase();


      const user =
        await User.findOne({
          email: normalizedEmail
        });


      if (!user) {
        return res.status(404).json({
          message:
            'No account found with this email address.'
        });
      }


      // Direct password reset
      // if newPassword is provided
      if (newPassword) {

        if (
          newPassword.length < 8
        ) {
          return res.status(400).json({
            message:
              'Password must contain at least 8 characters.'
          });
        }


        user.password =
          newPassword;

        await user.save();


        return res.json({
          success: true,

          message:
            'Password reset successfully! You can now sign in.'
        });
      }


      // Generate reset token
      const resetToken =
        crypto
          .randomBytes(20)
          .toString('hex');


      await sendPasswordResetEmail({
        to: normalizedEmail,
        resetToken
      });


      res.json({
        success: true,

        message:
          'Password reset link sent to your email.'
      });

    } catch (error) {

      console.error(
        'Forgot password error:',
        error
      );

      res.status(500).json({
        message: error.message
      });
    }
  }
);


// ============================================================
// 7. POST /api/auth/admin-login
// Admin Login
// ============================================================
router.post(
  '/admin-login',
  async (req, res) => {

    try {

      const {
        email,
        password
      } = req.body;


      // Default admin credentials
      if (
        email ===
          'admin@skillsync.edu' &&
        password === 'admin123'
      ) {

        return res.json({

          _id:
            'admin_super_user_id',

          name:
            'System Administrator',

          email:
            'admin@skillsync.edu',

          role: 'admin',

          token:
            generateToken(
              'admin_super_user_id',
              'admin'
            )
        });
      }


      // Database admin login
      const user =
        await User.findOne({
          email:
            email.toLowerCase(),
          role: 'admin'
        });


      if (
        user &&
        (await user.matchPassword(
          password
        ))
      ) {

        return res.json({

          _id: user._id,

          name: user.name,

          email: user.email,

          role: user.role,

          token:
            generateToken(
              user._id,
              user.role
            )
        });
      }


      res.status(401).json({
        message:
          'Invalid admin credentials.'
      });

    } catch (error) {

      console.error(
        'Admin login error:',
        error
      );

      res.status(500).json({
        message: error.message
      });
    }
  }
);


module.exports = router;