/**
 * One-time cloud setup: creates tables in the database already provisioned by Railway/Render.
 * Usage: npm run db:setup
 */
const fs = require("fs");
const path = require("path");
const pool = require("../src/db");

async function main() {
  const sqlPath = path.join(__dirname, "../sql/spotn_fix.sql");
  let sql = fs.readFileSync(sqlPath, "utf8");

  sql = sql
    .replace(/CREATE DATABASE IF NOT EXISTS[\s\S]*?;/i, "")
    .replace(/USE\s+`?spotn_fix`?\s*;/i, "");

  const connection = await pool.getConnection();
  try {
    await connection.query({ sql, multipleStatements: true });
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
