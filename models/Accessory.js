const mongoose = require('mongoose');

const accessorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  images: {
    type: [String],
    required: true,
    default: [],
  },
  stock: {
    type: Number,
    required: true,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Accessory', accessorySchema);
