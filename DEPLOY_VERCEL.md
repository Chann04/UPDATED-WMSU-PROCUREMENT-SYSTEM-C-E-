# Deploy WMSU Procurement Frontend to Vercel

Follow these steps to deploy without errors.

---

## 1. Prepare the repo

- Ensure all changes are committed and pushed to GitHub (e.g. `https://github.com/Bensher06/WMSUProcurement`).
- The `frontend` folder contains the Vite + React app. The repo root is one level above `frontend`.

---

## 2. Create a Vercel account and import the project

1. Go to **https://vercel.com** and sign in (use **Continue with GitHub**).
2. Click **Add New…** → **Project**.
3. **Import** your GitHub repository (e.g. `Bensher06/WMSUProcurement`).
4. If asked to configure the Git repository, you can leave defaults for now; you’ll set the rest in the next step.

---

## 3. Configure the project (important – avoids most errors)

In the import/configuration screen, set:

| Setting | Value | Why |
|--------|--------|-----|
| **Framework Preset** | Vite | So Vercel uses the right build. |
| **Root Directory** | `frontend` | App lives in `frontend/`, not repo root. Click **Edit** next to Root Directory and choose `frontend`. |
| **Build Command** | `npm run build` | Default; leave as is. |
| **Output Directory** | `dist` | Vite’s default output; leave as is. |
| **Install Command** | `npm install` | Default; leave as is. |

Do **not** set Root Directory to the repo root, or the build will fail (no `package.json` at root).

---

## 4. Add environment variables (required for Supabase)

Without these, the app will build but Supabase will not work in production.

1. In the same screen (or in **Project → Settings → Environment Variables**), add:

   - **Name:** `VITE_SUPABASE_URL`  
     **Value:** your Supabase project URL (e.g. `https://xxxxx.supabase.co`).  
     **Environment:** Production (and Preview if you use preview deployments).

   - **Name:** `VITE_SUPABASE_ANON_KEY`  
     **Value:** your Supabase anon/public key from Project Settings → API.  
     **Environment:** Production (and Preview if you use preview deployments).

2. Use the same values as in your local `frontend/.env`.  
3. Do **not** commit `.env` or real keys to the repo; only set them in Vercel.

---

## 5. Deploy

1. Click **Deploy**.
2. Wait for the build. If something fails, check the build logs (Step 6).
3. When it succeeds, Vercel gives you a URL like `https://your-project.vercel.app`.

---

## 6. If the build fails – what to check

- **“Cannot find package.json” or “No such file”**  
  → Root Directory must be `frontend`, not the repo root.

- **Build passes but app is blank or “Cannot read env”**  
  → Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel (Step 4). Redeploy after adding them.

- **Direct URLs or refresh return 404 (e.g. /dashboard)**  
  → The repo should include `frontend/vercel.json` with the SPA rewrite. Redeploy after adding/committing it.

- **TypeScript or lint errors**  
  → Run locally: `cd frontend && npm run build`. Fix any errors, then push and redeploy.

---

## 7. Supabase (auth and CORS)

For login and auth to work on the deployed URL:

1. In **Supabase Dashboard** → **Authentication** → **URL Configuration**:
   - Add your Vercel URL to **Redirect URLs** (e.g. `https://your-project.vercel.app/**`).
   - Add it to **Site URL** if you use redirects after login.

2. In **Supabase** → **Project Settings** → **API** (or CORS if shown):
   - Ensure your Vercel domain is allowed in CORS (Supabase often allows all by default for anon key; if you restricted CORS, add the Vercel origin).

---

## 8. Optional: custom domain

In Vercel: **Project → Settings → Domains** → add your domain and follow the DNS instructions.

---

## Quick checklist

- [ ] Root Directory = `frontend`
- [ ] `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set in Vercel
- [ ] `frontend/vercel.json` committed (SPA rewrites)
- [ ] Supabase redirect URLs include your Vercel URL
- [ ] Local build passes: `cd frontend && npm run build`
