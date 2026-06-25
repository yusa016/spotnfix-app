const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const pool = require("./db");
const authRoutes = require("./routes/auth");
const reportRoutes = require("./routes/reports");
const facilityRoutes = require("./routes/facilities");
const taskRoutes = require("./routes/tasks");
const contactRoutes = require("./routes/contact");
const roomRoutes = require("./routes/rooms");

const app = express();
const port = Number(process.env.PORT || 3000);

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadDir));

app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    const [dbRows] = await pool.query("SELECT DATABASE() AS db");
    let contacts = 0;
    try {
      const [contactRows] = await pool.query("SELECT COUNT(*) AS c FROM tbl_contact_messages");
      contacts = contactRows[0].c;
    } catch (_error) {
      contacts = null;
    }
    const [counts] = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM tbl_users) AS users,
        (SELECT COUNT(*) FROM tbl_facilities) AS facilities,
        (SELECT COUNT(*) FROM tbl_issue_reports) AS reports
    `);
    res.json({
      ok: true,
      service: "SpotN'Fix API",
      database: {
        connected: true,
        name: dbRows[0].db,
        users: counts[0].users,
        facilities: counts[0].facilities,
        reports: counts[0].reports,
        contacts,
      },
    });
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: "SpotN'Fix API",
      database: { connected: false, error: error.message },
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/facilities", facilityRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/contact", contactRoutes);

const frontendDir = path.join(__dirname, "../../frontend");
app.use(express.static(frontendDir));

app.use((req, res) => {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({ error: "Route not found." });
  }
  if (req.method === "GET") {
    return res.sendFile(path.join(frontendDir, "index.html"));
  }
  return res.status(404).send("Not found.");
});

app.use((error, _req, res, _next) => {
  if (error.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "Request blocked by CORS policy." });
  }
  console.error("Unhandled error:", error);
  res.status(500).json({ error: error.message || "Internal server error." });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`SpotN'Fix running at http://0.0.0.0:${port}`);
  console.log(`Health check: http://0.0.0.0:${port}/api/health`);
});
