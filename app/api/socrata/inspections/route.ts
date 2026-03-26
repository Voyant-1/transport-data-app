import { NextRequest, NextResponse } from "next/server";
import { fetchInspections } from "@/lib/socrata";
import { validateDotNumber } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const dotNumber = searchParams.get("dotNumber") || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 1000, 1000);
    const offset = Number(searchParams.get("offset")) || 0;

    if (!validateDotNumber(dotNumber)) {
      return NextResponse.json({ error: "Invalid DOT number" }, { status: 400 });
    }

    const data = await fetchInspections(dotNumber, limit, offset);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
