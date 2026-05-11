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
 * POST /api/admin/sync-fixtures
 *
 * Body options:
 *   { mode: "today" }                       → sync today only
 *   { mode: "week" }                        → sync today + 7 days
 *   { mode: "month" }                       → sync today + 30 days
 *   { mode: "league", leagueId: 39 }       → sync specific league (30 days)
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
      fixtures = await getFixturesByDate(today, today);
    } else if (mode === "week") {
      const to = new Date();
      to.setDate(to.getDate() + 7);
      fixtures = await getFixturesByDate(today, to.toISOString().split("T")[0]);
    } else if (mode === "month") {
      const to = new Date();
      to.setDate(to.getDate() + 30);
      fixtures = await getFixturesByDate(today, to.toISOString().split("T")[0]);
    } else if (mode === "league" && leagueId) {
      fixtures = await getFixturesByLeague(Number(leagueId), 2025, 30);
    } else if (mode === "update-live") {
      // Fetch only live/recent matches to update scores
      const liveRes = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
        headers: { "x-apisports-key": process.env.FOOTBALL_API_KEY! },
      });
      const liveData = await liveRes.json();
      
      // ONLY ingest live matches from our 5 active leagues
      // 39=EPL, 140=La Liga, 2=UCL, 233=Egypt PL, 1=World Cup
      const ACTIVE_LEAGUES = [39, 140, 2, 233, 1];
      fixtures = (liveData.response ?? []).filter((f: any) => ACTIVE_LEAGUES.includes(f.league.id));
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

    // Find or create a tournament for this league+season
    let tournament = await prisma.tournament.findFirst({
      where: { name: `${f.league.name} ${f.league.season}` },
    });

    if (!tournament) {
      // Find system admin to assign as creator
      const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
      if (!admin) { skipped++; continue; }

      tournament = await prisma.tournament.create({
        data: {
          name: `${f.league.name} ${f.league.season}`,
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
