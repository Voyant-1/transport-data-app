import { NextRequest, NextResponse } from "next/server";
import { fetchCarriers } from "@/lib/socrata";
import {
  sanitizeSearchTerm,
  validateStateCode,
  sanitizeCityName,
  validateZipCode,
  validateCargoField,
  validatePowerUnitsOp,
  validatePowerUnitsValue,
} from "@/lib/validators";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const rawSearch = searchParams.get("search") || "";
    const rawState = searchParams.get("state") || "";
    const rawCity = searchParams.get("city") || "";
    const rawZip = searchParams.get("zip") || "";
    const rawCargo = searchParams.get("cargo") || "";
    const rawPowerUnitsOp = searchParams.get("powerUnitsOp") || "";
    const rawPowerUnitsValue = searchParams.get("powerUnitsValue") || "";
    const limit = Math.min(Number(searchParams.get("limit")) || 1000, 1000);
    const offset = Number(searchParams.get("offset")) || 0;

    const search = rawSearch ? sanitizeSearchTerm(rawSearch) : undefined;
    const state = rawState && validateStateCode(rawState) ? rawState : undefined;
    const city = rawCity ? sanitizeCityName(rawCity) : undefined;
    const zip = rawZip && validateZipCode(rawZip) ? rawZip : undefined;
    const cargo = rawCargo && validateCargoField(rawCargo) ? rawCargo : undefined;
    const powerUnitsOp = rawPowerUnitsOp && validatePowerUnitsOp(rawPowerUnitsOp) ? rawPowerUnitsOp : undefined;
    const powerUnitsValue = rawPowerUnitsValue && validatePowerUnitsValue(rawPowerUnitsValue) ? rawPowerUnitsValue : undefined;

    const data = await fetchCarriers({
      search,
      state,
      city,
      zip,
      cargo,
      powerUnitsOp,
      powerUnitsValue,
      limit,
      offset,
    });

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
