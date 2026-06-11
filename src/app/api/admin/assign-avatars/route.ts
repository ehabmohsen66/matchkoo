import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

const MALE_SEEDS = [
  "Felix&backgroundColor=b6e3f4",
  "Kai&backgroundColor=c0aede",
  "Marco&backgroundColor=ffd5dc",
];

const FEMALE_SEEDS = [
  "Nadia&backgroundColor=b6e3f4",
  "Luna&backgroundColor=c0aede",
  "Jade&backgroundColor=ffd5dc",
  "Sofia&backgroundColor=d1d4f9",
];

function randomAvatar(gender: string | null) {
  const pool = gender === "female" ? FEMALE_SEEDS : MALE_SEEDS;
  const seed = pool[Math.floor(Math.random() * pool.length)];
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
}

export async function POST() {
  // Must be signed in as ADMIN
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any)?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Find all users with null or empty image
  const users = await prisma.user.findMany({
    where: { OR: [{ image: null }, { image: "" }] },
    select: { id: true, name: true, email: true, gender: true },
  });

  if (users.length === 0) {
    return NextResponse.json({ message: "All users already have avatars.", updated: 0 });
  }

  const results = [];
  for (const user of users) {
    const avatar = randomAvatar(user.gender);
    await prisma.user.update({ where: { id: user.id }, data: { image: avatar } });
    results.push({ name: user.name, email: user.email, gender: user.gender, avatar });
  }

  return NextResponse.json({
    message: `✅ Assigned avatars to ${results.length} user(s).`,
    updated: results.length,
    users: results,
  });
}
