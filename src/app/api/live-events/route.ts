import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/live-events
 * Returns goals + red card events from all LIVE matches, for the homepage ticker.
 * Public endpoint — no auth required (ticker is visible without login).
 */
export async function GET() {
  try {
    const liveMatches = await prisma.match.findMany({
      where: { status: "LIVE" },
      select: {
        id: true,
        homeTeam: true,
        awayTeam: true,
        homeScore: true,
        awayScore: true,
        events: true,
        tournament: { select: { name: true } },
      },
    });

    if (liveMatches.length === 0) {
      return NextResponse.json({ events: [], liveCount: 0 });
    }

    const allEvents: {
      matchId: string;
      homeTeam: string;
      awayTeam: string;
      score: string;
      tournament: string;
      time: number;
      teamName: string;
      playerName: string;
      type: string;
      detail: string;
    }[] = [];

    for (const match of liveMatches) {
      const evts = (match.events as any[]) || [];
      const score = `${match.homeScore ?? 0}-${match.awayScore ?? 0}`;
      // Strip year + [ID] suffix from tournament name
      const tournament = match.tournament.name
        .replace(/\s*\[\d+\]/, "")
        .replace(/\s*\d{4}/, "")
        .trim();

      let hasNotableEvent = false;

      for (const evt of evts) {
        const isGoal = evt.type === "Goal";
        const isRedCard = evt.type === "Card" && evt.detail === "Red Card";
        if (isGoal || isRedCard) {
          hasNotableEvent = true;
          allEvents.push({
            matchId: match.id,
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam,
            score,
            tournament,
            time: evt.time ?? 0,
            teamName: evt.teamName ?? "",
            playerName: evt.playerName ?? "",
            type: evt.type,
            detail: evt.detail,
          });
        }
      }

      if (!hasNotableEvent) {
        allEvents.push({
          matchId: match.id,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          score,
          tournament,
          time: 0,
          teamName: "",
          playerName: "Live Now",
          type: "Live",
          detail: "",
        });
      }
    }

    // Most recent events first
    allEvents.sort((a, b) => b.time - a.time);

    return NextResponse.json({
      events: allEvents.slice(0, 30),
      liveCount: liveMatches.length,
    });
  } catch {
    return NextResponse.json({ events: [], liveCount: 0 });
  }
}
