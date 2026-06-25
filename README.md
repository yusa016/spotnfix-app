# Cardinal's SpotN'Fix — Backend + Database

Node.js REST API connected to MariaDB/MySQL (XAMPP), with frontend integration files for your existing GitHub site.

## Project layout

```
spotnfix/
├── backend/                 # Node.js + Express API
│   ├── sql/spotn_fix.sql    # Database schema (import in phpMyAdmin)
│   ├── src/
│   │   ├── server.js        # API entry point
│   │   ├── seed.js          # Sample data
│   │   └── routes/          # auth, reports, facilities, tasks
│   └── .env                 # Database credentials
├── frontend-integration/    # Copy these into your frontend Git repo
└── .vscode/                 # VS Code run/debug config
```

## VS Code setup (step by step)

### 1. Prerequisites

Install in this order:

1. **XAMPP** — [https://www.apachefriends.org/](https://www.apachefriends.org/) (MariaDB + phpMyAdmin)
2. **Node.js LTS** — [https://nodejs.org/](https://nodejs.org/)
3. **VS Code extensions** (recommended):
   - Live Server (ritwickdey.LiveServer) — serve the frontend locally
   - MySQL (cweijan.vscode-mysql-client2) — optional, browse the database

### 2. Open this folder in VS Code

```
File → Open Folder → C:\Users\aifos\spotnfix
```

### 3. Create the database

1. Start **Apache** and **MySQL** in the XAMPP Control Panel
2. Open **phpMyAdmin**: [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
3. Click **Import** → choose `backend/sql/spotn_fix.sql` → **Go**

This creates the `spotn_fix` database and all tables.

### 4. Install backend dependencies

Open a terminal in VS Code (`Terminal → New Terminal`) and run:

```powershell
cd backend
npm install
npm run seed
npm run dev
```

You should see: `SpotN'Fix API running at http://localhost:3000`

Test it: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### 5. Connect your frontend

Clone your existing frontend repo (or copy it into this workspace), then merge the integration files:

```powershell
# Example: clone your frontend next to backend
git clone https://github.com/stevenblakecasio/spotnfix.git frontend
```

Copy from `frontend-integration/` into your frontend repo:

| Copy from | Paste into frontend repo |
|-----------|--------------------------|
| `assets/js/config.js` | `assets/js/config.js` |
| `assets/js/api.js` | `assets/js/api.js` |
| `assets/js/login.js` | `assets/js/login.js` (replace) |
| `assets/js/register.js` | `assets/js/register.js` (replace) |
| `assets/js/main.js` | `assets/js/main.js` (replace) |

Add to **every page that uses the API** (before other scripts):

```html
<script src="assets/js/config.js"></script>
<script src="assets/js/api.js"></script>
```

On `pages/auth/register.html`, add the ID/name fields listed in `frontend-integration/HTML_PATCHES.md`.

### 6. Run frontend + backend together

**Terminal 1 — API:**
```powershell
cd backend
npm run dev
```

**Terminal 2 — Frontend (Live Server):**
- Right-click `frontend/index.html` → **Open with Live Server**
- Opens at `http://127.0.0.1:5500/...`

Or use VS Code **Run and Debug** (`F5`) → **Start SpotN'Fix API**.

## Sample accounts

After `npm run seed`:

| Email | Password | Role |
|-------|----------|------|
| admin@spotnfix.local | password123 | admin |
| charlie.k@mapua.edu.ph | password123 | student |
| blake.casio@mapua.edu.ph | password123 | faculty |

## API endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login (returns JWT) |
| GET | `/api/reports` | List reports (filters: floor, status, room, type, search) |
| POST | `/api/reports` | Submit report (login required) |
| PATCH | `/api/reports/:id/status` | Update status (admin) |
| DELETE | `/api/reports/:id` | Delete report (admin) |
| GET | `/api/reports/analytics` | Dashboard counts |
| GET | `/api/facilities` | List facilities |
| GET | `/api/tasks` | Maintenance tasks (admin) |

## Database tables

Matches your proposal and `spotn_fix.sql`:

- `tbl_users` — students, faculty, admin (+ `password_hash` for login)
- `tbl_facilities` — equipment by floor/room (+ `floor` column for frontend filters)
- `tbl_issue_reports` — submitted issues
- `tbl_maintenance_tasks` — assigned repair work
- `tbl_activity_logs` — audit trail for create/update/delete

## Troubleshooting

**"Could not load reports. Is the backend running?"**
→ Run `npm run dev` in the `backend` folder first.

**CORS error in browser**
→ Make sure `CORS_ORIGIN` in `backend/.env` includes your Live Server URL (`http://127.0.0.1:5500`).

**Database connection failed**
→ Check XAMPP MySQL is running. Default XAMPP user is `root` with no password — matches `backend/.env`.

**GitHub Pages can't reach localhost**
→ The live site at [stevenblakecasio.github.io/spotnfix](https://stevenblakecasio.github.io/spotnfix/) needs the backend deployed publicly (Render, Railway, etc.) and `config.js` updated with that URL.

## Course alignment

This backend implements the proposal features:

- User report submission with location and description
- Maintenance dashboard with status updates
- Search and filter by floor, room, type, status
- Analytics (open / in progress / resolved counts)
- SQL CRUD with activity logging
- Role-based access (student reports, admin manages status)
