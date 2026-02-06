const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
  shippingPolicy: {
    type: String,
    required: true,
    default: ''
  },
  refundPolicy: {
    type: String,
    required: true,
    default: ''
  },
  termsAndConditions: {
    type: String,
    required: true,
    default: ''
  },
  privacyPolicy: {
    type: String,
    required: true,
    default: ''
  }
});

module.exports = mongoose.model('Policy', policySchema);