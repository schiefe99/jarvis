const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { isGuest } = require('../utils/access');

const router = express.Router();
router.use(authMiddleware);

router.get('/members', async (req, res) => {
  if (await isGuest(req.userId)) {
    // convidado só enxerga quem divide algum grupo com ele
    const members = await db.prepare(`
      SELECT DISTINCT u.id, u.name FROM users u
      JOIN work_group_participants gp ON gp.user_id = u.id
      WHERE gp.group_id IN (SELECT group_id FROM work_group_participants WHERE user_id = ?)
      ORDER BY u.name
    `).all(req.userId);
    return res.json(members);
  }
  const members = await db.prepare('SELECT id, name FROM users ORDER BY name').all();
  res.json(members);
});

module.exports = router;
