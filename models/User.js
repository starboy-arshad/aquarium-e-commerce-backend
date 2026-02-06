const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    required: true,
    default: false,
  },
  billingAddress: {
    name: String,
    company: String,
    street: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    email: String,
  },
  shippingAddress: {
    name: String,
    company: String,
    street: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    email: String,
  },
  resetPasswordOTP: String,
  resetPasswordOTPExpires: Date,
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
