const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');

const router = express.Router();
router.use(authMiddleware);

function decryptExpense(row) {
  return { ...row, amount: decrypt(row.amount) };
}

// ── Salary helpers ───────────────────────────────────────
async function getSalaryForMonth(userId, month) {
  const row = await db.prepare('SELECT salary FROM monthly_salary WHERE user_id = ? AND month = ?').get(userId, month);
  return { salary: row ? decrypt(row.salary) : 0, defined: !!row };
}

// ── Salary routes ────────────────────────────────────────
router.get('/settings', async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Informe o mês' });
  res.json(await getSalaryForMonth(req.userId, month));
});

router.put('/settings', async (req, res) => {
  const { salary, month } = req.body;
  if (salary == null || isNaN(salary)) return res.status(400).json({ error: 'Salário inválido' });
  if (!month) return res.status(400).json({ error: 'Informe o mês' });
  const val = parseFloat(salary);
  await db.prepare('INSERT OR REPLACE INTO monthly_salary (user_id, month, salary) VALUES (?, ?, ?)').run(req.userId, month, encrypt(val));
  res.json({ salary: val, defined: true });
});

router.delete('/settings/monthly/:month', async (req, res) => {
  await db.prepare('DELETE FROM monthly_salary WHERE user_id = ? AND month = ?').run(req.userId, req.params.month);
  res.json({ salary: 0, defined: false });
});

// ── Expenses ─────────────────────────────────────────────
router.get('/expenses', async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Informe o mês (YYYY-MM)' });
  const rows = await db.prepare(
    'SELECT * FROM expenses WHERE user_id = ? AND month = ? ORDER BY expense_date DESC, created_at DESC'
  ).all(req.userId, month);
  res.json(rows.map(decryptExpense));
});

router.post('/expenses', async (req, res) => {
  const { title, category, amount, month, expense_date, notes } = req.body;
  if (!title || !category || amount == null || !month)
    return res.status(400).json({ error: 'Campos obrigatórios: título, categoria, valor, mês' });

  const result = await db.prepare(
    'INSERT INTO expenses (user_id, title, category, amount, month, expense_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(req.userId, title, category, encrypt(amount), month, expense_date || null, notes || '');

  res.status(201).json(decryptExpense(await db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid)));
});

router.put('/expenses/:id', async (req, res) => {
  const row = await db.prepare('SELECT * FROM expenses WHERE id = ? AND user_id = ?').get(req.params.id, req.userId);
  if (!row) return res.status(404).json({ error: 'Despesa não encontrada' });

  const { title, category, amount, month, expense_date, notes } = req.body;
  await db.prepare(
    'UPDATE expenses SET title=?, category=?, amount=?, month=?, expense_date=?, notes=? WHERE id=? AND user_id=?'
  ).run(
    title ?? row.title,
    category ?? row.category,
    amount != null ? encrypt(amount) : row.amount,
    month ?? row.month,
    expense_date ?? row.expense_date,
    notes ?? row.notes,
    req.params.id, req.userId
  );
  res.json(decryptExpense(await db.prepare('SELECT * FROM expenses WHERE id = ?').get(req.params.id)));
});

router.delete('/expenses/:id', async (req, res) => {
  const r = await db.prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?').run(req.params.id, req.userId);
  if (r.changes === 0) return res.status(404).json({ error: 'Despesa não encontrada' });
  res.status(204).send();
});

// ── Summary (aggregation in JS after decryption) ─────────
router.get('/summary', async (req, res) => {
  const { month } = req.query;
  if (!month) return res.status(400).json({ error: 'Informe o mês' });

  const { salary } = await getSalaryForMonth(req.userId, month);

  const rawExpenses = await db.prepare(
    'SELECT category, amount FROM expenses WHERE user_id = ? AND month = ?'
  ).all(req.userId, month);

  const byCategory = {};
  let totalExpenses = 0;
  for (const row of rawExpenses) {
    const val = decrypt(row.amount);
    totalExpenses += val;
    byCategory[row.category] = (byCategory[row.category] || 0) + val;
  }
  const byCategoryArr = Object.entries(byCategory).map(([category, total]) => ({ category, total }));

  const rawCommitments = await db.prepare(
    'SELECT forecast_amount FROM commitments WHERE user_id = ? AND (is_recurring = 1 OR month = ?)'
  ).all(req.userId, month);
  const totalCommitments = rawCommitments.reduce((s, r) => s + decrypt(r.forecast_amount), 0);

  const sixAgo = getSixMonthsAgo(month);
  const trendRaw = await db.prepare(
    'SELECT month, category, amount FROM expenses WHERE user_id = ? AND month <= ? AND month >= ?'
  ).all(req.userId, month, sixAgo);

  const trendMap = {};
  for (const row of trendRaw) {
    const key = `${row.month}|${row.category}`;
    trendMap[key] = trendMap[key] || { month: row.month, category: row.category, total: 0 };
    trendMap[key].total += decrypt(row.amount);
  }
  const trend = Object.values(trendMap).sort((a, b) => a.month.localeCompare(b.month));

  res.json({
    salary,
    byCategory: byCategoryArr,
    totalExpenses,
    totalCommitments,
    remaining: salary - totalExpenses - totalCommitments,
    trend,
  });
});

function getSixMonthsAgo(month) {
  const [y, m] = month.split('-').map(Number);
  let nm = m - 5, ny = y;
  if (nm <= 0) { nm += 12; ny -= 1; }
  return `${ny}-${String(nm).padStart(2, '0')}`;
}

module.exports = router;
