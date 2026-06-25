const bcrypt = require("bcryptjs");
const pool = require("./db");

const ADMIN_USER_ID = 5;

async function getFloorId(level) {
  const [rows] = await pool.query("SELECT floor_id FROM tbl_floors WHERE floor_level = ?", [level]);
  return rows[0]?.floor_id;
}

async function getFacilityTypeId(name) {
  const [rows] = await pool.query("SELECT facility_type_id FROM tbl_facility_types WHERE type_name = ?", [name]);
  return rows[0]?.facility_type_id;
}

async function getIssueTypeId(name) {
  const [rows] = await pool.query("SELECT issue_type_id FROM tbl_issue_types WHERE type_name = ?", [name]);
  return rows[0]?.issue_type_id;
}

async function ensureLookupValues() {
  for (const name of ["Equipment", "Furniture", "Electrical", "Hardware", "Supplies", "Plumbing"]) {
    const table = ["Electrical", "Hardware", "Supplies", "Plumbing"].includes(name)
      ? "tbl_issue_types"
      : "tbl_facility_types";
    await pool.query(`INSERT IGNORE INTO ${table} (type_name) VALUES (?)`, [name]);
  }
}

async function resetSampleData() {
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  await pool.query("TRUNCATE TABLE tbl_activity_logs");
  await pool.query("TRUNCATE TABLE tbl_maintenance_tasks");
  await pool.query("TRUNCATE TABLE tbl_issue_reports");
  await pool.query("TRUNCATE TABLE tbl_facilities");
  await pool.query("TRUNCATE TABLE tbl_room");
  await pool.query("TRUNCATE TABLE tbl_contact_messages");
  await pool.query("TRUNCATE TABLE tbl_users");
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
}

function mapReportStatus(sheetStatus) {
  const normalized = String(sheetStatus || "").toLowerCase();
  if (normalized.startsWith("resolve")) return "Resolved";
  if (normalized.includes("progress")) return "In Progress";
  return "Pending";
}

async function seed() {
  const passwordHash = await bcrypt.hash("password123", 10);

  console.log("Clearing all test data...");
  await resetSampleData();
  await ensureLookupValues();

  const users = [
    [2025062407, "Eightria Nadyn", "Rascon", "erascon@mymail.mapua.edu.ph", "student"],
    [3000000034, "Juan", "Dela Cruz", "jdelacruz@mapua.edu.ph", "faculty"],
    [2000000078, "Liza", "Gomez", "lgomez@mapua.edu.ph", "faculty"],
    [2023001320, "Sofia Angela", "Uy", "suy@mymail.mapua.edu.ph", "student"],
    [1000000010, "Admin", "User", "admin@spotnfix.local", "admin"],
  ];

  for (const [idNumber, firstName, lastName, email, role] of users) {
    await pool.query(
      `INSERT INTO tbl_users (id_number, first_name, last_name, email, password_hash, role)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idNumber, firstName, lastName, email, passwordHash, role]
    );
  }

  const rooms = [
    ["608", 6, "left"],
    ["402", 4, "left"],
    ["311", 3, "right"],
    ["216", 2, "right"],
    ["101", 1, "left"],
  ];

  for (const [roomNumber, floorLevel, side] of rooms) {
    const floorId = await getFloorId(floorLevel);
    if (!floorId) continue;
    await pool.query(`INSERT INTO tbl_room (room_number, floor_id, side) VALUES (?, ?, ?)`, [
      roomNumber,
      floorId,
      side,
    ]);
  }

  const facilities = [
    ["Projector", "Equipment", 6, "608", "room", "Operational"],
    ["Computer Lab PC", "Equipment", 4, "402", "room", "Under Maintenance"],
    ["Whiteboard", "Furniture", 3, "311", "room", "Under Maintenance"],
    ["Air Conditioner", "Equipment", 2, "216", "room", "Under Maintenance"],
    ["Printer", "Equipment", 1, "101", "room", "Faulty"],
  ];

  for (const [name, typeName, floorLevel, roomNumber, locationType, status] of facilities) {
    const floorId = await getFloorId(floorLevel);
    const facilityTypeId = await getFacilityTypeId(typeName);
    if (!floorId || !facilityTypeId) continue;
    await pool.query(
      `INSERT INTO tbl_facilities (facility_name, facility_type_id, floor_id, room_number, location_type, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, facilityTypeId, floorId, roomNumber, locationType, status]
    );
  }

  const reports = [
    [1, 1, "Electrical", "Projector not turning on in Room 608", "photos/projector_issue.jpg", "2026-06-20", "Resolved"],
    [2, 2, "Hardware", "Computer in Lab 402 won't boot", "photos/computer_issue.jpg", "2026-06-21", "In Progress"],
    [3, 3, "Supplies", "Whiteboard has a big hole in Room 311", "photos/whiteboard.jpg", "2026-06-22", "In Progress"],
    [4, 4, "Plumbing", "Aircon leaking water in Room 216", "photos/aircon_leak.jpg", "2026-06-23", "In Progress"],
    [5, 4, "Hardware", "Registrar printer jammed with paper", "photos/printer_jam.jpg", "2026-06-24", "Pending"],
  ];

  for (const [facilityId, userId, issueName, description, photoPath, reportDate, status] of reports) {
    const issueTypeId = await getIssueTypeId(issueName);
    if (!issueTypeId) continue;
    await pool.query(
      `INSERT INTO tbl_issue_reports (facility_id, user_id, issue_type_id, description, photo_path, report_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [facilityId, userId, issueTypeId, description, photoPath, reportDate, mapReportStatus(status)]
    );
  }

  // Maintenance staff log in as admin — all tasks assigned to admin user_id 5
  await pool.query(
    `INSERT INTO tbl_maintenance_tasks (report_id, assigned_to, task_status, started_at, completed_at)
     VALUES
      (1, ?, 'Completed', '2026-06-20 08:00:00', '2026-06-21 17:00:00'),
      (2, ?, 'Assigned', '2026-06-21 09:00:00', NULL),
      (3, ?, 'Assigned', '2026-06-22 09:00:00', NULL),
      (4, ?, 'Assigned', '2026-06-23 09:00:00', NULL),
      (5, ?, 'Assigned', '2026-06-24 09:00:00', NULL)`,
    [ADMIN_USER_ID, ADMIN_USER_ID, ADMIN_USER_ID, ADMIN_USER_ID, ADMIN_USER_ID]
  );

  const activityLogs = [
    [1, "SIGNUP", "tbl_users", 1, null, { message: "Account created" }],
    [2, "LOGIN", "tbl_users", 2, null, { message: "Successful login" }],
    [3, "SIGNUP", "tbl_users", 3, null, { message: "Account created" }],
    [4, "LOGIN", "tbl_users", 4, null, { message: "Successful login" }],
    [5, "LOGIN", "tbl_users", 5, null, { message: "Successful login" }],
  ];

  for (const [userId, action, tableName, recordId, oldValue, newValue] of activityLogs) {
    await pool.query(
      `INSERT INTO tbl_activity_logs (user_id, action, table_name, record_id, old_value, new_value)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, tableName, recordId, oldValue ? JSON.stringify(oldValue) : null, JSON.stringify(newValue)]
    );
  }

  console.log("Official sample data loaded (5 users, 5 reports).");
  console.log("Admin / maintenance login: admin@spotnfix.local / password123");
  console.log("Student example: erascon@mymail.mapua.edu.ph / password123");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error.message);
  process.exit(1);
});
