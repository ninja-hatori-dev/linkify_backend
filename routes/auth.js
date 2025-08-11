const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/failure' }),
  (req, res) => {
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: req.user.id, 
        email: req.user.email,
        domain: req.user.company_domain 
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Redirect to frontend with token
    const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}`;
    console.log('Redirecting to frontend with token:', redirectUrl);
    res.redirect(redirectUrl);
  }
);

router.get('/failure', (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL}/auth/failure`);
});

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Verify current user
router.get('/verify', verifyToken, (req, res) => {
  res.json({ 
    user: {
      userId: req.user.userId,
      email: req.user.email,
      domain: req.user.domain
    },
    valid: true 
  });
});

// Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const db = require('../database/db');
    const user = await db.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Don't send sensitive data
    const { google_id, user_data, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

module.exports = { router, verifyToken };