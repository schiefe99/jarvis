const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { isGuest, isGroupParticipant, canViewSharedPool } = require('../utils/access');

const router = express.Router();
router.use(authMiddleware);

const MAX_STEPS = 10;

async function attachSteps(task) {
  task.steps = await db.prepare('SELECT * FROM task_steps WHERE task_id = ? ORDER BY position, id').all(task.id);
  return task;
}

async function attachAssignees(task) {
  task.assignees = await db.prepare(
    'SELECT u.id, u.name FROM task_assignees ta JOIN users u ON u.id = ta.user_id WHERE ta.task_id = ?'
  ).all(task.id);
  return task;
}

async function usersMap() {
  const rows = await db.prepare('SELECT id, name FROM users').all();
  return new Map(rows.map(u => [u.id, u.name]));
}

function attachNames(task, map) {
  task.created_by_name = map.get(task.user_id) || null;
  return task;
}

async function attachProjectName(task) {
  task.project_name = task.project_id
    ? ((await db.prepare('SELECT name FROM projects WHERE id = ?').get(task.project_id))?.name || null)
    : null;
  return task;
}

async function attachGroupName(task) {
  task.group_name = task.group_id
    ? ((await db.prepare('SELECT name FROM work_groups WHERE id = ?').get(task.group_id))?.name || null)
    : null;
  return task;
}

async function hydrate(task, map) {
  await attachSteps(task);
  attachNames(task, map);
  await attachAssignees(task);
  await attachProjectName(task);
  await attachGroupName(task);
  return task;
}

async function isProjectParticipant(projectId, userId) {
  return !!await db.prepare('SELECT 1 FROM project_participants WHERE project_id = ? AND user_id = ?').get(projectId, userId);
}

async function getAccessibleTask(id, userId) {
  const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return null;
  if (await isGuest(userId)) {
    // convidado: só as próprias tarefas não compartilhadas, ou tarefas de um grupo em que participa
    if (task.group_id) return (await isGroupParticipant(task.group_id, userId)) ? task : null;
    return task.user_id === userId && !task.shared_with_team ? task : null;
  }
  if (task.category === 'pessoal' && task.user_id !== userId) return null;
  if (task.category === 'trabalho' && task.project_id) {
    if (task.user_id !== userId && !(await isProjectParticipant(task.project_id, userId))) return null;
    return task;
  }
  if (task.category === 'trabalho' && task.shared_with_team && task.group_id) {
    // pertence a um grupo novo — só participantes daquele grupo
    if (task.user_id !== userId && !(await isGroupParticipant(task.group_id, userId))) return null;
    return task;
  }
  if (task.category === 'trabalho' && task.shared_with_team && !task.group_id) {
    return task; // Tercon: qualquer membro do time, exatamente como hoje
  }
  if (task.category === 'trabalho' && !task.shared_with_team && task.user_id !== userId) return null;
  return task;
}

router.get('/', async (req, res) => {
  const { category, status, search, scope, project, group } = req.query;
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];

  if (category === 'trabalho' && scope === 'team') {
    if (!(await canViewSharedPool(group, req.userId))) return res.json([]);
    // shared team/company pool, visible to every member regardless of who created it —
    // sem "group", é o Tercon (group_id IS NULL); com "group", é um grupo novo isolado
    query += ' AND category = ? AND shared_with_team = 1';
    params.push('trabalho');
    if (group) {
      query += ' AND group_id = ?';
      params.push(group);
    } else {
      query += ' AND group_id IS NULL';
    }
    if (project) {
      query += ' AND project_id = ?';
      params.push(project);
    }
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
  const map = await usersMap();
  const rows = await db.prepare(query).all(...params);
  const tasks = await Promise.all(rows.map(t => hydrate(t, map)));
  res.json(tasks);
});

router.post('/', async (req, res) => {
  const { title, description, category, assignee_ids, due_date, shared_with_team, project_id, group_id } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: 'Título e categoria são obrigatórios' });
  }

  const assignees = Array.isArray(assignee_ids) ? assignee_ids.filter(id => typeof id === 'number') : [];

  let projectId = null;
  let groupId = null;
  if (category === 'trabalho' && project_id) {
    if (!(await isProjectParticipant(project_id, req.userId))) {
      return res.status(400).json({ error: 'Você não participa desse projeto' });
    }
    projectId = project_id;
    // grupo é herdado do projeto — nunca confia num group_id vindo direto do client junto com project_id
    groupId = (await db.prepare('SELECT group_id FROM projects WHERE id = ?').get(projectId))?.group_id || null;
  } else if (category === 'trabalho' && group_id) {
    if (!(await isGroupParticipant(group_id, req.userId))) {
      return res.status(400).json({ error: 'Você não participa desse grupo' });
    }
    groupId = group_id;
  }

  let shared = category === 'trabalho' && shared_with_team ? 1 : 0;
  // atribuir a outra pessoa ou vincular a um projeto exige que o ticket seja compartilhado,
  // senão quem foi atribuído não conseguiria nem ver a própria tarefa
  if (category === 'trabalho' && assignees.some(id => id !== req.userId)) shared = 1;
  if (projectId || groupId) shared = 1;

  if (shared && !groupId && (await isGuest(req.userId))) {
    return res.status(403).json({ error: 'Convidados só podem criar tarefas compartilhadas nos grupos em que participam' });
  }

  const result = await db.prepare(
    'INSERT INTO tasks (user_id, title, description, category, due_date, shared_with_team, project_id, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.userId, title, description || '', category, due_date || null, shared, projectId, groupId);

  const taskId = result.lastInsertRowid;
  const insertAssignee = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)');
  const insertParticipant = db.prepare('INSERT OR IGNORE INTO project_participants (project_id, user_id) VALUES (?, ?)');
  for (const userId of assignees) {
    await insertAssignee.run(taskId, userId);
    if (projectId) await insertParticipant.run(projectId, userId);
  }

  const task = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  res.status(201).json(await hydrate(task, await usersMap()));
});

