import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/user/preferences — returns the current user's preferredLeagues
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredLeagues: true },
  });

  return NextResponse.json({ preferredLeagues: user?.preferredLeagues ?? [] });
}

// PATCH /api/user/preferences — { league: string, action: "follow" | "unfollow" }
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { league, action } = await req.json();
  if (!league || !["follow", "unfollow"].includes(action)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredLeagues: true },
  });

  const current = user?.preferredLeagues ?? [];
  const updated =
    action === "follow"
      ? Array.from(new Set([...current, league]))
      : current.filter((l) => l !== league);

  await prisma.user.update({
    where: { id: session.user.id },
    data: { preferredLeagues: updated },
  });

  return NextResponse.json({ preferredLeagues: updated });
}
