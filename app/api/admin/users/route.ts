import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendInviteEmail } from "@/lib/mail";

async function getAdminSession() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "admin") return null;

  return user;
}

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      company: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { email, firstName, lastName, company } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const emailLower = email.toLowerCase();

  // Check if user already exists
  const existing = await prisma.user.findUnique({ where: { email: emailLower } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 400 });
  }

  // Create user with random temporary password
  const tempPassword = crypto.randomBytes(16).toString("hex");
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      email: emailLower,
      firstName: firstName || null,
      lastName: lastName || null,
      company: company || null,
      password: hashedPassword,
      name: [firstName, lastName].filter(Boolean).join(" ") || null,
      mfaEnabled: true,
    },
  });

  // Create password reset token for invite
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.passwordReset.create({
    data: {
      email: emailLower,
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  // Send invite email
  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;
  const inviterName = admin.name || admin.email;
  await sendInviteEmail(emailLower, resetUrl, inviterName);

  return NextResponse.json({ success: true, user: { id: user.id, email: user.email } });
}
