/**
 * SpotN'Fix ER diagram PDF — polished single-page diagram + reference page.
 * Run: npm run generate:er-pdf
 */
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const C = {
  primary: "#a50000",
  primaryDark: "#8b0000",
  gold: "#ffd700",
  cream: "#fff8f0",
  zone: "#fff5ee",
  text: "#333333",
  textLight: "#555555",
  white: "#ffffff",
  line: "#7a0000",
};

const OUTPUT = path.join(__dirname, "..", "DATABASE_ER_DIAGRAM.pdf");

const ENTITIES = [
  {
    id: "users",
    title: "tbl_users",
    x: 52,
    y: 94,
    w: 128,
    lines: ["PK  user_id", "UK  id_number", "UK  email", "    first_name, last_name", "    password_hash, role"],
  },
  {
    id: "floors",
    title: "tbl_floors",
    x: 248,
    y: 94,
    w: 118,
    lines: ["PK  floor_id", "UK  floor_level", "UK  floor_name"],
  },
  {
    id: "facility_types",
    title: "tbl_facility_types",
    x: 438,
    y: 94,
    w: 122,
    lines: ["PK  facility_type_id", "UK  type_name"],
  },
  {
    id: "issue_types",
    title: "tbl_issue_types",
    x: 618,
    y: 94,
    w: 122,
    lines: ["PK  issue_type_id", "UK  type_name"],
  },
  {
    id: "room",
    title: "tbl_room",
    x: 248,
    y: 188,
    w: 118,
    lines: ["PK  room_number", "FK  floor_id"],
  },
  {
    id: "logs",
    title: "tbl_activity_logs",
    x: 52,
    y: 208,
    w: 128,
    lines: ["PK  log_id", "FK  user_id", "    action, table_name", "    record_id, timestamp"],
  },
  {
    id: "facilities",
    title: "tbl_facilities",
    x: 438,
    y: 188,
    w: 148,
    lines: [
      "PK  facility_id",
      "FK  facility_type_id",
      "FK  floor_id",
      "    facility_name, room_number",
      "    location_type, status",
    ],
  },
  {
    id: "tasks",
    title: "tbl_maintenance_tasks",
    x: 52,
    y: 334,
    w: 134,
    lines: ["PK  task_id", "FK  report_id", "FK  assigned_to", "    task_status, started_at"],
  },
  {
    id: "reports",
    title: "tbl_issue_reports",
    x: 248,
    y: 334,
    w: 160,
    lines: [
      "PK  report_id",
      "FK  facility_id",
      "FK  user_id",
      "FK  issue_type_id",
      "    description, photo_path",
      "    report_date, status",
    ],
  },
  {
    id: "contact",
    title: "tbl_contact_messages",
    x: 618,
    y: 334,
    w: 138,
    lines: [
      "PK  contact_id",
      "    first_name, last_name",
      "    email, subject",
      "    message, status",
      "    submitted_at",
    ],
  },
];

const ZONES = [
  { label: "Users & audit", x: 42, y: 80, w: 150, h: 340 },
  { label: "Location lookups", x: 234, y: 80, w: 146, h: 148 },
  { label: "Facility & issue lookups", x: 424, y: 80, w: 330, h: 148 },
  { label: "Core reporting", x: 234, y: 320, w: 188, h: 132 },
  { label: "Public contact (no FKs)", x: 606, y: 320, w: 162, h: 132 },
];

function measure(entity) {
  const headerH = 24;
  const lineH = 11.5;
  const bodyH = entity.lines.length * lineH + 8;
  const h = headerH + bodyH;
  return {
    ...entity,
    headerH,
    h,
    cx: entity.x + entity.w / 2,
    cy: entity.y + h / 2,
    top: entity.y,
    bottom: entity.y + h,
    left: entity.x,
    right: entity.x + entity.w,
  };
}

function anchor(box, side) {
  switch (side) {
    case "top":
      return [box.cx, box.top];
    case "bottom":
      return [box.cx, box.bottom];
    case "left":
      return [box.left, box.cy];
    case "right":
      return [box.right, box.cy];
    default:
      return [box.cx, box.cy];
  }
}

