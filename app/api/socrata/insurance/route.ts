import { NextRequest, NextResponse } from "next/server";
import { validateDotNumber } from "@/lib/validators";

const INSURANCE_BLOB_URL =
  "https://data.transportation.gov/api/views/chgs-tx6x/files/68f81a41-2994-4572-86b0-e057cc07fa59?download=true&filename=actpendins.txt";

// Cache the parsed file in memory (refreshed every 24 hours — file updates daily)
let cachedData: Map<string, InsuranceRow[]> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface InsuranceRow {
  docket_number: string;
  dot_number: string;
  form_code: string;
  insurance_type: string;
  insurance_carrier: string;
  policy_number: string;
  posted_date: string;
  coverage_from: number;
  coverage_to: number;
  effective_date: string;
  cancellation_date: string;
}

function parseLine(line: string): InsuranceRow | null {
  // CSV with quoted fields: "MC...","DOT...","form","type","carrier","policy","date",num,num,"date","date"
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);

  if (fields.length < 11) return null;

  return {
    docket_number: fields[0],
    dot_number: fields[1].replace(/^0+/, ""), // Strip leading zeros
    form_code: fields[2],
    insurance_type: fields[3],
    insurance_carrier: fields[4],
    policy_number: fields[5],
    posted_date: fields[6],
    coverage_from: parseInt(fields[7]) || 0,
    coverage_to: parseInt(fields[8]) || 0,
    effective_date: fields[9],
    cancellation_date: fields[10],
  };
}

async function loadInsuranceData(): Promise<Map<string, InsuranceRow[]>> {
  if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedData;
  }

  const response = await fetch(INSURANCE_BLOB_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch insurance file: ${response.status}`);
  }

  const text = await response.text();
  const lines = text.split("\n").filter((l) => l.trim().length > 0);

  const map = new Map<string, InsuranceRow[]>();

  for (const line of lines) {
    const row = parseLine(line);
    if (!row) continue;

    const existing = map.get(row.dot_number) || [];
    existing.push(row);
    map.set(row.dot_number, existing);
  }

  cachedData = map;
  cacheTimestamp = Date.now();
  return map;
}

export async function GET(request: NextRequest) {
  try {
    const dotNumber = request.nextUrl.searchParams.get("dotNumber") || "";

    if (!validateDotNumber(dotNumber)) {
      return NextResponse.json({ error: "Invalid DOT number" }, { status: 400 });
    }

    const data = await loadInsuranceData();
    const records = data.get(dotNumber) || [];

    return NextResponse.json(records);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
