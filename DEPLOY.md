# Deploy SpotN'Fix for demo (easiest path)

One public URL serves **both** the website and the API. Best option for a class presentation: **Railway** (Node + MySQL in one place, simple setup).

---

## What you need

1. [GitHub](https://github.com) account — push this whole `spotnfix` folder as one repo
2. [Railway](https://railway.app) account — free trial credit is enough for a demo
3. About **20–30 minutes** first time

---

## Step 1 — Push to GitHub

If the repo is not on GitHub yet:

```powershell
cd C:\Users\aifos\spotnfix
git init
git add .
git commit -m "SpotN'Fix demo deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/spotnfix.git
git push -u origin main
```

Make sure **`.env` is not committed** (it is in `.gitignore`).

---

## Step 2 — Create Railway project

1. Go to [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → select your `spotnfix` repo
3. Railway detects Node — leave **Root Directory** empty (repo root)
4. **Settings → Deploy**:
   - **Build Command:** `npm install --prefix backend`
   - **Start Command:** `npm start`

---

## Step 3 — Add MySQL database

1. In the same Railway project → **+ New** → **Database** → **MySQL**
2. Click the MySQL service → **Variables** tab
3. In your **web service**, add these variables (Railway can reference the MySQL service):

| Variable | Value |
|----------|--------|
| `DB_HOST` | `${{MySQL.MYSQLHOST}}` |
| `DB_PORT` | `${{MySQL.MYSQLPORT}}` |
| `DB_USER` | `${{MySQL.MYSQLUSER}}` |
| `DB_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `DB_NAME` | `${{MySQL.MYSQLDATABASE}}` |
| `DB_SSL` | `true` |
| `JWT_SECRET` | any long random string (e.g. `spotnfix-demo-jwt-2026-change-me`) |
| `PORT` | `3000` |

Replace `MySQL` with your MySQL service name if Railway named it differently.

---

## Step 4 — Load schema + sample data (one time)

1. Open your **web service** → **Settings** → run a one-off command, or use Railway CLI:

```powershell
npm run db:setup
```

Or separately:

```powershell
node backend/scripts/import-schema.js
node backend/src/seed.js
```

2. Wait for deploy to finish. Open the **public URL** Railway gives you (e.g. `https://spotnfix-production.up.railway.app`).

3. Check health: `https://YOUR-URL/api/health` — should show `"connected": true`.

---

## Step 5 — Demo checklist

Before presenting:

1. Open the live URL **2 minutes early** (free tiers may sleep / cold-start)
2. Log in as admin: `admin@spotnfix.local` / `password123`
3. Confirm green status bar and report list load
4. Optional: submit a test report as a student account

---

## Local vs live

| | Local (XAMPP) | Live (Railway) |
|--|--|--|
| Website | Live Server | Same URL as API |
| API | `localhost:3000` | `your-url/api/...` |
| Database | XAMPP MariaDB | Railway MySQL |
| Config | `config.js` auto-detects localhost | Uses same-origin `/api` |

No code changes needed when switching — `frontend/assets/js/config.js` detects the environment.

---

## Alternative: Render (free, but sleeps)

Render’s free web tier **spins down after ~15 minutes** — first visit can take 30–60 seconds. Fine for demo if you wake it early.

1. [render.com](https://render.com) → **New Web Service** → connect GitHub repo
2. **Build:** `npm install --prefix backend`
3. **Start:** `npm start`
4. Add a MySQL database elsewhere (e.g. Railway MySQL only, or Aiven free trial) and set the same env vars as above.

---

## Troubleshooting

**Health check shows database disconnected**
→ Check `DB_*` variables and `DB_SSL=true` for cloud MySQL.

**Blank page or 404 on subpages**
→ Redeploy after latest code (server now serves the `frontend/` folder).

**CORS errors**
→ Not needed on live demo — website and API share the same URL.

**Uploads disappear after redeploy**
→ Expected on free hosting (ephemeral disk). Photos are optional for demo.

**Seed wiped my data**
→ `npm run seed` clears sample tables. Only run it once during setup.

---

## Presentation tip

If internet fails in the room, fall back to **local XAMPP + Live Server** — you already have that working. Use the live URL as the primary demo and local as backup.
