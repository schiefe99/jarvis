const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, is_admin: !!user.is_admin },
  });
});

router.post('/set-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token e senha são obrigatórios' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
  }

  const invite = db.prepare('SELECT * FROM invite_tokens WHERE token = ?').get(token);
  if (!invite) {
    return res.status(404).json({ error: 'Convite não encontrado' });
  }
  if (invite.expires_at < Math.floor(Date.now() / 1000)) {
    db.prepare('DELETE FROM invite_tokens WHERE id = ?').run(invite.id);
    return res.status(400).json({ error: 'Convite expirado' });
  }

  const hashed = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, invite.user_id);
  db.prepare('DELETE FROM invite_tokens WHERE id = ?').run(invite.id);

  res.json({ success: true });
});

module.exports = router;
