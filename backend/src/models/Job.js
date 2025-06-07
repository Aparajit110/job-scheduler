const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  scheduleType: {
    type: String,
    enum: ['hourly', 'daily', 'weekly'],
    required: true,
  },
  scheduleConfig: {
    // For hourly: minute (0-59)
    // For daily: hour (0-23), minute (0-59)
    // For weekly: day (0-6, where 0 is Sunday), hour (0-23), minute (0-59)
    minute: { type: Number, min: 0, max: 59 },
    hour: { type: Number, min: 0, max: 23 },
    day: { type: Number, min: 0, max: 6 },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastRun: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Job', jobSchema); 