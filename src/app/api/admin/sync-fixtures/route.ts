import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  getFixturesByDate,
  getFixturesByLeague,
  toMatchStatus,
  LEAGUE_CONTINENT_MAP,
  type ApiFixture,
} from "@/lib/football-api";

/**
 * Agreed-upon leagues — ONLY these 5 are ever synced or shown to users.
 *  39  = English Premier League
 *  140 = La Liga
 *  2   = UEFA Champions League
 *  233 = Egyptian Premier League
 *  1   = FIFA World Cup
 */
const ALLOWED_LEAGUES = new Set([39, 140, 2, 233, 1]);

/**
 * POST /api/admin/sync-fixtures
 *
 * Body options:
 *   { mode: "today" }                       → sync today only (whitelisted leagues)
 *   { mode: "week" }                        → sync today + 7 days (whitelisted leagues)
 *   { mode: "month" }                       → sync today + 30 days (whitelisted leagues)
 *   { mode: "league", leagueId: 39 }       → sync one specific allowed league (30 days)
 *   { mode: "update-live" }                 → update scores for LIVE matches
 *
 * Also callable from Vercel CRON (no session required if CRON_SECRET header matches)
 */
export async function POST(req: NextRequest) {
  // Allow admin session OR internal cron secret
  const cronSecret = req.headers.get("x-cron-secret");
  const isValidCron = cronSecret && cronSecret === process.env.CRON_SECRET;

  if (!isValidCron) {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any)?.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const body = await req.json().catch(() => ({ mode: "today" }));
  const { mode = "today", leagueId } = body;

  try {
    let fixtures: ApiFixture[] = [];
    const today = new Date().toISOString().split("T")[0];

    if (mode === "today") {
      const raw = await getFixturesByDate(today, today);
      fixtures = raw.filter(f => ALLOWED_LEAGUES.has(f.league.id));
    } else if (mode === "week") {
      const to = new Date();
      to.setDate(to.getDate() + 7);
      const raw = await getFixturesByDate(today, to.toISOString().split("T")[0]);
      fixtures = raw.filter(f => ALLOWED_LEAGUES.has(f.league.id));
    } else if (mode === "month") {
      const to = new Date();
      to.setDate(to.getDate() + 30);
      const raw = await getFixturesByDate(today, to.toISOString().split("T")[0]);
      fixtures = raw.filter(f => ALLOWED_LEAGUES.has(f.league.id));
    } else if (mode === "league" && leagueId) {
      const lid = Number(leagueId);
      if (!ALLOWED_LEAGUES.has(lid)) {
        return NextResponse.json({ error: `League ${lid} is not in the allowed list` }, { status: 400 });
      }
      fixtures = await getFixturesByLeague(lid, 2025, 30);
    } else if (mode === "update-live") {
      const liveRes = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
        headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY! },
      });
      const liveData = await liveRes.json();
      fixtures = (liveData.response ?? []).filter((f: any) => ALLOWED_LEAGUES.has(f.league.id));
    } else if (mode === "fix-stale") {
      // Find all matches stuck in LIVE or UPCOMING past their match date
      const stale = await prisma.match.findMany({
        where: {
          status: { in: ["LIVE", "UPCOMING"] },
          matchDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) }, // before today midnight
          externalId: { startsWith: "apif-" },
        },
        select: { id: true, externalId: true },
      });

      if (stale.length === 0) {
        return NextResponse.json({ success: true, message: "No stale matches found", fixed: 0 });
      }

      // Re-fetch each stale match from the API and update its real status
      const fixtureIds = stale.map(m => (m.externalId ?? "").replace("apif-", "")).filter(Boolean).join(",");
      const res = await fetch(
        `https://v3.football.api-sports.io/fixtures?ids=${fixtureIds}`,
        { headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY! } }
      );
      const data = await res.json();
      fixtures = (data.response ?? []).filter((f: any) => ALLOWED_LEAGUES.has(f.league.id));

      // For anything the API didn't return, force-mark as COMPLETED directly
      const returnedIds = new Set(fixtures.map((f: ApiFixture) => `apif-${f.fixture.id}`));
      const missingStale = stale.filter(m => !returnedIds.has(m.externalId ?? ""));
      if (missingStale.length > 0) {
        await prisma.match.updateMany({
          where: { id: { in: missingStale.map(m => m.id) } },
          data: { status: "COMPLETED" },
        });
      }
    }

    // Always close stale LIVE/UPCOMING from previous days on any sync mode
    if (["today", "week", "month", "update-live"].includes(mode)) {
      const staleCount = await prisma.match.updateMany({
        where: {
          status: { in: ["LIVE", "UPCOMING"] },
          matchDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
        data: { status: "COMPLETED" },
      });
      if (staleCount.count > 0) {
        console.log(`[sync] Auto-closed ${staleCount.count} stale LIVE/UPCOMING matches from previous days`);
      }
    }

    const results = await upsertFixtures(fixtures);
    return NextResponse.json({ success: true, ...results });
  } catch (err: any) {
    console.error("Sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/** GET /api/admin/sync-fixtures — see sync status */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const total = await prisma.match.count();
  const upcoming = await prisma.match.count({ where: { status: "UPCOMING" } });
  const live = await prisma.match.count({ where: { status: "LIVE" } });
  const completed = await prisma.match.count({ where: { status: "COMPLETED" } });
  const lastAdded = await prisma.match.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } });

  return NextResponse.json({ total, upcoming, live, completed, lastSync: lastAdded?.createdAt });
}

