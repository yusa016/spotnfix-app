const express = require("express");
const pool = require("../db");
const { authRequired, adminRequired } = require("../middleware/auth");
const { logActivity } = require("../utils");

const router = express.Router();

function mapContactRow(row) {
  return {
    contactId: row.contact_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    submittedAt: row.submitted_at,
  };
}

router.post("/", async (req, res) => {
  try {
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const subject = String(req.body.subject || "").trim();
    const message = String(req.body.message || "").trim();

    if (!firstName || !lastName || !email || !subject || !message) {
      return res.status(400).json({ error: "All contact fields are required." });
    }

    if (message.length < 10) {
      return res.status(400).json({ error: "Message should be at least 10 characters." });
    }

    const [result] = await pool.query(
      `INSERT INTO tbl_contact_messages (first_name, last_name, email, subject, message, status)
       VALUES (?, ?, ?, ?, ?, 'New')`,
      [firstName, lastName, email, subject, message]
    );

    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (token) {
      try {
        const jwt = require("jsonwebtoken");
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        await logActivity(payload.userId, "CREATE", "tbl_contact_messages", result.insertId, null, {
          email,
          subject,
        });
      } catch (_error) {
        // Optional: contact can be submitted without login.
      }
    }

    return res.status(201).json({
      message: "Thank you! Your message was sent to the SpotN'Fix team.",
      contactId: result.insertId,
    });
  } catch (error) {
    console.error("Contact submit error:", error);
    return res.status(500).json({ error: "Failed to send message." });
  }
});

router.get("/", authRequired, adminRequired, async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT contact_id, first_name, last_name, email, subject, message, status, submitted_at
       FROM tbl_contact_messages
       ORDER BY submitted_at DESC`
    );
    return res.json(rows.map(mapContactRow));
  } catch (error) {
    console.error("Get contacts error:", error);
    return res.status(500).json({ error: "Failed to load contact messages." });
  }
});

router.patch("/:id/status", authRequired, adminRequired, async (req, res) => {
  try {
    const contactId = Number(req.params.id);
    const status = String(req.body.status || "").trim();
    const allowed = ["New", "Read", "Archived"];

    if (!allowed.includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }

    const [existing] = await pool.query("SELECT * FROM tbl_contact_messages WHERE contact_id = ?", [contactId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Message not found." });
    }

    await pool.query("UPDATE tbl_contact_messages SET status = ? WHERE contact_id = ?", [status, contactId]);
    await logActivity(req.user.userId, "UPDATE", "tbl_contact_messages", contactId, existing[0], { status });

    const [rows] = await pool.query(
      `SELECT contact_id, first_name, last_name, email, subject, message, status, submitted_at
       FROM tbl_contact_messages WHERE contact_id = ?`,
      [contactId]
    );

    return res.json(mapContactRow(rows[0]));
  } catch (error) {
    console.error("Update contact status error:", error);
    return res.status(500).json({ error: "Failed to update message status." });
  }
});

router.delete("/:id", authRequired, adminRequired, async (req, res) => {
  try {
    const contactId = Number(req.params.id);
    const [existing] = await pool.query("SELECT * FROM tbl_contact_messages WHERE contact_id = ?", [contactId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Message not found." });
    }

    await pool.query("DELETE FROM tbl_contact_messages WHERE contact_id = ?", [contactId]);
    await logActivity(req.user.userId, "DELETE", "tbl_contact_messages", contactId, existing[0], null);

    return res.json({ message: "Message deleted." });
  } catch (error) {
    console.error("Delete contact error:", error);
    return res.status(500).json({ error: "Failed to delete message." });
  }
});

module.exports = router;
