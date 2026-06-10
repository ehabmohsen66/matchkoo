# Matchkoo — Complete Project Documentation

> **Live URL:** https://kickoff-taupe.vercel.app  
> **Codebase folder:** `matchkoo` (internal package name: `kickoff`)  
> **Last updated:** 2026-06-09 (21:30 EET — 50 commits since last update)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [Directory Structure](#4-directory-structure)
5. [Database Schema](#5-database-schema)
6. [Authentication](#6-authentication)
7. [API Routes Reference](#7-api-routes-reference)
8. [Frontend (Static App)](#8-frontend-static-app)
9. [Cron Jobs & Automation](#9-cron-jobs--automation)
10. [Football Data Integration](#10-football-data-integration)
11. [XP & Gamification System](#11-xp--gamification-system)
12. [Weekly Challenges](#12-weekly-challenges)
13. [Leagues Whitelist](#13-leagues-whitelist)
14. [Internationalisation (i18n)](#14-internationalisation-i18n)
15. [Deployment](#15-deployment)
16. [Environment Variables](#16-environment-variables)
17. [Common Bugs & Gotchas](#17-common-bugs--gotchas)
18. [Git History Summary](#18-git-history-summary)
20. [Changelog — 2026-06-08 (Evening) & 2026-06-09](#20-changelog--2026-06-08-evening--2026-06-09)

---

## 1. Project Overview

**Matchkoo** is a football prediction web app where users earn XP points by predicting match outcomes. The platform supports:

- Match scoreline predictions with confidence levels
- First Goalscorer predictions
- Both Teams to Score (BTTS) and Total Goals side-bets
- Weekly Challenges for bonus XP
- Daily Spin for extra rewards
- Club Vote system (vote for your favourite club, earn XP)
- Global, Tournament, and Mini-League leaderboards
- Live match scores, lineups, and commentary
- Referral system
- Multi-language support (EN, AR, DE, ES, FR)
- Admin panel for managing tournaments, syncing fixtures, and updating results

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16.2.4 (App Router) |
| **Language** | TypeScript 5 |
| **Database** | PostgreSQL (Neon / Vercel Postgres) |
| **ORM** | Prisma 6.4.1 |
| **Auth** | NextAuth v4 (JWT strategy, Credentials provider) |
| **Styling** | Tailwind CSS v4 |
| **Animations** | Framer Motion 12 |
| **Email** | Resend + @react-email/components |
| **Password Hashing** | bcryptjs |
| **Football Data** | API-Football v3 (api-sports.io) |
| **Hosting** | Vercel (with Vercel Cron) |
| **Static App JS** | Vanilla JS (no framework) |

---

## 3. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                      Browser                             │
│  ┌──────────────────┐   ┌───────────────────────────┐   │
│  │  Next.js pages   │   │  Static App (/app.html)   │   │
│  │  (auth flow,     │   │  Vanilla JS SPA with       │   │
│  │  landing page)   │   │  app.js + backend_api.js   │   │
│  └────────┬─────────┘   └─────────────┬─────────────┘   │
└───────────┼─────────────────────────── ┼───────────────── ┘
            │  NextAuth sessions (JWT)   │  REST API calls
            ▼                            ▼
┌──────────────────────────────────────────────────────────┐
│             Next.js API Routes  (src/app/api/)           │
│  auth · predictions · matches · leaderboard · clubs      │
│  challenges · daily-spin · mini-leagues · cron · admin   │
└──────────────────────┬───────────────────────────────────┘
                       │  Prisma Client
                       ▼
┌──────────────────────────────────────────────────────────┐
│             PostgreSQL (Neon / Vercel Postgres)           │
└──────────────────────────────────────────────────────────┘
                       ▲
┌──────────────────────┴───────────────────────────────────┐
│               API-Football v3 (external)                  │
│  Fixtures · Live Scores · Lineups · Events · News         │
└──────────────────────────────────────────────────────────┘
```

**Key architectural decision:** The main user dashboard (`/app`) is a **static HTML/JS single-page app** (`public/app.html` + `public/js/app.js`). Next.js is used exclusively for:
- API routes (`src/app/api/`)
- Auth pages (login, register, forgot-password, verify-email, reset-password)
- The landing page (`src/app/page.tsx`)
- Admin dashboard (`src/app/admin/`)

---

## 4. Directory Structure

```
matchkoo/
├── prisma/
│   └── schema.prisma           # Database schema (all models)
├── public/
│   ├── app.html                # Main static SPA shell (~72 KB)
│   ├── js/
│   │   ├── app.js              # Core SPA logic (~227 KB, ~1900 lines)
│   │   ├── backend_api.js      # Hydrates page from DB/API
│   │   ├── data.js             # Static fallback/seed data
│   │   ├── i18n.js             # Internationalisation strings
│   │   ├── motion.js           # Animation helpers
│   │   └── teams_db.js         # Local teams database
│   ├── css/                    # Stylesheets
│   └── images/                 # Team logos, assets
├── src/
│   ├── app/
│   │   ├── api/                # All Next.js API routes (45 route files)
│   │   │   ├── admin/          # Admin-only endpoints
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── challenges/     # Weekly challenges
│   │   │   ├── clubs/          # Club vote, leaderboard, logos
│   │   │   ├── cron/           # Scheduled job endpoints
│   │   │   ├── daily-spin/     # Daily spin wheel
│   │   │   ├── friends/        # Follow/unfollow system
│   │   │   ├── leaderboard/    # Global & mini-league rankings
│   │   │   ├── lineups/        # Match lineup + events cache
│   │   │   ├── live-events/    # Live match event stream
│   │   │   ├── matches/        # Match listing, live, chat, pulse
│   │   │   ├── mini-leagues/   # Mini-league CRUD
│   │   │   ├── predictions/    # Predictions CRUD + stats
│   │   │   ├── referrals/      # Referral tracking
│   │   │   ├── team-reminder/  # Team match reminders
│   │   │   ├── tournaments/    # Tournament listing & registration
│   │   │   └── user/           # User preferences
│   │   ├── admin/              # Admin Next.js page
│   │   ├── dashboard/          # Dashboard Next.js page
│   │   ├── login/              # Login page
│   │   ├── register/           # Registration page
│   │   ├── leaderboard/        # Leaderboard page
│   │   ├── predictions/        # My Predictions page
│   │   ├── tournaments/        # Tournaments page
│   │   ├── forgot-password/    # Forgot password flow
│   │   ├── reset-password/     # Reset password flow
│   │   ├── verify-email/       # Email verification
│   │   ├── ar/                 # Arabic locale routing
│   │   ├── globals.css         # Global styles
│   │   ├── landing.css         # Landing page styles
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page (~41 KB)
│   ├── components/
│   │   ├── AuthProvider.tsx    # Session provider wrapper
│   │   ├── MatchkooLogo.tsx    # Logo component
│   │   ├── Navbar.tsx          # Navigation bar
│   │   └── ScrollReveal.tsx    # Scroll animation component
│   ├── emails/                 # React Email templates
│   └── lib/
│       ├── auth.ts             # NextAuth configuration
│       ├── email.ts            # Email sending via Resend
│       ├── football-api.ts     # API-Football client
│       └── prisma.ts           # Prisma client singleton
├── types/                      # TypeScript type declarations
├── next.config.ts              # Next.js config (rewrites for /app → app.html)
├── vercel.json                 # Vercel deployment + cron config
├── package.json
├── tsconfig.json
└── AGENTS.md                   # AI agent context rules
```

---

## 5. Database Schema

All models are defined in [`prisma/schema.prisma`](prisma/schema.prisma). Database: **PostgreSQL** (Neon).

### Core Models

#### `User`
The central model. Stores auth credentials, XP, stats, and social links.

| Field | Type | Description |
|---|---|---|
| `id` | String (cuid) | Primary key |
| `name` | String? | Display name |
| `email` | String (unique) | Login email |
| `emailVerified` | DateTime? | Set when email confirmed |
| `password` | String? | bcrypt hash |
| `role` | String | `USER` or `ADMIN` |
| `gender` | String? | `male` / `female` |
| `country` | String? | Default 'EG', captured from IP |
| `dateOfBirth` | DateTime? | Optional DOB |
| `xp` | Int | Total XP points |
| `streak` | Int | Current prediction streak |
| `bestStreak` | Int | All-time best streak |
| `predictionCount` | Int | Total predictions made |
| `correctCount` | Int | Total correct outcomes |
| `preferredLeagues` | String[] | Leagues chosen at registration |
| `referredById` | String? | FK to the user who referred them |
| `verificationToken` | String? | Email verification token |
| `resetPasswordToken` | String? | Password reset token |

#### `Match`
Represents a football fixture.

| Field | Type | Description |
|---|---|---|
| `externalId` | String? (unique) | API-Football fixture ID (e.g. `apif-123456`) |
| `homeTeam` / `awayTeam` | String | Team names |
| `homeLogo` / `awayLogo` | String? | Logo URLs |
| `matchDate` | DateTime | Kick-off time |
| `round` | String | Round label (e.g. `Round 34`) |
| `season` | String? | API-Football season year (e.g. `2025`) |
| `status` | String | `UPCOMING` / `LIVE` / `COMPLETED` |
| `homeScore` / `awayScore` | Int? | Actual full-time result |
| `firstGoalScorer` | String? | Actual first goalscorer name |
| `lineup` | Json? | Cached lineup from API-Football |
| `events` | Json? | Cached live events (goals, cards, subs) |

#### `Prediction`
One prediction per user per match.

| Field | Type | Description |
|---|---|---|
| `homeScore` / `awayScore` | Int | Predicted scoreline |
| `firstGoalScorer` | String? | Predicted goalscorer |
| `confidence` | Int | 50–100% confidence slider |
| `isDouble` | Boolean | Double XP joker (one every 7 days) |
| `isShield` | Boolean | Scoreline shield marker (one every 7 days) |
| `btts` | Boolean? | Both teams to score prediction |
| `totalGoals` | Int? | Predicted total goals |
| `xpEarned` | Int? | XP awarded after match (null = pending) |
| `status` | String? | `pending` / `correct` / `wrong` |

#### `Tournament`
A competition container grouping matches.

| Field | Type | Description |
|---|---|---|
| `name` | String | Canonical name (e.g. `English Premier League 2025 [39]`) |
| `game` | String | Game type |
| `type` | String | `League` or `Cup` |
| `status` | String | `UPCOMING` / `ONGOING` / `COMPLETED` |
| `registrationMode` | String | `OPEN` or `INVITE_ONLY` |
| `competition` | String? | Competition key for mini-leagues |
| `scoringMode` | String? | `global` or `simple` |
| `season` | String? | API-Football season year (e.g. `2025`) |

#### Other Models

| Model | Purpose |
|---|---|
| `MiniLeague` | Private leagues users create with a unique code |
| `MiniLeagueMember` | Many-to-many: users ↔ mini leagues |
| `Registration` | User registration in a Tournament |
| `ClubVote` | Daily club votes (one vote per club per day) |
| `DailySpin` | Daily spin wheel results (one per day) |
| `ChallengeReward` | Tracks which weekly challenges earned XP |
| `Referral` | Tracks referral links and XP award status |
| `TeamReminderSnooze` | Suppresses match reminders for a club |
| `Friendship` | Follower/following social graph |
| `ClubRequest` | User requests to add a missing club |
| `MatchChat` | Match-level live chat messages (280 chars max) |
| `DemonUsage` | Tracks who cast The Demon penalty in a mini-league |
| `Account` / `Session` / `VerificationToken` | NextAuth adapter tables |

---

## 6. Authentication

**Provider:** NextAuth v4 with `CredentialsProvider` (email + bcrypt password).  
**Session strategy:** JWT (stateless).

### Auth Flow

```
Register → Email Verification → Login → JWT issued
                                         ↓
                                 /app (static SPA)
```

1. **Registration** (`POST /api/auth/register`): Creates user, sends verification email via Resend.
2. **Email Verification** (`GET /api/auth/verify-email?token=...`): Sets `emailVerified` timestamp.
3. **Login** (`POST /api/auth/[...nextauth]`): Checks email verified before issuing JWT.
4. **Forgot Password** (`POST /api/auth/forgot-password`): Sends reset link.
5. **Reset Password** (`POST /api/auth/reset-password`): Validates token expiry, hashes new password.
6. **Resend Verification** (`POST /api/auth/resend-verification`): Resends the verification email.

### JWT Payload

The JWT token includes: `id`, `role`, `xp`, `streak`, `predictionCount`, `gender`.  
XP is **refreshed from DB on every token refresh** so it stays current without re-login.

### Pages

| Route | Component |
|---|---|
| `/login` | Login form |
| `/register` | Registration form (name, email, password, gender, DOB, league preferences) |
| `/forgot-password` | Email input to trigger reset |
| `/reset-password` | New password form (token via query param) |
| `/verify-email` | Auto-verifies on page load |

---

## 7. API Routes Reference

All routes are under `src/app/api/`. Total: **47 route files**.

### Auth

| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user. Captures country flag from Vercel geo IP header and assigns gender-based avatar. |
| POST | `/api/auth/[...nextauth]` | NextAuth handler (login, session, signout) |
| GET | `/api/auth/verify-email` | Verify email via token |
| POST | `/api/auth/forgot-password` | Send password reset email |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/resend-verification` | Resend verification email |

### Predictions

| Method | Route | Description |
|---|---|---|
| GET | `/api/predictions` | Get user's predictions (filter: `upcoming`/`past`) |
| POST | `/api/predictions` | Create or update a prediction (locked once match starts). Enforces a 7-day cooldown on Joker and Shield boosts. Supports boost-only updates. |
| GET | `/api/predictions/stats` | Prediction statistics for a match |

### Matches

| Method | Route | Description |
|---|---|---|
| GET | `/api/matches` | List matches (by tournament, status, date) |
| GET | `/api/matches/live` | Live matches only |
| GET | `/api/matches/chat` | Get match chat messages |
| POST | `/api/matches/chat` | Post a chat message |
| GET | `/api/matches/pulse` | Live Pulse stats ("Who Will Win?") |
| GET | `/api/matches/commentary` | AI-generated match commentary |

### Leaderboard

| Method | Route | Description |
|---|---|---|
| GET | `/api/leaderboard` | Global/tournament/mini-league rankings (includes `country` code) |
| GET | `/api/leaderboard/my-rank` | Current user's rank + `xpToday` (XP earned from settled predictions today, UTC) |

**Query params for `/api/leaderboard`:**
- `period`: `week` / `month` / `alltime` (**default is `alltime`** as of 2026-06-08)
- `tournamentId`: filter to a specific tournament
- `myLeagues=true`: user's registered tournament ranks
- `miniLeagues=true`: user's mini-league ranks

**`/api/leaderboard/my-rank` response shape:**
```json
{ "rank": 42, "totalUsers": 1500, "xp": 8450, "xpToday": 120 }
```
`xpToday` is the sum of `xpEarned` from predictions whose `updatedAt` falls within the current UTC day.

### Clubs

| Method | Route | Description |
|---|---|---|
| POST | `/api/clubs/vote` | Vote for a club (+20 XP) |
| GET | `/api/clubs/leaderboard` | Top voted clubs (monthly) |
| GET | `/api/clubs/logos` | Fetch club logo URLs |
| POST | `/api/clubs/request` | Request a missing club to be added |

### Tournaments

| Method | Route | Description |
|---|---|---|
| GET | `/api/tournaments` | List all tournaments |
| POST | `/api/tournaments/[id]/register` | Register for an OPEN tournament (or INVITE_ONLY with code). Auto-joins user. |
| DELETE | `/api/tournaments/[id]/register` | Unregister / leave an OPEN tournament |

### Mini-Leagues

| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/mini-leagues` | List/create mini leagues |
| GET/PUT/DELETE | `/api/mini-leagues/[id]` | Get/update/delete a mini league — returns rankings, fixtures, and live matches. Rankings aggregate and subtract Demon Usage penalties. |

> **Bug fix (2026-06-08):** The per-mini-league XP ranking previously used a raw DB `name IN (...)` query which failed to match canonical names like `"UEFA Champions League 2025 [2]"`. Rankings now use `normaliseName()` filtering in-memory after fetching all tournament matches, ensuring XP totals from completed matches are counted correctly.

### Admin

| Method | Route | Description |
|---|---|---|
| POST | `/api/admin/sync-fixtures` | Sync fixtures from API-Football |
| GET/PATCH | `/api/admin/matches/[id]` | Get/update match results |
| GET | `/api/admin/users` | List all users |
| GET/PATCH/DELETE | `/api/admin/tournaments/[id]` | Manage tournaments |
| GET | `/api/admin/sa-logos` | Saudi Pro League logo utility |

### Other

| Method | Route | Description |
|---|---|---|
| GET | `/api/lineups` | Fetch/cache lineup + events for a match |
| GET | `/api/live-events` | Live event stream for a match |
| GET | `/api/challenges` | Weekly challenges + award XP if completed |
| POST | `/api/daily-spin` | Spin the wheel (once per day) |
| GET/POST | `/api/friends` | Follow/unfollow users |
| GET | `/api/referrals` | Referral info |
| POST | `/api/team-reminder/snooze` | Snooze match reminders |
| POST | `/api/user/preferences` | Update user preferences |
| GET | `/api/football-news` | Latest football news |
| POST | `/api/signout` | Sign out handler |

### Boosts

| Method | Route | Description |
|---|---|---|
| POST | `/api/boosts/demon` | Cast The Demon penalty on a rival in a mini-league (-500 XP penalty) |

### Cron (Automated)

| Route | Trigger | Description |
|---|---|---|
| `/api/cron/sync-today` | 3am, 6am, 9am UTC | Fix stale matches + sync today's fixtures |
| `/api/cron/update-live` | Every 2 min | Update live scores + match events |
| `/api/cron/re-engagement` | 2pm UTC daily | Send re-engagement emails |
| `/api/cron/team-reminders` | 10am UTC daily | Send team match reminder emails |
| `/api/cron/sync-fixtures` | Manual | General fixture sync |
| `/api/cron/cleanup-leagues` | Manual | Purge non-whitelisted tournament data |
| `/api/cron/purge-bad-tournaments` | Manual | Remove legacy malformed tournaments |

---

## 8. Frontend (Static App)

The main user-facing app is served at `/app` and is a **static HTML + Vanilla JS SPA**.

### Key Files

| File | Size | Purpose |
|---|---|---|
| `public/app.html` | ~72 KB | HTML shell with all section templates |
| `public/js/app.js` | ~227 KB | Core app logic, UI rendering, state |
| `public/js/backend_api.js` | ~21 KB | Fetches DB data, hydrates static page |
| `public/js/data.js` | ~13 KB | Static fallback/seed data |
| `public/js/i18n.js` | ~22 KB | Translation strings (EN, AR, DE, ES, FR) |
| `public/js/motion.js` | ~5 KB | Animation helpers |
| `public/js/teams_db.js` | ~5 KB | Local team name/logo database |

### Key JS Functions (in `app.js`)

| Function | Description |
|---|---|
| `_normaliseTournamentName()` | Strips year + `[ID]` suffix from DB tournament name |
| `initLeaderboard()` | Initialises global/mini-league leaderboard UI |
| `_loadLineup(matchId)` | Fetches lineup & events, renders prediction popup |
| `_loadLivePulse()` | Fetches "Who Will Win?" stats widget |
| `openLeagueFixtures(cuid, name)` | Opens fixtures for a specific tournament |
| `_xpToLevel(xp)` | Maps XP to badge level (Bronze → Legend) |
| `openLeagueDetailPage(tournamentId, name)` | **[NEW 2026-06-08]** Navigates to the full league detail page (`#page-league-detail`) showing podium + rankings + upcoming fixtures |
| `openMiniLeagueDetail(id)` | **[REDESIGNED 2026-06-08]** Navigates directly to mini-league detail from leaderboard — renders two-column layout (podium ranking + fixtures grid) |
| `openJokerModal()` / `openShieldModal()` | **[NEW 2026-06-09]** Opens modal to select an upcoming prediction and apply a Joker (2x XP) or Shield boost |
| `openDemonModal()` / `castDemon()` | **[NEW 2026-06-09]** Opens mini-league victim selector and posts The Demon cast to deduct 500 XP |
| `_showBoostConfirmModal()` | **[NEW 2026-06-09]** Renders custom styled confirmation dialog for boosts |

### Key HTML Pages/Panels (in `app.html`)

| Element ID | Description |
|---|---|
| `#page-leaderboard` | Main leaderboard page |
| `#page-league-detail` | **[NEW 2026-06-08]** Full-page league detail: header, podium, rank rows, upcoming fixtures |
| `#page-minileague` | Mini-leagues listing page |
| `#mini-league-detail-panel` | Inline mini-league detail panel (within `#page-minileague`) |
| `#yrb-today-xp` | **[NEW 2026-06-08]** Span in "Your Rank" banner that shows real-time daily XP gain/loss |
| `#boost-modal-overlay` | **[NEW 2026-06-09]** Modal sheet for selecting matches/rivals to apply boosts |

### Key JS Functions (in `backend_api.js`)

| Function | Description |
|---|---|
| `_hydrateData()` | Main data hydration: fetches `/api/tournaments`, injects CUIDs into cards |
| `LEAGUE_META` | **[NEW 2026-06-09]** Comprehensive map of API-Football league IDs to emojis, clean names, logos, colors |
| `_loadUserRank()` | **[UPDATED 2026-06-08]** Fetches `/api/leaderboard/my-rank` and now also reads `xpToday` to render the daily XP insight |
| `toggleLeagueFollow(name, action, tournamentId)` | **[UPDATED 2026-06-09]** Updates preferredLeagues preferences and registers/unregisters user in database |

### Routing

Next.js rewrites map `/app` and `/:lang/app` to `app.html`:

```typescript
{ source: "/app", destination: "/app.html" }
{ source: "/en/app", destination: "/app.html" }
{ source: "/ar/app", destination: "/app.html" }
// ... de, es, fr
```

### Versioning

Bump the version query string in `app.html` when changing files (e.g. `?v=6.8` or timestamp):
```html
<script src="/js/backend_api.js?v=6.8"></script>
```

---

## 9. Cron Jobs & Automation

Cron schedules are defined in [`vercel.json`](vercel.json):

```json
{ "path": "/api/cron/sync-today",  "schedule": "0 3 * * *"  },
{ "path": "/api/cron/sync-today",  "schedule": "0 6 * * *"  },
{ "path": "/api/cron/sync-today",  "schedule": "0 9 * * *"  },
{ "path": "/api/cron/update-live", "schedule": "*/2 * * * *" },
{ "path": "/api/cron/re-engagement",   "schedule": "0 14 * * *" },
{ "path": "/api/cron/team-reminders",  "schedule": "0 10 * * *" }
```

### `sync-today` flow:
1. **Fix stale matches** — Any `LIVE` or `UPCOMING` match with `matchDate < today` is auto-closed as `COMPLETED`.
2. **Sync today's fixtures** — Fetches today's fixtures from API-Football for all whitelisted leagues and upserts into DB.

### `update-live` flow:
1. Fetches all currently `LIVE` matches from DB.
2. Calls API-Football for latest scores and events.
3. Updates `homeScore`, `awayScore`, `events`, and `lineup` fields.
4. If match is now finished, marks as `COMPLETED` and triggers XP scoring.

---

## 10. Football Data Integration

**Provider:** [API-Football v3](https://www.api-football.com/documentation-v3)  
**Base URL:** `https://v3.football.api-sports.io`  
**Auth:** `x-apisports-key` header (from `FOOTBALL_API_KEY` env var)  
**Timezone:** All fetches use `Africa/Cairo`

### Key Functions (`src/lib/football-api.ts`)

| Function | Description |
|---|---|
| `getFixturesByDate(from, to, leagueId?, season?)` | Fetch fixtures in a date range |
| `getFixturesByLeague(leagueId, season?, daysAhead?)` | Fetch upcoming fixtures for a league |
| `getUpcomingFixtures(daysAhead?)` | Fetch all leagues, next N days |
| `toMatchStatus(short)` | Maps API status codes to `UPCOMING`/`LIVE`/`COMPLETED` |

### Status Mapping

| API Codes | Matchkoo Status |
|---|---|
| `NS`, `TBD`, `PST` | `UPCOMING` |
| `1H`, `HT`, `2H`, `ET`, `BT`, `P`, `SUSP`, `INT`, `LIVE` | `LIVE` |
| `FT`, `AET`, `PEN`, `ABD`, `AWD`, `WO` | `COMPLETED` |

### Season Auto-Detection
- January–July → previous year's season
- August–December → current year's season

### Tournament Naming (CRITICAL)
API-Football returns `"Premier League"` for **both** English (ID: 39) and Egyptian (ID: 233) leagues. The sync engine uses a `CANONICAL_NAMES` map:

```
"Egyptian Premier League 2025 [233]"
"English Premier League 2025 [39]"
"La Liga 2025 [140]"
```

**Never use `f.league.name` directly** — always go through the canonical map.

---

## 11. XP & Gamification System

### XP Rewards

| Achievement | XP |
|---|---|
| Correct match outcome (win/draw/loss) | +10 XP |
| Exact correct scoreline | +30 XP |
| Correct first goalscorer | +150 XP (Wrong pick = -100 XP) |
| Both Teams to Score correct | +75 XP |
| Total Goals correct | +75 XP |
| The Joker (double XP boost, 7-day cooldown) | 2× base XP |
| Scoreline Shield (exact score protection, 7-day cooldown) | Exact score XP if outcome is correct |
| The Demon penalty (1x per mini-league) | -500 XP to target user |
| Club Vote | +20 XP per vote |
| Referral bonus | Variable |
| Daily Spin | Variable |
| Weekly Challenge – Scoreline Sniper | +750 XP |
| Weekly Challenge – Confidence King | +500 XP |
| Weekly Challenge – Crystal Baller | +600 XP |

### XP Levels

| Level | XP Required |
|---|---|
| 🥉 Bronze | 0–2,999 |
| 🥈 Silver | 3,000–9,999 |
| 🥇 Gold | 10,000–19,999 |
| 💎 Platinum | 20,000–49,999 |
| 🏆 Legend | 50,000+ |

### Prediction Locking
Predictions are locked the moment a match leaves `UPCOMING` status. The `POST /api/predictions` endpoint returns HTTP 400 if the match has started.

### Boosts & Penalties

#### The Joker
Doubles the XP earned for a single match. Limited to **one use every 7 days** globally.

#### Scoreline Shield
Protects the prediction from a near-miss. If you predict the correct outcome (win/draw/loss) but miss the exact scoreline, it still awards you the **exact scoreline bonus (+30 XP)**. Limited to **one use every 7 days**.

#### The Demon
A penalty cast in private mini-leagues. A user can choose a rival in a mini-league and cast The Demon to deduct **500 XP** from their ranking. Limited to **one use per mini-league**.

#### First Goalscorer Penalty
Predicting the first goalscorer carries a risk-vs-reward penalty. An incorrect prediction results in a flat **-100 XP** penalty.

---

## 12. Weekly Challenges

Challenges reset every **Monday at 00:00 local time**. Progress is tracked in real-time via `/api/challenges`. Rewards are issued once per week via the `ChallengeReward` model (prevents double-awarding).

| Challenge | Goal | XP Reward |
|---|---|---|
| 🎯 **Scoreline Sniper** | 3 exact correct scorelines this week | +750 XP |
| 👑 **Confidence King** | 5 correct outcomes with 100% confidence | +500 XP |
| 🔮 **Crystal Baller** | Correct first goalscorer in 3 matches | +600 XP |

---

## 13. Dynamic Leagues List

The hardcoded 5-league whitelist has been replaced by a **fully dynamic seasonal league management system**. Leagues are mapped by their API-Football IDs via the `LEAGUE_META` structure in `backend_api.js` and stored dynamically in the database.

### Core Active Leagues

| League | API-Football ID | Continent |
|---|---|---|
| English Premier League | 39 | Europe |
| La Liga | 140 | Europe |
| UEFA Champions League | 2 | Europe |
| Egyptian Premier League | 233 | Africa |
| FIFA World Cup | 1 | World |

Other regional and cup competitions (e.g. Saudi Pro League, CAF Champions League, MLS) are supported and displayed dynamically as "Ongoing", "Completed", or "Coming Soon" based on their season status in the database.

Any data from unauthorized or unsupported leagues can be purged via `/api/cron/cleanup-leagues`.

---

## 14. Internationalisation (i18n)

The app supports 5 languages via `public/js/i18n.js`. Language codes: `en`, `ar`, `de`, `es`, `fr`.

URL patterns for localised access:
- English: `/app` or `/en/app`
- Arabic: `/ar/app`
- German: `/de/app`
- Spanish: `/es/app`
- French: `/fr/app`

All five `/lang/app` routes are rewritten to `app.html` by Next.js. The language is detected from the URL prefix by `i18n.js`.

---

## 15. Deployment

**Platform:** Vercel  
**Framework Preset:** Next.js

### Build Command
```bash
prisma db push --accept-data-loss && prisma generate && next build
```

### Deploy to Production
```bash
npx vercel --prod
```

### Schema Changes
```bash
npx prisma db push   # NOT: prisma migrate dev
```

### Pre-Deploy Checklist
1. Run `npx tsc --noEmit` — no TypeScript errors
2. Bump JS version string in `app.html` if any `public/js/*.js` was changed
3. Ensure `.env` / Vercel env vars are up to date

---

## 16. Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon/Vercel Postgres connection string (pooled) |
| `DATABASE_URL_UNPOOLED` | Direct Neon connection (for Prisma migrations) |
| `NEXTAUTH_SECRET` | Secret for signing JWT tokens |
| `NEXTAUTH_URL` | Base URL (e.g. `https://kickoff-taupe.vercel.app`) |
| `FOOTBALL_API_KEY` | API-Football v3 API key |
| `RESEND_API_KEY` | Resend email API key |
| `CRON_SECRET` | Secret header to protect cron endpoints |

---

## 17. Common Bugs & Gotchas

| Bug | Fix |
|---|---|
| Using `f.league.name` directly in sync logic | Use `CANONICAL_NAMES` map instead |
| Forgetting to normalise tournament name in frontend | Call `_normaliseTournamentName()` before whitelist check |
| Using `getElementById('podium-1')` for leaderboard podium | IDs don't exist — use `.querySelectorAll('.podium-card')` |
| Running `prisma migrate dev` on Vercel | Use `prisma db push` in non-interactive envs |
| Stale matches showing as LIVE | `sync-today` cron runs `fix-stale` first; never remove this step |
| Discover page shows empty leagues | `ACTIVE_EXACT` names must match canonical names after normalisation |
| Double XP joker placed twice | Enforced server-side — check existing double before creating |
| Weekly challenge XP awarded multiple times | Check `ChallengeReward` table before inserting |
| Forgetting to handle `isShield` when checking exact scorelines | The sync engine and adminPATCH routes must evaluate `exactScore = trueExactScore || (pred.isShield && correctResult)` |
| Hardcoding league cards and active tabs on frontend | Use dynamic hydration from `/api/tournaments` and map metadata via `LEAGUE_META` |

---

## 18. Git History Summary

**Total commits:** 209 (159 baseline + 50 recent changes)  
**Active branches:** `main` (remote: `origin/main`)  
**Initial commit:** Legacy HTML app  
**Migration to Next.js:** Full-stack Next.js with auth, Prisma, admin area

### Notable Milestones (chronological)

| Date | Milestone |
|---|---|
| Initial | Legacy HTML/JS app committed |
| Early | Migrated to Next.js full-stack with Prisma + PostgreSQL |
| Early | Auth system: login, register, email verification, password reset |
| Early | Gated leagues — EPL, La Liga, Egyptian PL, UCL active |
| Early | Live score real-time polling |
| Early | Static HTML SPA architecture for `/app` |
| Mid | Admin sync engine for fixtures |
| Mid | First Goalscorer predictions + lineup cache |
| Mid | Leaderboard (global, tournament, mini-league) |
| Mid | Mini-leagues with join codes |
| Mid | Daily Spin wheel |
| Mid | Club Vote system (+XP) |
| Mid | Real Live Pulse + Match Chat |
| 2026-05-30 | Match Commentary replacing Match Chat |
| 2026-05-30 | Continent tabs layout for clubs page |
| 2026-05-30 | Redirect user to continent on club vote |
| 2026-05-30 | Weekly challenges reworked (Confidence King + Crystal Baller) |
| 2026-05-30 | Top Clubs widget filtered by monthly period |
| 2026-06-04 | Date of Birth field added to registration (UI + API + schema) |
| 2026-06-08 | Mini-league direct navigation from leaderboard |
| 2026-06-08 | Mini-league detail redesigned: two-column layout (podium + fixtures) |
| 2026-06-08 | Mini-league XP ranking bug fixed (normalised name filter) |
| 2026-06-08 | World Cup mini-league now shows correct FIFA 2026 logo and label |
| 2026-06-08 | Real daily XP insight added to leaderboard "Your Rank" banner |
| 2026-06-08 | Clickable official league detail pages (podium + rankings + fixtures) |
| 2026-06-08 | Overlay bug fixed (legacy `openLeagueDetail` removed) |
| 2026-06-08 | Default leaderboard period changed from "This Week" to "All Time" |
| 2026-06-08 | Flat 100XP penalty for wrong first goalscorer |
| 2026-06-08 | Gender-based default avatar assignment |
| 2026-06-08 | Overhaul of Boost Inventory: Joker, Scoreline Shield, The Demon |
| 2026-06-08 | Capturing user country on registration and flag display on leaderboard podiums |
| 2026-06-09 | Seasonal league management (season tagging, auto-complete, auto-register returning users) |
| 2026-06-09 | Fully dynamic leagues page with comprehensive meta structure |
| 2026-06-09 | Auto-join league on prediction (idempotent Registration creation) |
| 2026-06-09 | Level badge thresholds fix and visible rank numbers on podiums |

---

## 19. Changelog — 2026-06-08

> 12 commits landed on `main` today. All changes are in the static SPA (`public/`) and the leaderboard/mini-leagues API.

### Features

#### 🏆 Official League Detail Page (`#page-league-detail`)
- New full-page view when a user taps a league tile on the Discover/Leaderboard tab.
- Shows: league logo + name header, participant count, **top-3 podium** (matching the main leaderboard style), rank rows 4+ with avatar/level/accuracy, a **"Your Rank" banner**, and a horizontal scrollable **upcoming fixtures grid** (next 14 days).
- Implemented as a new `<div class="page hidden" id="page-league-detail">` in `app.html` + `openLeagueDetailPage()` in `app.js`.
- Fixture cards are clickable (`openRealMatchDetail()`), colour-coded green if the user has already predicted.
- **Reverted once** (overlay bug from fixed positioning) then re-implemented correctly using standard page-panel navigation.

#### 📊 Real Daily XP Insight
- The "Your Rank" banner on the leaderboard now shows live daily XP earned/lost.
- `#yrb-today-xp` span replaces the previous hardcoded `↑142 today` placeholder.
- Colours: green (`↑N today`) if positive, red (`↓N today`) if negative, muted grey (`— today`) if zero.
- **API change:** `GET /api/leaderboard/my-rank` now returns `xpToday` (sum of `xpEarned` from predictions settled since UTC midnight).
- **Frontend change:** `Backend._loadUserRank()` in `backend_api.js` reads and renders `xpToday`.

#### 🔄 Mini-League Detail Redesign
- Mini-league detail now uses a **two-column layout**: left column = podium + rank rows, right column = fixtures.
- Clicking a mini-league tile in the leaderboard navigates directly to the detail view (previously required a separate tap).

#### ⏱ Default Leaderboard Period → All Time
- `app.html`: The "All Time" tab now has the `active` class by default; "This Week" tab no longer starts active.
- Ensures new users see the full global leaderboard instead of an empty weekly view.

### Bug Fixes

| Bug | Root Cause | Fix |
|---|---|---|
| Mini-league XP ranking showed 0 XP for all members | DB `WHERE name IN (...)` didn't match canonical names like `"UEFA Champions League 2025 [2]"` | `mini-leagues/[id]/route.ts` now fetches all tournament matches and filters by `normaliseName()` in-memory |
| World Cup mini-league showed wrong logo/label | Hardcoded asset path didn't handle FIFA 2026 | Logo and label now correctly resolved to FIFA 2026 |
| League detail opened as a broken fixed-position overlay | Legacy `openLeagueDetail()` function was still bound to click events | Removed the leftover function; all league navigation now goes through `openLeagueDetailPage()` |

### Files Changed Today

| File | Changes |
|---|---|
| `public/app.html` | Added `#page-league-detail` page div; changed default active tab to "All Time"; replaced hardcoded `↑142 today` with `#yrb-today-xp` |
| `public/js/app.js` | Added `openLeagueDetailPage()`, redesigned `openMiniLeagueDetail()`, removed legacy `openLeagueDetail()`, added fixture rendering helpers |
| `public/js/backend_api.js` | Updated `_loadUserRank()` to render real `xpToday` from API response |
| `src/app/api/leaderboard/my-rank/route.ts` | Added `xpToday` field: aggregates `xpEarned` for predictions settled since UTC midnight |
| `src/app/api/mini-leagues/[id]/route.ts` | Fixed XP ranking: switched from raw DB name filter to in-memory `normaliseName()` filter |

---

## 20. Changelog — 2026-06-08 (Evening) & 2026-06-09

> 50 commits landed on `main` over these two days. The updates cover a full rework of the boost system, dynamic seasonal league management, capture and display of user countries, profile state synchronization, auto-joining of tournaments, and general bug fixes.

### Features

#### 🛡️ Overhaul of Boost Inventory: Joker, Scoreline Shield, and The Demon
- Complete redesign of the boost cards layout in the user Profile tab. Old mock items like `Double XP x3` and `Wildcard x2` are replaced with interactive boost buttons:
  - **The Joker**: Doubles XP on your next correct prediction. Limited to **one use every 7 days** globally.
  - **Scoreline Shield**: Guarantees exact score XP (+30 XP) if you guess the correct outcome (win/draw/loss) but miss the exact scoreline. Limited to **one use every 7 days**.
  - **The Demon**: Deducts **500 XP** from a rival's ranking in a private mini-league. Castable from a new target selector popup. Limited to **one use per mini-league**.
- Added `#boost-modal-overlay` HTML container in `app.html` to host the boost match/rival selections.
- Added custom confirmation modals (`_showBoostConfirmModal()`) to prevent accidental activations.
- Integrated `/api/boosts/demon` POST endpoint to log casting and aggregate penalties inside the mini-league leaderboard rankings.

#### 🌍 Capturing User Country and Displaying Flags
- Capture new user registration country automatically from the `x-vercel-ip-country` header, defaulting to `EG` (Egypt) for local development.
- Stored in the new `country` database field in the `User` model.
- Exhibited country flags next to names on the global, tournament, and mini-league leaderboard podiums and lists.

#### 📅 Seasonal League Management & Dynamic Leagues
- Added `season` field to `Tournament` and `Match` models to store API-Football season years (e.g. `2025/26`).
- Fully dynamic leagues page in `/app` powered by the new `LEAGUE_META` config object. Replaces the old 5-league hardcoding.
- Dynamic league card status: displays "Completed" badges for completed seasons, "Coming Soon" badges for upcoming seasons, and hides Join/Joined action toggle buttons for completed tournaments.
- Completed tournaments are kept on the Discover page with their season years.
- Sorts leagues on the page with "Coming Soon" at the end of the list.
- Automatically marks tournaments as `COMPLETED` in the fixture sync engine if all matches are completed and the last match date was more than 7 days ago.

#### 🔄 Auto-Join & Registration Improvements
- **Auto-Join League on Prediction**: When a user predicts a match, the backend automatically registers the user for the corresponding tournament (creates a `Registration` row if it is an OPEN tournament) and adds the league name to the user's preferred leagues.
- **Registration Table Sync**: Refactored Follow/Unfollow action to make explicit `POST` and `DELETE` requests to `/api/tournaments/[id]/register` to unify leaderboard membership with preferences.
- **Auto-Register Returning Users**: During the fixture sync of a new season tournament, users who registered for that league in the previous season are automatically registered for the new season tournament.

#### 👤 Enhanced Profile Customization & JWT Session Sync
- **Gender-Based Default Avatar**: Automatically assigns a default cartoon avatar URL (from `avatar.iran.liara.run`) on registration based on the selected gender (`male`/`female`).
- **Profile Edit Mode Sync**: Saves name and avatar picker changes directly to the local `window.Backend.user` state, and updates the NextAuth session JWT on every token refresh from the database, preventing profile state reverts on subsequent UI renders.
- **XP Progress Bar Threshold Correction**: XP progress bar width calculation is updated to accurately map to the active levels tier thresholds (Bronze, Silver, Gold, Platinum, Legend) instead of divided by a static 20000.

#### ✉️ Referral XP Deferral
- Referral welcome bonus is still given immediately to the referred user, but the referrer's **+200 XP** reward is deferred until the referred user makes their **first prediction** (triggering a `ReferralConvertedEmail` alert).

---

### Bug Fixes & Adjustments

- **First Goalscorer Penalty**: Wrong first goalscorer selections now result in a flat **-100 XP** penalty, replacing the confidence-based formula. Warning added to first goalscorer picker UI.
- **Podium Visuals**: Made podium rank numbers `#1`, `#2`, `#3` visible by giving them distinct colors instead of a semi-transparent black.
- **Silver & Bronze Badge styles**: Added missing `.bronze` and `.silver` CSS class styles to the level badges in both main stylesheets and corrected silver badge text color.
- **State Hydration Re-renders**: Triggered UI re-renders directly from state properties instead of undefined window states, ensuring season tags and Completed badges render immediately on page load.
- **Cache Busting**: Bumped JS asset versions to timestamp query parameters to bypass edge caching on deployment.

---

### Files Changed Today

| File | Changes |
|---|---|
| `prisma/schema.prisma` | Added `country` to `User`; `season` to `Tournament`/`Match`; `isShield` to `Prediction`; created `DemonUsage` model. |
| `public/app.html` | Updated boost cards structure, added `#boost-modal-overlay`, updated FGS penalty info, simplified mini-league creation form, bumped asset versions. |
| `public/css/main.css` / `main.v6.css` | Added Bronze/Silver level styles, colored podium rank numbers. |
| `public/js/app.js` | Added boost modal logic, victim selectors, confirm popups, FGS UI text change, version timestamp query parameter. |
| `public/js/backend_api.js` | Integrated `LEAGUE_META`, dynamic follow/unfollow registration calls, local profile edit state updates, level tier XP progress calculations. |
| `public/js/data.js` | Added logo URLs, status flags, season years to mock/placeholder leagues list. |
| `src/lib/auth.ts` | Selected and token-cached country; synced user edits (name, image, country) from DB to JWT session. |
| `src/app/api/auth/register/route.ts` | Captured country from header, assigned default avatar URL, deferred referral XP award. |
| `src/app/api/predictions/route.ts` | Implemented 7-day cooldown limits on Joker/Shield, added boost-only update path, added auto-join registration, deferred referral XP transaction. |
| `src/app/api/admin/sync-fixtures/route.ts` | Implemented flat FGS penalty (-100 XP), checked `isShield` for exact score bonus, auto-registered returning users, auto-completed seasons. |
| `src/app/api/boosts/demon/route.ts` | **[NEW]** Created Demon cast route. |
| `src/app/api/tournaments/[id]/register/route.ts` | **[NEW]** Created tournament register POST/DELETE handlers. |
| `src/app/api/leaderboard/route.ts` | Aggregated and returned `country` code in rankings. |
| `src/app/api/mini-leagues/[id]/route.ts` | Aggregated and subtracted `DemonUsage` penalties from ranks. |
| `src/emails/WelcomeEmail.tsx` / `ReferralWelcomeBonusEmail.tsx` | Updated welcome email copies to reflect prediction deferral. |

---

*Documentation last updated: 2026-06-09 21:30 EET.*
