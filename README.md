# Fika Friday

Weekly office fika-guessing game. Every Friday at 08:00 Europe/Stockholm time a
guessing window opens; players pick a fika category and describe what they
think it is. An admin later reveals the answer and grades guesses, feeding a
running leaderboard.

## Stack

- **Backend:** Fastify (plain JS/ESM), `mysql2` (no ORM), Google ID token auth
  via `google-auth-library`, JWT session cookie.
- **Frontend:** React + Vite (JS), Tailwind CSS, hand-added shadcn-style UI
  components, React Router.
- **Database:** MySQL 8, schema in [`sql/schema.sql`](sql/schema.sql).

## Setup

1. Create the database and load the schema:

   ```
   mysql -h <host> -u <user> -p <database> < sql/schema.sql
   ```

2. Copy env files and fill them in:

   ```
   cp .env.example .env
   cp web/.env.example web/.env
   ```

   - `.env` (repo root, read by the server): DB connection, `GOOGLE_CLIENT_ID`,
     `GOOGLE_ALLOWED_DOMAIN` (set to your Workspace domain, e.g. `telavox.com`),
     `JWT_SECRET`, `ADMIN_EMAILS` (comma-separated — these accounts get the
     `admin` role automatically on login).
   - `web/.env`: `VITE_API_URL` and `VITE_GOOGLE_CLIENT_ID` (same OAuth client
     ID as the server, "Web application" type in Google Cloud Console, with
     your frontend origin as an authorized JavaScript origin).

3. Install dependencies (npm workspaces):

   ```
   npm install
   ```

4. Run both apps in dev:

   ```
   npm run dev:server   # http://localhost:3001
   npm run dev:web      # http://localhost:5173
   ```

## How it works

- The current week's fika event (and its 08:00–close Stockholm guessing
  window) is created lazily the first time it's requested — no cron job
  needed. Window length is `FIKA_GUESS_WINDOW_MINUTES` (default 120).
- Players submit one guess per event: a category (cookie, bread/doughy, cake,
  pastry, fruit, candy, other — editable in `fika_categories`) plus free-text
  description. Guesses can be updated until the window closes.
- The admin reveals the real answer on `/admin`. Category correctness is
  graded automatically (exact match); description correctness is graded
  manually per guess since it's free text. Points are configurable per event
  (`points_category`, `points_description`) and recompute live as guesses are
  graded.
- `/api/leaderboard` reads from the `leaderboard` SQL view, which sums
  `points_awarded` per user.

## Docker

A single image builds the frontend and serves it, plus the API, from one
Fastify process on one port (`1167`):

```
docker build -t fika-friday .
docker run --env-file .env -e PORT=1167 -p 1167:1167 fika-friday
```

The `.env` file needs the same variables as local dev (DB connection,
`GOOGLE_CLIENT_ID`, `GOOGLE_ALLOWED_DOMAIN`, `JWT_SECRET`, `ADMIN_EMAILS`) —
`CORS_ORIGIN` and `web/.env` don't matter here since the frontend is served
same-origin. The `-e PORT=1167` makes sure the app listens on the port
that's actually published even if `.env` sets a different one for local dev.

