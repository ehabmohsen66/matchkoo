import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * POST /api/admin/backfill-scorers
 * Reads the already-stored `events` JSON on each completed match and
 * derives firstGoalScorer from the first non-own-goal event.
 * Safe to run multiple times — only fills null values.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all completed matches that have events stored but no scorer yet
  const matches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      firstGoalScorer: null,
      events: { not: null },
    },
    select: { id: true, homeTeam: true, awayTeam: true, events: true },
  });

  let filled = 0;
  const details: string[] = [];

  for (const match of matches) {
    const events = match.events as any[];
    if (!Array.isArray(events) || events.length === 0) continue;

    // Find first goal that isn't an own goal
    const firstGoalEvent = events.find(
      (e) => e.type === "Goal" && e.detail !== "Own Goal"
    );

    if (firstGoalEvent?.playerName) {
      await prisma.match.update({
        where: { id: match.id },
        data: { firstGoalScorer: firstGoalEvent.playerName },
      });
      filled++;
      details.push(`${match.homeTeam} vs ${match.awayTeam} → ${firstGoalEvent.playerName}`);
    }
  }

  return NextResponse.json({
    success: true,
    filled,
    skipped: matches.length - filled,
    details,
  });
}
