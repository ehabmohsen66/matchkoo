<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:matchkoo-context -->
# Matchkoo (Kickoff) — Project Context
# READ THIS FULLY BEFORE WRITING ANY CODE

## Project Identity
- **Name:** Matchkoo (codebase folder: `kickoff`)
- **Live URL:** https://kickoff-taupe.vercel.app
- **Stack:** Next.js 16, Prisma, PostgreSQL (Neon), Vercel
- **Football Data:** API-Football (`FOOTBALL_API_KEY` env var)
- **Repo:** `/Users/ihabmohamed/kickoff`

---

## 🔴 CRITICAL RULES — Never Break These

### 1. Only 5 Leagues Are Allowed (STRICT WHITELIST)
No other leagues. Ever. The user has explicitly confirmed this repeatedly.

| League | API ID |
|---|---|
| English Premier League | 39 |
| La Liga | 140 |
| UEFA Champions League | 2 |
| Egyptian Premier League | 233 |
| FIFA World Cup | 1 |

### 2. Tournament Naming (CANONICAL_NAMES map in sync-fixtures)
API-Football returns `"Premier League"` for BOTH English (39) AND Egyptian (233).
Always use the CANONICAL_NAMES map in `src/app/api/admin/sync-fixtures/route.ts`.
DB stores names as: `"Egyptian Premier League 2025 [233]"`
Never use raw `f.league.name` in sync logic.

### 3. Name Normalisation (strip year + [ID] suffix)
DB names include `[leagueId]` suffix. Frontend strips it before whitelist matching:
- Function `_normaliseTournamentName()` in `public/js/app.js`
- Inline regex in `public/js/backend_api.js`
- Pattern: `"Egyptian Premier League 2025 [233]"` → `"egyptian premier league"`

### 4. Stale Match Fix (auto-runs on every sync)
Every sync mode closes LIVE/UPCOMING matches with `matchDate < today`.
`sync-today` cron runs `fix-stale` FIRST, then syncs new fixtures.
Do not remove this — it prevents yesterday's games showing as LIVE.

### 5. Frontend is Static HTML/JS (NOT Next.js pages)
The dashboard at `/app` is a static HTML/JS app:
- `public/app.html` — shell
- `public/js/app.js` — all UI logic (~1900 lines)
- `public/js/backend_api.js` — hydrates static page with DB data
- `public/js/data.js` — static fallback data
- Next.js is only used for API routes under `src/app/api/`

---

## Key Files

| File | Purpose |
|---|---|
| `src/app/api/admin/sync-fixtures/route.ts` | Main sync engine — POST `{mode}` |
| `src/app/api/cron/sync-today/route.ts` | Daily cron: fix-stale → today sync |
| `src/app/api/cron/update-live/route.ts` | Every 2min: live scores + events |
| `src/app/api/cron/cleanup-leagues/route.ts` | Purge non-whitelisted data |
| `src/app/api/cron/purge-bad-tournaments/route.ts` | Remove legacy bad-named tournaments |
| `src/app/api/lineups/route.ts` | Fetch/cache lineup + events per match |
| `src/app/api/leaderboard/route.ts` | XP rankings (global/tournament/mini) |
| `public/js/app.js` | Contains: ACTIVE_LEAGUE_NAMES, _normaliseTournamentName, initLeaderboard, _loadLineup |
| `public/js/backend_api.js` | Contains: ACTIVE_EXACT, ACTIVE_LEAGUES, _hydrateData |
| `prisma/schema.prisma` | Match model has: `lineup Json?`, `events Json?` fields |
| `vercel.json` | Cron schedule |

## Cron Schedule
```
0 6 * * *    → /api/cron/sync-today   (daily 6am UTC)
*/2 * * * *  → /api/cron/update-live  (every 2 min)
```

## How Discover Page Works
1. `backend_api.js _hydrateData()` fetches `/api/tournaments` on load
2. Normalises name → matches against `ACTIVE_EXACT` array
3. Injects real DB tournament CUID into static league card
4. User clicks → `openLeagueFixtures(cuid, name)` → `/api/matches?tournamentId=<cuid>`
5. ACTIVE_EXACT names MUST match canonical names after normalisation

## How First Goalscorer / Lineup Works
- Match modal open → `_loadLineup(matchId)` → `/api/lineups?matchId=`
- Returns `{ lineup, events }` cached in `Match.lineup` + `Match.events` (Json fields)
- Lineup available ~1hr before kickoff; events update live every 30s in modal
- Subbed-off players strikethrough; substitutes shown in orange
- +300 XP for correct first goalscorer prediction

## How Leaderboard Works (Live Data)
- `/api/leaderboard` → global ranking by User.xp
- `?period=week|month|alltime`, `?myLeagues=true`, `?miniLeagues=true`
- `_xpToLevel(xp)` → Bronze/Silver/Gold(10k)/Platinum(20k)/Legend(50k)
- Podium selects top 3 by `.podium-card` class (NOT getElementById)

## Current DB Tournaments
- `Egyptian Premier League 2025 [233]`
- `English Premier League 2025 [39]`
- `La Liga 2025 [140]`

---

## Deployment Rules
1. Deploy: `npx vercel --prod`
2. Bump JS version in `app.html` when changing public JS files (`?v=2.5` → `?v=2.6`)
3. Schema changes: `npx prisma db push` (NOT `migrate dev`)
4. Always run `npx tsc --noEmit` before deploying

## Common Bugs to Avoid
- Using `f.league.name` directly → breaks Egyptian/English PL disambiguation
- Forgetting to normalise tournament name before whitelist check → Discover shows empty
- Adding leagues not in the 5-league whitelist → user will report clutter
- Using `getElementById('podium-1/2/3')` → those IDs don't exist, use `.querySelectorAll('.podium-card')`
- `migrate dev` in non-interactive env → use `db push` instead
<!-- END:matchkoo-context -->
