import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/clubs/leaderboard?scope=global&period=weekly&country=EG&continent=africa
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "alltime"; // weekly | monthly | alltime
  const country = searchParams.get("country") || null;
  const continent = searchParams.get("continent") || null;

  // Build date filter
  const now = new Date();
  let dateFilter: any = {};
  if (period === "weekly") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    dateFilter = { createdAt: { gte: weekAgo } };
  } else if (period === "monthly") {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    dateFilter = { createdAt: { gte: monthAgo } };
  }

  const where: any = { ...dateFilter };
  if (country) where.country = country;
  if (continent) where.continent = continent;

  // Aggregate votes by clubName
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