function drawPolyline(doc, points) {
  if (points.length < 2) return;
  doc.save();
  doc.lineWidth(0.95).strokeColor(C.line);
  doc.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) doc.lineTo(points[i][0], points[i][1]);
  doc.stroke();
  const [ex, ey] = points[points.length - 1];
  doc.circle(ex, ey, 1.8).fillColor(C.primary).stroke();
  doc.restore();
}

function segmentLength(p1, p2) {
  return Math.abs(p1[0] - p2[0]) + Math.abs(p1[1] - p2[1]);
}

function segmentMidpoint(p1, p2) {
  return [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
}

function badgeHitsAnyBox(cx, cy, boxes, w = 34, h = 13, pad = 1) {
  const left = cx - w / 2 - pad;
  const right = cx + w / 2 + pad;
  const top = cy - h / 2 - pad;
  const bottom = cy + h / 2 + pad;
  return Object.values(boxes).some(
    (b) => left < b.right && right > b.left && top < b.bottom && bottom > b.top
  );
}

function placeLabelOnSegment(points, segIdx, boxes) {
  const p1 = points[segIdx];
  const p2 = points[segIdx + 1];
  const mid = segmentMidpoint(p1, p2);
  const horizontal = Math.abs(p1[1] - p2[1]) < 0.5;

  if (!badgeHitsAnyBox(mid[0], mid[1], boxes)) return mid;

  const offsets = horizontal
    ? [
        [0, -9],
        [0, 9],
        [0, -16],
        [0, 16],
      ]
    : [
        [9, 0],
        [-9, 0],
        [12, 0],
        [-12, 0],
      ];

  for (const [ox, oy] of offsets) {
    const pos = [mid[0] + ox, mid[1] + oy];
    if (!badgeHitsAnyBox(pos[0], pos[1], boxes)) return pos;
  }

  return mid;
}

function labelPositionForRoute(route, boxes) {
  const { points } = route;
  const candidates = [];

  for (let i = 0; i < points.length - 1; i += 1) {
    const len = segmentLength(points[i], points[i + 1]);
    if (len < 8) continue;
    candidates.push({ i, len });
  }

  if (route.labelSegment != null && points[route.labelSegment + 1]) {
    return placeLabelOnSegment(points, route.labelSegment, boxes);
  }

  candidates.sort((a, b) => b.len - a.len);

  for (const candidate of candidates) {
    const pos = placeLabelOnSegment(points, candidate.i, boxes);
    if (!badgeHitsAnyBox(pos[0], pos[1], boxes)) return pos;
  }

  const fallbackIdx = candidates[0]?.i ?? 0;
  return placeLabelOnSegment(points, fallbackIdx, boxes);
}

function buildRoutes(b) {
  const busReports = 222;
  const busTasks = 186;
  const busH = 304;

  return [
    { points: [anchor(b.floors, "bottom"), anchor(b.room, "top")] },
    {
      points: [
        anchor(b.floors, "right"),
        [b.floors.right + 28, b.floors.cy],
        [b.floors.right + 28, b.facilities.top - 12],
        [b.facilities.cx, b.facilities.top - 12],
        anchor(b.facilities, "top"),
      ],
      labelSegment: 2,
    },
    { points: [anchor(b.facility_types, "bottom"), anchor(b.facilities, "top")] },
    {
      points: [
        anchor(b.facilities, "bottom"),
        [b.facilities.cx, busH],
        [b.reports.cx, busH],
        anchor(b.reports, "top"),
      ],
      labelSegment: 1,
    },
    {
      points: [
        anchor(b.users, "right"),
        [busReports, b.users.cy],
        [busReports, b.reports.cy],
        anchor(b.reports, "left"),
      ],
      labelSegment: 1,
    },
    {
      points: [
        anchor(b.issue_types, "bottom"),
        [b.issue_types.cx, busH],
        [b.reports.right + 26, busH],
        [b.reports.right + 26, b.reports.cy],
        anchor(b.reports, "right"),
      ],
      labelSegment: 1,
    },
    { points: [anchor(b.users, "bottom"), anchor(b.logs, "top")] },
    {
      points: [
        anchor(b.users, "left"),
        [busTasks, b.users.cy],
        [busTasks, b.tasks.cy],
        anchor(b.tasks, "left"),
      ],
      labelSegment: 1,
    },
    {
      points: [
        anchor(b.reports, "left"),
        [217, b.reports.cy],
        [217, b.tasks.cy],
        anchor(b.tasks, "right"),
      ],
      labelSegment: 1,
    },
  ].map((route) => ({ ...route, label: null }));
}

function attachLabels(routes, boxes) {
  return routes.map((route) => ({
    ...route,
    label: labelPositionForRoute(route, boxes),
  }));
}

function drawCardinality(doc, x, y) {
  const w = 34;
  const h = 13;
  doc.save();
  doc.roundedRect(x - w / 2, y - h / 2, w, h, 3)
    .fillColor(C.white)
    .strokeColor(C.gold)
    .lineWidth(0.75)
    .fillAndStroke();
  doc.fillColor(C.primaryDark).font("Helvetica-Bold").fontSize(6.3);
  doc.text("1:N", x - w / 2, y - 4, { width: w, align: "center" });
  doc.restore();
}

function drawZones(doc) {
  ZONES.forEach((z) => {
    doc.save();
    doc.roundedRect(z.x, z.y, z.w, z.h, 6).fillColor(C.zone).fill();
    doc.roundedRect(z.x, z.y, z.w, z.h, 6).lineWidth(0.45).strokeColor(C.primary).opacity(0.15).stroke();
    doc.opacity(1);
    doc.fillColor(C.textLight).font("Helvetica-Bold").fontSize(7);
    doc.text(z.label.toUpperCase(), z.x + 8, z.y + 6);
    doc.restore();
  });
}

function drawEntity(doc, entity) {
  const box = measure(entity);
  doc.save();

  doc.roundedRect(entity.x, entity.y, entity.w, box.h, 5)
    .fillColor(C.cream)
    .strokeColor(C.primary)
    .lineWidth(1)
    .fillAndStroke();

  doc.roundedRect(entity.x, entity.y, entity.w, box.headerH, 5).fillColor(C.primaryDark).fill();
  doc.rect(entity.x, entity.y + box.headerH - 4, entity.w, 4).fillColor(C.primaryDark).fill();

  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(8.5);
  doc.text(entity.title, entity.x + 6, entity.y + 7, { width: entity.w - 12, align: "center" });

  let y = entity.y + box.headerH + 6;
  entity.lines.forEach((line) => {
    const key = line.startsWith("PK") || line.startsWith("FK") || line.startsWith("UK");
    doc.font(key ? "Helvetica-Bold" : "Helvetica")
      .fontSize(7.15)
      .fillColor(key ? C.primaryDark : C.text);
    doc.text(line, entity.x + 7, y, { width: entity.w - 14, lineBreak: false });
    y += 11.5;
  });

  doc.restore();
  return box;
}

function drawHeader(doc, subtitle) {
  doc.rect(0, 0, doc.page.width, 62).fill(C.primaryDark);
  doc.rect(0, 58, doc.page.width, 3).fill(C.gold);
  doc.fillColor(C.white).font("Helvetica-Bold").fontSize(17);
  doc.text("Cardinal's SpotN'Fix", 36, 13);
  doc.font("Helvetica").fontSize(9.5).fillColor(C.cream);
  doc.text(subtitle, 36, 34);
}

function drawDiagramPage(doc) {
  drawHeader(doc, "Entity-Relationship Overview (3NF) — 10 tables · 9 foreign keys");

  const boxes = {};
  ENTITIES.forEach((e) => {
    boxes[e.id] = measure(e);
  });

  const routes = attachLabels(buildRoutes(boxes), boxes);

  drawZones(doc);
  routes.forEach((r) => drawPolyline(doc, r.points));
  ENTITIES.forEach((e) => drawEntity(doc, e));
  routes.forEach((r) => drawCardinality(doc, r.label[0], r.label[1]));

  doc.fillColor(C.textLight).font("Helvetica-Oblique").fontSize(7.5);
  doc.text("Page 2 — full foreign key map, primary keys, and legend.", 36, 528);
}

function drawReferencePage(doc) {
  doc.addPage({ size: "A4", layout: "landscape", margin: 0 });
  drawHeader(doc, "Schema reference — keys and relationships");

  let y = 86;
  const x = 48;

  doc.fillColor(C.text).font("Helvetica-Bold").fontSize(11).text("Foreign key map", x, y);
  y += 20;

  const cols = [
    ["Parent table", 160],
    ["Parent key", 100],
    ["Child table", 180],
    ["Foreign key", 120],
  ];
  let cx = x;
  cols.forEach(([title, w]) => {
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.primaryDark).text(title, cx, y, { width: w });
    cx += w;
  });
  y += 14;
  doc.moveTo(x, y).lineTo(x + 560, y).strokeColor(C.gold).lineWidth(0.8).stroke();
  y += 10;

  const rows = [
    ["tbl_floors", "floor_id", "tbl_room", "floor_id"],
    ["tbl_floors", "floor_id", "tbl_facilities", "floor_id"],
    ["tbl_facility_types", "facility_type_id", "tbl_facilities", "facility_type_id"],
    ["tbl_facilities", "facility_id", "tbl_issue_reports", "facility_id"],
    ["tbl_users", "user_id", "tbl_issue_reports", "user_id"],
    ["tbl_users", "user_id", "tbl_activity_logs", "user_id"],
    ["tbl_users", "user_id", "tbl_maintenance_tasks", "assigned_to"],
    ["tbl_issue_types", "issue_type_id", "tbl_issue_reports", "issue_type_id"],
    ["tbl_issue_reports", "report_id", "tbl_maintenance_tasks", "report_id"],
  ];

  rows.forEach((row) => {
    cx = x;
    row.forEach((cell, i) => {
      doc.font(i === 3 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8.2)
        .fillColor(i === 3 ? C.primaryDark : C.text)
        .text(cell, cx, y, { width: cols[i][1] });
      cx += cols[i][1];
    });
    y += 17;
  });

  y += 24;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.text).text("Primary keys", x, y);
  y += 18;
  doc.font("Helvetica").fontSize(8.2).fillColor(C.textLight);
  [
    "tbl_users.user_id · tbl_floors.floor_id · tbl_facility_types.facility_type_id · tbl_issue_types.issue_type_id",
    "tbl_room.room_number · tbl_facilities.facility_id · tbl_issue_reports.report_id · tbl_maintenance_tasks.task_id",
    "tbl_activity_logs.log_id · tbl_contact_messages.contact_id",
  ].forEach((line) => {
    doc.text(line, x, y, { width: 720 });
    y += 14;
  });

  y += 20;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.text).text("Legend", x, y);
  y += 16;
  [
    ["PK", "Primary key"],
    ["FK", "Foreign key"],
    ["UK", "Unique key"],
    ["1:N", "One-to-many relationship"],
  ].forEach(([k, d]) => {
    doc.roundedRect(x, y, 26, 13, 2).fillColor(C.cream).strokeColor(C.primary).lineWidth(0.7).fillAndStroke();
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor(C.primaryDark).text(k, x, y + 2, { width: 26, align: "center" });
    doc.font("Helvetica").fontSize(8.5).fillColor(C.text).text(d, x + 34, y + 1);
    y += 18;
  });
}

function main() {
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 0 });
  const stream = fs.createWriteStream(OUTPUT);
  doc.pipe(stream);
  drawDiagramPage(doc);
  drawReferencePage(doc);
  doc.end();
  stream.on("finish", () => console.log(`Created ${OUTPUT}`));
}

main();
