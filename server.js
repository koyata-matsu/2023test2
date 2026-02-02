const path = require("path");
const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const sqlite3 = require("sqlite3").verbose();

const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "shift.db");

const app = express();
const db = new sqlite3.Database(DB_PATH);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      token TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS states (
      user_id INTEGER PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  );
});

const runAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const getAsync = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

const validateCredentials = (email, password) => {
  if (!email || !password) return "メールアドレスとパスワードを入力してください。";
  if (!email.includes("@")) return "メールアドレスの形式が正しくありません。";
  if (password.length < 8) return "パスワードは8文字以上にしてください。";
  return null;
};

const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/);
  if (!match) return res.status(401).json({ error: "unauthorized" });
  const token = match[1];
  try {
    const session = await getAsync(
      `SELECT sessions.user_id AS user_id, users.email AS email
       FROM sessions
       JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`,
      [token]
    );
    if (!session) return res.status(401).json({ error: "unauthorized" });
    req.user = session;
    req.token = token;
    return next();
  } catch (error) {
    return res.status(500).json({ error: "server_error" });
  }
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/register", async (req, res) => {
  const { email, password } = req.body || {};
  const validationError = validateCredentials(email, password);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await runAsync(
      "INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)",
      [email, passwordHash, new Date().toISOString()]
    );
    return res.json({ ok: true });
  } catch (error) {
    if (String(error).includes("UNIQUE")) {
      return res.status(409).json({ error: "このメールアドレスは既に登録済みです。" });
    }
    return res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  const validationError = validateCredentials(email, password);
  if (validationError) return res.status(400).json({ error: validationError });
  try {
    const user = await getAsync(
      "SELECT id, email, password_hash FROM users WHERE email = ?",
      [email]
    );
    if (!user) return res.status(401).json({ error: "認証に失敗しました。" });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: "認証に失敗しました。" });
    const token = crypto.randomUUID();
    await runAsync(
      "INSERT INTO sessions (user_id, token, created_at) VALUES (?, ?, ?)",
      [user.id, token, new Date().toISOString()]
    );
    return res.json({ token, email: user.email });
  } catch (error) {
    return res.status(500).json({ error: "server_error" });
  }
});

app.post("/api/logout", authMiddleware, async (req, res) => {
  try {
    await runAsync("DELETE FROM sessions WHERE token = ?", [req.token]);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "server_error" });
  }
});

app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ email: req.user.email });
});

app.get("/api/state", authMiddleware, async (req, res) => {
  try {
    const row = await getAsync("SELECT payload FROM states WHERE user_id = ?", [
      req.user.user_id
    ]);
    if (!row) {
      return res.json({ groups: [], sheets: [] });
    }
    const payload = JSON.parse(row.payload);
    return res.json({
      groups: Array.isArray(payload.groups) ? payload.groups : [],
      sheets: Array.isArray(payload.sheets) ? payload.sheets : []
    });
  } catch (error) {
    return res.status(500).json({ error: "server_error" });
  }
});

app.put("/api/state", authMiddleware, async (req, res) => {
  const { groups = [], sheets = [] } = req.body || {};
  try {
    const payload = JSON.stringify({ groups, sheets });
    await runAsync(
      `INSERT INTO states (user_id, payload, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      [req.user.user_id, payload, new Date().toISOString()]
    );
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "server_error" });
  }
});

app.listen(PORT, () => {
  console.log(`Shift API server running on http://localhost:${PORT}`);
});
