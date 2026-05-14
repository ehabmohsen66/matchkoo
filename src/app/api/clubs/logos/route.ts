import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns a map of { teamName: logoUrl } built from all synced matches
// so the vote page can show real club crests.
export async function GET() {
  try {
    const matches = await prisma.match.findMany({
      select: {
        homeTeam: true,
        homeLogo: true,
        awayTeam: true,
        awayLogo: true,
      },
    });

    const logoMap: Record<string, string> = {};
    for (const m of matches) {
      if (m.homeLogo && m.homeTeam) logoMap[m.homeTeam] = m.homeLogo;
      if (m.awayLogo && m.awayTeam)  logoMap[m.awayTeam]  = m.awayLogo;
    }

    return NextResponse.json(logoMap);
  } catch (error) {
    console.error("clubs/logos error:", error);
    return NextResponse.json({});
  }
}
