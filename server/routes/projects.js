const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

async function attachParticipants(project) {
  project.participants = await db.prepare(
    'SELECT u.id, u.name FROM project_participants pp JOIN users u ON u.id = pp.user_id WHERE pp.project_id = ?'
  ).all(project.id);
  return project;
}

async function usersMap() {
  const rows = await db.prepare('SELECT id, name FROM users').all();
  return new Map(rows.map(u => [u.id, u.name]));
}

async function attachGroupName(project) {
  project.group_name = project.group_id
    ? ((await db.prepare('SELECT name FROM work_groups WHERE id = ?').get(project.group_id))?.name || null)
    : null;
  return project;
}

router.get('/', async (req, res) => {
  const map = await usersMap();
  const projects = await db.prepare(`
    SELECT p.* FROM projects p
    JOIN project_participants pp ON pp.project_id = p.id
    WHERE pp.user_id = ?
    ORDER BY p.created_at DESC
  `).all(req.userId);

  res.json(await Promise.all(projects.map(async p => attachGroupName(await attachParticipants({ ...p, created_by_name: map.get(p.created_by) || null })))));
});

router.post('/', async (req, res) => {
  const { name, participant_ids, group_id } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do projeto é obrigatório' });
  }

  let groupId = null;
  if (group_id) {
    const isGroupParticipant = await db.prepare(
      'SELECT 1 FROM work_group_participants WHERE group_id = ? AND user_id = ?'
    ).get(group_id, req.userId);
    if (!isGroupParticipant) {
      return res.status(400).json({ error: 'Você não participa desse grupo' });
    }
    groupId = group_id;
  }

  const result = await db.prepare('INSERT INTO projects (name, created_by, group_id) VALUES (?, ?, ?)').run(name.trim(), req.userId, groupId);
  const projectId = result.lastInsertRowid;

  const participantIds = new Set([req.userId, ...(Array.isArray(participant_ids) ? participant_ids : [])]);
  const insertParticipant = db.prepare('INSERT OR IGNORE INTO project_participants (project_id, user_id) VALUES (?, ?)');
  for (const userId of participantIds) {
    await insertParticipant.run(projectId, userId);
  }

  const project = await db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  const map = await usersMap();
  res.status(201).json(await attachGroupName(await attachParticipants({ ...project, created_by_name: map.get(project.created_by) || null })));
});

module.exports = router;
