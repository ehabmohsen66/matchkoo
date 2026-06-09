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

    const { matchId, homeScore, awayScore, firstGoalScorer, confidence, isDouble, isJoker, isShield, btts, totalGoals } = await req.json();

    if (!matchId) {
      return NextResponse.json({ message: "Missing matchId" }, { status: 400 });
    }

    const match = await prisma.match.findUnique({ where: { id: matchId } });
    if (!match) return NextResponse.json({ message: "Match not found" }, { status: 404 });

    // Lock predictions once a match is no longer UPCOMING (status is authoritative)
    if (match.status !== "UPCOMING") {
      return NextResponse.json({ message: "Predictions are locked — match has started" }, { status: 400 });
    }

    // Map frontend's isJoker to backend's isDouble schema field
    const applyJoker = isJoker || isDouble;
    const applyShield = isShield;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (applyJoker) {
      const recentJoker = await prisma.prediction.findFirst({
        where: {
          userId: session.user.id,
          isDouble: true,
          createdAt: { gte: sevenDaysAgo },
          NOT: { matchId },
        },
      });
      if (recentJoker) {
        return NextResponse.json({ message: "You can only use The Joker once every 7 days" }, { status: 400 });
      }
    }

    if (applyShield) {
      const recentShield = await prisma.prediction.findFirst({
        where: {
          userId: session.user.id,
          isShield: true,
          createdAt: { gte: sevenDaysAgo },
          NOT: { matchId },
        },
      });
      if (recentShield) {
        return NextResponse.json({ message: "You can only use Scoreline Shield once every 7 days" }, { status: 400 });
      }
    }

    // If it's just a boost update, we don't require scores.
    const isBoostUpdate = homeScore == null && awayScore == null;
    let prediction;

    if (isBoostUpdate) {
      prediction = await prisma.prediction.update({
        where: { userId_matchId: { userId: session.user.id, matchId } },
        data: {
          ...(applyJoker !== undefined && { isDouble: applyJoker }),
          ...(applyShield !== undefined && { isShield: applyShield }),
          updatedAt: new Date(),
        }
      });
    } else {
      prediction = await prisma.prediction.upsert({
        where: { userId_matchId: { userId: session.user.id, matchId } },
        update: { 
          homeScore, awayScore, firstGoalScorer, 
          confidence: confidence ?? 50, 
          isDouble: applyJoker ?? false, 
          isShield: applyShield ?? false,
          btts: btts ?? null, totalGoals: totalGoals ?? null, 
          updatedAt: new Date() 
        },
        create: { 
          userId: session.user.id, matchId, homeScore, awayScore, firstGoalScorer, 
          confidence: confidence ?? 50, 
          isDouble: applyJoker ?? false, 
          isShield: applyShield ?? false,
          btts: btts ?? null, totalGoals: totalGoals ?? null 
        },
      });
    }

    if (!isBoostUpdate) {
      // Check if this is the user's first prediction
      const count = await prisma.prediction.count({
        where: { userId: session.user.id },
      });
      if (count === 1) {
        // Find referral record
        const referral = await prisma.referral.findUnique({
          where: { referredId: session.user.id },
        });
        if (referral && !referral.xpAwarded) {
          // Award +200 XP to the referrer
          const [_, referrer] = await prisma.$transaction([
            prisma.referral.update({
              where: { referredId: session.user.id },
              data: { xpAwarded: true },
            }),
            prisma.user.update({
              where: { id: referral.referrerId },
              data: { xp: { increment: 200 } },
              select: { name: true, email: true, xp: true },
            }),
          ]);

          // Notify referrer
          if (referrer.email) {
            void sendEmail({
              to: referrer.email,
              subject: `🎉 ${session.user.name ?? "Your friend"} just made their first prediction — +200 XP earned!`,
              react: React.createElement(ReferralConvertedEmail, {
                name: referrer.name ?? "there",
                friendName: session.user.name ?? "Your friend",
                xpAwarded: 200,
                newTotalXp: referrer.xp,
              }),
            }).catch((err) => console.error("[email] Referral converted email failed:", err));
          }
        }
      }
    }

    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "An error occurred" }, { status: 500 });
  }
}
