import { NextRequest, NextResponse } from "next/server";
import { fetchAuthority } from "@/lib/socrata";
import { validateDotNumber } from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const dotNumber = request.nextUrl.searchParams.get("dotNumber") || "";

    if (!validateDotNumber(dotNumber)) {
      return NextResponse.json({ error: "Invalid DOT number" }, { status: 400 });
    }

    const data = await fetchAuthority(dotNumber);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
