const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');

const router = express.Router();
router.use(authMiddleware);

function decryptCommitment(row) {
  return { ...row, forecast_amount: decrypt(row.forecast_amount) };
}

router.get('/', async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Informe o mês (YYYY-MM)' });
  const rows = await db.prepare(
    'SELECT * FROM commitments WHERE user_id = ? AND (is_recurring = 1 OR month = ?) ORDER BY created_at DESC'
  ).all(req.userId, month);
  res.json(rows.map(decryptCommitment));
});

router.post('/', async (req, res) => {
  const { title, category, forecast_amount, month, is_recurring, notes, commitment_date } = req.body;
  if (!title || !category || forecast_amount == null)
    return res.status(400).json({ error: 'Título, categoria e valor são obrigatórios' });

  const recurring = is_recurring ? 1 : 0;
  const result = await db.prepare(
    'INSERT INTO commitments (user_id, title, category, forecast_amount, month, is_recurring, notes, commitment_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(req.userId, title, category, encrypt(forecast_amount), recurring ? null : (month || null), recurring, notes || '', commitment_date || null);

  res.status(201).json(decryptCommitment(await db.prepare('SELECT * FROM commitments WHERE id = ?').get(result.lastInsertRowid)));
});

router.put('/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM commitments WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Compromisso não encontrado' });

  const { title, category, forecast_amount, month, is_recurring, notes, commitment_date } = req.body;
  const recurring = is_recurring !== undefined ? (is_recurring ? 1 : 0) : row.is_recurring;

  await db.prepare(
    'UPDATE commitments SET title=?, category=?, forecast_amount=?, month=?, is_recurring=?, notes=?, commitment_date=? WHERE id=? AND user_id=?'
  ).run(
    title ?? row.title,
    category ?? row.category,
    forecast_amount != null ? encrypt(forecast_amount) : row.forecast_amount,
    recurring ? null : (month ?? row.month),
    recurring,
    notes ?? row.notes,
    commitment_date !== undefined ? (commitment_date || null) : row.commitment_date,
    req.params.id, req.userId
  );
  res.json(decryptCommitment(await db.prepare('SELECT * FROM commitments WHERE id = ?').get(req.params.id)));
});

router.delete('/:id', async (req, res) => {
  const r = await db.prepare('DELETE FROM commitments WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Compromisso não encontrado' });
  res.status(204).send();
});

router.get('/budget', async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Informe o mês' });

  const monthlySalaryRow = await db.prepare('SELECT salary FROM monthly_salary WHERE user_id = ? AND month = ?').get(req.userId, month);
  const salary = monthlySalaryRow ? decrypt(monthlySalaryRow.salary) : 0;

  const rawCommitments = await db.prepare(
    'SELECT forecast_amount FROM commitments WHERE user_id = ? AND (is_recurring = 1 OR month = ?)'
  ).all(req.userId, month);
  const totalCommitted = rawCommitments.reduce((s, r) => s + decrypt(r.forecast_amount), 0);

  const rawExpenses = await db.prepare(
    'SELECT amount FROM expenses WHERE user_id = ? AND month = ?'
  ).all(req.userId, month);
  const totalExpenses = rawExpenses.reduce((s, r) => s + decrypt(r.amount), 0);

  const totalUsed = totalCommitted + totalExpenses;
  res.json({ salary, totalExpenses, totalCommitted, totalUsed, remaining: salary - totalUsed });
});

module.exports = router;
