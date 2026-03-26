// FMCSA QCMobile API client
// Docs: https://mobile.fmcsa.dot.gov/QCDevsite/docs/qcApi

const BASE = "https://mobile.fmcsa.dot.gov/qc/services";
const WEBKEY = process.env.FMCSA_WEBKEY || "";

export interface FMCSACarrier {
  allowedToOperate: string;
  bipdInsuranceOnFile: string;
  bipdInsuranceRequired: string;
  bipdRequiredAmount: string;
  bondInsuranceOnFile: string;
  bondInsuranceRequired: string;
  brokerAuthorityStatus: string;
  cargoInsuranceOnFile: string;
  cargoInsuranceRequired: string;
  commonAuthorityStatus: string;
  contractAuthorityStatus: string;
  crashTotal: number;
  dbaName: string | null;
  dotNumber: number;
  driverInsp: number;
  driverOosInsp: number;
  driverOosRate: number;
  driverOosRateNationalAverage: string;
  ein: number;
  fatalCrash: number;
  hazmatInsp: number;
  hazmatOosInsp: number;
  hazmatOosRate: number;
  hazmatOosRateNationalAverage: string;
  injCrash: number;
  isPassengerCarrier: string;
  legalName: string;
  mcs150Outdated: string;
  oosDate: string | null;
  phyCity: string;
  phyCountry: string;
  phyState: string;
  phyStreet: string;
  phyZipcode: string;
  reviewDate: string | null;
  safetyRating: string | null;
  safetyRatingDate: string | null;
  statusCode: string;
  totalDrivers: number;
  totalPowerUnits: number;
  carrierOperation: { carrierOperationCode: string; carrierOperationDesc: string } | null;
  towawayCrash: number;
  vehicleInsp: number;
  vehicleOosInsp: number;
  vehicleOosRate: number;
  vehicleOosRateNationalAverage: string;
}

export interface FMCSAAuthority {
  applicantID: number;
  authorizedForBroker: string;
  authorizedForHouseholdGoods: string;
  authorizedForPassenger: string;
  authorizedForProperty: string;
  brokerAuthorityStatus: string;
  commonAuthorityStatus: string;
  contractAuthorityStatus: string;
  docketNumber: number;
  dotNumber: number;
  prefix: string;
}

// In-memory cache with TTL
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

async function fetchFMCSA<T>(path: string): Promise<T | null> {
  if (!WEBKEY) return null;

  const cacheKey = path;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data as T;
  }

  try {
    const url = `${BASE}${path}?webKey=${WEBKEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    cache.set(cacheKey, { data, ts: Date.now() });
    return data as T;
  } catch {
    return null;
  }
}

export async function getCarrier(dotNumber: string): Promise<FMCSACarrier | null> {
  const result = await fetchFMCSA<{ content: { carrier: FMCSACarrier } }>(`/carriers/${dotNumber}`);
  return result?.content?.carrier || null;
}

export async function getAuthority(dotNumber: string): Promise<FMCSAAuthority[]> {
  const result = await fetchFMCSA<{ content: Array<{ carrierAuthority: FMCSAAuthority }> }>(`/carriers/${dotNumber}/authority`);
  return result?.content?.map((a) => a.carrierAuthority) || [];
}

// Helper to format insurance status
export function formatInsuranceStatus(required: string, onFile: string): {
  status: "compliant" | "non-compliant" | "not_required" | "unknown";
  amount: number;
} {
  if (required !== "Y") return { status: "not_required", amount: 0 };
  const amount = parseInt(onFile) || 0;
  return {
    status: amount > 0 ? "compliant" : "non-compliant",
    amount,
  };
}
