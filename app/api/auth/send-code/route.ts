import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
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

  // Send code in background so the response returns immediately
  after(() => send2FACode(email, code));

  // Build a signed token so the verify step can skip the DB entirely
  const secret = process.env.NEXTAUTH_SECRET!;
  const payload = Buffer.from(JSON.stringify({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    codeHmac: crypto.createHmac("sha256", secret).update(code + user.email).digest("hex"),
    exp: Date.now() + 5 * 60 * 1000,
  })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const preAuthToken = `${payload}.${sig}`;

  return NextResponse.json({ mfaRequired: true, codeSent: true, preAuthToken });
}
