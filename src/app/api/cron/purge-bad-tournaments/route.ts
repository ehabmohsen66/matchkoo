import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time: purge duplicate/wrongly-named tournaments left over from before canonical naming
// "Premier League 2025 [233]" should be "Egyptian Premier League 2025 [233]"
// "Premier League 2025 [39]" should be "English Premier League 2025 [39]"
const BAD_NAMES = [
  "Premier League 2025 [233]",
  "Premier League 2025 [39]",
];

export async function GET() {
  const bad = await prisma.tournament.findMany({
    where: { name: { in: BAD_NAMES } },
    select: { id: true, name: true },
  });

  if (bad.length === 0) {
    return NextResponse.json({ message: "Nothing to purge", removed: 0 });
  }

  const badIds = bad.map(t => t.id);

  // Re-link any matches that point to these old tournaments to the correct new ones
  for (const t of bad) {
    const leagueId = t.name.match(/\[(\d+)\]$/)?.[1];
    if (!leagueId) continue;

    const canonicalNames: Record<string, string> = {
      "233": "Egyptian Premier League 2025 [233]",
      "39":  "English Premier League 2025 [39]",
    };
    const newName = canonicalNames[leagueId];
    if (!newName) continue;

    const newT = await prisma.tournament.findFirst({ where: { name: newName } });
    if (!newT) continue;

    await prisma.match.updateMany({
      where: { tournamentId: t.id },
      data: { tournamentId: newT.id },
    });
  }

  await prisma.tournament.deleteMany({ where: { id: { in: badIds } } });

  return NextResponse.json({ success: true, removed: bad.length, names: bad.map(t => t.name) });
}
