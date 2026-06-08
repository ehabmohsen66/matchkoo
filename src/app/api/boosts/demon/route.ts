import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { miniLeagueId, targetUserId } = await req.json();

    if (!miniLeagueId || !targetUserId) {
      return NextResponse.json({ message: "Missing miniLeagueId or targetUserId" }, { status: 400 });
    }

    if (userId === targetUserId) {
      return NextResponse.json({ message: "You cannot cast The Demon on yourself!" }, { status: 400 });
    }

    // Verify both users are in the mini league
    const members = await prisma.miniLeagueMember.findMany({
      where: { miniLeagueId, userId: { in: [userId, targetUserId] } }
    });

    if (members.length !== 2) {
      return NextResponse.json({ message: "Both users must be in the specified mini league" }, { status: 400 });
    }

    // Check if the user has already used The Demon in this league
    const existingUsage = await prisma.demonUsage.findUnique({
      where: {
        miniLeagueId_sourceUserId: {
          miniLeagueId,
          sourceUserId: userId
        }
      }
    });

    if (existingUsage) {
      return NextResponse.json({ message: "You have already used The Demon in this mini league!" }, { status: 400 });
    }

    // Cast the demon
    await prisma.demonUsage.create({
      data: {
        miniLeagueId,
        sourceUserId: userId,
        targetUserId,
        amount: 500
      }
    });

    return NextResponse.json({ success: true, message: "Demon successfully cast" });

  } catch (error) {
    console.error("Demon cast error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
