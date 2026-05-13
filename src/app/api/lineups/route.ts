import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/lineups?matchId=<cuid>
 * Returns lineup for a match. Fetches from API-Football if not cached,
 * or if the match is LIVE (always refresh).
 */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const matchId = req.nextUrl.searchParams.get("matchId");
  if (!matchId) return NextResponse.json({ error: "matchId required" }, { status: 400 });

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, externalId: true, status: true, lineup: true, events: true },
  });

  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  const isLive = match.status === "LIVE";
  const hasLineup = match.lineup !== null;

  // Use cached lineup for upcoming/completed matches, always refresh for live
  if (hasLineup && !isLive) {
    return NextResponse.json({ lineup: match.lineup, events: match.events ?? [] });
  }

  if (!match.externalId?.startsWith("apif-")) {
    return NextResponse.json({ lineup: null, events: [] });
  }

  const fixtureId = match.externalId.replace("apif-", "");
  const apiKey = process.env.FOOTBALL_API_KEY!;
  const base = "https://v3.football.api-sports.io";

  // Fetch lineup + events in parallel
  const [lineupRes, eventsRes] = await Promise.all([
    fetch(`${base}/fixtures/lineups?fixture=${fixtureId}`, {
      headers: { "x-apisports-key": apiKey },
    }),
    fetch(`${base}/fixtures/events?fixture=${fixtureId}`, {
      headers: { "x-apisports-key": apiKey },
    }),
  ]);

  const [lineupData, eventsData] = await Promise.all([
    lineupRes.json(),
    eventsRes.json(),
  ]);

  // Parse lineup into a clean structure
  let lineup: any = null;
  if (lineupData.response?.length >= 2) {
    const parseTeam = (t: any) => ({
      team: t.team?.name,
      logo: t.team?.logo,
      formation: t.formation,
      startXI: (t.startXI || []).map((p: any) => ({
        id: p.player?.id,
        name: p.player?.name,
        number: p.player?.number,
        pos: p.player?.pos,
      })),
      substitutes: (t.substitutes || []).map((p: any) => ({
        id: p.player?.id,
        name: p.player?.name,
        number: p.player?.number,
        pos: p.player?.pos,
      })),
    });
    lineup = {
      home: parseTeam(lineupData.response[0]),
      away: parseTeam(lineupData.response[1]),
    };
  }

  // Parse events — goals + substitutions only
  const events = (eventsData.response || [])
    .filter((e: any) => e.type === "Goal" || e.type === "subst")
    .map((e: any) => ({
      time: e.time?.elapsed,
      extraTime: e.time?.extra ?? null,
      teamId: e.team?.id,
      teamName: e.team?.name,
      playerId: e.player?.id,
      playerName: e.player?.name,
      assistId: e.assist?.id,
      assistName: e.assist?.name,
      type: e.type,       // "Goal" | "subst"
      detail: e.detail,   // "Normal Goal" | "Penalty" | "Own Goal" etc.
    }));

  // Cache in DB
  await prisma.match.update({
    where: { id: matchId },
    data: { lineup: lineup ?? undefined, events },
  });

  return NextResponse.json({ lineup, events });
}
