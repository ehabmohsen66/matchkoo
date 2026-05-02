import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const tournaments = await prisma.tournament.findMany({
      orderBy: { startDate: 'asc' },
      include: {
        _count: {
          select: { registrations: true }
        }
      }
    });
    return NextResponse.json(tournaments);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch tournaments" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    const { name, game, description, prizePool, maxPlayers, startDate } = await req.json();

    if (!name || !game || !startDate) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const tournament = await prisma.tournament.create({
      data: {
        name,
        game,
        description: description || "",
        prizePool: prizePool || "$0",
        maxPlayers: parseInt(maxPlayers) || 100,
        startDate: new Date(startDate),
        createdByUserId: session.user.id,
      }
    });

    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    console.error("Failed to create tournament:", error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
