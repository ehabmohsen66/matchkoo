import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time cleanup: remove tournaments not in the 5 agreed leagues
// Allowed league IDs embedded in tournament names: [39], [140], [2], [233], [1]
const ALLOWED_IDS = new Set([39, 140, 2, 233, 1]);

export async function GET() {
  const all = await prisma.tournament.findMany({ select: { id: true, name: true } });

  const badIds = all
    .filter(t => {
      const m = t.name.match(/\[(\d+)\]$/);
      if (!m) return false; // no ID tag — leave alone
      return !ALLOWED_IDS.has(Number(m[1]));
    })
    .map(t => t.id);

  if (badIds.length === 0) {
    return NextResponse.json({ message: "Nothing to clean up", removed: 0 });
  }

  const badMatches = await prisma.match.findMany({
    where: { tournamentId: { in: badIds } },
    select: { id: true },
  });
  const badMatchIds = badMatches.map(m => m.id);

  if (badMatchIds.length > 0) {
    await prisma.prediction.deleteMany({ where: { matchId: { in: badMatchIds } } });
    await prisma.match.deleteMany({ where: { id: { in: badMatchIds } } });
  }
  await prisma.tournament.deleteMany({ where: { id: { in: badIds } } });

  return NextResponse.json({
    success: true,
    removed: badIds.length,
    matchesRemoved: badMatchIds.length,
  });
}
