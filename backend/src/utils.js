const pool = require("./db");

async function logActivity(userId, action, tableName, recordId, oldValue, newValue) {
  await pool.query(
    `INSERT INTO tbl_activity_logs (user_id, action, table_name, record_id, old_value, new_value)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      action,
      tableName,
      recordId,
      oldValue ? JSON.stringify(oldValue) : null,
      newValue ? JSON.stringify(newValue) : null,
    ]
  );
}

function dbStatusToFrontend(status) {
  switch (status) {
    case "In Progress":
      return "in progress";
    case "Resolved":
      return "resolved";
    default:
      return "open";
  }
}

function frontendStatusToDb(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "in progress") return "In Progress";
  if (normalized === "resolved") return "Resolved";
  return "Pending";
}

function formatReportDate(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatReportTime(dateValue) {
  const date = new Date(dateValue);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function mapReportRow(row) {
  return {
    id: `r${row.report_id}`,
    reportId: row.report_id,
    facilityId: row.facility_id,
    userId: row.user_id,
    status: dbStatusToFrontend(row.status),
    floor: row.floor,
    room: row.room_number,
    type: row.facility_name,
    facilityType: row.facility_type,
    issueType: row.issue_type,
    description: row.description,
    photoPath: row.photo_path,
    date: formatReportDate(row.report_date),
    reportDateIso: row.report_date
      ? new Date(row.report_date).toISOString().slice(0, 10)
      : "",
    time: formatReportTime(row.report_date),
    submittedBy: `${row.first_name} ${row.last_name}`.trim(),
    studentNo: String(row.id_number),
    history: [
      {
        date: formatReportDate(row.report_date),
        expanded: true,
        submitter: `${row.first_name} ${row.last_name}`.trim(),
        content: row.description,
        resolved: row.status === "Resolved" ? formatReportDate(row.report_date) : "Pending",
      },
    ],
    notes: [],
  };
}

module.exports = {
  logActivity,
  dbStatusToFrontend,
  frontendStatusToDb,
  mapReportRow,
};
