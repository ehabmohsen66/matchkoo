import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as React from "react";
import { sendEmail } from "@/lib/email";


// GET /api/predictions — user's own predictions, grouped data included
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") || "upcoming";

    const predictions = await prisma.prediction.findMany({
      where: {
        userId: session.user.id,
        match: {
          status: filter === "upcoming" ? { in: ["UPCOMING", "LIVE"] } : "COMPLETED",
        },
      },
      include: {
        match: {
          select: {
            homeTeam: true, awayTeam: true, matchDate: true, status: true,
            homeScore: true, awayScore: true, firstGoalScorer: true,
            homeLogo: true, awayLogo: true,
            tournament: { select: { id: true, name: true, type: true, prizes: true } },
          },
        },
      },
      orderBy: [{ match: { matchDate: "asc" } }],
    });

    return NextResponse.json(predictions);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch predictions" }, { status: 500 });
  }
}

// POST /api/predictions — create or update a prediction
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { matchId, homeScore, awayScore, firstGoalScorer, confidence, isDouble, btts, totalGoals } = await req.json();

    if (!matchId || homeScore == null || awayScore == null) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ message: "Match not found" }, { status: 404 });

    // Lock predictions once a match is no longer UPCOMING (status is authoritative)
    if (match.status !== "UPCOMING") {
      return NextResponse.json({ message: "Predictions are locked — match has started" }, { status: 400 });
    }

    // Enforce one double per round per tournament
    if (isDouble) {
      const existingDouble = await prisma.prediction.findFirst({
        where: {
          userId: session.user.id,
          isDouble: true,
          match: { tournamentId: match.tournamentId, round: match.round },
          NOT: { matchId },
        },
      });
      if (existingDouble) {
        return NextResponse.json({ message: "You already have a double marker in this round" }, { status: 400 });
      }
    }

    const prediction = await prisma.prediction.upsert({
      where: { userId_matchId: { userId: session.user.id, matchId } },
      update: { homeScore, awayScore, firstGoalScorer, confidence: confidence ?? 50, isDouble: isDouble ?? false, btts: btts ?? null, totalGoals: totalGoals ?? null, updatedAt: new Date() },
      create: { userId: session.user.id, matchId, homeScore, awayScore, firstGoalScorer, confidence: confidence ?? 50, isDouble: isDouble ?? false, btts: btts ?? null, totalGoals: totalGoals ?? null },
    });

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
