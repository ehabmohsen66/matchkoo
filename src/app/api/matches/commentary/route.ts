import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const API_KEY = process.env.FOOTBALL_API_KEY!;
const BASE    = "https://v3.football.api-sports.io";

/**
 * GET /api/matches/commentary?matchId=<id>
 *
 * Returns all match events (goals, cards, subs, VAR) with optional
 * live commentary text from API-Football.
 * Falls back to cached DB events if the upstream call fails.
 *
 * Cached for 15 seconds — fast enough for live commentary without
 * hammering the upstream API.
 */
export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const match = await prisma.match.findUnique({
    where:  { id: matchId },
    select: { externalId: true, status: true, events: true,
              homeTeam: true, awayTeam: true,
              homeScore: true, awayScore: true },
  });

  if (!match) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // ── Try live fetch from API-Football ───────────────────────────
  if (match.externalId?.startsWith("apif-")) {
    const fixtureId = match.externalId.replace("apif-", "");

    try {
      const res = await fetch(`${BASE}/fixtures/events?fixture=${fixtureId}`, {
        headers: { "x-apisports-key": API_KEY },
        next: { revalidate: 15 },
      });

      if (res.ok) {
        const data = await res.json();
        const raw: any[] = data?.response ?? [];

        const events = raw.map(toEvent).filter(Boolean);

        // Cache enriched events back to DB (only goals + subst for storage)
        const forDb = events
          .filter((e: any) => e.type === "Goal" || e.type === "subst")
          .map((e: any) => ({
            time:       e.minute,
            extraTime:  e.extraMinute ?? null,
            teamName:   e.team,
            playerName: e.player ?? "",
            assistName: e.assist ?? null,
            type:       e.type,
            detail:     e.detail,
          }));

        prisma.match.update({
          where: { id: matchId },
          data:  { events: forDb },
        }).catch(() => {});

        return NextResponse.json({ events, source: "live" }, {
          headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=5" },
        });
      }
    } catch { /* fall through to DB cache */ }
  }

  // ── Fallback: synthesise events from cached DB data ───────────
  const cached: any[] = (match.events as any[]) ?? [];
  const events = cached.map((e) => ({
    minute:      e.time ?? 0,
    extraMinute: e.extraTime ?? null,
    team:        e.teamName ?? "",
    player:      e.playerName ?? null,
    assist:      e.assistName ?? null,
    type:        e.type,
    detail:      e.detail ?? "",
    commentary:  null,
  }));

  return NextResponse.json({ events, source: "cached" }, {
    headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=5" },
  });
}

function toEvent(e: any) {
  if (!e) return null;
  return {
    minute:      e.time?.elapsed  ?? 0,
    extraMinute: e.time?.extra    ?? null,
    team:        e.team?.name     ?? "",
    player:      e.player?.name   ?? null,
    assist:      e.assist?.name   ?? null,
    type:        e.type           ?? "other",  // Goal | Card | subst | Var
    detail:      e.detail         ?? "",       // Normal Goal | Yellow Card | Red Card | …
    commentary:  e.comments       ?? null,     // Free-text commentary from API-Football
  };
}
