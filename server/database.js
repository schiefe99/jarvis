const { createClient } = require('@libsql/client');
const path = require('path');

// Sem TURSO_DATABASE_URL cai no arquivo local, útil pra desenvolver offline.
const client = createClient({
  url: process.env.TURSO_DATABASE_URL || `file:${path.join(__dirname, 'tasks.db')}`,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// libsql devolve Rows array-like; converte pra objetos simples como o better-sqlite3 fazia
function toObjects(rs) {
  return rs.rows.map(row => Object.fromEntries(rs.columns.map((col, i) => [col, row[i]])));
}

// Mantém a mesma cara do better-sqlite3 (prepare().get/all/run), só que assíncrono
const db = {
  prepare(sql) {
    return {
      async get(...args) {
        return toObjects(await client.execute({ sql, args }))[0];
      },
      async all(...args) {
        return toObjects(await client.execute({ sql, args }));
      },
      async run(...args) {
        const rs = await client.execute({ sql, args });
        return {
          changes: rs.rowsAffected,
          lastInsertRowid: rs.lastInsertRowid === undefined ? undefined : Number(rs.lastInsertRowid),
        };
      },
    };
  },
  exec(sql) {
    return client.executeMultiple(sql);
  },
};

async function init() {
  await db.exec('PRAGMA foreign_keys = ON');

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT NOT NULL,
      status TEXT DEFAULT 'nao_iniciada',
      estimated_time INTEGER DEFAULT 5400,
      real_time INTEGER DEFAULT 0,
      timer_active INTEGER DEFAULT 0,
      timer_started_at INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      finished_at INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INTEGER PRIMARY KEY,
      salary TEXT DEFAULT '0',
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS monthly_salary (
      user_id INTEGER NOT NULL,
      month TEXT NOT NULL,
      salary TEXT NOT NULL,
      PRIMARY KEY (user_id, month),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      amount TEXT NOT NULL,
      month TEXT NOT NULL,
      expense_date INTEGER,
      notes TEXT DEFAULT '',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      forecast_amount TEXT NOT NULL,
      month TEXT,
      is_recurring INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY(task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS invite_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS project_participants (
      project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS task_assignees (
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS work_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS work_group_participants (
      group_id INTEGER NOT NULL REFERENCES work_groups(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (group_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS daily_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      weekdays TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS daily_task_completions (
      daily_task_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (daily_task_id, date),
      FOREIGN KEY(daily_task_id) REFERENCES daily_tasks(id) ON DELETE CASCADE
    );
  `);

  // Migrations — ADD COLUMN only if it doesn't exist yet
  const migrations = [
    "ALTER TABLE commitments ADD COLUMN commitment_date TEXT",
    "ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0",
    "ALTER TABLE tasks ADD COLUMN assigned_to INTEGER REFERENCES users(id)",
    "ALTER TABLE tasks ADD COLUMN due_date INTEGER",
  ];
  for (const sql of migrations) {
    try { await db.exec(sql); } catch { /* column already exists */ }
  }

  // shared_with_team distinguishes personal "Trabalho" tickets from tickets allocated to the shared team pool
  try {
    await db.exec("ALTER TABLE tasks ADD COLUMN shared_with_team INTEGER DEFAULT 0");
    // preserva a visibilidade atual: todo ticket trabalho que já existe hoje é visto pelo time inteiro,
    // então já nasce marcado como compartilhado — só tickets novos criados depois desta mudança
    // começam pessoais por padrão.
    await db.exec("UPDATE tasks SET shared_with_team = 1 WHERE category = 'trabalho'");
  } catch { /* column already exists — migration already ran */ }

  // project_id ties a shared task to a project; task_assignees replaces the old single assigned_to column
  try {
    await db.exec("ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id)");
    // migra o único responsável de hoje (assigned_to) pra tabela de múltiplos responsáveis,
    // preservando quem já estava atribuído antes desta mudança
    await db.exec(`
      INSERT INTO task_assignees (task_id, user_id)
      SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL
    `);
  } catch { /* column already exists — migration already ran */ }

  // work_groups adds extra parallel, independent shared spaces alongside the default Tercon space.
  // NULL group_id keeps meaning "Tercon" exactly as before — no backfill needed, existing data is untouched.
  try {
    await db.exec("ALTER TABLE tasks ADD COLUMN group_id INTEGER REFERENCES work_groups(id)");
    await db.exec("ALTER TABLE projects ADD COLUMN group_id INTEGER REFERENCES work_groups(id)");
  } catch { /* column already exists — migration already ran */ }

  // The oldest account becomes the team admin automatically
  await db.exec('UPDATE users SET is_admin = 1 WHERE id = (SELECT MIN(id) FROM users)');
}

db.ready = init();

module.exports = db;
