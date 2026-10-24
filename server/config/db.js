const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn('[MongoDB Warning]: MONGODB_URI is not configured in .env file.');
      return;
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // 5 second timeout so server doesn't hang indefinitely
    });

    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`[MongoDB Connection Warning]: ${error.message}`);
    console.warn('[SkillSync Backend]: Operating in Graceful Fallback Mode without active MongoDB connection.');
  }
};

module.exports = connectDB;