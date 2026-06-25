const express = require("express");
const pool = require("../db");
const upload = require("../middleware/upload");
const { authRequired, adminRequired, reporterRequired } = require("../middleware/auth");
const { logActivity, frontendStatusToDb, mapReportRow } = require("../utils");
const { isValidFloorLabel, lookupRoomFloor } = require("../floors");
const { getFloorIdByName, getOrCreateFacilityTypeId, getOrCreateIssueTypeId } = require("../dbLookups");

const router = express.Router();

const REPORT_SELECT = `
  SELECT
    r.report_id,
    r.facility_id,
    r.user_id,
    it.type_name AS issue_type,
    r.description,
    r.photo_path,
    r.report_date,
    r.status,
    f.facility_name,
    ft.type_name AS facility_type,
    fl.floor_name AS floor,
    f.room_number,
    f.location_type,
    u.first_name,
    u.last_name,
    u.id_number
  FROM tbl_issue_reports r
  JOIN tbl_facilities f ON f.facility_id = r.facility_id
  JOIN tbl_floors fl ON fl.floor_id = f.floor_id
  JOIN tbl_facility_types ft ON ft.facility_type_id = f.facility_type_id
  JOIN tbl_issue_types it ON it.issue_type_id = r.issue_type_id
  JOIN tbl_users u ON u.user_id = r.user_id
`;

async function findOrCreateFacility(floorName, room, facilityTypeName, facilityName, locationType = "room") {
  const floorId = await getFloorIdByName(floorName);
  const facilityTypeId = await getOrCreateFacilityTypeId(facilityTypeName);
  if (!floorId || !facilityTypeId) {
    throw new Error("Invalid floor or equipment type.");
  }

  const [existing] = await pool.query(
    `SELECT facility_id FROM tbl_facilities
     WHERE floor_id = ? AND room_number = ? AND facility_type_id = ? AND facility_name = ?`,
    [floorId, room, facilityTypeId, facilityName]
  );

  if (existing.length > 0) {
    await pool.query(`UPDATE tbl_facilities SET status = 'Faulty' WHERE facility_id = ?`, [existing[0].facility_id]);
    return existing[0].facility_id;
  }

  const [result] = await pool.query(
    `INSERT INTO tbl_facilities (facility_name, facility_type_id, floor_id, room_number, location_type, status)
     VALUES (?, ?, ?, ?, ?, 'Faulty')`,
    [facilityName, facilityTypeId, floorId, room, locationType === "area" ? "area" : "room"]
  );

  return result.insertId;
}

