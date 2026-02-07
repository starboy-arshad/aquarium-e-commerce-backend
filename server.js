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

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.log('MongoDB connection error:', err.message);
  console.log('Connection details:', {
    uri: process.env.MONGO_URI,
    error: err
  });
  process.exit(1);
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
