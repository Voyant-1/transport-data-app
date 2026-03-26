import { NextRequest, NextResponse } from "next/server";
import { fetchUnits } from "@/lib/socrata";
import { UNIT_BATCH_SIZE } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const inspectionIds: string[] = body.inspectionIds;

    if (!Array.isArray(inspectionIds) || inspectionIds.length === 0) {
      return NextResponse.json({ error: "inspectionIds must be a non-empty array" }, { status: 400 });
    }

    // Validate IDs are alphanumeric
    const validIds = inspectionIds.filter((id) => /^[a-zA-Z0-9_-]+$/.test(id));
    if (validIds.length === 0) {
      return NextResponse.json({ error: "No valid inspection IDs" }, { status: 400 });
    }

    // Batch fetch
    const allResults = [];
    for (let i = 0; i < validIds.length; i += UNIT_BATCH_SIZE) {
      const batch = validIds.slice(i, i + UNIT_BATCH_SIZE);
      const batchResults = await fetchUnits(batch);
      allResults.push(...batchResults);
    }

    return NextResponse.json(allResults);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
