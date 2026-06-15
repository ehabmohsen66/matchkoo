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

    if (applyJoker && applyShield) {
      return NextResponse.json({ message: "You cannot apply both Joker and Scoreline Shield to the same match" }, { status: 400 });
    }

    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0=Sun, 1=Mon, ...
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const weekStart = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + diffToMonday,
      0, 0, 0, 0
    ));

    if (applyJoker) {
      const recentJoker = await prisma.prediction.findFirst({
        where: {
          userId: session.user.id,
          isDouble: true,
          createdAt: { gte: weekStart },
          NOT: { matchId },
        },
        include: { match: true }
      });
      if (recentJoker) {
        if (recentJoker.match.status !== "UPCOMING") {
          return NextResponse.json({ message: "You can only use The Joker once per week, and your previously selected match has already started." }, { status: 400 });
        } else {
          await prisma.prediction.update({
            where: { id: recentJoker.id },
            data: { isDouble: false }
          });
        }
      }
    }

    if (applyShield) {
      const recentShield = await prisma.prediction.findFirst({
        where: {
          userId: session.user.id,
          isShield: true,
          createdAt: { gte: weekStart },
          NOT: { matchId },
        },
        include: { match: true }
      });
      if (recentShield) {
        if (recentShield.match.status !== "UPCOMING") {
          return NextResponse.json({ message: "You can only use Scoreline Shield once per week, and your previously selected match has already started." }, { status: 400 });
        } else {
          await prisma.prediction.update({
            where: { id: recentShield.id },
            data: { isShield: false }
          });
        }
      }
    }

    // If it's just a boost update, we don't require scores.
    const isBoostUpdate = homeScore == null && awayScore == null;
    const existing = await prisma.prediction.findUnique({
      where: { userId_matchId: { userId: session.user.id, matchId } }
    });
    const action = existing ? "UPDATE" : "CREATE";

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

    // Record audit log entry
    await prisma.predictionAudit.create({
      data: {
        userId: session.user.id,
        matchId,
        action,
        homeScore: prediction.homeScore,
        awayScore: prediction.awayScore,
        firstGoalScorer: prediction.firstGoalScorer,
        confidence: prediction.confidence,
        isDouble: prediction.isDouble,
        isShield: prediction.isShield,
        btts: prediction.btts,
        totalGoals: prediction.totalGoals,
      }
    }).catch(auditError => {
      console.error("[predictions] failed to write prediction audit:", auditError);
    });

    // ── Auto-join the league when a user predicts a match ──────────────
    // Runs for both new predictions and updates — idempotent everywhere.
    if (!isBoostUpdate) {
      // Auto-join league
      try {
        const fullMatch = await prisma.match.findUnique({
          where: { id: matchId },
          select: { tournamentId: true, tournament: { select: { name: true, registrationMode: true } } },
        });

        if (fullMatch?.tournamentId && fullMatch.tournament) {
          const { tournamentId, tournament } = fullMatch;

          // 1. Ensure a Registration row exists (skip INVITE_ONLY — those need a code)
          if (tournament.registrationMode !== "INVITE_ONLY") {
            await prisma.registration.create({
              data: { userId: session.user.id, tournamentId },
            }).catch((e: any) => {
              // P2002 = unique violation → already registered, that's fine
              if (e?.code !== "P2002") throw e;
            });
          }

          // 2. Ensure tournament name is in preferredLeagues
          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { preferredLeagues: true },
          });
          const current = user?.preferredLeagues ?? [];
          const alreadyIn = current.some(
            (l) => l.toLowerCase() === tournament.name.toLowerCase()
          );
          if (!alreadyIn) {
            await prisma.user.update({
              where: { id: session.user.id },
              data: { preferredLeagues: [...current, tournament.name] },
            });
          }
        }
      } catch (autoJoinError) {
        // Non-fatal — don't fail the prediction if auto-join has an issue
        console.error("[predictions] auto-join failed:", autoJoinError);
      }

      // ── Referral XP — first prediction bonus ──────────────────────
      const count = await prisma.prediction.count({
        where: { userId: session.user.id },
      });
      if (count === 1) {
        const referral = await prisma.referral.findUnique({
          where: { referredId: session.user.id },
        });
        if (referral && !referral.xpAwarded) {
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