router.put('/:id', async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.userId);

  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  const updated = { ...task };
  // category e project_id são imutáveis após a criação
  const allowed = ['title', 'description', 'status', 'real_time', 'timer_active', 'timer_started_at', 'finished_at', 'due_date'];

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

  const assignees = Array.isArray(req.body.assignee_ids)
    ? req.body.assignee_ids.filter(id => typeof id === 'number')
    : null;

  // atribuir a alguém diferente do criador promove automaticamente:
  // com projeto, a pessoa vira participante do projeto; com grupo (sem projeto), vira participante do grupo;
  // sem nenhum dos dois, é o Tercon — o ticket só vira compartilhado (comportamento de sempre)
  if (assignees && updated.category === 'trabalho') {
    const others = assignees.filter(id => id !== task.user_id);
    if (others.length > 0 && !task.group_id && (await isGuest(req.userId))) {
      return res.status(403).json({ error: 'Convidados só podem atribuir pessoas em tarefas dos seus grupos' });
    }
    if (others.length > 0) {
      if (task.project_id) {
        const insertParticipant = db.prepare('INSERT OR IGNORE INTO project_participants (project_id, user_id) VALUES (?, ?)');
        for (const id of others) await insertParticipant.run(task.project_id, id);
      } else if (task.group_id) {
        const insertParticipant = db.prepare('INSERT OR IGNORE INTO work_group_participants (group_id, user_id) VALUES (?, ?)');
        for (const id of others) await insertParticipant.run(task.group_id, id);
      } else {
        updated.shared_with_team = 1;
      }
    }
  }

  await db.prepare(`
    UPDATE tasks SET
      title = ?, description = ?, category = ?, status = ?,
      real_time = ?, timer_active = ?,
      timer_started_at = ?, finished_at = ?, due_date = ?, shared_with_team = ?
    WHERE id = ?
  `).run(
    updated.title, updated.description, updated.category, updated.status,
    updated.real_time, updated.timer_active,
    updated.timer_started_at, updated.finished_at, updated.due_date || null,
    updated.shared_with_team,
    req.params.id
  );

  if (assignees) {
    await db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(task.id);
    const insertAssignee = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)');
    for (const id of assignees) await insertAssignee.run(task.id, id);
  }

  const result = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  res.json(await hydrate(result, await usersMap()));
});

router.delete('/:id', async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  await db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

router.post('/:id/steps', async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Título da etapa é obrigatório' });
  }

  const { count } = await db.prepare('SELECT COUNT(*) as count FROM task_steps WHERE task_id = ?').get(task.id);
  if (count >= MAX_STEPS) {
    return res.status(400).json({ error: `Limite de ${MAX_STEPS} itens por tarefa` });
  }

  const { maxPosition } = await db.prepare('SELECT COALESCE(MAX(position), -1) as maxPosition FROM task_steps WHERE task_id = ?').get(task.id);
  await db.prepare('INSERT INTO task_steps (task_id, title, position) VALUES (?, ?, ?)')
    .run(task.id, title.trim(), maxPosition + 1);

  res.status(201).json(await hydrate(task, await usersMap()));
});

router.put('/:id/steps/:stepId', async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  const step = await db.prepare('SELECT * FROM task_steps WHERE id = ? AND task_id = ?').get(req.params.stepId, task.id);
  if (!step) {
    return res.status(404).json({ error: 'Etapa não encontrada' });
  }

  const updated = { ...step };
  if ('title' in req.body) updated.title = req.body.title;
  if ('done' in req.body) updated.done = req.body.done ? 1 : 0;

  await db.prepare('UPDATE task_steps SET title = ?, done = ? WHERE id = ?')
    .run(updated.title, updated.done, step.id);

  res.json(await hydrate(task, await usersMap()));
});

router.delete('/:id/steps/:stepId', async (req, res) => {
  const task = await getAccessibleTask(req.params.id, req.userId);
  if (!task) {
    return res.status(404).json({ error: 'Tarefa não encontrada' });
  }

  await db.prepare('DELETE FROM task_steps WHERE id = ? AND task_id = ?').run(req.params.stepId, task.id);
  res.json(await hydrate(task, await usersMap()));
});

module.exports = router;
