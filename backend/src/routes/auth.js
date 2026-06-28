const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { logActivity } = require("../utils");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { idNumber, firstName, lastName, email, password, role = "student" } = req.body;

    if (!idNumber || !firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const allowedRoles = ["student", "faculty", "other"];
    const safeRole = allowedRoles.includes(role) ? role : "student";
    const dbRole = safeRole === "other" ? "student" : safeRole;

    const emailDomain = email.trim().toLowerCase().split("@")[1];
    if (safeRole === "student" && emailDomain !== "mymail.mapua.edu.ph") {
      return res.status(400).json({
        error: "Students must use a @mymail.mapua.edu.ph email address. Select Other if you need a different email.",
      });
    }
    if (safeRole === "faculty" && emailDomain !== "mapua.edu.ph") {
      return res.status(400).json({
        error: "Faculty must use a @mapua.edu.ph email address. Select Other if you need a different email.",
      });
    }

    const [existing] = await pool.query(
      "SELECT user_id FROM tbl_users WHERE email = ? OR id_number = ?",
      [email.trim().toLowerCase(), Number(idNumber)]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: "Email or ID number already exists." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO tbl_users (id_number, first_name, last_name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [Number(idNumber), firstName.trim(), lastName.trim(), email.trim().toLowerCase(), passwordHash, dbRole]
    );

    await logActivity(result.insertId, "CREATE", "tbl_users", result.insertId, null, {
      email: email.trim().toLowerCase(),
      role: dbRole,
      signupRole: safeRole,
    });

    return res.status(201).json({ message: "Account created successfully." });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ error: "Registration failed." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const [rows] = await pool.query(
      "SELECT user_id, id_number, first_name, last_name, email, password_hash, role FROM tbl_users WHERE email = ?",
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name,
        idNumber: user.id_number,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    return res.json({
      token,
      user: {
        userId: user.user_id,
        idNumber: user.id_number,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Login failed." });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const idNumber = Number(req.body.idNumber);
    const newPassword = String(req.body.newPassword || "").trim();

    if (!email || !idNumber || !newPassword) {
      return res.status(400).json({ error: "Email, ID number, and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters." });
    }

    const [rows] = await pool.query(
      "SELECT user_id, email, id_number FROM tbl_users WHERE email = ? AND id_number = ?",
      [email, idNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "No account found with that email and ID number." });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query("UPDATE tbl_users SET password_hash = ? WHERE user_id = ?", [passwordHash, rows[0].user_id]);

    await logActivity(rows[0].user_id, "UPDATE", "tbl_users", rows[0].user_id, null, {
      action: "password_reset",
    });

    return res.json({ message: "Password updated successfully. You can now log in with your new password." });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ error: "Password reset failed." });
  }
});

function normalizeIdNumber(value) {
  const digits = String(value ?? "").replace(/\D/g, "").trim();
  return digits || null;
}

async function resolveAccountIdNumber(req) {
  const fromToken = normalizeIdNumber(req.user.idNumber);
  if (fromToken) return fromToken;

  const [rows] = await pool.query("SELECT id_number FROM tbl_users WHERE user_id = ?", [req.user.userId]);
  if (!rows.length) return null;
  return normalizeIdNumber(rows[0].id_number);
}

router.delete("/account", authRequired, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const submittedId = normalizeIdNumber(req.body.idNumber);
    const accountId = await resolveAccountIdNumber(req);

    if (!submittedId) {
      return res.status(400).json({ error: "ID number is required." });
    }

    if (!accountId || submittedId !== accountId) {
      return res.status(403).json({ error: "ID number does not match your account." });
    }

    const userId = req.user.userId;
    await connection.beginTransaction();

    const [reportRows] = await connection.query(
      "SELECT report_id FROM tbl_issue_reports WHERE user_id = ?",
      [userId]
    );
    const reportIds = reportRows.map((row) => row.report_id);

    if (reportIds.length > 0) {
      await connection.query("DELETE FROM tbl_maintenance_tasks WHERE report_id IN (?)", [reportIds]);
    }
    await connection.query("DELETE FROM tbl_maintenance_tasks WHERE assigned_to = ?", [userId]);
    await connection.query("DELETE FROM tbl_issue_reports WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM tbl_activity_logs WHERE user_id = ?", [userId]);
    await connection.query("DELETE FROM tbl_users WHERE user_id = ?", [userId]);

    await connection.commit();
    return res.json({ message: "Account deleted successfully." });
  } catch (error) {
    await connection.rollback();
    console.error("Delete account error:", error);
    return res.status(500).json({ error: "Failed to delete account." });
  } finally {
    connection.release();
  }
});

router.get("/me", async (req, res) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const [rows] = await pool.query(
      "SELECT user_id, id_number, first_name, last_name, email, role FROM tbl_users WHERE user_id = ?",
      [payload.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    const user = rows[0];
    return res.json({
      userId: user.user_id,
      idNumber: user.id_number,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      role: user.role,
    });
  } catch (_error) {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
});

module.exports = router;
