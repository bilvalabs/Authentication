// controllers/authController.js

const User = require('../models/user');
const transporter = require('../config/mailer'); // Import the transporter from config

// Middleware to check if user is authenticated
exports.isAuthenticated = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/auth/login');
    }
};

// Register a new user
exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;
        const existingUser = await User.findOne({ username });

        if (existingUser) {
            return res.status(400).send('User already exists');
        }

        const user = new User({ username, password });
        await user.save();
        res.redirect('/auth/login');
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).send('Server error');
    }
};

// Login a user
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });

        if (!user || user.password !== password) {
            return res.status(401).send('Invalid credentials');
        }

        // Invalidate any existing session
        if (user.sessionID) {
            req.sessionStore.destroy(user.sessionID, (err) => {
                if (err) console.error('Error destroying previous session:', err);
            });
        }

        req.session.user = user;
        user.sessionID = req.sessionID;
        await user.save();

        res.redirect('/auth/dashboard');
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Server error');
    }
};

// Logout a user
exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.redirect('/auth/login');
    });
};

// Handle forget password
exports.forgetPassword = async (req, res) => {
    try {
        const { username } = req.body;
        const user = await User.findOne({ username });

        if (!user) return res.status(404).send('User not found');

        const otp = Math.floor(100000 + Math.random() * 900000); // Generate 6-digit OTP
        req.session.otp = otp; // Store OTP in session
        req.session.username = username; // Store username in session

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: username, // Assuming email is the username
            subject: 'Password Reset OTP',
            text: `Your OTP is ${otp}`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending OTP email:', error);
                return res.status(500).send('Failed to send OTP');
            }
            res.redirect('/auth/reset-password');
        });
    } catch (error) {
        console.error('Error during forget password:', error);
        res.status(500).send('Server error');
    }
};

// Reset password
exports.resetPassword = async (req, res) => {
    try {
        const { otp, newPassword } = req.body;
        const username = req.session.username;

        if (!username || req.session.otp !== parseInt(otp)) {
            return res.status(400).send('Invalid OTP');
        }

        const user = await User.findOne({ username });
        if (!user) return res.status(404).send('User not found');

        user.password = newPassword; // Save new password in plain text
        await user.save();

        // Clear OTP and username from session
        req.session.otp = null;
        req.session.username = null;

        res.redirect('/auth/login');
    } catch (error) {
        console.error('Error during password reset:', error);
        res.status(500).send('Server error');
    }
};

