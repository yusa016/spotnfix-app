# Go live — quick checklist

**Recommended host:** [Railway](https://railway.app) (website + API + MySQL, one URL)

---

## Already prepared in this project

- Single server serves **frontend + API** (`npm start`)
- Auto API URL on live sites (`frontend/assets/js/config.js`)
- Cloud MySQL support (`backend/src/db.js` + SSL)
- `railway.toml` build/start settings
- One-time DB setup: `npm run db:setup`

---

## YOU do these (I cannot do them — needs your accounts)

### A. GitHub — one time (~2 min)

1. Open PowerShell:

```powershell
gh auth login
```

Choose: **GitHub.com** → **HTTPS** → **Login with a web browser** → paste the code.

2. After login, run:

```powershell
cd C:\Users\aifos\spotnfix
.\scripts\push-new-repo.ps1
```

That creates **`stevenblakecasio/spotnfix-system`** and pushes `main` (separate from your old frontend-only repo).

> If you want a different repo name, edit `scripts/push-new-repo.ps1` first.

---

### B. Railway — deploy (~10 min)

1. Go to [railway.app](https://railway.app) → sign in with GitHub
2. **New Project** → **Deploy from GitHub repo** → pick **`spotnfix-system`**
3. Wait for first deploy (may fail until DB exists — that's OK)
4. In the same project: **+ New** → **Database** → **MySQL**
5. Click your **web service** (not MySQL) → **Variables** → add:

| Variable | Value |
|----------|--------|
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | `spotnfix-demo-jwt-2026-pick-any-long-random-string` |
| `PORT` | `3000` |

Replace `MySQL` with your MySQL service name if Railway named it differently (e.g. `MySQL-abc1`).

6. **Web service** → **Settings** → **Networking** → **Generate Domain** (copy the URL)
7. **Web service** → right tab **Deployments** or use **Railway CLI** → run once:

```powershell
npm run db:setup
```

(Railway dashboard: service → **Settings** → shell / one-off command, if available)

8. Open `https://YOUR-DOMAIN/api/health` — should show `"connected": true`
9. Open `https://YOUR-DOMAIN` — full site should load

---

### C. Before presentation

- Open live URL **2 minutes early** (cold start)
- Admin: `admin@spotnfix.local` / `password123`
- Student: `erascon@mymail.mapua.edu.ph` / `password123`
- Keep local XAMPP as backup if Wi‑Fi fails

---

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@spotnfix.local | password123 |
| Student | erascon@mymail.mapua.edu.ph | password123 |
| Student | suy@mymail.mapua.edu.ph | password123 |