/** Upsert fixtures into the DB */
async function upsertFixtures(fixtures: ApiFixture[]) {
  let created = 0, updated = 0, skipped = 0;

  for (const f of fixtures) {
    const externalId = `apif-${f.fixture.id}`;
    const status = toMatchStatus(f.fixture.status.short);
    const matchDate = new Date(f.fixture.date);
    const homeScore = f.goals.home ?? (status === "UPCOMING" ? null : 0);
    const awayScore = f.goals.away ?? (status === "UPCOMING" ? null : 0);
    const round = f.league.round || "Round";

    // Canonical league names — API returns generic names like "Premier League" for multiple countries.
    // We override with unambiguous names so backend_api.js can match them correctly.
    const CANONICAL_NAMES: Record<number, string> = {
      39:  "English Premier League",
      140: "La Liga",
      2:   "UEFA Champions League",
      233: "Egyptian Premier League",
      1:   "FIFA World Cup",
    };
    const leagueName = CANONICAL_NAMES[f.league.id] || f.league.name;
    const tournamentName = `${leagueName} ${f.league.season} [${f.league.id}]`;

    // Find or create a tournament for this league+season
    let tournament = await prisma.tournament.findFirst({
      where: { name: tournamentName },
    });

    if (!tournament) {
      // Find system admin to assign as creator
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      if (!admin) { skipped++; continue; }

      tournament = await prisma.tournament.create({
        data: {
          name: tournamentName,
          game: "Football",
          type: f.league.id === 2 || f.league.id === 3 || f.league.id === 848 ? "Cup" : "League",
          description: `${f.league.country} · Season ${f.league.season}`,
          prizePool: "TBD",
          maxPlayers: 10000,
          startDate: matchDate,
          status: "ONGOING",
          registrationMode: "OPEN",
          createdByUserId: admin.id,
        },
      });
    }

    // Upsert match by externalId
    const existing = await prisma.match.findFirst({ where: { externalId } });

    const matchData = {
      externalId,
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      homeLogo: f.teams.home.logo || null,
      awayLogo: f.teams.away.logo || null,
      matchDate,
      status,
      round,
      homeScore: status !== "UPCOMING" ? homeScore : null,
      awayScore: status !== "UPCOMING" ? awayScore : null,
      tournamentId: tournament.id,
    };

    if (existing) {
      await prisma.match.update({ where: { id: existing.id }, data: matchData });
      
      // If automatically transitioning to COMPLETED, calculate XP!
      if (status === "COMPLETED" && existing.status !== "COMPLETED" && homeScore !== null && awayScore !== null) {
        const predictions = await prisma.prediction.findMany({ where: { matchId: existing.id } });
        for (const pred of predictions) {
          let xp = 0;
          const correctResult =
            (pred.homeScore > pred.awayScore && homeScore > awayScore) ||
            (pred.homeScore < pred.awayScore && homeScore < awayScore) ||
            (pred.homeScore === pred.awayScore && homeScore === awayScore);
          const exactScore = pred.homeScore === homeScore && pred.awayScore === awayScore;

          if (exactScore) xp += 30;
          else if (correctResult) xp += 10;

          const multiplier = 1 + ((pred.confidence - 50) / 50);
          xp = Math.round(xp * multiplier);
          if (pred.isDouble) xp *= 2;

          await prisma.prediction.update({ where: { id: pred.id }, data: { xpEarned: xp } });
          if (xp > 0) {
            await prisma.user.update({ where: { id: pred.userId }, data: { xp: { increment: xp } } });
          }
        }
      }
      
      updated++;
    } else {
      await prisma.match.create({ data: matchData });
      created++;
    }
  }

  return { created, updated, skipped, total: fixtures.length };
}
