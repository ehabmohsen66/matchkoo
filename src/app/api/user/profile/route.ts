import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// PATCH /api/user/profile — update name and/or avatar (image)
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, image } = body;

  // Validate name
  if (name !== undefined) {
    if (typeof name !== "string" || name.trim().length < 2 || name.trim().length > 40) {
      return NextResponse.json(
        { error: "Name must be between 2 and 40 characters" },
        { status: 400 }
      );
    }
  }

  // Validate image URL (must be one of the allowed avatar URLs or empty)
  const ALLOWED_AVATAR_PREFIXES = [
    "https://api.dicebear.com/",
    "/images/avatars/",
  ];
  if (image !== undefined && image !== null && image !== "") {
    const isAllowed = ALLOWED_AVATAR_PREFIXES.some((prefix) =>
      image.startsWith(prefix)
    );
    if (!isAllowed) {
      return NextResponse.json(
        { error: "Invalid avatar URL" },
        { status: 400 }
      );
    }
  }

  const updateData: { name?: string; image?: string } = {};
  if (name !== undefined) updateData.name = name.trim();
  if (image !== undefined) updateData.image = image;

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data: updateData,
    select: { id: true, name: true, image: true },
  });

  return NextResponse.json({ success: true, user: updatedUser });
}
