const path = require("path");
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const PORT = process.env.PORT || 3001;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "shift.db");

const app = express();
const db = new sqlite3.Database(DB_PATH);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "2mb" }));

db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS states (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
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

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/state", async (_req, res) => {
  try {
    const row = await getAsync("SELECT payload FROM states WHERE id = 1");
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

app.put("/api/state", async (req, res) => {
  const { groups = [], sheets = [] } = req.body || {};
  try {
    const payload = JSON.stringify({ groups, sheets });
    await runAsync(
      `INSERT INTO states (id, payload, updated_at)
       VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at`,
      [payload, new Date().toISOString()]
    );
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: "server_error" });
  }
});

app.listen(PORT, () => {
  console.log(`Shift API server running on http://localhost:${PORT}`);
});
