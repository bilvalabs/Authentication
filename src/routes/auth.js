// routes/auth.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// GET /register - Render registration form
router.get('/register', (req, res) => {
    res.render('register');
});

// POST /register
router.post('/register', authController.register);

// GET /login - Render login form
router.get('/login', (req, res) => {
    res.render('login');
});

// POST /login
router.post('/login', authController.login);

// GET /dashboard - Protected route
router.get('/dashboard', authController.isAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.session.user });
});

// GET /logout - Logout and redirect to login
router.get('/logout', authController.logout);

// GET /forget-password - Render forget password form
router.get('/forget-password', (req, res) => {
    res.render('forget-password');
});

// POST /forget-password
router.post('/forget-password', authController.forgetPassword);

// GET /reset-password - Render reset password form
router.get('/reset-password', (req, res) => {
    res.render('reset-password');
});

// POST /reset-password
router.post('/reset-password', authController.resetPassword);

module.exports = router;
