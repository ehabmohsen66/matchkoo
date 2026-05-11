import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/clubs/vote — get today's votes for the user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date().toISOString().split("T")[0];
  const votes = await prisma.clubVote.findMany({
    where: { userId: (session.user as any).id, votedDate: today },
    select: { clubName: true, country: true, continent: true },
  });
  return NextResponse.json({ votedToday: votes });
}

// POST /api/clubs/vote — cast a vote for a club
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  const { clubName, country, continent = "world" } = await req.json();

  if (!clubName || !country) {
    return NextResponse.json({ error: "clubName and country are required" }, { status: 400 });
  }

  const today = new Date().toISOString().split("T")[0];

  try {
    // Check if already voted for this club today
    const existing = await prisma.clubVote.findUnique({
      where: { userId_clubName_votedDate: { userId, clubName, votedDate: today } },
    });
    if (existing) {
      return NextResponse.json({ error: "Already voted for this club today" }, { status: 409 });
    }

    // Cast vote + award 50 XP
    await prisma.$transaction([
      prisma.clubVote.create({
        data: { userId, clubName, country, continent, votedDate: today },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { xp: { increment: 50 } },
      }),
    ]);

    return NextResponse.json({ success: true, xpAwarded: 50 });
  } catch (e: any) {
    if (e.code === "P2002") {
      return NextResponse.json({ error: "Already voted for this club today" }, { status: 409 });
    }
    return NextResponse.json({ error: "Vote failed" }, { status: 500 });
  }
}
