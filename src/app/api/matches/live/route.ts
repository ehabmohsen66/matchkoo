import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const API_KEY = process.env.FOOTBALL_API_KEY!;
const BASE    = "https://v3.football.api-sports.io";

/**
 * GET /api/matches/live?id=<dbMatchId>
 *
 * Fetches real-time live data from API-Football for a specific match.
 * The response is edge-cached for 10 seconds so multiple simultaneous
 * viewers don't hammer the upstream API.
 *
 * Returns:
 *   { id, homeTeam, awayTeam, homeScore, awayScore, minute, status, elapsed }
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("id"); // DB UUID

  try {
    if (matchId) {
      // ── Single match lookup ────────────────────────────────────────
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        select: { externalId: true, homeTeam: true, awayTeam: true,
                  homeScore: true, awayScore: true, status: true,
                  matchDate: true, homeLogo: true, awayLogo: true,
                  tournament: { select: { name: true } } },
      });

      if (!match || !match.externalId) {
        return NextResponse.json({ error: "Match not found" }, { status: 404 });
      }

      // externalId is "apif-<number>"
      const fixtureId = match.externalId.replace("apif-", "");

      const apifRes = await fetch(
        `${BASE}/fixtures?id=${fixtureId}`,
        {
          headers: {
            "x-apisports-key": API_KEY,
            "x-rapidapi-host": "v3.football.api-sports.io",
          },
          // Edge cache — Next.js will revalidate every 10 seconds
          next: { revalidate: 10 },
        }
      );

      if (!apifRes.ok) {
        // Upstream error — return whatever we have in DB
        return NextResponse.json(toDbFallback(matchId, match));
      }

      const apifData = await apifRes.json();
      const f = apifData?.response?.[0];

      if (!f) {
        return NextResponse.json(toDbFallback(matchId, match));
      }

      const live = toNormalized(matchId, f, match);

      // Persist the latest score to DB in the background (fire-and-forget)
      if (live.status === "LIVE" || live.status === "COMPLETED") {
        prisma.match.update({
          where: { id: matchId },
          data: {
            homeScore: live.homeScore,
            awayScore: live.awayScore,
            status:    live.status,
          },
        }).catch(() => {}); // non-blocking
      }

      return NextResponse.json(live, {
        headers: {
          // Also set a Cache-Control so CDN/browser caches for 10s
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=5",
        },
      });
    }

    // ── All live matches ───────────────────────────────────────────
    const apifRes = await fetch(`${BASE}/fixtures?live=all`, {
      headers: {
        "x-apisports-key": API_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
      next: { revalidate: 10 },
    });

    if (!apifRes.ok) {
      return NextResponse.json({ live: [] });
    }

    const apifData = await apifRes.json();
    const fixtures = apifData?.response ?? [];

    const live = fixtures.map((f: any) => ({
      externalId: `apif-${f.fixture.id}`,
      homeTeam:   f.teams.home.name,
      awayTeam:   f.teams.away.name,
      homeScore:  f.goals.home ?? 0,
      awayScore:  f.goals.away ?? 0,
      minute:     f.fixture.status.elapsed ?? 0,
      status:     f.fixture.status.short,
      league:     f.league.name,
      homeLogo:   f.teams.home.logo,
      awayLogo:   f.teams.away.logo,
    }));

    return NextResponse.json({ live }, {
      headers: { "Cache-Control": "public, s-maxage=10, stale-while-revalidate=5" },
    });

  } catch (err: any) {
    console.error("[live]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function toNormalized(matchId: string, f: any, dbMatch: any) {
  const short   = f.fixture.status.short as string;
  const elapsed = f.fixture.status.elapsed as number | null;

  const statusMap: Record<string, "UPCOMING" | "LIVE" | "COMPLETED"> = {
    NS: "UPCOMING", TBD: "UPCOMING", PST: "UPCOMING",
    "1H": "LIVE", "2H": "LIVE", ET: "LIVE", BT: "LIVE",
    P: "LIVE", SUSP: "LIVE", INT: "LIVE", LIVE: "LIVE",
  };
  const status = statusMap[short] ?? "COMPLETED";

  return {
    id:         matchId,
    homeTeam:   f.teams.home.name,
    awayTeam:   f.teams.away.name,
    homeLogo:   f.teams.home.logo || dbMatch.homeLogo || null,
    awayLogo:   f.teams.away.logo || dbMatch.awayLogo || null,
    homeScore:  f.goals.home  ?? dbMatch.homeScore ?? 0,
    awayScore:  f.goals.away  ?? dbMatch.awayScore ?? 0,
    minute:     elapsed ?? null,
    statusShort: short,
    status,
    league:     dbMatch.tournament?.name ?? "",
    matchDate:  dbMatch.matchDate,
  };
}

function toDbFallback(matchId: string, match: any) {
  return {
    id:         matchId,
    homeTeam:   match.homeTeam,
    awayTeam:   match.awayTeam,
    homeLogo:   match.homeLogo,
    awayLogo:   match.awayLogo,
    homeScore:  match.homeScore,
    awayScore:  match.awayScore,
    minute:     null,
    statusShort: match.status === "LIVE" ? "LIVE" : "NS",
    status:     match.status,
    league:     match.tournament?.name ?? "",
    matchDate:  match.matchDate,
  };
}
