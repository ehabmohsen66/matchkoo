import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { normaliseName } from "@/lib/ranking";

// GET /api/predictions/stats — accuracy, correct/wrong counts for current user
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;

  // Fetch all completed predictions and evaluate correctness dynamically.
  // This avoids relying on DB `status` or `xpEarned` fields which might be
  // corrupted or null for older matches.
  const [allPredictions, completed] = await Promise.all([
    prisma.prediction.count({ where: { userId } }),
    prisma.prediction.findMany({
      where: { 
        userId, 
        match: { status: "COMPLETED", homeScore: { not: null }, awayScore: { not: null } } 
      },
      select: { 
        homeScore: true, 
        awayScore: true, 
        status: true,
        xpEarned: true,
        match: { select: { homeScore: true, awayScore: true } } 
      },
    }),
  ]);

  let correct = 0;
  let wrong = 0;

  for (const p of completed) {
    let status = p.status;
    
    // Fallback for older predictions before the `status` field was added.
    // Matches the exact fallback logic used in app.js for the UI list.
    if (!status) {
      status = (p.xpEarned && p.xpEarned > 0) ? "correct" : "wrong";
    }

    if (status === "correct") correct++;
    else wrong++;
  }

  const total = correct + wrong; // resolved picks only
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  // Fetch unique leagues predicted in
  const allUserPredictions = await prisma.prediction.findMany({
    where: { userId },
    select: {
      match: {
        select: {
          tournament: {
            select: {
              name: true
            }
          }
        }
      }
    }
  });

  const uniqueLeagues = new Set<string>();
  for (const p of allUserPredictions) {
    if (p.match?.tournament?.name) {
      uniqueLeagues.add(normaliseName(p.match.tournament.name));
    }
  }
  const uniqueLeaguesCount = uniqueLeagues.size;

  return NextResponse.json({
    total,
    correct,
    wrong,
    allPredictions,
    accuracy,
    uniqueLeaguesCount
  });
}

