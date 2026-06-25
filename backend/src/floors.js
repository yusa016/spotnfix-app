const FLOOR_LABELS = [
  "",
  "1st Floor",
  "2nd Floor",
  "3rd Floor",
  "4th Floor",
  "5th Floor",
  "6th Floor",
  "7th Floor",
  "8th Floor",
];

function floorLabelFromLevel(level) {
  const n = Number(level);
  if (!Number.isInteger(n) || n < 1 || n > 8) return null;
  return FLOOR_LABELS[n];
}

function floorLevelFromLabel(label) {
  const normalized = String(label || "").trim();
  const index = FLOOR_LABELS.indexOf(normalized);
  return index >= 1 ? index : null;
}

function isValidFloorLabel(label) {
  return floorLevelFromLabel(label) !== null;
}

function normalizeRoomKey(room) {
  return String(room || "")
    .trim()
    .replace(/^R/i, "")
    .toUpperCase();
}

function inferFloorLevelFromRoom(room) {
  const key = normalizeRoomKey(room);
  if (!/^\d{2,3}$/.test(key)) return null;
  const num = parseInt(key, 10);
  if (num < 100 || num > 899) return null;
  const level = Math.floor(num / 100);
  return level >= 1 && level <= 8 ? level : null;
}

async function lookupRoomFloor(pool, roomInput) {
  const raw = String(roomInput || "").trim();
  if (!raw) return null;

  const key = normalizeRoomKey(raw);

  try {
    const [rows] = await pool.query(
      `SELECT fl.floor_name, fl.floor_level
       FROM tbl_room tr
       JOIN tbl_floors fl ON fl.floor_id = tr.floor_id
       WHERE UPPER(TRIM(tr.room_number)) IN (?, ?, ?)`,
      [raw.toUpperCase(), key, `R${key}`]
    );
    if (rows.length > 0) {
      return {
        floor: rows[0].floor_name,
        floorLevel: rows[0].floor_level,
        source: "database",
      };
    }
  } catch (_error) {
    // tbl_room may not exist yet on older databases
  }

  const inferred = inferFloorLevelFromRoom(raw);
  if (inferred) {
    return { floor: floorLabelFromLevel(inferred), floorLevel: inferred, source: "pattern" };
  }

  return null;
}

module.exports = {
  FLOOR_LABELS,
  floorLabelFromLevel,
  floorLevelFromLabel,
  isValidFloorLabel,
  normalizeRoomKey,
  inferFloorLevelFromRoom,
  lookupRoomFloor,
};
