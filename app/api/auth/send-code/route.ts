import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { send2FACode } from "@/lib/mail";

export async function POST(request: NextRequest) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
  }

  // Verify password first
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  if (!user.mfaEnabled) {
    return NextResponse.json({ mfaRequired: false });
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  // Delete any existing codes for this email
  await prisma.verificationCode.deleteMany({ where: { email: email.toLowerCase() } });

  // Store code with 5-minute expiry
  await prisma.verificationCode.create({
    data: {
      email: email.toLowerCase(),
      code,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  // Send code
  await send2FACode(email, code);

  return NextResponse.json({ mfaRequired: true, codeSent: true });
}
