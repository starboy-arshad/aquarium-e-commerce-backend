const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB configuration
mongoose.set('bufferCommands', false); // Disable buffering so we fail fast if DB is down

// MongoDB connection
console.log('Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aquarium-shop', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
})
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.error('Ensure MongoDB is running locally or check your MONGODB_URI in .env');
  });

// Routes
app.get('/', (req, res) => {
  res.send('Aquarium Shop API');
});

// Product routes
app.use('/api/products', require('./routes/products'));

// Full Marine Setup routes
app.use('/api/full-marine-setup', require('./routes/fullMarineSetup'));

// User routes
app.use('/api/users', require('./routes/users'));

// Order routes
app.use('/api/orders', require('./routes/orders'));

// Category routes
app.use('/api/categories', require('./routes/categories'));

// Accessory routes
app.use('/api/accessories', require('./routes/accessories'));

// Policy routes
app.use('/api/policies', require('./routes/policies'));

// Cart routes
app.use('/api/cart', require('./routes/cart'));

// Contact routes
app.use('/api/contact', require('./routes/contact'));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'production' ? {} : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Admin routes
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin.html'));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
