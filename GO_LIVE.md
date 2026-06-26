# Go live — SpotN'Fix (your checklist)

**GitHub repo (already set up):** https://github.com/yusa016/spotnfix-app

**Recommended hosting:** [Render](https://render.com) (app) + [TiDB Cloud Serverless](https://tidbcloud.com) (free MySQL-compatible database)

---

## Why not Netlify / Firebase / Railway?

| Platform | Works for SpotN'Fix? |
|----------|----------------------|
| **Netlify** | No — static sites + serverless only. You need a running Node.js server + MySQL. |
| **Firebase** | No — would require rewriting the app to Firestore/Auth. |
| **Railway** | Works, but free credits run out and the project stops. |
| **Render (free)** | Yes — URL stays forever. App sleeps after ~15 min idle; first visit wakes in ~30–60 sec (open the link before your demo). |
| **TiDB Cloud (free)** | Yes — MySQL-compatible, free tier stays available for the database. |

---

## What is already done for you

- Full project pushed to **your** GitHub: `yusa016/spotnfix-app`
- One server serves **website + API** (no CORS setup needed)
- `render.yaml` included for easy Render deploy
- `npm run db:setup` imports schema + sample data

---

## What YOU need to do (about 20 minutes)

### Part A — Free database (TiDB Cloud)

1. Go to https://tidbcloud.com and sign up (free).
2. Create a **Serverless** cluster (free tier).
3. Open **Connect** → choose **General** → copy the connection details:
   - Host, Port, User, Password, Database name
4. Keep this tab open — you will paste these into Render in Part B.

TiDB uses MySQL protocol. In Render, set:

| Render env var | TiDB value |
|----------------|------------|
| `DB_HOST` | your host (e.g. `gateway01.xxx.prod.aws.tidbcloud.com`) |
| `DB_PORT` | usually `4000` |
| `DB_USER` | from TiDB |
| `DB_PASSWORD` | from TiDB |
| `DB_NAME` | e.g. `spotn_fix` |
| `DB_SSL` | `true` |

---

### Part B — Deploy app (Render)

1. Go to https://render.com and sign up (GitHub login is easiest).
2. **New +** → **Blueprint** → connect GitHub → select **`yusa016/spotnfix-app`**.
   - Or: **New Web Service** → same repo → use settings below.
3. Confirm settings:
   - **Build command:** `npm install && npm install --prefix backend`
   - **Start command:** `npm start`
   - **Plan:** Free
4. Add **Environment Variables** (Environment tab):

| Key | Value |
|-----|--------|
| `DB_HOST` | from TiDB |
| `DB_PORT` | from TiDB |
| `DB_USER` | from TiDB |
| `DB_PASSWORD` | from TiDB |
| `DB_NAME` | `spotn_fix` (create this database in TiDB if needed) |
| `DB_SSL` | `true` |
| `JWT_SECRET` | any long random string (e.g. `spotnfix-demo-jwt-2026-yusa016`) |

5. Click **Deploy**. Wait until status is **Live**.
6. Open **Shell** on Render (one time) and run:

```bash
npm run db:setup
```

7. Visit your Render URL, e.g. `https://spotnfix.onrender.com`
8. Test: `https://YOUR-URL.onrender.com/api/health` → should show `"connected": true`

---

### Part C — Before presentation

1. Open the live URL **2 minutes early** (free tier may be waking from sleep).
2. Log in as admin: `admin@spotnfix.local` / `password123`
3. Keep **local XAMPP** as backup if Wi‑Fi fails.

---

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@spotnfix.local | password123 |
| Student | erascon@mymail.mapua.edu.ph | password123 |
| Student | suy@mymail.mapua.edu.ph | password123 |

---

## Troubleshooting

**Health check: database disconnected**  
→ Double-check TiDB host/port/user/password and `DB_SSL=true`.

**Site loads but 404 on pages**  
→ Redeploy from Render dashboard (Deploy latest commit).

**Very slow first load**  
→ Normal on Render free tier after idle. Wake it before presenting.

**Need always-on with zero sleep?**  
→ Render paid plan ($7/mo) or run locally for the demo.
