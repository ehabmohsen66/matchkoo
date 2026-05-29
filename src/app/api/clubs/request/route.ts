import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/clubs/request — user submits a missing club
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { clubName, leagueHint, continent } = await req.json();

    if (!clubName || typeof clubName !== "string" || clubName.trim().length < 2) {
      return NextResponse.json({ error: "Club name is required" }, { status: 400 });
    }

    const trimmed = clubName.trim().slice(0, 100);

    await prisma.clubRequest.create({
      data: {
        clubName: trimmed,
        leagueHint: (leagueHint || "").trim().slice(0, 100),
        continent: (continent || "").trim().slice(0, 50),
        userId: session?.user?.id ?? null,
        status: "PENDING",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("club-request POST:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// GET /api/clubs/request — admin only, returns all requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await prisma.clubRequest.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(requests);
  } catch (e) {
    console.error("club-request GET:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH /api/clubs/request — admin updates status
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, status } = await req.json();
    if (!id || !["PENDING", "ADDED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    await prisma.clubRequest.update({ where: { id }, data: { status } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("club-request PATCH:", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
