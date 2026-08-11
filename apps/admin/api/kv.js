import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Make sure the table exists (cheap no-op after the first call)
let ensured = false;
async function ensureTable() {
  if (ensured) return;
  await client.execute(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);
  ensured = true;
}

export default async function handler(req, res) {
  try {
    await ensureTable();

    if (req.method === "GET") {
      const { key } = req.query;
      if (!key) return res.status(400).json({ error: "key is required" });
      const result = await client.execute({
        sql: "SELECT value FROM kv_store WHERE key = ?",
        args: [key],
      });
      if (result.rows.length === 0) {
        return res.status(404).json({ error: "not found" });
      }
      return res.status(200).json({ key, value: result.rows[0].value });
    }

    if (req.method === "POST") {
      const { key, value } = req.body || {};
      if (!key || value === undefined) {
        return res.status(400).json({ error: "key and value are required" });
      }
      await client.execute({
        sql: `INSERT INTO kv_store (key, value, updated_at)
              VALUES (?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
        args: [key, value],
      });
      return res.status(200).json({ key, value });
    }

    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: "method not allowed" });
  } catch (err) {
    console.error("kv handler error", err);
    return res.status(500).json({ error: "server error", detail: String(err) });
  }
}
