import { NextRequest, NextResponse } from "next/server";
import { validateDotNumber } from "@/lib/validators";
import { getCarrier, getAuthority, formatInsuranceStatus } from "@/lib/fmcsa-api";

// FMCSA active/pending insurance blob (per-policy detail)
const INSURANCE_BLOB_URL =
  "https://data.transportation.gov/api/views/chgs-tx6x/files/68f81a41-2994-4572-86b0-e057cc07fa59?download=true&filename=actpendins.txt";

// Cache the blob file
let cachedPolicies: Map<string, PolicyRecord[]> | null = null;
let policyCacheTs = 0;
const CACHE_TTL = 24 * 60 * 60 * 1000;

interface PolicyRecord {
  docket_number: string;
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

function parsePolicyLine(line: string): { dotNumber: string; record: PolicyRecord } | null {
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
    dotNumber: fields[1].replace(/^0+/, ""),
    record: {
      docket_number: fields[0],
      form_code: fields[2],
      insurance_type: fields[3],
      insurance_carrier: fields[4],
      policy_number: fields[5],
      posted_date: fields[6],
      coverage_from: parseInt(fields[7]) || 0,
      coverage_to: parseInt(fields[8]) || 0,
      effective_date: fields[9],
      cancellation_date: fields[10],
    },
  };
}

async function loadPolicies(): Promise<Map<string, PolicyRecord[]>> {
  if (cachedPolicies && Date.now() - policyCacheTs < CACHE_TTL) {
    return cachedPolicies;
  }

  try {
    const res = await fetch(INSURANCE_BLOB_URL);
    if (!res.ok) return new Map();

    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const map = new Map<string, PolicyRecord[]>();

    for (const line of lines) {
      const parsed = parsePolicyLine(line);
      if (!parsed) continue;
      const existing = map.get(parsed.dotNumber) || [];
      existing.push(parsed.record);
      map.set(parsed.dotNumber, existing);
    }

    cachedPolicies = map;
    policyCacheTs = Date.now();
    return map;
  } catch {
    return new Map();
  }
}

export async function GET(request: NextRequest) {
  try {
    const dotNumber = request.nextUrl.searchParams.get("dotNumber") || "";

    if (!validateDotNumber(dotNumber)) {
      return NextResponse.json({ error: "Invalid DOT number" }, { status: 400 });
    }

    // Fetch QCMobile carrier data, authority, and per-policy blob in parallel
    const [carrier, authorities, policyMap] = await Promise.all([
      getCarrier(dotNumber),
      getAuthority(dotNumber),
      loadPolicies(),
    ]);

    const policies = policyMap.get(dotNumber) || [];

    // Build insurance coverage from QCMobile data
    const bipd = carrier ? formatInsuranceStatus(carrier.bipdInsuranceRequired, carrier.bipdInsuranceOnFile) : null;
    const cargo = carrier ? formatInsuranceStatus(carrier.cargoInsuranceRequired, carrier.cargoInsuranceOnFile) : null;
    const bond = carrier ? formatInsuranceStatus(carrier.bondInsuranceRequired, carrier.bondInsuranceOnFile) : null;

    const response = {
      // Coverage summary from QCMobile
      coverage: carrier ? {
        bipd: {
          required: carrier.bipdInsuranceRequired === "Y",
          requiredAmount: parseInt(carrier.bipdRequiredAmount) || 0,
          onFileAmount: parseInt(carrier.bipdInsuranceOnFile) || 0,
          status: bipd?.status || "unknown",
        },
        cargo: {
          required: carrier.cargoInsuranceRequired === "Y",
          onFileAmount: parseInt(carrier.cargoInsuranceOnFile) || 0,
          status: cargo?.status || "unknown",
        },
        bond: {
          required: carrier.bondInsuranceRequired === "Y",
          onFileAmount: parseInt(carrier.bondInsuranceOnFile) || 0,
          status: bond?.status || "unknown",
        },
      } : null,

      // Authority detail from QCMobile
      authority: authorities.map((a) => ({
        docketNumber: `${a.prefix}-${a.docketNumber}`,
        prefix: a.prefix,
        commonStatus: a.commonAuthorityStatus,
        contractStatus: a.contractAuthorityStatus,
        brokerStatus: a.brokerAuthorityStatus,
        property: a.authorizedForProperty === "Y",
        passenger: a.authorizedForPassenger === "Y",
        hhg: a.authorizedForHouseholdGoods === "Y",
        broker: a.authorizedForBroker === "Y",
      })),

      // Carrier-level stats from QCMobile
      carrierStats: carrier ? {
        allowedToOperate: carrier.allowedToOperate === "Y",
        statusCode: carrier.statusCode,
        safetyRating: carrier.safetyRating,
        safetyRatingDate: carrier.safetyRatingDate,
        totalPowerUnits: carrier.totalPowerUnits,
        totalDrivers: carrier.totalDrivers,
      } : null,

      // Per-policy detail from FMCSA blob (may be empty for most carriers)
      policies,

      // Legacy compatibility
      bipd_status: bipd?.status || "unknown",
      cargo_status: cargo?.status || "unknown",
      bond_status: bond?.status || "unknown",
    };

    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
