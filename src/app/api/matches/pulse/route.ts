import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/matches/pulse?matchId=<id>
 *
 * Returns the prediction breakdown (Home Win / Draw / Away Win) for a match,
 * computed from all predictions locked before the match started.
 * Cached for 60 seconds — predictions are frozen once the match is LIVE.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 });
  }

  try {
    const predictions = await prisma.prediction.findMany({
      where: { matchId },
      select: { homeScore: true, awayScore: true },
    });

    const total = predictions.length;

    if (total === 0) {
      return NextResponse.json(
        { homeWin: 0, draw: 0, awayWin: 0, total: 0 },
        { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } }
      );
    }

    let homeWin = 0, draw = 0, awayWin = 0;
    for (const p of predictions) {
      if (p.homeScore > p.awayScore) homeWin++;
      else if (p.homeScore === p.awayScore) draw++;
      else awayWin++;
    }

    return NextResponse.json(
      {
        homeWin: Math.round((homeWin / total) * 100),
        draw:    Math.round((draw    / total) * 100),
        awayWin: Math.round((awayWin / total) * 100),
        total,
      },
      {
        headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" },
      }
    );
  } catch (err) {
    console.error("[pulse]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
