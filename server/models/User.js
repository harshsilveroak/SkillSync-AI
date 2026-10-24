const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, default: 'New Student' },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'admin'], default: 'student' },
  avatar: { type: String, default: '' },
  
  // Step 2: Education
  college: { type: String, default: 'Silver Oak University' },
  branch: { type: String, default: 'Computer Science & Engineering' },
  degree: { type: String, default: 'B.Tech' },
  semester: { type: String, default: '7th Semester' },
  
  // Step 3: Location
  country: { type: String, default: 'India' },
  state: { type: String, default: 'Gujarat' },
  city: { type: String, default: 'Ahmedabad' },

  // Step 4: Skills & Proficiency
  skills: [{
    name: { type: String },
    proficiency: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced'], default: 'Intermediate' }
  }],

  // Step 5: Project Interests
  interests: [{ type: String }],

  // Step 6: Project Experience
  projects: [{
    title: { type: String },
    description: { type: String },
    techStack: [{ type: String }],
    projectUrl: { type: String, default: '' },
    githubUrl: { type: String, default: '' }
  }],

  // Step 7: GitHub Profile
  github: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  portfolio: { type: String, default: '' },
  resumeUrl: { type: String, default: '' },

  // Step 8: Collaboration Preferences
  preferredRoles: [{ type: String }],
  preferredTeamSize: { type: String, default: '4' },
  preferredExperience: { type: String, default: 'Any' },

  // Step 9: Availability & Work Style
  availabilityTime: { type: String, default: '5-10 hours/week' },
  collaborationStyle: { type: String, default: 'Hybrid' },
  bio: { type: String, default: '' },

  // Profile Completion & Onboarding State
  profileCompletionScore: { type: Number, default: 0 },
  onboardingCompleted: { type: Boolean, default: false },

  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving to MongoDB using bcryptjs
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare entered password with hashed password in DB
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
