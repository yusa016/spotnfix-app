const pool = require("./db");

async function getFloorIdByName(floorName) {
  const [rows] = await pool.query("SELECT floor_id FROM tbl_floors WHERE floor_name = ?", [floorName]);
  return rows[0]?.floor_id || null;
}

async function getOrCreateFacilityTypeId(typeName) {
  const name = String(typeName || "").trim();
  await pool.query("INSERT IGNORE INTO tbl_facility_types (type_name) VALUES (?)", [name]);
  const [rows] = await pool.query("SELECT facility_type_id FROM tbl_facility_types WHERE type_name = ?", [name]);
  return rows[0]?.facility_type_id || null;
}

async function getOrCreateIssueTypeId(typeName) {
  const name = String(typeName || "").trim();
  await pool.query("INSERT IGNORE INTO tbl_issue_types (type_name) VALUES (?)", [name]);
  const [rows] = await pool.query("SELECT issue_type_id FROM tbl_issue_types WHERE type_name = ?", [name]);
  return rows[0]?.issue_type_id || null;
}

module.exports = {
  getFloorIdByName,
  getOrCreateFacilityTypeId,
  getOrCreateIssueTypeId,
};
