// src/test/auth.test.js

// 1. Mock Nodemailer at the very top before any imports
jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
      sendMail: jest.fn().mockImplementation((mailOptions, callback) => {
        // Extract OTP from mailOptions.text
        const otpMatch = mailOptions.text.match(/Your OTP is (\d{6})/);
        const otp = otpMatch ? otpMatch[1] : null;
  
        // Attach the OTP to the mock sendMail call for retrieval in tests
        mailOptions.otp = otp;
  
        // Call the callback with no error
        callback(null, { response: 'OK' });
  
        // Return a resolved promise
        return Promise.resolve({ response: 'OK' });
      }),
      verify: jest.fn().mockResolvedValue(true), // Mock verify to resolve successfully
    })),
  }));
  
  const request = require('supertest');
  const express = require('express');
  const session = require('express-session');
  const MongoStore = require('connect-mongo');
  const cookieParser = require('cookie-parser');
  const bodyParser = require('body-parser');
  const mongoose = require('mongoose');
  const dotenv = require('dotenv');
  
  dotenv.config({ path: '.env.test' }); // Use separate env for testing
  
  // Import your routes and other necessary modules
  const authRoutes = require('../routes/auth'); // Corrected path
  const connectDB = require('../config/db');
  const User = require('../models/user');
  const transporter = require('../config/mailer'); // This will now use the mocked transporter
  
  // Initialize the app for testing
  const app = express();
  
  // Middleware
  app.use(bodyParser.json());
  app.use(cookieParser());
  app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { 
      httpOnly: true, 
      sameSite: 'strict',
      secure: false // Set to true if using HTTPS
    }
  }));
  
  // Use Routes
  app.use('/auth', authRoutes);
  
  // Connect to the test database before running tests
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI, {
      // Uncomment if needed
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
  });
  
  // Clean up the database after each test
  afterEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks(); // Clear mock history between tests
  });
  
  // Close the database connection after all tests
  afterAll(async () => {
    await mongoose.connection.close();
  });
  
  // Access the mocked sendMail function
  const sendMailMock = transporter.sendMail;
  
  // Test Suite for Authentication
  describe('Authentication Routes', () => {
    test('Register a new user', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ username: 'gvirkramram63@gmail.com', password: 'password123' });
      
      expect(response.statusCode).toBe(201);
      expect(response.body.message).toBe('User registered');
      
      const user = await User.findOne({ username: 'gvirkramram63@gmail.com' });
      expect(user).not.toBeNull();
      expect(user.password).toBe('password123'); // Update if using bcrypt
    });
    
    test('Login with correct credentials', async () => {
      // First, create a user
      const user = new User({ username: 'gvirkramram63@gmail.com', password: 'password123' });
      await user.save();
      
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'gvirkramram63@gmail.com', password: 'password123' });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Logged in successfully');
    });
    
    test('Login with incorrect credentials', async () => {
      // First, create a user
      const user = new User({ username: 'gvirkramram63@gmail.com', password: 'password123' });
      await user.save();
      
      const response = await request(app)
        .post('/auth/login')
        .send({ username: 'gvirkramram63@gmail.com', password: 'wrongpassword' });
      
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });
    
    test('Logout a user', async () => {
      // First, create a user and login
      const user = new User({ username: 'gvirkramram63@gmail.com', password: 'password123' });
      await user.save();
      
      const agent = request.agent(app);
      
      await agent
        .post('/auth/login')
        .send({ username: 'gvirkramram63@gmail.com', password: 'password123' });
      
      const response = await agent.post('/auth/logout');
      
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('Logged out');
    });
    
    test('Forget password sends OTP', async () => {
      // Create a user
      const user = new User({ username: 'gvirkramram63@gmail.com', password: 'password123' });
      await user.save();
      
      const response = await request(app)
        .post('/auth/forget-password')
        .send({ username: 'gvirkramram63@gmail.com' });
      
      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('OTP sent');
      expect(response.body.otp).toBeDefined(); // OTP should be included during testing
      expect(sendMailMock).toHaveBeenCalled();
      
      // Optionally, you can verify the OTP format
      const otp = response.body.otp;
      expect(otp).toMatch(/^\d{6}$/); // OTP should be a 6-digit number
    });
    
    test('Reset password with correct OTP', async () => {
      // Create a user
      const user = new User({ username: 'gvirkramram63@gmail.com', password: 'password123' });
      await user.save();
      
      const agent = request.agent(app);
      
      // Simulate forget password to set OTP and retrieve it
      const forgetResponse = await agent
        .post('/auth/forget-password')
        .send({ username: 'gvirkramram63@gmail.com' });
      
      expect(forgetResponse.statusCode).toBe(200);
      expect(forgetResponse.body.message).toBe('OTP sent');
      expect(forgetResponse.body.otp).toBeDefined(); // OTP should be included during testing
      expect(sendMailMock).toHaveBeenCalled();
      
      const otp = forgetResponse.body.otp;
      expect(otp).toMatch(/^\d{6}$/); // OTP should be a 6-digit number
      
      // Attempt to reset password with the correct OTP
      const responseReset = await agent
        .post('/auth/reset-password')
        .send({ username: 'gvirkramram63@gmail.com', otp: otp, newPassword: 'newpassword123' });
      
      expect(responseReset.statusCode).toBe(200);
      expect(responseReset.body.message).toBe('Password reset successfully');
      
      // Verify that the password was updated
      const updatedUser = await User.findOne({ username: 'gvirkramram63@gmail.com' });
      expect(updatedUser.password).toBe('newpassword123'); // Update if using bcrypt
    });
  });
  