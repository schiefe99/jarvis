const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const { sendInvite } = require('../services/email');

const router = express.Router();
router.use(authMiddleware, adminMiddleware);

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

router.get('/users', async (req, res) => {
  const users = await db.prepare('SELECT id, name, email, is_admin FROM users ORDER BY id').all();
  res.json(users.map(u => ({ ...u, is_admin: !!u.is_admin })));
});

router.post('/users', async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).json({ error: 'Nome e email são obrigatórios' });
  }

  const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email já cadastrado' });
  }

  const placeholderPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
  const result = await db.prepare(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)'
  ).run(name, email, placeholderPassword);
  const userId = result.lastInsertRowid;

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
