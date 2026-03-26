import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function getAdminSession() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.role !== "admin") return null;

  return user;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getAdminSession();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  // Only allow updating specific fields
  const updateData: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") updateData.isActive = body.isActive;
  if (typeof body.role === "string" && ["user", "admin"].includes(body.role)) updateData.role = body.role;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email, isActive: user.isActive, role: user.role } });
  } catch {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
}
