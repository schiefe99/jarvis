const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

const DEFAULT_GROUP_NAME = 'Grupo';

router.get('/group-name', async (req, res) => {
  const row = await db.prepare('SELECT value FROM app_settings WHERE key = ?').get('group_name');
  res.json({ name: row?.value || DEFAULT_GROUP_NAME });
});

router.put('/group-name', async (req, res) => {
  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Nome não pode ser vazio' });
  await db.prepare('INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .run('group_name', name);
  res.json({ name });
});

module.exports = router;
