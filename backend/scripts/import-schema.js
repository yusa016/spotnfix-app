/**
 * One-time cloud setup: creates tables in the database already provisioned on Render/TiDB.
 * Usage: npm run db:setup
 */
const fs = require("fs");
const path = require("path");
const pool = require("../src/db");

function prepareSql(raw) {
  return raw
    .replace(/CREATE DATABASE IF NOT EXISTS[\s\S]*?;/i, "")
    .replace(/USE\s+`?[\w-]+`?\s*;/gi, "")
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function main() {
  const sqlPath = path.join(__dirname, "../sql/spotn_fix.sql");
  const statements = prepareSql(fs.readFileSync(sqlPath, "utf8"));

  const connection = await pool.getConnection();
  try {
    for (const statement of statements) {
      await connection.query(statement);
    }
    console.log("Database schema imported successfully.");
  } finally {
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Schema import failed:", error.message);
  process.exit(1);
});
