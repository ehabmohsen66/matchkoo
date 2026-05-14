import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// POST /api/auth/reset-password  { token, password }
export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ message: "Token and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { resetPasswordToken: token },
      select: { id: true, resetPasswordExpiry: true },
    });

    if (!user) {
      return NextResponse.json({ message: "Invalid or expired reset link" }, { status: 400 });
    }

    if (!user.resetPasswordExpiry || user.resetPasswordExpiry < new Date()) {
      return NextResponse.json({ message: "This reset link has expired. Please request a new one." }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,   // consume token
        resetPasswordExpiry: null,
      },
    });

    return NextResponse.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("[reset-password]", err);
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 });
  }
}
