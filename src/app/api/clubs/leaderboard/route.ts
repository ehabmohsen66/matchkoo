import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/clubs/leaderboard?scope=global&period=weekly&country=EG&continent=africa&group=continents
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "alltime"; // weekly | monthly | thisyear | alltime
  const country = searchParams.get("country") || null;
  const continent = searchParams.get("continent") || null;
  const group = searchParams.get("group") || null;

  // Build date filter
  const now = new Date();
  let dateFilter: any = {};
  const normalizedPeriod = period.toLowerCase();
  
  if (normalizedPeriod === "weekly" || normalizedPeriod === "thisweekly" || normalizedPeriod === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    dateFilter = { createdAt: { gte: weekAgo } };
  } else if (normalizedPeriod === "monthly" || normalizedPeriod === "thismonth" || normalizedPeriod === "month") {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    dateFilter = { createdAt: { gte: monthAgo } };
  } else if (normalizedPeriod === "thisyear" || normalizedPeriod === "yearly" || normalizedPeriod === "year") {
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    dateFilter = { createdAt: { gte: startOfYear } };
  }

  const where: any = { ...dateFilter };
  if (country) where.country = country;
  if (continent) where.continent = continent;

  // Handle group by continents request
  if (group === "continents") {
    const votes = await prisma.clubVote.groupBy({
      by: ["clubName", "country", "continent"],
      where: { ...dateFilter },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const result: Record<string, any[]> = {
      europe: [],
      africa: [],
      americas: [],
      asia: [],
      oceania: [],
      world: []
    };

    for (const v of votes) {
      const cont = v.continent?.toLowerCase() || "world";
      if (result[cont] !== undefined && result[cont].length < 10) {
        result[cont].push({
          rank: result[cont].length + 1,
          clubName: v.clubName,
          country: v.country,
          continent: v.continent,
          votes: v._count.id,
        });
      }
    }

    return NextResponse.json(result);
  }

  // Aggregate votes by clubName (standard leaderboard query)
  const votes = await prisma.clubVote.groupBy({
    by: ["clubName", "country", "continent"],
    where,
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 50,
  });

  return NextResponse.json(
    votes.map((v, i) => ({
      rank: i + 1,
      clubName: v.clubName,
      country: v.country,
      continent: v.continent,
      votes: v._count.id,
    }))
  );
}
