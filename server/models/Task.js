// ============================================================
// SkillSync AI — Sprint / Task Model
// Persists project tasks, milestones, and sprint data to MongoDB
// ============================================================
const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  group:        { type: mongoose.Schema.Types.ObjectId, ref: 'Group', required: true },
  title:        { type: String, required: true, trim: true },
  description:  { type: String, default: '' },
  category:     { type: String, enum: ['Frontend','Backend','AI/ML','Database','Testing','DevOps','Design','Documentation','Deployment','Other'], default: 'Other' },
  priority:     { type: String, enum: ['Critical','High','Medium','Low'], default: 'Medium' },
  status:       { type: String, enum: ['pending','in-progress','blocked','completed'], default: 'pending' },
  assignedTo:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  dueDate:      { type: Date, default: null },
  completedAt:  { type: Date, default: null },
  acceptanceCriteria: { type: String, default: '' },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  phase:        { type: String, default: 'Phase 1' },
  weekNumber:   { type: Number, default: 1 },
  createdBy:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt:    { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

TaskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  if (this.status === 'completed' && !this.completedAt) {
    this.completedAt = new Date();
  }
  next();
});

TaskSchema.index({ group: 1, status: 1 });
TaskSchema.index({ assignedTo: 1 });

module.exports = mongoose.model('Task', TaskSchema);
