# Cardinal's SpotN'Fix

**A Tracking System For Facility Issues**

## Group Members

- Casio, Steven Blake J.
- Legazpi, Julie Angelica S.
- Rascon, Eightria Nadyn T.
- Uy, Sofia Angela B.

## Brief Description

Cardinal's SpotN'Fix is a web-based reporting and monitoring system developed to address problems encountered when reporting faulty university equipment and facility maintenance needs. It provides a centralized platform where students, faculty, and staff can report maintenance problems without complicated procedures that delay the process.

The system helps maintenance workers receive reports and monitor resolution progress. It improves communication and accountability by keeping maintenance staff aware of needed and ongoing work across the campus.

Cardinal's SpotN'Fix contributes to a safer, more functional, and better-maintained campus environment for all users.

---

## Live Demo

**https://spotnfix-0jrs.onrender.com**

> First load on Render may take 30–60 seconds if the service was idle.

---

## Demo Login Credentials

### Admin (maintenance / dashboard access)

| Field | Value |
|-------|-------|
| **Email** | `admin@spotnfix.local` |
| **Password** | `password123` |
| **ID Number** | `1000000010` |
| **Role** | Admin |

Admins can track all reports, update status, view the system health bar, and manage contact messages. Admins **cannot** submit issue reports.

### Sample student account

| Field | Value |
|-------|-------|
| **Email** | `erascon@mymail.mapua.edu.ph` |
| **Password** | `password123` |
| **ID Number** | `2025062407` |
| **Role** | Student |

### Sample faculty account

| Field | Value |
|-------|-------|
| **Email** | `jdelacruz@mapua.edu.ph` |
| **Password** | `password123` |
| **ID Number** | `3000000034` |
| **Role** | Faculty |

> You can also **Register** a new account from the login page (Mapúa email rules apply for students and faculty).

---

## Tech Stack

| Layer | Technologies |
|-------|----------------|
| **Presentation** | HTML, CSS, JavaScript, Figma |
| **Application** | Node.js, Express, JWT, Multer |
| **Data** | MySQL / TiDB Cloud, SQL |
| **Tools** | VS Code, GitHub, XAMPP, Render |

---

## Main Features

- User registration and login (student, faculty, admin)
- Submit facility issue reports with optional photo upload
- Track and filter reports by floor, status, issue type, date, and search
- Admin dashboard — update report status, view analytics, contact inbox
- Profile page and account management (including delete account)
- Public contact form

---

## Project Repository

Full source (frontend + backend + database):  
**https://github.com/yusa016/spotnfix-app**

Database schema documentation: see `DATABASE_SCHEMA.md` in the main repository.

---

## Local Setup (optional)

From the project root:

```powershell
npm install
npm run db:setup
npm start
```

Open **http://localhost:3000**

Use the same demo credentials above after seeding.
