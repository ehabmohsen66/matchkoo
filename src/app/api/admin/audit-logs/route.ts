import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

function adminOnly(session: any) {
  return !session || session.user?.role !== "ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (adminOnly(session)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const userId = searchParams.get("userId") || "";
  const matchId = searchParams.get("matchId") || "";
  const limit = parseInt(searchParams.get("limit") || "50", 10);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const skip = (page - 1) * limit;

  // Build prisma search conditions
  const where: any = {};

  if (userId) {
    where.userId = userId;
  }

  if (matchId) {
    where.matchId = matchId;
  }

  if (search) {
    where.OR = [
      {
        user: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      },
      {
        match: {
          OR: [
            { homeTeam: { contains: search, mode: "insensitive" } },
            { awayTeam: { contains: search, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  try {
    const [total, logs] = await Promise.all([
      prisma.predictionAudit.count({ where }),
      prisma.predictionAudit.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          match: {
            select: {
              id: true,
              homeTeam: true,
              awayTeam: true,
              matchDate: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[audit-logs] Failed to fetch audit logs:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
