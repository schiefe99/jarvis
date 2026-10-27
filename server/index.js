require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
require('express-async-errors'); // erros em handlers async viram 500 em vez de derrubar o processo
const cors = require('cors');

const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const dashboardRoutes = require('./routes/dashboard');
const financeRoutes = require('./routes/finance');
const commitmentsRoutes = require('./routes/commitments');
const adminRoutes = require('./routes/admin');
const teamRoutes = require('./routes/team');
const aiRoutes = require('./routes/ai');
const settingsRoutes = require('./routes/settings');
const projectsRoutes = require('./routes/projects');
const groupsRoutes = require('./routes/groups');
const dailyTasksRoutes = require('./routes/dailyTasks');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/commitments', commitmentsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/daily-tasks', dailyTasksRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

db.ready
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Falha ao inicializar o banco:', err);
    process.exit(1);
  });
