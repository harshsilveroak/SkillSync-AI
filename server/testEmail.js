/**
 * SkillSync AI - Real SMTP Email Test Script
 * Run with: node server/testEmail.js recipient@example.com
 */

const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const { sendPasswordResetEmail, verifyTransporter } = require('./services/emailService');

async function runTest() {
  const targetEmail = process.argv[2] || process.env.EMAIL_USER;

  console.log('----------------------------------------------------');
  console.log('SkillSync AI SMTP Email Delivery Diagnostic Test');
  console.log('----------------------------------------------------');
  console.log(`EMAIL_HOST: ${process.env.EMAIL_HOST || '(NOT SET)'}`);
  console.log(`EMAIL_PORT: ${process.env.EMAIL_PORT || '(NOT SET)'}`);
  console.log(`EMAIL_USER: ${process.env.EMAIL_USER || '(NOT SET)'}`);
  console.log(`EMAIL_FROM: ${process.env.EMAIL_FROM || '(NOT SET)'}`);
  console.log(`Target Recipient: ${targetEmail || '(NOT SET)'}`);
  console.log('----------------------------------------------------');

  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ ERROR: Missing SMTP configuration variables in .env!');
    process.exit(1);
  }

  console.log('🔍 Testing SMTP Transporter Connection...');
  const isConnected = await verifyTransporter();

  if (!isConnected) {
    console.error('❌ SMTP Connection Failed!');
    process.exit(1);
  }

  console.log(`🚀 Sending test password reset email to: ${targetEmail}...`);
  try {
    const result = await sendPasswordResetEmail({ to: targetEmail, resetToken: 'test_token_123' });
    console.log('✅ TEST EMAIL SUCCESSFUL!');
    console.log(`Message ID: ${result.messageId}`);
  } catch (err) {
    console.error('❌ TEST EMAIL FAILED TO DELIVER:', err.message);
  }
}

runTest();
