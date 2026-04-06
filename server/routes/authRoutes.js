const express = require('express');
const jwt = require('jsonwebtoken');
const { getAuth } = require('@clerk/express');
const router = express.Router();

// The user provided the existing ENCRYPTION_SECRET to use as the JWT secret
const JWT_SECRET = process.env.ENCRYPTION_SECRET;

/**
 * GET /api/auth/extension-token
 * Generates a long-lived JWT for the extension using the existing Clerk session.
 */
router.get('/extension-token', async (req, res) => {
  const auth = getAuth(req);
  
  if (!auth?.userId) {
    return res.status(401).json({ error: 'Unauthorized: No Clerk session found' });
  }

  try {
    // Generate a 30-day JWT for the extension
    const token = jwt.sign(
      { userId: auth.userId, source: 'extension_bridge' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ token });
  } catch (error) {
    console.error('[AUTH] ❌ Error generating extension token:', error.message);
    res.status(500).json({ error: 'Failed to generate extension token' });
  }
});

module.exports = router;
