# Deploying PhotoSphere for free

Backend and frontend are separate GitHub repos (`SocialMedia_Backend`, `SocialMedia_Frontend`), deployed to two different free services, plus one free database service — $0/month, no credit card required:

| Piece | Service | Notes |
|---|---|---|
| Backend (this repo — Express + Socket.IO) | [Render](https://render.com) | Free web service — **sleeps after 15 min idle**, ~30–50s cold start on the next request |
| Frontend (`SocialMedia_Frontend` repo) | [Vercel](https://vercel.com) | Static hosting, auto-deploys on push |
| Database (Postgres) | [Neon](https://neon.tech) or [Supabase](https://supabase.com) | Free tier that doesn't expire (Render's own free Postgres expires after ~30 days) |

Cloudinary (media) and Gmail SMTP (email) are already configured and need no changes — they work from any host.

## 1. Push these changes

The deployment prep (this file, `render.yaml`, SSL support for managed Postgres, and a cross-site cookie fix) is only committed locally so far:

```bash
git add -A
git commit -m "Add deployment config for Render/Neon"
git push
```

## 2. Create the database (Neon)

1. Sign up at [neon.tech](https://neon.tech), create a project.
2. Copy the connection string it gives you (starts with `postgres://...`, already includes `?sslmode=require`).
3. Keep it handy for step 3.

(Supabase works the same way — grab its connection string from Project Settings → Database.)

## 3. Deploy the backend (Render)

1. Sign up at [render.com](https://render.com) and connect your GitHub account.
2. **New +** → **Blueprint** → pick the `SocialMedia_Backend` repo. Render will detect `render.yaml` and set up the `photosphere-backend` web service automatically.
3. Before the first deploy finishes, fill in these environment variables in the Render dashboard (they're marked `sync: false` in the blueprint, meaning Render leaves them blank for you to fill in — nothing secret is ever committed to git):
   - `DATABASE_URL` — the Neon/Supabase connection string from step 2
   - `CORS_ORIGIN` — leave as a placeholder for now (e.g. `https://placeholder.vercel.app`); you'll come back and set the real value in step 5
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` — from your existing Cloudinary account
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — your existing Gmail SMTP settings
   - `HUGGINGFACE_API_KEY` — optional, only needed for AI caption suggestions
4. Deploy. Once it's live, copy the backend URL Render gives you (`https://photosphere-backend-xxxx.onrender.com`).

## 4. Deploy the frontend (Vercel)

1. Sign up at [vercel.com](https://vercel.com), connect GitHub, import the `SocialMedia_Frontend` repo.
2. It should auto-detect the Vite build (a `vercel.json` with an SPA rewrite rule is already committed there, needed so deep links like `/profile/username` don't 404 on refresh).
3. Add one environment variable:
   - `VITE_API_BASE_URL` = `https://photosphere-backend-xxxx.onrender.com/api/v1` (your Render URL from step 3, with `/api/v1` appended)
4. Deploy. Copy the resulting URL (`https://your-app.vercel.app`).

## 5. Close the loop: point the backend's CORS at the real frontend URL

Back in the Render dashboard → your service → Environment:
- Set `CORS_ORIGIN` to your actual Vercel URL from step 4 (no trailing slash).
- Save — Render will redeploy automatically.

## 6. Test it

Visit your Vercel URL and try registering, posting, and opening a chat. If real-time features (chat, calls, notifications) don't connect, double-check `VITE_API_BASE_URL` and `CORS_ORIGIN` match exactly (protocol + domain, no trailing slash).

## Known limitations of the free tier

- **Render free web services sleep after 15 minutes of no traffic.** The first request after a sleep takes 30–50 seconds to wake up (including the Socket.IO handshake) — this is normal, not a bug.
- Both Render and Vercel provide HTTPS automatically on their own subdomains, which is required for cookies to work cross-site (see `sameSite: 'none'` in `src/modules/auth/auth.controller.js`).
- If you outgrow the free tier, Render's paid plans remove the sleep behavior; Neon/Supabase free tier storage limits are generous for a hobby project but will eventually need upgrading with real usage.
