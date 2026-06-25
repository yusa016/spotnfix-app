const express = require("express");
const pool = require("../db");
const { getFloorIdByName, getOrCreateFacilityTypeId } = require("../dbLookups");

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.facility_id, f.facility_name, ft.type_name AS facility_type,
              fl.floor_name AS floor, f.room_number, f.location_type, f.status
       FROM tbl_facilities f
       JOIN tbl_floors fl ON fl.floor_id = f.floor_id
       JOIN tbl_facility_types ft ON ft.facility_type_id = f.facility_type_id
       ORDER BY fl.floor_level DESC, f.room_number`
    );
    return res.json(rows);
  } catch (error) {
    console.error("Get facilities error:", error);
    return res.status(500).json({ error: "Failed to load facilities." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { facilityName, facilityType, floor, roomNumber, status = "Operational", locationType = "room" } = req.body;

    if (!facilityName || !facilityType || !floor || !roomNumber) {
      return res.status(400).json({ error: "All facility fields are required." });
    }

    const floorId = await getFloorIdByName(floor);
    const facilityTypeId = await getOrCreateFacilityTypeId(facilityType);
    if (!floorId || !facilityTypeId) {
      return res.status(400).json({ error: "Invalid floor or equipment type." });
    }

    const [result] = await pool.query(
      `INSERT INTO tbl_facilities (facility_name, facility_type_id, floor_id, room_number, location_type, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [facilityName, facilityTypeId, floorId, roomNumber, locationType === "area" ? "area" : "room", status]
    );

    return res.status(201).json({ facilityId: result.insertId });
  } catch (error) {
    console.error("Create facility error:", error);
    return res.status(500).json({ error: "Failed to create facility." });
  }
});

module.exports = router;
