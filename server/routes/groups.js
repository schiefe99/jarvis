const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

async function attachParticipants(group) {
  group.participants = await db.prepare(
    'SELECT u.id, u.name FROM work_group_participants gp JOIN users u ON u.id = gp.user_id WHERE gp.group_id = ?'
  ).all(group.id);
  return group;
}

async function usersMap() {
  const rows = await db.prepare('SELECT id, name FROM users').all();
  return new Map(rows.map(u => [u.id, u.name]));
}

router.get('/', async (req, res) => {
  const map = await usersMap();
  const groups = await db.prepare(`
    SELECT g.* FROM work_groups g
    JOIN work_group_participants gp ON gp.group_id = g.id
    WHERE gp.user_id = ?
    ORDER BY g.created_at DESC
  `).all(req.userId);

  res.json(await Promise.all(groups.map(g => attachParticipants({ ...g, created_by_name: map.get(g.created_by) || null }))));
});

router.post('/', async (req, res) => {
  const { name, participant_ids } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do grupo é obrigatório' });
  }

  const result = await db.prepare('INSERT INTO work_groups (name, created_by) VALUES (?, ?)').run(name.trim(), req.userId);
  const groupId = result.lastInsertRowid;

  const participantIds = new Set([req.userId, ...(Array.isArray(participant_ids) ? participant_ids : [])]);
  const insertParticipant = db.prepare('INSERT OR IGNORE INTO work_group_participants (group_id, user_id) VALUES (?, ?)');
  for (const userId of participantIds) {
    await insertParticipant.run(groupId, userId);
  }

  const group = await db.prepare('SELECT * FROM work_groups WHERE id = ?').get(groupId);
  const map = await usersMap();
  res.status(201).json(await attachParticipants({ ...group, created_by_name: map.get(group.created_by) || null }));
});

router.put('/:id', async (req, res) => {
  const isParticipant = await db.prepare(
    'SELECT 1 FROM work_group_participants WHERE group_id = ? AND user_id = ?'
  ).get(req.params.id, req.userId);
  if (!isParticipant) {
    return res.status(404).json({ error: 'Grupo não encontrado' });
  }

  const name = (req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Nome não pode ser vazio' });

  await db.prepare('UPDATE work_groups SET name = ? WHERE id = ?').run(name, req.params.id);

  const group = await db.prepare('SELECT * FROM work_groups WHERE id = ?').get(req.params.id);
  const map = await usersMap();
  res.json(await attachParticipants({ ...group, created_by_name: map.get(group.created_by) || null }));
});

module.exports = router;
