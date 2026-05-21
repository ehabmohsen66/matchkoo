import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    where: { name: { contains: "Ahmed Atef" } }
  });
  
  if (users.length === 0) return NextResponse.json({ error: "User not found" });

  const predictions = await prisma.prediction.findMany({
    where: { userId: users[0].id },
    include: { match: true }
  });

  const debug = predictions.map(p => {
    const hs = p.match.homeScore;
    const as = p.match.awayScore;
    const correctResult =
      hs !== null && as !== null &&
      ((p.homeScore > p.awayScore && hs > as) ||
      (p.homeScore < p.awayScore && hs < as) ||
      (p.homeScore === p.awayScore && hs === as));
      
    return {
      match: `${p.match.homeTeam} vs ${p.match.awayTeam}`,
      predicted: `${p.homeScore}-${p.awayScore}`,
      actual: `${hs}-${as}`,
      dbStatus: p.status,
      myLogicCorrect: correctResult
    };
  });

  return NextResponse.json(debug);
}
