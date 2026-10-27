const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/members', async (req, res) => {
  const members = await db.prepare('SELECT id, name FROM users ORDER BY name').all();
  res.json(members);
});

module.exports = router;
