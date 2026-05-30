import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/admin/sa-logos
 * Fetches South African PSL teams from api-football.com (league 288)
 * and returns a map of { teamName: logoUrl } so we can update the STATIC_LOGO_MAP.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const API_KEY = process.env.FOOTBALL_API_KEY!;
  const BASE = "https://v3.football.api-sports.io";

  // League 288 = South African Premier Soccer League
  const url = `${BASE}/teams?league=288&season=2024`;
  const res = await fetch(url, {
    headers: {
      "x-apisports-key": API_KEY,
      "x-rapidapi-host": "v3.football.api-sports.io",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: `API error: ${res.status}` }, { status: 500 });
  }

  const data = await res.json();
  const teams: { id: number; name: string; logo: string }[] = (data.response ?? []).map(
    (r: any) => ({
      id: r.team.id,
      name: r.team.name,
      logo: r.team.logo,
    })
  );

  // Return both the team list and the ready-to-use JS snippet
  const logoMap: Record<string, string> = {};
  for (const t of teams) {
    logoMap[t.name] = t.logo;
  }

  return NextResponse.json({ teams, logoMap, total: teams.length });
}
