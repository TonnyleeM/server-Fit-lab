// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const User = require('./models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Routes

// Setup
dotenv.config();
const app = express();
app.use(cors()); // Ensure CORS is enabled before all routes
app.use(express.json()); // Ensure JSON body parsing is enabled

// Routes
app.post('/api/auth/register', async (req, res) => {
  console.log('Received registration request from:', req.ip);
  console.log('Request body:', req.body);
  try {
    const { name, age, email, password, fitnessGoal, experience, workoutTime, dietaryPreference } = req.body;

    if (!name || !age || !email || !password || !fitnessGoal || !experience) {
      return res.status(400).json({ message: 'All required fields must be provided.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      age,
      email,
      password: hashedPassword,
      fitnessGoal,
      experience,
      workoutTime,
      dietaryPreference
    });

    await user.save();

    res.status(201).json({ message: 'User registered successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Login attempt for:', email);
  try {
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      console.log('Login failed: user not found');
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      console.log('Login failed: incorrect password');
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }
    // Generate JWT token
    const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '7d' });
    
    // Remove password from user object before sending
    const userData = user.toObject();
    delete userData.password;
    console.log('Login successful for:', email);
    res.json({ 
      success: true, 
      message: 'Login successful!', 
      user: userData,
      token: token
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// Add JWT verification endpoint
app.get('/api/auth/verify', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided.' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    
    const userData = user.toObject();
    delete userData.password;
    
    res.json({ success: true, user: userData });
  } catch (err) {
    console.error('Token verification error:', err);
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
});

// Connect to DB and start server
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => {
    console.log('MongoDB connected');
    app.listen(3000, () => console.log('Server running on http://localhost:3000'));
})
.catch(err => console.error('DB connection error:', err));
