import { NextRequest, NextResponse } from "next/server";
import { VIN_BATCH_SIZE } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const vehicleIds: string[] = body.vehicleIds;

    if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) {
      return NextResponse.json({ error: "vehicleIds must be a non-empty array" }, { status: 400 });
    }

    // Validate VINs are alphanumeric (VINs are 17 chars, alphanumeric)
    const validVins = vehicleIds.filter((vin) => /^[a-zA-Z0-9]{5,17}$/.test(vin));
    if (validVins.length === 0) {
      return NextResponse.json({ error: "No valid VINs provided" }, { status: 400 });
    }

    const allResults = [];

    for (let i = 0; i < validVins.length; i += VIN_BATCH_SIZE) {
      const batch = validVins.slice(i, i + VIN_BATCH_SIZE);

      const response = await fetch("https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesBatch/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `format=json&data=${batch.join(";")}`,
      });

      if (!response.ok) {
        throw new Error(`NHTSA API error: ${response.status}`);
      }

      const vinData = await response.json();
      allResults.push(...vinData.Results);
    }

    return NextResponse.json(allResults);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
