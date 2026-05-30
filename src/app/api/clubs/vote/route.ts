import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/clubs/vote — get today's votes for the user
// Returns: { votedToday: [{clubName, league, country, continent}] }
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const votes = await prisma.clubVote.findMany({
    where: { userId: (session.user as any).id, votedDate: today },
    select: { clubName: true, league: true, country: true, continent: true },
  });
  return NextResponse.json({ votedToday: votes });
}

// POST /api/clubs/vote — cast a vote for a club
// Body: { clubName, league, country, continent }
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { clubName, league = "", country, continent = "world" } = await req.json();

  if (!clubName || !country) {
    return NextResponse.json({ error: "clubName and country are required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    // 1. Already voted for this exact club today?
    const existingClub = await prisma.clubVote.findUnique({
      where: { userId_clubName_votedDate: { userId, clubName, votedDate: today } },
    });
    if (existingClub) {
      return NextResponse.json({ error: "Already voted for this club today" }, { status: 409 });
    }

    // 2. Already voted for a DIFFERENT club in the same league today?
    if (league) {
      const existingLeague = await prisma.clubVote.findUnique({
        where: { userId_league_votedDate: { userId, league, votedDate: today } },
      });
      if (existingLeague) {
        return NextResponse.json(
          {
            error: "already_voted_league",
            message: `You already voted for ${existingLeague.clubName} in the ${league} today. One team per league per day.`,
            votedFor: existingLeague.clubName,
          },
          { status: 409 }
        );
      }
    }

    // Cast vote + award 20 XP
    await prisma.$transaction([
      prisma.clubVote.create({
        data: { userId, clubName, league, country, continent, votedDate: today },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: 20 } },
      }),
    ]);

    return NextResponse.json({ success: true, xpAwarded: 20 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Already voted for this club today" }, { status: 409 });
    }
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
