const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function attachSteps(task) {
  task.steps = db.prepare('SELECT * FROM task_steps WHERE task_id = ? ORDER BY position, id').all(task.id);
  return task;
}

function usersMap() {
  const rows = db.prepare('SELECT id, name FROM users').all();
  return new Map(rows.map(u => [u.id, u.name]));
}

function attachNames(task, map) {
  task.created_by_name = map.get(task.user_id) || null;
  task.assigned_to_name = task.assigned_to ? (map.get(task.assigned_to) || null) : null;
  return task;
}

function getAccessibleTask(id, userId) {
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return null;
  if (task.category === 'pessoal' && task.user_id !== userId) return null;
  if (task.category === 'trabalho' && !task.shared_with_team && task.user_id !== userId) return null;
  return task;
}

router.get('/', (req, res) => {
  const { category, status, search, scope } = req.query;
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (category === 'trabalho' && scope === 'team') {
    // Tercon: shared team/company pool, visible to every member regardless of who created it
    query += ' AND category = ? AND shared_with_team = 1';
    params.push('trabalho');
  } else if (category === 'trabalho') {
    // Trabalho: personal work list — only what this user created and hasn't allocated to the group
    query += ' AND category = ? AND user_id = ? AND (shared_with_team IS NULL OR shared_with_team = 0)';
    params.push('trabalho', req.userId);
  } else {
    // pessoal, or no category given: always scoped to the requesting user
    query += ' AND user_id = ?';
    params.push(req.userId);
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
  }
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  if (search) {
    query += ' AND (title LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY created_at DESC';
  const map = usersMap();
  const tasks = db.prepare(query).all(...params).map(t => attachNames(attachSteps(t), map));
  res.json(tasks);
});

router.post('/', (req, res) => {
  const { title, description, category, assigned_to, due_date, shared_with_team } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: 'Título e categoria são obrigatórios' });
  }

  let shared = category === 'trabalho' && shared_with_team ? 1 : 0;
  // atribuir a outra pessoa exige que o ticket seja compartilhado, senão a pessoa não conseguiria vê-lo
  if (category === 'trabalho' && assigned_to && assigned_to !== req.userId) shared = 1;

  const result = db.prepare(
    'INSERT INTO tasks (user_id, title, description, category, assigned_to, due_date, shared_with_team) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.userId, title, description || '', category, assigned_to || null, due_date || null, shared);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(attachNames(attachSteps(task), usersMap()));
});

router.put('/:id', (req, res) => {
  const task = getAccessibleTask(req.params.id, req.userId);

  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  const updated = { ...task };
  // category é imutável após a criação — evita que uma tarefa cruze entre Jarvis (trabalho, compartilhado) e Sivraj (pessoal, privado)
  const allowed = ['title', 'description', 'status', 'real_time', 'timer_active', 'timer_started_at', 'finished_at', 'assigned_to', 'due_date'];

  for (const field of allowed) {
    if (field in req.body) {
      updated[field] = req.body[field];
    }
  }

  if (typeof updated.timer_active === 'boolean') {
    updated.timer_active = updated.timer_active ? 1 : 0;
  }

  if (req.body.status === 'concluida' && !task.finished_at) {
    updated.finished_at = Math.floor(Date.now() / 1000);
  }

  // atribuir a alguém diferente do criador promove o ticket pro pool compartilhado automaticamente,
  // senão a pessoa atribuída não conseguiria nem ver a própria tarefa (getAccessibleTask bloquearia)
  if (updated.category === 'trabalho' && updated.assigned_to && updated.assigned_to !== task.user_id) {
    updated.shared_with_team = 1;
  }

  db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, category = ?, status = ?,
      real_time = ?, timer_active = ?,
      timer_started_at = ?, finished_at = ?, assigned_to = ?, due_date = ?, shared_with_team = ?
    WHERE id = ?
  `).run(
    updated.title, updated.description, updated.category, updated.status,
    updated.real_time, updated.timer_active,
    updated.timer_started_at, updated.finished_at, updated.assigned_to || null, updated.due_date || null,
    updated.shared_with_team,
    req.params.id
  );

  const result = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(attachNames(attachSteps(result), usersMap()));
});

router.delete('/:id', (req, res) => {
  const task = getAccessibleTask(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

router.post('/:id/steps', (req, res) => {
  const task = getAccessibleTask(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Título da etapa é obrigatório' });
  }

  const { maxPosition } = db.prepare('SELECT COALESCE(MAX(position), -1) as maxPosition FROM task_steps WHERE task_id = ?').get(task.id);
  db.prepare('INSERT INTO task_steps (task_id, title, position) VALUES (?, ?, ?)')
    .run(task.id, title.trim(), maxPosition + 1);

  res.status(201).json(attachNames(attachSteps(task), usersMap()));
});

router.put('/:id/steps/:stepId', (req, res) => {
  const task = getAccessibleTask(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  const step = db.prepare('SELECT * FROM task_steps WHERE id = ? AND task_id = ?').get(req.params.stepId, task.id);
  if (!step) {
    return res.status(404).json({ error: 'Etapa não encontrada' });
  }

  const updated = { ...step };
  if ('title' in req.body) updated.title = req.body.title;
  if ('done' in req.body) updated.done = req.body.done ? 1 : 0;

  db.prepare('UPDATE task_steps SET title = ?, done = ? WHERE id = ?')
    .run(updated.title, updated.done, step.id);

  res.json(attachNames(attachSteps(task), usersMap()));
});

router.delete('/:id/steps/:stepId', (req, res) => {
  const task = getAccessibleTask(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  db.prepare('DELETE FROM task_steps WHERE id = ? AND task_id = ?').run(req.params.stepId, task.id);
  res.json(attachNames(attachSteps(task), usersMap()));
});

module.exports = router;
