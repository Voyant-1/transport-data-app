import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/mail";

export async function POST(request: NextRequest) {
  const { email } = await request.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const emailLower = email.toLowerCase();

  // Always return success to not leak whether email exists
  try {
    const user = await prisma.user.findUnique({ where: { email: emailLower } });

    if (user && user.isActive) {
      // Generate token
      const token = crypto.randomBytes(32).toString("hex");

      // Delete any existing reset tokens for this email
      await prisma.passwordReset.deleteMany({ where: { email: emailLower } });

      // Create new reset token with 1 hour expiry
      await prisma.passwordReset.create({
        data: {
          email: emailLower,
          token,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      // Send email
      const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail(emailLower, resetUrl);
    }
  } catch (err) {
    console.error("[forgot-password] Error:", err);
  }

  return NextResponse.json({ success: true });
}
