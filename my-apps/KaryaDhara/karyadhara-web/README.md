# Karyadhara (web)

*कार्यधारा — a steady stream of work.* A calm daily to-do list with topics, sub-topics and date-wise history.

Multi-user web app. Each person creates their own account
(email + password, hashed with bcrypt), and their to-do list and history are
completely isolated from every other account — the server only ever queries
a user's own row, identified by a signed, httpOnly session cookie.

## How privacy is enforced

- **Passwords**: never stored in plain text — only a bcrypt hash (12 rounds).
  Nobody with database access, including you, can recover the original password.
- **Per-user isolation**: every row in `user_data` is keyed by `user_id`. Every
  API route (`/api/data`, `/api/export`, …) requires a verified session and only
  ever reads/writes `req.userId`'s own row — there is no endpoint that can return
  another user's data.
- **Session cookie**: httpOnly (invisible to page JavaScript, so it can't be stolen
  via a script-injection bug), `secure` in production (HTTPS only), signed with
  `SESSION_SECRET`.
- **Secrets never in the repo**: `DATABASE_URL` and `SESSION_SECRET` are injected
  by Render as environment variables (see `render.yaml`) — the GitHub repo can be
  public without exposing either.
- **Backups**: Render's managed Postgres takes automatic daily backups. Each user
  can also download their *own* history as a JSON file at any time via the 💾 button.

## Deploy to Render (recommended path)

1. Push this folder to a GitHub repository (public or private — secrets aren't in it).
2. In the Render dashboard: **New → Blueprint**, point it at your repo. Render reads
   `render.yaml` and provisions both the web service and the managed Postgres database
   automatically, generating `SESSION_SECRET` for you.
3. Wait for the first deploy to finish, then open the service's `.onrender.com` URL.
4. Share that URL — anyone who visits can create their own account and will only
   ever see their own to-dos.

## Run locally (optional, for development)

Requires Node.js 18+ and a local Postgres instance.

    cp .env.example .env     # then edit .env with your local Postgres URL and a random secret
    npm install
    npm start

Then open http://localhost:3000.

## Sign-up and sign-in (email only, for now)

Accounts are created with an email address + a password. After "Create account", a 6-digit
code is emailed to that address (via your SMTP settings) and the account only becomes usable
once that code is confirmed — there's no logged-in-but-unverified state. After that, signing
back in works either with the password or with a fresh emailed code ("Log in with Email Code").

Mobile-number sign-up (OTP by SMS) is built but switched off for now — see
`MOBILE_SIGNUP_ENABLED` in `lib/identifier.js`. It uses the free, open-source
[SMS Gateway for Android](https://github.com/capcom6/android-sms-gateway) project instead of a
paid vendor like Twilio (a spare Android phone with its own SIM sends the texts). The
`SMS_GATEWAY_*` variables in `.env.example` are ready for whenever it's turned back on; until
then they're unused and every identifier must be an email address.

## Project layout

- `server.js` — Express app: security headers, routing, static frontend
- `db.js` — Postgres connection + schema setup
- `auth.js` — session cookie signing/verification (the one place that decides "who is this request")
- `routes/auth-routes.js` — register / login / logout / me
- `routes/data-routes.js` — get/save today's list + history, per-user export
- `public/index.html` — the entire frontend (sign-in screen + the to-do app), talking to the API
- `public/manifest.webmanifest`, `icon*.png`, `icon.svg` — makes the site installable ("Add to Home Screen") on phones, tablets and desktops

## Responsive design

One page adapts to every screen — no separate mobile site:

| Screen | Layout |
| --- | --- |
| Phones (≥ 320 px) | Single column, brand + progress card + labelled action bar, large touch targets, always-visible delete buttons, full-screen history sheet |
| Tablets | Header with icon toolbar, two-column topic grid, centred history dialog |
| Laptops / desktops (≥ 900 px) | Sticky sidebar (progress ring, actions, account) + topic grid that grows to 2–3 columns on wide monitors |

Also: light/dark theme (follows the system, toggle remembered per browser), safe-area support for notched phones,
keyboard accessible, and honours "reduce motion".

## Upgrading from DailyDeck Web

- Existing accounts, passwords and data are untouched — the database schema did not change.
- Existing signed-in sessions keep working (the old `dailydeck_token` cookie is still accepted, then replaced).
- `render.yaml` renames the **web service** to `karyadhara`. The **database name is intentionally still `dailydeck-db`**:
  renaming a Render database creates a new, empty one. If you already deployed the old blueprint, either keep the
  old service name in `render.yaml` or accept that Render will create a second service (with a new URL) pointing at the same database.
