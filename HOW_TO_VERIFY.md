# How to Tell If Everything Is Working

Use this checklist in order. If every step passes, your **Node.js + MariaDB** setup is good.

---

## 1. Is MariaDB (database) running?

**XAMPP Control Panel**
- MySQL shows **Running** (green)

**Browser test (optional)**
- Open [http://localhost/phpmyadmin](http://localhost/phpmyadmin)
- Click **`spotn_fix`** on the left
- You should see tables including:
  - `tbl_users`, `tbl_floors`, `tbl_facility_types`, `tbl_issue_types`
  - `tbl_room`, `tbl_facilities`, `tbl_issue_reports`
  - `tbl_maintenance_tasks`, `tbl_activity_logs`, `tbl_contact_messages`

**Command line test**
```powershell
& "C:\xampp\mysql\bin\mysql.exe" -u root -e "USE spotn_fix; SHOW TABLES;"
```

---

## 2. Is the Node.js backend running?

In VS Code terminal:
```powershell
cd C:\Users\aifos\spotnfix\backend
npm run dev
```

You should see:
```
SpotN'Fix API running at http://localhost:3000
Health check: http://localhost:3000/api/health
```

**Browser test — open this URL:**

[http://localhost:3000/api/health](http://localhost:3000/api/health)

**Good response looks like:**
```json
{
  "ok": true,
  "service": "SpotN'Fix API",
  "database": {
    "connected": true,
    "name": "spotn_fix",
    "users": 9,
    "facilities": 10,
    "reports": 10
  }
}
```

| Field | Meaning |
|-------|---------|
| `"ok": true` | API is alive |
| `"connected": true` | Node.js can talk to MariaDB |
| `"users"` / `"reports"` | How many rows are in the database |

If `"connected": false` → start MySQL in XAMPP and check `backend/.env`.

---

## 3. Is the frontend connected to the backend?

1. Open `frontend/index.html` with **Live Server**
2. Look at the **colored bar at the top** of the page

| Bar color | Meaning |
|-----------|---------|
| **Green** | Database connected, report count shown |
| **Red** | Backend or database not reachable |

Green bar example:
> Database connected (spotn_fix) · 10 reports · Not logged in

---

## 4. Can you log in?

1. Go to **Login**
2. Use:
   - Email: `admin@spotnfix.local`
   - Password: `password123`
3. After login, the top bar should say **Logged in as Admin User (admin)**
4. A **Log out** button appears in the nav

---

## 5. Can you submit a report (full flow)?

1. Click **Report an Issue** or **+ Submit Report**
2. If not logged in → you get a prompt to **Login** or **Register**
3. After login, fill in **all required fields**:
   - Floor, Room
   - Equipment Type, Equipment Name
   - Issue Type, Description
   - Photo (optional)
4. Submit → report appears on **Track Reports** from the database (not browser storage)

---

## 6. Quick “all good” summary

| Check | Pass? |
|-------|-------|
| XAMPP MySQL running | ☐ |
| `/api/health` shows `"connected": true` | ☐ |
| Green status bar on every page (Home, About, Features, Contact, Reports, Login) | ☐ |
| Login works | ☐ |
| Submit report requires login | ☐ |
| New report shows in Track Reports | ☐ |

**All checked = everything is working.**

---

## If something fails

| Problem | Fix |
|---------|-----|
| Red status bar | Run `npm run dev` in `backend` folder |
| `connected: false` | Start MySQL in XAMPP |
| Login fails | Run `npm run seed` in `backend` |
| CORS error | Use Live Server, not opening HTML as a file |
| Empty reports / API errors after update | Re-import `backend/sql/spotn_fix.sql` in phpMyAdmin, then `npm run seed` |
