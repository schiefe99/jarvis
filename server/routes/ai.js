const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { ask, chat } = require('../services/claude');

const router = express.Router();
router.use(authMiddleware);

function todayContext() {
  const now = new Date();
  const formatted = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
  return `Hoje é ${formatted} (${now.toISOString().slice(0, 10)}). Use essa data como referência pra resolver prazos relativos (ex: "sexta-feira", "amanhã", "semana que vem").`;
}

async function taskSnapshot(userId, category, scope, projectId, groupId) {
  let query = 'SELECT * FROM tasks WHERE 1=1';
  const params = [];
  if (category === 'trabalho' && scope === 'team') {
    query += ' AND category = ? AND shared_with_team = 1';
    params.push('trabalho');
    if (groupId) {
      query += ' AND group_id = ?';
      params.push(groupId);
    } else {
      query += ' AND group_id IS NULL';
    }
    if (projectId) {
      query += ' AND project_id = ?';
      params.push(projectId);
    }
  } else if (category === 'trabalho') {
    query += ' AND category = ? AND user_id = ?';
    params.push('trabalho', userId);
  } else {
    query += ' AND user_id = ? AND category = ?';
    params.push(userId, 'pessoal');
  }
  query += ' ORDER BY created_at DESC';
  const tasks = await db.prepare(query).all(...params);

  if (tasks.length === 0) return 'Nenhuma tarefa cadastrada.';

  const usersMap = new Map((await db.prepare('SELECT id, name FROM users').all()).map(u => [u.id, u.name]));
  const stepsMap = new Map(
    (await db.prepare('SELECT task_id, COUNT(*) as total, SUM(done) as done FROM task_steps GROUP BY task_id').all())
      .map(s => [s.task_id, s])
  );
  const assigneesMap = new Map();
  (await db.prepare('SELECT task_id, user_id FROM task_assignees').all()).forEach(row => {
    const list = assigneesMap.get(row.task_id) || [];
    list.push(usersMap.get(row.user_id));
    assigneesMap.set(row.task_id, list);
  });
  const now = Math.floor(Date.now() / 1000);

  return tasks.map(t => {
    const steps = stepsMap.get(t.id);
    const stepsText = steps ? `${steps.done}/${steps.total} etapas` : 'sem etapas';
    const assignees = assigneesMap.get(t.id);
    const hours = ((t.real_time || 0) / 3600).toFixed(1);
    let dueText = '';
    if (t.due_date) {
      const dateStr = new Date(t.due_date * 1000).toISOString().slice(0, 10);
      dueText = t.due_date < now && t.status !== 'concluida' ? ` · ATRASADA (prazo era ${dateStr})` : ` · prazo ${dateStr}`;
    }
    return `- [${t.status}] "${t.title}"${assignees?.length ? ` (atribuída a ${assignees.join(', ')})` : ''} · ${stepsText} · ${hours}h gastas${dueText}`;
  }).join('\n');
}

router.get('/summary', async (req, res) => {
  const category = req.query.category === 'pessoal' ? 'pessoal' : 'trabalho';
  const scope = req.query.scope === 'team' ? 'team' : undefined;
  const snapshot = await taskSnapshot(req.userId, category, scope, req.query.project, req.query.group);

  try {
    const summary = await ask({
      system: `Você é o assistente do Jarvis, um app de gestão de tarefas. Responda sempre em português, de forma curta e direta.
${todayContext()}
Dado o snapshot de tarefas abaixo, escreva um resumo do estado atual (2-3 frases) seguido de uma lista com 2-3 prioridades sugeridas pra hoje, considerando o que está atrasado, em andamento ou sem etapas concluídas.

Tarefas:
${snapshot}`,
      messages: [{ role: 'user', content: 'Gere o resumo e as prioridades.' }],
    });
    res.json({ summary });
  } catch (err) {
    if (err.code === 'AI_NOT_CONFIGURED') return res.status(503).json({ error: 'IA não configurada' });
    console.error(err);
    res.status(500).json({ error: 'Erro ao gerar resumo' });
  }
});

router.post('/chat', async (req, res) => {
  const { messages, category, scope: rawScope, project, group } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Mensagens são obrigatórias' });
  }

  const cat = category === 'pessoal' ? 'pessoal' : 'trabalho';
  const scope = rawScope === 'team' ? 'team' : undefined;
  const snapshot = await taskSnapshot(req.userId, cat, scope, project, group);

  async function onCreateTask(input) {
    const due_date = input.due_date ? Math.floor(new Date(input.due_date).getTime() / 1000) : null;
    const shared_with_team = cat === 'trabalho' && scope === 'team' ? 1 : 0;
    const projectId = shared_with_team && project ? project : null;
    const groupId = shared_with_team && group ? group : null;
    const result = await db.prepare(
      'INSERT INTO tasks (user_id, title, description, category, due_date, shared_with_team, project_id, group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(req.userId, input.title, input.description || '', cat, due_date, shared_with_team, projectId, groupId);
    return { id: result.lastInsertRowid, title: input.title };
  }

  try {
    const { text, taskCreated } = await chat({
      system: `Você é o assistente do Jarvis, um app de gestão de tarefas. Responda sempre em português, de forma curta e direta.
${todayContext()}
Use o snapshot de tarefas abaixo como contexto pra responder às perguntas do usuário. Quando o usuário pedir explicitamente pra criar/adicionar/registrar uma tarefa, use a ferramenta create_task em vez de só descrever o que faria.

Tarefas:
${snapshot}`,
      messages,
      onCreateTask,
      maxTokens: 512,
    });
    res.json({ reply: text, taskCreated });
  } catch (err) {
    if (err.code === 'AI_NOT_CONFIGURED') return res.status(503).json({ error: 'IA não configurada' });
    console.error(err);
    res.status(500).json({ error: 'Erro ao responder' });
  }
});

module.exports = router;
