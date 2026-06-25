const express = require("express");
const pool = require("../db");
const { FLOOR_LABELS, lookupRoomFloor } = require("../floors");

const router = express.Router();

router.get("/floors", (_req, res) => {
  res.json(FLOOR_LABELS.filter(Boolean));
});

router.get("/lookup", async (req, res) => {
  try {
    const room = String(req.query.room || "").trim();
    if (!room) {
      return res.status(400).json({ error: "Room number is required." });
    }

    const result = await lookupRoomFloor(pool, room);
    if (!result) {
      return res.status(404).json({
        error: "Could not determine floor. Use a room number like 216 (2nd floor) or pick Area and select the floor manually.",
      });
    }

    return res.json({ room, ...result });
  } catch (error) {
    console.error("Room lookup error:", error);
    return res.status(500).json({ error: "Room lookup failed." });
  }
});

module.exports = router;
