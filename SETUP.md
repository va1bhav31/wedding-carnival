# Wedding Carnival — Developer Setup

## Repo layout

```
wedding-carnival/
├── apps/
│   └── web/                 # Next.js 16 app (frontend + API). The real product.
│       ├── src/app/         # routes/pages
│       └── src/lib/supabase/# browser + server Supabase clients
├── supabase/
│   ├── migrations/          # versioned DB schema (run these in Supabase)
│   └── functions/           # (later) Edge Functions: scoring, realtime fan-out
├── packages/
│   └── shared/              # (later) shared TS types between web + functions
├── docs/                    # the static landing/demo site (served by GitHub Pages)
└── README.md
```

---

## One-time setup

### 1. Connect the app to Supabase
1. Supabase Dashboard → **Project Settings → API**.
2. Copy the **Project URL** and the **anon public** key.
3. In `apps/web/`, open **`.env.local`** and paste them:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key...
   ```
   > `.env.local` is gitignored — keys never get committed.

### 2. Create the database schema
Run each migration in order in **SQL Editor → New query → Run**:

| # | File | What it adds |
|---|------|--------------|
| 1 | `0001_init.sql` | `weddings` + `guests`, RLS, demo wedding seed |
| 2 | `0002_grants.sql` | Data API grants for weddings/guests |
| 3 | `0003_games_config.sql` | extends `weddings`; game catalog + content: `wedding_games`, `questions`, `photo_hunt_tasks`, `scratch_prizes`, `dares` |
| 4 | `0004_gameplay_and_garden.sql` | gameplay + Memory Garden: `question_responses`, `photo_submissions`, `scratch_results`, `game_scores`, `garden_flowers`, `garden_milestones` |

> Migrations are idempotent (safe to re-run). Each file adds its own GRANTs
> because "auto-expose new tables" is OFF — RLS policies alone won't make a
> table reachable by the Data API.

**Security notes baked into the schema:**
- `questions.correct_answer` is **not** granted to guests (column-level GRANT) — answer checking must run server-side (Edge Function + secret key). The client must select explicit columns, never `select *`.
- `garden_milestones` (hidden surprises) are **not** readable by guests — revealed server-side once the flower count is reached.
- `photo_submissions` shows only `approved` rows to guests; hosts moderate.

### 3. Run the app
```bash
cd apps/web
npm run dev
```
Open **http://localhost:3000** — you should see a green **“Connected to Supabase 🎉”** card showing the seeded wedding. If it's red, the keys or the migration are the issue.

---

## The demo site (GitHub Pages)
The static demo now lives in **`docs/`**. To keep it live after this move, update Pages once:

1. GitHub repo → **Settings → Pages**
2. **Source:** Deploy from a branch → **Branch:** `main` → **Folder:** `/docs`
3. Save. It redeploys at `https://va1bhav31.github.io/wedding-carnival/`.

After that, every `git push` updates both the demo (from `docs/`) and the codebase.

---

## What's next (backend build order)
1. **Guest join flow** — create a player profile (writes to `guests`).
2. **Game schema** — `games`, `questions`, `answers`, `responses` tables.
3. **Scoring** — points on correct/fast answers (Edge Function or Postgres function).
4. **Leaderboard** — read rankings (later: Upstash Redis sorted sets for live speed).
5. **Realtime** — live vote tallies, leaderboard, guest wall via Supabase Realtime.
6. **Admin panel** — branding, questions, lucky draw controls.
