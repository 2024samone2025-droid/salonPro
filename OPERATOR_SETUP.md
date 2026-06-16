# Operator Console — Setup & Go-Live Runbook

Follow this top to bottom to get the SalonPro **operator console** running at
**`https://ops.samuelxanda.dev/operator`**.

The console is already built (PR #31). Nothing here is coding — it's hosting,
DNS, Google sign-in, and environment variables. Tick each box as you go.

---

## How it fits together (read once)

- **Same repo, two Vercel projects, one database.**
  - *Tenant app* (your existing project): serves `*.salonpro.me`. **No** `OPERATOR_APP` var → operator routes return 404 there.
  - *Operator app* (new project, this runbook): serves `ops.samuelxanda.dev`. `OPERATOR_APP=1` turns the operator routes on.
- **One Neon database** is shared by both (on purpose). The `Salon.status` migration is already applied, so there is **no database migration to run** — the operator project just needs the same connection strings.
- **`samuelxanda.dev` stays on Netlify.** You only delegate the single subdomain `ops.samuelxanda.dev` to Vercel with one CNAME record. The apex is untouched.

```
                 ┌─────────────────────────────┐
  *.salonpro.me  │  Vercel project: TENANT      │  (no OPERATOR_APP)
  ───────────────▶  → operator routes 404       │
                 └─────────────┬───────────────┘
                               │  same repo, same Neon DB
                 ┌─────────────┴───────────────┐
ops.samuelxanda  │  Vercel project: OPERATOR    │  OPERATOR_APP=1
  .dev  ─────────▶  → /operator console live    │
                 └─────────────────────────────┘
samuelxanda.dev (apex) ──▶ stays on Netlify, untouched
```

---

## Prerequisites

- [ ] PR #31 is reviewed (merge happens in **Part 6**, not yet).
- [ ] Access to the existing **tenant** Vercel project (to copy `DATABASE_URL` / `DIRECT_URL`).
- [ ] Access to **DNS** for `samuelxanda.dev` (Netlify DNS panel, or your registrar).
- [ ] A **Google account** you'll sign in to the console with (e.g. your Gmail).
- [ ] `openssl` available locally (for generating a secret).

---

## Part 0 — (Optional but recommended) Verify locally first

Catch problems before touching production.

1. [ ] Set up the Google OAuth client first (do **Part 1**), adding the **dev** redirect URI:
   `http://localhost:3000/api/operator/auth/callback/google`
2. [ ] In your local `.env`, add:
   ```env
   OPERATOR_APP=1
   OPERATOR_ALLOWED_EMAILS=you@gmail.com          # the Google account you'll use
   OPERATOR_AUTH_SECRET=<paste output of: openssl rand -hex 32>
   GOOGLE_CLIENT_ID=<from Part 1>
   GOOGLE_CLIENT_SECRET=<from Part 1>
   ```
   (`OPERATOR_HOST` is not needed locally — the host check is relaxed off-production.)
3. [ ] Start your dev server the way you normally do, then open
   `http://localhost:3000/operator`.
4. [ ] Sign in with Google → you should land on the tenant directory. Open a salon,
   try **Reveal**, try **Suspend** with a reason, then **Reactivate**.
5. [ ] Confirm a non-allowlisted Google account is rejected (it should bounce back to sign-in).

If that all works, production is just the same config on Vercel + DNS.

---

## Part 1 — Create the Google OAuth credentials

1. [ ] Go to **Google Cloud Console** → https://console.cloud.google.com/ → pick or create a project.
2. [ ] **APIs & Services → OAuth consent screen**:
   - User type: **External** (works with any Google account) — or **Internal** if you only sign in with a Google Workspace account on your own org.
   - App name: `SalonPro Operator`. Add your email as support + developer contact. Save.
   - If **External**, add your operator email(s) under **Test users** so they can sign in while the app is in "Testing".
3. [ ] **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `SalonPro Operator Web`
   - **Authorized redirect URIs** — add both:
     - `https://ops.samuelxanda.dev/api/operator/auth/callback/google`
     - `http://localhost:3000/api/operator/auth/callback/google`  *(for local dev)*
   - Create.
4. [ ] Copy the **Client ID** and **Client secret** — you'll paste them into Vercel in Part 3.

> The redirect path `/api/operator/auth/callback/google` is fixed by the app. It must match exactly.

---

## Part 2 — Create the operator Vercel project

1. [ ] Vercel dashboard → **Add New… → Project**.
2. [ ] **Import the same Git repo**: `2024samone2025-droid/salonPro`.
   (Vercel allows multiple projects from one repo — this is a second, separate project.)
3. [ ] Name it something clear, e.g. `salonpro-operator`.
4. [ ] **Framework preset:** Next.js (auto-detected). Leave **Build Command** and
   **Install Command** at the defaults (the repo's build script already runs `prisma generate`).
5. [ ] **Production branch:** set to **`main`** (Project → Settings → Git). Both apps ship from `main`; the `OPERATOR_APP` var is the only difference.
6. [ ] **Do NOT deploy yet** — add the env vars first (Part 3), otherwise the first build will boot without secrets. (If it deploys automatically, that's fine; just redeploy after Part 3.)

---

## Part 3 — Set environment variables (operator project)

In the **operator** project → **Settings → Environment Variables**, add the following
with scope **Production** (and **Preview** too if you want preview deploys to work):

| Variable | Value | Notes |
|---|---|---|
| `OPERATOR_APP` | `1` | The kill switch. **Only** set on this project. |
| `OPERATOR_HOST` | `ops.samuelxanda.dev` | Host only — no `https://`, no path. |
| `OPERATOR_AUTH_SECRET` | *(generate, see below)* | **Must differ** from `AUTH_SECRET`. |
| `OPERATOR_ALLOWED_EMAILS` | `you@gmail.com` | Comma-separated. The whole operator allowlist. Use the Google account(s) from Part 1. |
| `GOOGLE_CLIENT_ID` | *(from Part 1)* | |
| `GOOGLE_CLIENT_SECRET` | *(from Part 1)* | |
| `DATABASE_URL` | *(copy from the tenant project)* | Same Neon pooled URL. |
| `DIRECT_URL` | *(copy from the tenant project)* | Same Neon direct URL. |
| `AUTH_SECRET` | *(any long random string; can copy the tenant's)* | The shared app code requires it to boot, even though operators don't use the tenant session. |
| `ROOT_DOMAIN` | `salonpro.me` | Not used by operator routes, but set it so the shared app is happy. |

Generate the operator secret locally and paste the output:
```bash
openssl rand -hex 32
```

> **Do NOT set `NODE_ENV`.** Vercel sets it to `production` automatically on production
> deploys — and the operator host check depends on that. Setting it yourself can break things.

To copy `DATABASE_URL` / `DIRECT_URL`: open the **tenant** project → Settings →
Environment Variables → reveal each value → paste the identical value here.

---

## Part 4 — Point `ops.samuelxanda.dev` at this project

1. [ ] Operator project → **Settings → Domains → Add** → enter `ops.samuelxanda.dev`.
2. [ ] Vercel shows a DNS record to create — usually:
   `CNAME   ops   →   cname.vercel-dns.com`
   (use the **exact** target Vercel displays).
3. [ ] Add that record where your DNS lives:
   - **Netlify DNS** (if your nameservers point to Netlify): Netlify → Domains → `samuelxanda.dev` → DNS records → Add record → type `CNAME`, name `ops`, value `cname.vercel-dns.com`.
   - **Registrar DNS**: add the same CNAME there.
4. [ ] ⚠️ **Do not** accept any Vercel prompt to switch the whole domain's **nameservers** to Vercel — that would pull the apex off Netlify. Only add the single CNAME for `ops`.
5. [ ] Wait for propagation (minutes up to ~1 hour). Vercel auto-issues the HTTPS cert
   (`.dev` is HTTPS-only — that's expected and handled automatically).
6. [ ] Vercel marks the domain **Valid Configuration** when it's ready.

---

## Part 5 — (Optional) Extra access protection

The console is already gated (Google SSO + email allowlist). For defense-in-depth you
*may* add Vercel's own gate in front:

- [ ] Operator project → **Settings → Deployment Protection → Vercel Authentication**.
  Note: protecting **Production** this way needs a paid Vercel plan and adds a second
  login (Vercel) before the Google one. Skip if that's friction you don't want — the
  app-level gate is sufficient for v1.

---

## Part 6 — Deploy

1. [ ] **Merge PR #31 → `main`** on GitHub.
2. [ ] This triggers a deploy on **both** Vercel projects from `main`:
   - Operator project builds with `OPERATOR_APP=1` → console live.
   - Tenant project rebuilds without it → operator routes stay 404 there.
3. [ ] Watch the operator project's deployment finish (green) in Vercel.

---

## Part 7 — Verify live

1. [ ] Open `https://ops.samuelxanda.dev/operator`.
2. [ ] You should be redirected to the sign-in page → **Sign in with Google** → land on the **tenant directory**.
3. [ ] Open a salon → check counts, **Reveal** owner contact, then **Suspend** with a typed reason.
4. [ ] In another browser, confirm that suspended salon's tenant app now blocks access
   and its public booking page reads as "not found". Then **Reactivate** it.
5. [ ] Back on the detail page, confirm the **Recent operator actions** list shows your
   SUSPEND / REACTIVATE / REVEAL_PII entries (the audit trail).
6. [ ] Sanity-check isolation: visit `https://salonpro.me/operator` (or any tenant
   subdomain + `/operator`) → it must **404**.

---

## Troubleshooting

- **`redirect_uri_mismatch` on Google sign-in** → the redirect URI in Google (Part 1)
  doesn't exactly match. It must be `https://ops.samuelxanda.dev/api/operator/auth/callback/google`.
- **Signed in with Google but bounced back to sign-in** → your email isn't in
  `OPERATOR_ALLOWED_EMAILS`, or the Google account's email isn't verified. Check the var
  (comma-separated, no spaces issues) and redeploy after editing env vars.
- **`/operator` 404s on the operator project** → `OPERATOR_APP` isn't `1` on that
  project, or the deploy predates the var. Re-check the value and redeploy.
- **App fails to boot / 500 on every route** → a required shared var is missing
  (`AUTH_SECRET`, `DATABASE_URL`, `DIRECT_URL`). Add it and redeploy.
- **Domain stuck "Invalid Configuration"** → the CNAME isn't visible yet (propagation),
  or it was added to the wrong DNS provider. Confirm where `samuelxanda.dev`'s
  nameservers actually point and add the record there.
- **Editing an env var didn't take effect** → Vercel env changes require a **redeploy**.

---

## Quick reference — env vars (operator project only)

```env
OPERATOR_APP=1
OPERATOR_HOST=ops.samuelxanda.dev
OPERATOR_AUTH_SECRET=<openssl rand -hex 32>     # MUST differ from AUTH_SECRET
OPERATOR_ALLOWED_EMAILS=you@gmail.com
GOOGLE_CLIENT_ID=<google oauth client id>
GOOGLE_CLIENT_SECRET=<google oauth client secret>
DATABASE_URL=<same as tenant project>
DIRECT_URL=<same as tenant project>
AUTH_SECRET=<any long random string; required for boot>
ROOT_DOMAIN=salonpro.me
```

Google OAuth redirect URIs:
```
https://ops.samuelxanda.dev/api/operator/auth/callback/google
http://localhost:3000/api/operator/auth/callback/google
```
