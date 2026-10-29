const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { sendInvite } = require('../services/email');

const router = express.Router();
router.use(authMiddleware, adminMiddleware);

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function groupIdsByUser() {
  const rows = await db.prepare('SELECT group_id, user_id FROM work_group_participants').all();
  const map = new Map();
  for (const r of rows) map.set(r.user_id, [...(map.get(r.user_id) || []), r.group_id]);
  return map;
}

// convidado fica exatamente nos grupos escolhidos — sai de qualquer outro grupo e de projetos fora deles
async function setGuestGroups(userId, groupIds) {
  const ids = groupIds.map(Number).filter(Number.isInteger);
  const placeholders = ids.map(() => '?').join(',') || 'NULL';
  await db.prepare(`DELETE FROM work_group_participants WHERE user_id = ? AND group_id NOT IN (${placeholders})`).run(userId, ...ids);
  await db.prepare(`
    DELETE FROM project_participants WHERE user_id = ? AND project_id IN (
      SELECT id FROM projects WHERE group_id IS NULL OR group_id NOT IN (${placeholders})
    )
  `).run(userId, ...ids);
  const insert = db.prepare('INSERT OR IGNORE INTO work_group_participants (group_id, user_id) VALUES (?, ?)');
  for (const groupId of ids) await insert.run(groupId, userId);
}

router.get('/users', async (req, res) => {
  const users = await db.prepare('SELECT id, name, email, is_admin, is_guest FROM users ORDER BY id').all();
  const groups = await groupIdsByUser();
  res.json(users.map(u => ({ ...u, is_admin: !!u.is_admin, is_guest: !!u.is_guest, group_ids: groups.get(u.id) || [] })));
});

router.get('/groups', async (req, res) => {
  res.json(await db.prepare('SELECT id, name FROM work_groups ORDER BY name').all());
});

router.patch('/users/:id', async (req, res) => {
  const target = await db.prepare('SELECT * FROM users WHERE id = ?').get(Number(req.params.id));
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado' });

  const isGuest = !!req.body.is_guest;
  if (isGuest && target.is_admin) {
    return res.status(400).json({ error: 'Administradores não podem ser convidados' });
  }

  await db.prepare('UPDATE users SET is_guest = ? WHERE id = ?').run(isGuest ? 1 : 0, target.id);
  if (isGuest) {
    await setGuestGroups(target.id, Array.isArray(req.body.group_ids) ? req.body.group_ids : []);
  }

  const groups = await groupIdsByUser();
  res.json({
    id: target.id, name: target.name, email: target.email,
    is_admin: !!target.is_admin, is_guest: isGuest, group_ids: groups.get(target.id) || [],
  });
});

router.post('/users', async (req, res) => {
  const { name, email, is_guest, group_ids } = req.body;
  const guest = !!is_guest;
  const guestGroupIds = Array.isArray(group_ids) ? group_ids : [];

  if (guest && guestGroupIds.length === 0) {
    return res.status(400).json({ error: 'Escolha ao menos um grupo para o convidado' });
  }

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email já cadastrado' });
  }

  const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const result = await db.prepare(
    'INSERT INTO users (name, email, password, is_guest) VALUES (?, ?, ?, ?)'
  ).run(name, email, placeholderPassword, guest ? 1 : 0);
  const userId = result.lastInsertRowid;
  if (guest) await setGuestGroups(userId, guestGroupIds);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Math.floor((Date.now() + INVITE_TTL_MS) / 1000);
  await db.prepare('INSERT INTO invite_tokens (user_id, token, expires_at) VALUES (?, ?, ?)')
    .run(userId, token, expiresAt);

  const appUrl = process.env.APP_URL || 'http://localhost:5173';
  const inviteLink = `${appUrl}/set-password?token=${token}`;

  let emailSent = false;
  try {
    await sendInvite({ to: email, name, link: inviteLink });
    emailSent = true;
  } catch (err) {
    console.error('Falha ao enviar convite por e-mail:', err.message);
  }

  res.status(201).json({
    id: userId,
    name,
    email,
    is_admin: false,
    is_guest: guest,
    emailSent,
    inviteLink: emailSent ? undefined : inviteLink,
  });
});

router.delete('/users/:id', async (req, res) => {
  const targetId = Number(req.params.id);

  if (targetId === req.userId) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta' });
  }

  await db.prepare('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = ?').run(targetId);
  const result = await db.prepare('DELETE FROM users WHERE id = ?').run(targetId);

  if (result.changes === 0) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }
  res.status(204).send();
});

module.exports = router;
