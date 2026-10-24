const mongoose = require('mongoose');

const GroupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  domain: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  requiredSkills: [{ type: String }],
  maxMembers: { type: Number, default: 4 },
  semester: { type: String, required: true },
  branch: { type: String, required: true },
  visibility: { type: String, enum: ['Public', 'Private'], default: 'Public' },
  status: { type: String, enum: ['Pending Approval', 'Approved', 'Rejected'], default: 'Approved' },
  leader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Group', GroupSchema);
