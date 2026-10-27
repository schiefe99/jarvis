const express = require('express');
const db = require('../database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

router.get('/metrics', async (req, res) => {
  const uid = req.userId;
  const category = ['trabalho', 'pessoal'].includes(req.query.category) ? req.query.category : undefined;
  const teamScope = category === 'trabalho' && req.query.scope === 'team';

  // scope=team (Tercon)     → pool compartilhado da empresa, qualquer criador
  // categoria sem scope     → o que este usuário criou nessa categoria (Painel, Sivraj)
  // sem categoria           → tudo que é deste usuário
  let scopeFilter, scopeParams;
  if (teamScope) {
    scopeFilter = 'AND category = ? AND shared_with_team = 1';
    scopeParams = ['trabalho'];
    if (req.query.group) {
      scopeFilter += ' AND group_id = ?';
      scopeParams.push(req.query.group);
    } else {
      scopeFilter += ' AND group_id IS NULL';
    }
    if (req.query.project) {
      scopeFilter += ' AND project_id = ?';
      scopeParams.push(req.query.project);
    }
  } else if (category) {
    scopeFilter = 'AND category = ? AND user_id = ?';
    scopeParams = [category, uid];
  } else {
    scopeFilter = 'AND user_id = ?';
    scopeParams = [uid];
  }

  const statusCounts = await db.prepare(`
    SELECT status, COUNT(*) as count FROM tasks WHERE 1=1 ${scopeFilter} GROUP BY status
  `).all(...scopeParams);

  const counts = { nao_iniciada: 0, em_andamento: 0, concluida: 0 };
  statusCounts.forEach(r => { counts[r.status] = r.count; });

  const total = counts.nao_iniciada + counts.em_andamento + counts.concluida;
  const completionRate = total > 0 ? Math.round((counts.concluida / total) * 100) : 0;

  const timeStats = await db.prepare(`
    SELECT AVG(real_time) as avg_time, SUM(real_time) as total_time
    FROM tasks WHERE status = 'concluida' ${scopeFilter}
  `).get(...scopeParams);

  const timeline = await db.prepare(`
    SELECT date(finished_at, 'unixepoch') as day, COUNT(*) as count
    FROM tasks
    WHERE status = 'concluida'
      AND finished_at IS NOT NULL
      AND finished_at >= unixepoch('now', '-30 days')
      ${scopeFilter}
    GROUP BY day ORDER BY day
  `).all(...scopeParams);

  const categoryStats = await db.prepare(`
    SELECT category, AVG(real_time) as avg_time, COUNT(*) as count,
      SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as completed
    FROM tasks WHERE 1=1 ${scopeFilter}
    GROUP BY category
  `).all(...scopeParams);

  res.json({
    counts,
    total,
    completionRate,
    avgTime: Math.round(timeStats.avg_time || 0),
    totalTime: timeStats.total_time || 0,
    timeline,
    categoryStats,
  });
});

module.exports = router;
