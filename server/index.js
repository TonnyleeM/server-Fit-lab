const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

// More specific CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Add logging middleware to see incoming requests
app.use((req, res, next) => {
  console.log(`\n📨 ${new Date().toISOString()} - ${req.method} ${req.url}`);
  if (req.method === 'POST') {
    console.log('📦 Request body:', req.body);
  }
  next();
});

// Simple User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  age: Number,
  fitnessGoal: String,
  experience: String,
  workoutTime: String,
  dietaryPreference: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected!'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Root route for testing
app.get('/', (req, res) => {
  console.log('🏠 Root route accessed');
  res.json({ 
    message: 'FitLab Server is running!',
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Test route
app.get('/test', (req, res) => {
  console.log('✅ Test route accessed');
  res.json({ 
    message: 'Server is working!',
    port: process.env.PORT || 3001,
    mongodb_status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Health check route
app.get('/api/health', (req, res) => {
  console.log('🏥 Health check accessed');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    server: 'FitLab API'
  });
});

// REGISTRATION ROUTE
app.post('/api/auth/register', async (req, res) => {
  console.log('\n🚀 REGISTRATION REQUEST RECEIVED');
  console.log('📝 Full request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { username, email, password, confirmPassword, age, fitnessGoal, experience, workoutTime, dietaryPreference } = req.body;

    // Basic validation
    if (!username || !email || !password) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ 
        success: false,
        message: 'Username, email, and password are required' 
      });
    }

    // Password confirmation check
    if (password !== confirmPassword) {
      console.log('❌ Passwords do not match');
      return res.status(400).json({ 
        success: false,
        message: 'Passwords do not match' 
      });
    }

    console.log('🔍 Checking if user exists with email:', email);
    
    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ User already exists');
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email' 
      });
    }

    console.log('🔐 Hashing password...');
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log('💾 Creating new user...');
    
    // Create user
    const newUser = new User({
      username,
      email: email.toLowerCase(),
      password: hashedPassword,
      age: age ? parseInt(age) : undefined,
      fitnessGoal,
      experience,
      workoutTime,
      dietaryPreference
    });

    console.log('💾 Saving user to database...');
    const savedUser = await newUser.save();
    
    console.log('✅ USER CREATED SUCCESSFULLY!');
    console.log('🆔 User ID:', savedUser._id);

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: savedUser._id, 
        email: savedUser.email,
        username: savedUser.username 
      },
      process.env.JWT_SECRET || 'fallback-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    console.log('🔑 JWT token generated');

    // Return success response
    const response = {
      success: true,
      message: 'User registered successfully!',
      token: token,
      user: {
        id: savedUser._id,
        username: savedUser.username,
        email: savedUser.email,
        age: savedUser.age,
        fitnessGoal: savedUser.fitnessGoal,
        experience: savedUser.experience,
        workoutTime: savedUser.workoutTime,
        dietaryPreference: savedUser.dietaryPreference
      }
    };

    console.log('📤 Sending success response');
    res.status(201).json(response);

  } catch (error) {
    console.log('\n🔥 REGISTRATION ERROR OCCURRED:');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('Full error:', error);
    
    if (error.name === 'ValidationError') {
      console.log('Validation errors:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors
      });
    }
    
    if (error.code === 11000) {
      console.log('Duplicate key error - user already exists');
      return res.status(400).json({ 
        success: false,
        message: 'User with this email already exists' 
      });
    }
    
    console.log('================================\n');

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Use port 3001 to avoid conflict
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`\n🚀 FitLab Server Successfully Started!`);
  console.log(`📍 Server running on http://localhost:${PORT}`);
  console.log(`🏠 Root: http://localhost:${PORT}/`);
  console.log(`🧪 Test: http://localhost:${PORT}/test`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  console.log(`📡 Registration: http://localhost:${PORT}/api/auth/register`);
  console.log(`\n📊 Environment Status:`);
  console.log(`- Node.js version: ${process.version}`);
  console.log(`- Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`- MongoDB URI: ${process.env.MONGODB_URI ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`- JWT Secret: ${process.env.JWT_SECRET ? '✅ Configured' : '⚠️ Using fallback'}`);
  console.log(`\n🎯 Ready to accept requests!`);
});

// Handle server errors
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please stop other services or use a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
});

process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT. Shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    mongoose.connection.close(false, () => {
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });
  });
});