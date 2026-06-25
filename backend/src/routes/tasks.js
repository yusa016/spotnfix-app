const express = require("express");
const pool = require("../db");
const { authRequired, adminRequired } = require("../middleware/auth");
const { logActivity } = require("../utils");

const router = express.Router();

router.get("/", authRequired, adminRequired, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT t.task_id, t.report_id, t.assigned_to, t.task_status, t.started_at, t.completed_at,
              u.first_name, u.last_name, r.status AS report_status
       FROM tbl_maintenance_tasks t
       JOIN tbl_users u ON u.user_id = t.assigned_to
       JOIN tbl_issue_reports r ON r.report_id = t.report_id
       ORDER BY t.task_id DESC`
    );
    return res.json(rows);
  } catch (error) {
    console.error("Get tasks error:", error);
    return res.status(500).json({ error: "Failed to load maintenance tasks." });
  }
});

router.post("/", authRequired, adminRequired, async (req, res) => {
  try {
    const { reportId, assignedTo, taskStatus = "Assigned" } = req.body;

    if (!reportId || !assignedTo) {
      return res.status(400).json({ error: "reportId and assignedTo are required." });
    }

    const [result] = await pool.query(
      `INSERT INTO tbl_maintenance_tasks (report_id, assigned_to, task_status)
       VALUES (?, ?, ?)`,
      [reportId, assignedTo, taskStatus]
    );

    await pool.query("UPDATE tbl_issue_reports SET status = 'In Progress' WHERE report_id = ?", [reportId]);
    await logActivity(req.user.userId, "CREATE", "tbl_maintenance_tasks", result.insertId, null, req.body);

    return res.status(201).json({ taskId: result.insertId });
  } catch (error) {
    console.error("Create task error:", error);
    return res.status(500).json({ error: "Failed to create maintenance task." });
  }
});

module.exports = router;
