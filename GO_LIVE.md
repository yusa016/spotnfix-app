# Go live — SpotN'Fix

**Host:** [Railway](https://railway.app) → one URL for website + API + MySQL  
**GitHub repo name:** `spotnfix-app` (project branding — not tied to `spotnfix-system`)

Your old frontend-only repo (`stevenblakecasio/spotnfix`) is **not** touched.

---

## Already done for you (in this folder)

- Frontend + API run together (`npm start`)
- Live sites auto-use `/api` (no manual config URL)
- Cloud MySQL + SSL in `backend/src/db.js`
- `railway.toml` — Railway build/start settings
- `npm run db:setup` — import schema + sample data
- Sample logins: `admin@spotnfix.local` / `password123`

---

## What YOU must do (accounts & clicks)

### Step 1 — GitHub login (~2 min)

Open **PowerShell**:

```powershell
gh auth login
```

1. **GitHub.com**
2. **HTTPS**
3. **Login with a web browser**
4. Paste the one-time code when asked

---

### Step 2 — Push to new repo (~1 min)

Still in PowerShell:

```powershell
cd C:\Users\aifos\spotnfix
.\scripts\push-new-repo.ps1
```

This creates **`YOUR_USERNAME/spotnfix-app`** and uploads the full project.

> Want the repo named exactly `spotnfix`? First rename or delete the old frontend-only repo on GitHub, then edit `$repoName` in `scripts/push-new-repo.ps1`.

---

### Step 3 — Railway project (~10 min)

1. Go to [railway.app](https://railway.app) → sign in with **GitHub**
2. **New Project** → **Deploy from GitHub repo** → choose **`spotnfix-app`**
3. Click the **web service** → **Settings** → rename service to **`SpotNFix`** (optional, for a cleaner dashboard name)
4. Same project → **+ New** → **Database** → **MySQL**
5. Click the **web service** (Node, not MySQL) → **Variables** → **Add**:

| Variable | Value |
|----------|--------|
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | `spotnfix-demo-jwt-change-this-to-any-long-random-string` |
| `PORT` | `3000` |

Replace **`MySQL`** with your MySQL service name if Railway named it differently (check the Variables reference picker).

6. **Web service** → **Settings** → **Networking** → **Generate Domain**  
   Copy the URL (e.g. `spotnfix-app-production.up.railway.app`).

7. Wait for deploy to finish (green). First deploy may fail until variables are set — redeploy after step 5.

---

### Step 4 — Database setup (one time)

**Web service** → open **Shell** (or use Railway CLI) and run:

```powershell
npm run db:setup
```

You should see schema imported + sample data loaded.

---

### Step 5 — Verify

1. Open `https://YOUR-RAILWAY-DOMAIN/api/health` → `"connected": true`
2. Open `https://YOUR-RAILWAY-DOMAIN` → home page loads
3. Log in: `admin@spotnfix.local` / `password123`
4. **Track Reports** and **Contact Inbox** work

---

## Before presentation

- Open the live URL **2 minutes early** (free tier cold start)
- Keep **local XAMPP** as backup if Wi‑Fi fails

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@spotnfix.local | password123 |
| Student | erascon@mymail.mapua.edu.ph | password123 |
| Student | suy@mymail.mapua.edu.ph | password123 |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Health check: DB disconnected | Check all `DB_*` vars + `DB_SSL=true` |
| Build failed | Ensure build command is `npm install --prefix backend` |
| Blank subpages | Redeploy after latest push |
| `gh auth login` timed out | Run it again; complete browser step within 2 min |

More detail: [DEPLOY.md](./DEPLOY.md)
