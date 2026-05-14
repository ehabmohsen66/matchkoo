import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import * as React from "react";
import { sendEmail } from "@/lib/email";
import ReferralConvertedEmail from "@/emails/ReferralConvertedEmail";

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
          include: {
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

    // ── Referral XP on first prediction ──────────────────────────────────────
    const predCount = await prisma.prediction.count({ where: { userId: session.user.id } });
    if (predCount === 1) {
      const referral = await prisma.referral.findUnique({ where: { referredId: session.user.id } });
      if (referral && !referral.xpAwarded) {
        // Award XP to referrer and get their details for the email
        const referrer = await prisma.user.update({
          where: { id: referral.referrerId },
          data: { xp: { increment: 200 } },
          select: { email: true, name: true, xp: true },
        });
        await prisma.referral.update({
          where: { referredId: session.user.id },
          data: { xpAwarded: true },
        });

        // Notify referrer
        const referredUser = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { name: true },
        });
        if (referrer.email) {
          sendEmail({
            to: referrer.email,
            subject: `🎉 Your friend ${referredUser?.name ?? "someone"} just made their first prediction — +200 XP earned!`,
            react: React.createElement(ReferralConvertedEmail, {
              name: referrer.name ?? "there",
              friendName: referredUser?.name ?? "Your friend",
              xpAwarded: 200,
              newTotalXp: referrer.xp,
            }),
          }).catch((err) => console.error(`[email] Failed to send referral converted email to ${referrer.email}:`, err));
        }
      }
    }

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
