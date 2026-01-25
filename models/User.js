const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  otp: {
    code: String,
    expiresAt: Date
  },
  appliedIPOs: [{
    ipoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IPO'
    },
    panCard: String, // Encrypted
    applicationNumber: String,
    appliedDate: Date,
    lotSize: Number,
    status: {
      type: String,
      enum: ['pending', 'allotted', 'not_allotted', 'checked_external'],
      default: 'pending'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
