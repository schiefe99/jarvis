const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/members', (req, res) => {
  const members = db.prepare('SELECT id, name FROM users ORDER BY name').all();
  res.json(members);
});

module.exports = router;
