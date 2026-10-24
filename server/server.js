const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const { verifyTransporter } = require('./services/emailService');

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static directory for uploaded PDFs & assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));
app.use('/api/chat', require('./routes/chatRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/github', require('./routes/githubRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'SkillSync Express API Active', mode: 'operational', timestamp: new Date() });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('[Server Route Error]:', err.message);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    demoMode: true
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`[SkillSync Backend Active]: http://localhost:${PORT}`);
  try {
    // Test SMTP connection status on server startup gracefully
    await verifyTransporter();
  } catch (err) {
    console.warn('[SMTP Verification Warning]:', err.message);
  }
});


