const mysql = require("mysql2/promise");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

function useSsl() {
  if (process.env.DB_SSL === "false") return false;
  if (process.env.DB_SSL === "true" || process.env.DB_SSL === "1") return true;
  const host = process.env.DB_HOST || "";
  return host.includes("tidbcloud.com") || host.includes("aws.tidbcloud.com");
}

function buildPoolConfig() {
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  const ssl = useSsl() ? { rejectUnauthorized: false } : undefined;

  if (url) {
    return {
      uri: url,
      waitForConnections: true,
      connectionLimit: 10,
      ssl,
    };
  }

  return {
    host: process.env.DB_HOST || process.env.MYSQLHOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
    user: process.env.DB_USER || process.env.MYSQLUSER || "root",
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || "",
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || "spotn_fix",
    waitForConnections: true,
    connectionLimit: 10,
    ssl,
  };
}

const pool = mysql.createPool(buildPoolConfig());

module.exports = pool;
