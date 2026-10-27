const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hydrate(task, date) {
  return {
    ...task,
    weekdays: JSON.parse(task.weekdays),
    active: !!task.active,
    done_today: !!db.prepare(
      'SELECT 1 FROM daily_task_completions WHERE daily_task_id = ? AND date = ?'
    ).get(task.id, date),
  };
}

function parseWeekdays(input) {
  if (!Array.isArray(input)) return null;
  const days = [...new Set(input.filter(d => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  return days.length > 0 ? days : null;
}

router.get('/', (req, res) => {
  const tasks = db.prepare('SELECT * FROM daily_tasks WHERE user_id = ? ORDER BY created_at DESC').all(req.userId);
  const date = todayKey();
  res.json(tasks.map(t => hydrate(t, date)));
});

router.post('/', (req, res) => {
  const { title, description } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Título é obrigatório' });
  }

  const days = parseWeekdays(req.body.weekdays);
  if (!days) {
    return res.status(400).json({ error: 'Selecione ao menos um dia da semana' });
  }

  const result = db.prepare(
    'INSERT INTO daily_tasks (user_id, title, description, weekdays) VALUES (?, ?, ?, ?)'
  ).run(req.userId, title.trim(), description || '', JSON.stringify(days));

  const task = db.prepare('SELECT * FROM daily_tasks WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(hydrate(task, todayKey()));
});

router.put('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM daily_tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa diária não encontrada' });
  }

  const title = 'title' in req.body && req.body.title.trim() ? req.body.title.trim() : task.title;
  const description = 'description' in req.body ? req.body.description : task.description;
  const active = 'active' in req.body ? (req.body.active ? 1 : 0) : task.active;

  let weekdays = task.weekdays;
  if ('weekdays' in req.body) {
    const days = parseWeekdays(req.body.weekdays);
    if (!days) {
      return res.status(400).json({ error: 'Selecione ao menos um dia da semana' });
    }
    weekdays = JSON.stringify(days);
  }

  db.prepare('UPDATE daily_tasks SET title = ?, description = ?, weekdays = ?, active = ? WHERE id = ?')
    .run(title, description, weekdays, active, task.id);

  res.json(hydrate(db.prepare('SELECT * FROM daily_tasks WHERE id = ?').get(task.id), todayKey()));
});

router.delete('/:id', (req, res) => {
  const task = db.prepare('SELECT * FROM daily_tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa diária não encontrada' });
  }

  db.prepare('DELETE FROM daily_tasks WHERE id = ?').run(task.id);
  res.status(204).send();
});

router.post('/:id/toggle', (req, res) => {
  const task = db.prepare('SELECT * FROM daily_tasks WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa diária não encontrada' });
  }

  const date = todayKey();
  const existing = db.prepare('SELECT 1 FROM daily_task_completions WHERE daily_task_id = ? AND date = ?').get(task.id, date);
  if (existing) {
    db.prepare('DELETE FROM daily_task_completions WHERE daily_task_id = ? AND date = ?').run(task.id, date);
  } else {
    db.prepare('INSERT INTO daily_task_completions (daily_task_id, date) VALUES (?, ?)').run(task.id, date);
  }

  res.json(hydrate(db.prepare('SELECT * FROM daily_tasks WHERE id = ?').get(task.id), date));
});

module.exports = router;