router.get("/", async (req, res) => {
  try {
    const { floor, status, room, type, search } = req.query;
    const conditions = [];
    const params = [];

    if (floor) {
      conditions.push("fl.floor_name = ?");
      params.push(floor);
    }
    if (status) {
      conditions.push("r.status = ?");
      params.push(frontendStatusToDb(status));
    }
    if (room) {
      conditions.push("f.room_number = ?");
      params.push(room);
    }
    if (type) {
      conditions.push("(f.facility_name LIKE ? OR ft.type_name LIKE ? OR it.type_name LIKE ?)");
      params.push(`%${type}%`, `%${type}%`, `%${type}%`);
    }
    if (search) {
      conditions.push(
        "(f.room_number LIKE ? OR f.facility_name LIKE ? OR r.description LIKE ? OR it.type_name LIKE ?)"
      );
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const [rows] = await pool.query(`${REPORT_SELECT} ${where} ORDER BY r.report_date DESC`, params);

    return res.json(rows.map(mapReportRow));
  } catch (error) {
    console.error("Get reports error:", error);
    return res.status(500).json({ error: "Failed to load reports." });
  }
});

router.get("/analytics", async (_req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) AS openCount,
        SUM(CASE WHEN status = 'In Progress' THEN 1 ELSE 0 END) AS inProgressCount,
        SUM(CASE WHEN status = 'Resolved' THEN 1 ELSE 0 END) AS resolvedCount
      FROM tbl_issue_reports
    `);

    const stats = rows[0];
    return res.json({
      total: Number(stats.total || 0),
      open: Number(stats.openCount || 0),
      inProgress: Number(stats.inProgressCount || 0),
      resolved: Number(stats.resolvedCount || 0),
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return res.status(500).json({ error: "Failed to load analytics." });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const reportId = Number(String(req.params.id).replace(/^r/, ""));
    const [rows] = await pool.query(`${REPORT_SELECT} WHERE r.report_id = ?`, [reportId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Report not found." });
    }

    return res.json(mapReportRow(rows[0]));
  } catch (error) {
    console.error("Get report error:", error);
    return res.status(500).json({ error: "Failed to load report." });
  }
});

router.post("/", authRequired, reporterRequired, upload.single("photo"), async (req, res) => {
  try {
    const locationType = String(req.body.locationType || "room").trim().toLowerCase();
    const facilityType = String(req.body.facilityType || req.body.type || "").trim();
    const facilityName = String(req.body.facilityName || "").trim();
    const issueType = String(req.body.issueType || "").trim();
    const description = String(req.body.description || "").trim();
    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

    let floor = "";
    let room = "";

    if (locationType === "area") {
      floor = String(req.body.floor || "").trim();
      room = String(req.body.room || req.body.area || "").trim();
      if (!room) {
        return res.status(400).json({ error: "Please enter an area name." });
      }
      if (!isValidFloorLabel(floor)) {
        return res.status(400).json({ error: "Please select a floor from 1st to 8th Floor." });
      }
    } else {
      room = String(req.body.room || "").trim();
      if (!room) {
        return res.status(400).json({ error: "Please enter a room number." });
      }
      const lookup = await lookupRoomFloor(pool, room);
      if (!lookup) {
        return res.status(400).json({
          error:
            "Could not determine the floor for that room. Use a number like 216 (2nd floor), or switch to Area and pick the floor manually.",
        });
      }
      floor = lookup.floor;
    }

    if (!facilityType || !facilityName || !issueType || !description) {
      return res.status(400).json({
        error: "Equipment type, equipment name, issue type, and description are required.",
      });
    }

    const issueTypeId = await getOrCreateIssueTypeId(issueType);
    if (!issueTypeId) {
      return res.status(400).json({ error: "Invalid issue type." });
    }

    const facilityId = await findOrCreateFacility(floor, room, facilityType, facilityName, locationType);
    const [result] = await pool.query(
      `INSERT INTO tbl_issue_reports (facility_id, user_id, issue_type_id, description, photo_path, status)
       VALUES (?, ?, ?, ?, ?, 'Pending')`,
      [facilityId, req.user.userId, issueTypeId, description, photoPath]
    );

    await logActivity(req.user.userId, "CREATE", "tbl_issue_reports", result.insertId, null, {
      locationType,
      floor,
      room,
      facilityType,
      facilityName,
      issueType,
      description,
      photoPath,
    });

    const [rows] = await pool.query(`${REPORT_SELECT} WHERE r.report_id = ?`, [result.insertId]);
    return res.status(201).json(mapReportRow(rows[0]));
  } catch (error) {
    console.error("Create report error:", error);
    return res.status(500).json({ error: error.message || "Failed to create report." });
  }
});

router.patch("/:id/status", authRequired, adminRequired, async (req, res) => {
  try {
    const reportId = Number(String(req.params.id).replace(/^r/, ""));
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required." });
    }

    const dbStatus = frontendStatusToDb(status);
    const [existing] = await pool.query("SELECT status FROM tbl_issue_reports WHERE report_id = ?", [reportId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Report not found." });
    }

    await pool.query("UPDATE tbl_issue_reports SET status = ? WHERE report_id = ?", [dbStatus, reportId]);

    if (dbStatus === "Resolved") {
      await pool.query(
        `UPDATE tbl_facilities f
         JOIN tbl_issue_reports r ON r.facility_id = f.facility_id
         SET f.status = 'Operational'
         WHERE r.report_id = ?`,
        [reportId]
      );
    } else if (dbStatus === "In Progress") {
      await pool.query(
        `UPDATE tbl_facilities f
         JOIN tbl_issue_reports r ON r.facility_id = f.facility_id
         SET f.status = 'Under Maintenance'
         WHERE r.report_id = ?`,
        [reportId]
      );
    }

    await logActivity(req.user.userId, "UPDATE", "tbl_issue_reports", reportId, existing[0], { status: dbStatus });

    const [rows] = await pool.query(`${REPORT_SELECT} WHERE r.report_id = ?`, [reportId]);
    return res.json(mapReportRow(rows[0]));
  } catch (error) {
    console.error("Update status error:", error);
    return res.status(500).json({ error: "Failed to update report status." });
  }
});

router.delete("/:id", authRequired, adminRequired, async (req, res) => {
  try {
    const reportId = Number(String(req.params.id).replace(/^r/, ""));
    const [existing] = await pool.query("SELECT * FROM tbl_issue_reports WHERE report_id = ?", [reportId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: "Report not found." });
    }

    await pool.query("DELETE FROM tbl_maintenance_tasks WHERE report_id = ?", [reportId]);
    await pool.query("DELETE FROM tbl_issue_reports WHERE report_id = ?", [reportId]);
    await logActivity(req.user.userId, "DELETE", "tbl_issue_reports", reportId, existing[0], null);

    return res.json({ message: "Report deleted." });
  } catch (error) {
    console.error("Delete report error:", error);
    return res.status(500).json({ error: "Failed to delete report." });
  }
});

module.exports = router;
