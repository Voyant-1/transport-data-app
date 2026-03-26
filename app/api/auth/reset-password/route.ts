import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { token, password } = await request.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Token and password are required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  // Find valid token
  const resetRecord = await prisma.passwordReset.findUnique({ where: { token } });

  if (!resetRecord || resetRecord.expiresAt < new Date()) {
    return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Update user password
  await prisma.user.update({
    where: { email: resetRecord.email },
    data: { password: hashedPassword },
  });

  // Delete the used token
  await prisma.passwordReset.delete({ where: { id: resetRecord.id } });

  return NextResponse.json({ success: true });
}
