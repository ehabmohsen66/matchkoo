import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/clubs/request — user submits a missing club
export async function POST(req: NextRequest) {
  try {
    // Self-heal: create table if it doesn't exist yet (handles first-deploy timing)
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "ClubRequest" (
        "id"         TEXT         NOT NULL,
        "clubName"   TEXT         NOT NULL,
        "leagueHint" TEXT         NOT NULL DEFAULT '',
        "continent"  TEXT         NOT NULL DEFAULT '',
        "userId"     TEXT,
        "status"     TEXT         NOT NULL DEFAULT 'PENDING',
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ClubRequest_pkey" PRIMARY KEY ("id")
      )
    `;

    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { clubName, leagueHint, continent } = body;

    if (!clubName || typeof clubName !== "string" || clubName.trim().length < 2) {
      return NextResponse.json({ error: "Club name is required" }, { status: 400 });
    }

    const trimmed = clubName.trim().slice(0, 100);
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);

    await prisma.$executeRaw`
      INSERT INTO "ClubRequest" ("id", "clubName", "leagueHint", "continent", "userId", "status", "createdAt")
      VALUES (
        ${id},
        ${trimmed},
        ${(leagueHint || "").trim().slice(0, 100)},
        ${(continent  || "").trim().slice(0, 50)},
        ${(session?.user as any)?.id ?? null},
        'PENDING',
        NOW()
      )
    `;

    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    console.error("club-request POST error:", e?.code, e?.message);
    return NextResponse.json(
      { error: "Server error", code: e?.code ?? "UNKNOWN", detail: e?.message ?? "" },
      { status: 500 }
    );
  }
}

// GET /api/clubs/request — admin only, returns all requests
export async function GET() {
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
