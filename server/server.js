const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// ===============================
// Supabase(Postgres) 接続
// ===============================
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

// 起動時接続チェック
(async () => {
  try {
    const r = await pool.query("select now()");
    console.log("Supabase DB OK:", r.rows[0]);
  } catch (e) {
    console.error("Supabase DB NG:", e);
  }
})();

// ===============================
// 共通
// ===============================
const validateCredentials = (email, password) => {
  if (!email || !password) return "メールアドレスとパスワードを入力してく。";
  if (!email.includes("@")) return "メールアドレスの形式が正しくありません。";
  if (password.length < 8) return "パスワードは8文字以上にしてください。";
  return null;
};

// ===============================
// 認証 middleware
// ===============================
const authMiddleware = async (req, res, next) => {
  const header = req.headers.authorization || "";
  const m = header.match(/^Bearer\s+(.+)$/);
  if (!m) return res.status(401).json({ error: "unauthorized" });

  try {
    const r = await pool.query(
      `select users.id as user_id, users.email
       from sessions
       join users on users.id = sessions.user_id
       where sessions.token = $1`,
      [m[1]]
    );

    if (r.rows.length === 0) {
      return res.status(401).json({ error: "unauthorized" });
    }

    req.user = r.rows[0];
    req.token = m[1];
    next();
  } catch (e) {
    return res.status(500).json({ error: "server_error" });
  }
};

// ===============================
// health
// ===============================
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ===============================
// register
// ===============================
app.post("/api/register", async (req, res) => {
  const { email, password } = req.body || {};
  const err = validateCredentials(email, password);
  if (err) return res.status(400).json({ error: err });

  try {
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "insert into users (email, password_hash) values ($1, $2)",
      [email, hash]
    );
    res.json({ ok: true });
  } catch (e) {
    if (String(e).includes("unique")) {
      return res.status(409).json({ error: "このメールアドレスは既に登録済みです。" });
    }
    res.status(500).json({ error: "server_error" });
  }
});

// ===============================
// login
// ===============================
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  const err = validateCredentials(email, password);
  if (err) return res.status(400).json({ error: err });

  try {
    const r = await pool.query(
      "select id, password_hash from users where email = $1",
      [email]
    );
    if (r.rows.length === 0) {
      return res.status(401).json({ error: "認証に失敗しました。" });
    }

    const user = r.rows[0];
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      return res.status(401).json({ error: "認証に失敗しました。" });
    }

    const token = crypto.randomUUID();
    await pool.query(
      "insert into sessions (token, user_id) values ($1, $2)",
      [token, user.id]
    );

    res.json({ token, email });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

// ===============================
// logout
// ===============================
app.post("/api/logout", authMiddleware, async (req, res) => {
  try {
    await pool.query("delete from sessions where token = $1", [req.token]);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

// ===============================
// me
// ===============================
app.get("/api/me", authMiddleware, (req, res) => {
  res.json({ email: req.user.email });
});

// ===============================
// state（永続）
// ===============================
app.get("/api/state", authMiddleware, async (req, res) => {
  try {
    const r = await pool.query(
      "select payload from states where user_id = $1",
      [req.user.user_id]
    );
    if (r.rows.length === 0) {
      return res.json({ groups: [], sheets: [] });
    }
    res.json(r.rows[0].payload);
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

app.put("/api/state", authMiddleware, async (req, res) => {
  const payload = req.body || {};
  try {
    await pool.query(
      `insert into states (user_id, payload, updated_at)
       values ($1, $2, now())
       on conflict (user_id)
       do update set payload = excluded.payload, updated_at = now()`,
      [req.user.user_id, payload]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "server_error" });
  }
});

// ===============================
// start
// ===============================
app.listen(PORT, () => {
  console.log(`Shift API server running on http://localhost:${PORT}`);
});
