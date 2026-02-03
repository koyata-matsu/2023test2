require("dotenv").config(); // ← これ超重要

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3001;

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

// ===============================
// Supabase(Postgres) 接続
// ===============================
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// 起動時接続チェック
(async () => {
  try {
    const r = await pool.query("select now()");
    console.log("Supabase DB OK:", r.rows[0]);
  } catch (e) {
    console.error("Supabase DB NG:", e);
    process.exit(1);
  }
})();

// ===============================
// health
// ===============================
app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// ===============================
// state（永続）
// ===============================
app.get("/api/state", async (_req, res) => {
  try {
    const r = await pool.query("select payload from states where id = 1");
    if (r.rows.length === 0) {
      return res.json({ groups: [], sheets: [] });
    }
    res.json(r.rows[0].payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});

app.put("/api/state", async (req, res) => {
  const payload = req.body || {};
  try {
    await pool.query(
      `insert into states (id, payload, updated_at)
       values (1, $1, now())
       on conflict (id)
       do update set payload = excluded.payload, updated_at = now()`,
      [payload]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "server_error" });
  }
});

// ===============================
// start
// ===============================
app.listen(PORT, () => {
  console.log(`Shift API server running on http://localhost:${PORT}`);
});
