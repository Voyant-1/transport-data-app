import { NextRequest, NextResponse } from "next/server";
import { getCarrier, getAuthority } from "@/lib/fmcsa-api";

const SOCRATA_BASE = "https://data.transportation.gov/resource";
const TOKEN = process.env.SOCRATA_API_TOKEN || "";

const DATASETS = {
  carriers: "az4n-8mr2",
  inspections: "fx4q-ay7w",
  crashes: "aayw-vxb3",
};

interface SafetyResult {
  input_name: string;
  input_city?: string;
  input_state?: string;
  input_zip?: string;
  input_dot?: string;
  match_type?: "exact_dot" | "fuzzy_name";
  // Other fuzzy candidates (for user review when no DOT provided)
  other_candidates?: Array<{ dot_number: string; legal_name: string; phy_city: string; phy_state: string; power_units: string }>;
  matched: boolean;
  dot_number?: string;
  legal_name?: string;
  dba_name?: string;
  phy_city?: string;
  phy_state?: string;
  phy_zip?: string;
  phone?: string;
  power_units?: string;
  total_drivers?: string;
  safety_rating?: string;
  status_code?: string;
  carrier_operation?: string;
  // SAFER data
  safer_power_units?: number;
  safer_drivers?: number;
  safer_authority?: string;
  // Crash totals
  crash_count?: number;
  fatalities?: number;
  injuries?: number;
  // Inspection stats (2yr)
  inspection_count_2yr?: number;
  vehicle_inspections_2yr?: number;
  vehicle_oos_2yr?: number;
  vehicle_oos_pct?: string;
  driver_inspections_2yr?: number;
  driver_oos_2yr?: number;
  driver_oos_pct?: string;
}

async function socrataFetch<T>(dataset: string, params: string): Promise<T[]> {
  const url = `${SOCRATA_BASE}/${dataset}.json?${params}`;
  const headers: Record<string, string> = {};
  if (TOKEN) headers["X-App-Token"] = TOKEN;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`Socrata ${res.status}`);
  return res.json();
}

// Strip common suffixes that may or may not appear in the legal name
const NOISE_WORDS = new Set(["INC", "LLC", "LTD", "CORP", "CO", "COMPANY", "INCORPORATED", "CORPORATION", "LP", "LLP", "PC", "DBA", "THE", "OF", "AND", "&"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function resolveCarrier(row: {
  name: string;
  city?: string;
  state?: string;
  zip?: string;
  dot?: string;
}): Promise<{ carrier: any; matchType: "exact_dot" | "fuzzy_name"; candidates?: any[] } | null> {
  // Clean DOT: handle numeric values from Excel (e.g., 53467.0 → "53467")
  const cleanDot = row.dot ? String(row.dot).trim().replace(/\.0+$/, "").replace(/[^\d]/g, "") : "";

  // If DOT number provided, use it directly — exact match
  if (cleanDot && /^\d+$/.test(cleanDot)) {
    const results = await socrataFetch(
      DATASETS.carriers,
      `$where=dot_number=${cleanDot}&$limit=1`
    );
    if (results[0]) return { carrier: results[0], matchType: "exact_dot" };
    // DOT not found, fall through to name search if name provided
    if (!row.name?.trim()) return null;
  }

  const rawName = (row.name || "").trim();
  if (!rawName) return null;

  // Break name into significant words (strip noise like INC, LLC, etc.)
  const words = rawName
    .toUpperCase()
    .replace(/[.,\-\/\\&()]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 && !NOISE_WORDS.has(w));

  if (words.length === 0) return null;

  // Build word-based LIKE clauses — each word must appear somewhere in legal_name
  const nameClauses = words.map(w => {
    const escaped = w.replace(/'/g, "''");
    return `upper(legal_name) like '%25${encodeURIComponent(escaped)}%25'`;
  });

  const clauses = [...nameClauses];
  if (row.state) clauses.push(`phy_state='${row.state.trim().toUpperCase()}'`);
  if (row.city) {
    const city = row.city.trim().toUpperCase().replace(/'/g, "''");
    clauses.push(`upper(phy_city) like '%25${encodeURIComponent(city)}%25'`);
  }
  if (row.zip) clauses.push(`phy_zip='${row.zip.trim()}'`);

  // First try: all words + location
  let results = await socrataFetch(
    DATASETS.carriers,
    `$where=${clauses.join(" AND ")}&$limit=5&$order=power_units DESC`
  );

  // Second try: if no results and we had location filters, try just name words
  if (results.length === 0 && (row.state || row.city || row.zip)) {
    results = await socrataFetch(
      DATASETS.carriers,
      `$where=${nameClauses.join(" AND ")}&$limit=5&$order=power_units DESC`
    );
  }

  // Third try: if still no results and we have 3+ words, try with just the first 2 significant words
  if (results.length === 0 && words.length >= 3) {
    const shortClauses = words.slice(0, 2).map(w => {
      const escaped = w.replace(/'/g, "''");
      return `upper(legal_name) like '%25${encodeURIComponent(escaped)}%25'`;
    });
    if (row.state) shortClauses.push(`phy_state='${row.state.trim().toUpperCase()}'`);
    results = await socrataFetch(
      DATASETS.carriers,
      `$where=${shortClauses.join(" AND ")}&$limit=5&$order=power_units DESC`
    );
  }

  if (results.length === 0) return null;

  return {
    carrier: results[0],
    matchType: "fuzzy_name",
    candidates: results.slice(0, 5), // Return top 5 candidates for user review
  };
}

// Use aggregate queries to avoid $limit truncation on large carriers
async function getCrashStats(dotNumber: string): Promise<{ count: number; fatalities: number; injuries: number }> {
  // 24-month window to match SAFER
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);
  const cutoffStr = cutoff.toISOString().slice(0, 10).replace(/-/g, "");
  const dateFilter = `dot_number='${dotNumber}' AND report_date>='${cutoffStr}'`;

  // fatalities/injuries are text fields in Socrata, can't use sum()
  // Use grouped counts: count crashes where fatalities > 0, injuries > 0
  // Then get totals via fatalities grouping
  const [countResult, fatalGroups, injuryGroups] = await Promise.all([
    socrataFetch<{ cnt: string }>(
      DATASETS.crashes,
      `$select=count(*) as cnt&$where=${dateFilter}`
    ),
    socrataFetch<{ fatalities: string; cnt: string }>(
      DATASETS.crashes,
      `$select=fatalities,count(*) as cnt&$where=${dateFilter} AND fatalities!='0'&$group=fatalities`
    ),
    socrataFetch<{ injuries: string; cnt: string }>(
      DATASETS.crashes,
      `$select=injuries,count(*) as cnt&$where=${dateFilter} AND injuries!='0'&$group=injuries`
    ),
  ]);

  const total = parseInt(countResult[0]?.cnt || "0", 10);
  let fatalities = 0;
  for (const row of fatalGroups) {
    fatalities += parseInt(row.fatalities || "0", 10) * parseInt(row.cnt || "0", 10);
  }
  let injuries = 0;
  for (const row of injuryGroups) {
    injuries += parseInt(row.injuries || "0", 10) * parseInt(row.cnt || "0", 10);
  }

  return { count: total, fatalities, injuries };
}

async function getInspectionStats2yr(dotNumber: string) {
  // 24-month window to match SAFER
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);
  const cutoffStr = cutoff.toISOString().slice(0, 10).replace(/-/g, "");
  const dateFilter = `dot_number='${dotNumber}' AND insp_date>='${cutoffStr}'`;

  // Use aggregate queries grouped by inspection level — no row limit issues
  const levelStats = await socrataFetch<{
    insp_level_id: string;
    cnt: string;
    veh_oos: string;
    drv_oos: string;
  }>(
    DATASETS.inspections,
    `$select=insp_level_id,count(*) as cnt,sum(case(vehicle_oos_total>'0',1,true,0)) as veh_oos,sum(case(driver_oos_total>'0',1,true,0)) as drv_oos&$where=${dateFilter}&$group=insp_level_id`
  );

  let totalInsp = 0, vehicleInsp = 0, vehicleOOS = 0, driverInsp = 0, driverOOS = 0;

  for (const row of levelStats) {
    const level = row.insp_level_id;
    const cnt = parseInt(row.cnt || "0", 10);
    totalInsp += cnt;

    // FMCSA inspection levels — matching SAFER's counting methodology:
    // 1 = Full (vehicle + driver), 2 = Walk-around (vehicle + driver credentials)
    // 3 = Driver-only, 4 = Special, 5 = Vehicle-only (terminal)
    // 6 = Enhanced NAS (vehicle + driver)
    // SAFER counts vehicle inspections as levels 1, 2, 5, 6
    // SAFER counts driver inspections as levels 1, 2, 3, 4, 6 (essentially all)
    if (["1", "2", "5", "6"].includes(level)) {
      vehicleInsp += cnt;
      vehicleOOS += parseInt(row.veh_oos || "0", 10);
    }
    if (["1", "2", "3", "4", "6"].includes(level)) {
      driverInsp += cnt;
      driverOOS += parseInt(row.drv_oos || "0", 10);
    }
  }

  return {
    count: totalInsp,
    vehicleInsp,
    vehicleOOS,
    vehicleOOSPct: vehicleInsp > 0 ? ((vehicleOOS / vehicleInsp) * 100).toFixed(1) : "0.0",
    driverInsp,
    driverOOS,
    driverOOSPct: driverInsp > 0 ? ((driverOOS / driverInsp) * 100).toFixed(1) : "0.0",
  };
}

interface QCMobileEnrichment {
  powerUnits: number;
  drivers: number;
  authority: string;
  crashTotal: number;
  fatalCrash: number;
  injCrash: number;
  towawayCrash: number;
  vehicleInsp: number;
  vehicleOosInsp: number;
  vehicleOosRate: number;
  vehicleOosRateNationalAvg: string;
  driverInsp: number;
  driverOosInsp: number;
  driverOosRate: number;
  driverOosRateNationalAvg: string;
  safetyRating: string;
  allowedToOperate: boolean;
}

async function fetchQCMobileData(dotNumber: string): Promise<QCMobileEnrichment | null> {
  const [carrier, authorities] = await Promise.all([
    getCarrier(dotNumber),
    getAuthority(dotNumber),
  ]);
  if (!carrier) return null;

  // Build authority string from actual authority data
  let authority = "Unknown";
  if (authorities.length > 0) {
    const auth = authorities[0];
    const types: string[] = [];
    if (auth.authorizedForProperty === "Y") types.push("Property");
    if (auth.authorizedForPassenger === "Y") types.push("Passenger");
    if (auth.authorizedForHouseholdGoods === "Y") types.push("HHG");
    if (auth.authorizedForBroker === "Y") types.push("Broker");
    if (auth.commonAuthorityStatus === "A" && types.length > 0) {
      authority = `AUTHORIZED FOR ${types.join(", ")}`;
    } else if (carrier.allowedToOperate === "Y") {
      authority = "Active (Private/Exempt)";
    } else {
      authority = "NOT AUTHORIZED";
    }
  } else if (carrier.allowedToOperate === "Y") {
    authority = "Active (Private/Exempt)";
  } else {
    authority = "NOT AUTHORIZED";
  }

  return {
    powerUnits: carrier.totalPowerUnits || 0,
    drivers: carrier.totalDrivers || 0,
    authority,
    crashTotal: carrier.crashTotal || 0,
    fatalCrash: carrier.fatalCrash || 0,
    injCrash: carrier.injCrash || 0,
    towawayCrash: carrier.towawayCrash || 0,
    vehicleInsp: carrier.vehicleInsp || 0,
    vehicleOosInsp: carrier.vehicleOosInsp || 0,
    vehicleOosRate: carrier.vehicleOosRate || 0,
    vehicleOosRateNationalAvg: carrier.vehicleOosRateNationalAverage || "",
    driverInsp: carrier.driverInsp || 0,
    driverOosInsp: carrier.driverOosInsp || 0,
    driverOosRate: carrier.driverOosRate || 0,
    driverOosRateNationalAvg: carrier.driverOosRateNationalAverage || "",
    safetyRating: carrier.safetyRating || "",
    allowedToOperate: carrier.allowedToOperate === "Y",
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rows: Array<{ name: string; city?: string; state?: string; zip?: string; dot?: string }> = body.rows;

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 });
    }

    if (rows.length > 100) {
      return NextResponse.json({ error: "Maximum 100 carriers per batch" }, { status: 400 });
    }

    const results: SafetyResult[] = [];

    // Process in batches of 5 to be respectful to APIs
    for (let i = 0; i < rows.length; i += 5) {
      const batch = rows.slice(i, i + 5);
      const batchResults = await Promise.all(
        batch.map(async (row): Promise<SafetyResult> => {
          const result: SafetyResult = {
            input_name: row.name,
            input_city: row.city,
            input_state: row.state,
            input_zip: row.zip,
            input_dot: row.dot,
            matched: false,
          };

          try {
            const match = await resolveCarrier(row);
            if (!match) return result;

            const carrier = match.carrier;
            result.matched = true;
            result.match_type = match.matchType;
            result.dot_number = carrier.dot_number;
            result.legal_name = carrier.legal_name;
            result.dba_name = carrier.dba_name;
            result.phy_city = carrier.phy_city;
            result.phy_state = carrier.phy_state;
            result.phy_zip = carrier.phy_zip;
            result.phone = carrier.phone;
            result.power_units = carrier.power_units;
            result.total_drivers = carrier.total_drivers;
            result.safety_rating = carrier.safety_rating;
            result.status_code = carrier.status_code;
            result.carrier_operation = carrier.carrier_operation;

            // Include other candidates for fuzzy matches so user can verify
            if (match.matchType === "fuzzy_name" && match.candidates && match.candidates.length > 1) {
              result.other_candidates = match.candidates.slice(1).map((c: { dot_number: string; legal_name: string; phy_city: string; phy_state: string; power_units: string }) => ({
                dot_number: c.dot_number,
                legal_name: c.legal_name,
                phy_city: c.phy_city || "",
                phy_state: c.phy_state || "",
                power_units: c.power_units || "0",
              }));
            }

            // Fetch QCMobile data (single API call replaces SAFER scrape + Socrata crash/inspection queries)
            // Fall back to Socrata for crash/inspection detail if QCMobile is unavailable
            const qcData = await fetchQCMobileData(carrier.dot_number);

            if (qcData) {
              result.safer_power_units = qcData.powerUnits;
              result.safer_drivers = qcData.drivers;
              result.safer_authority = qcData.authority;
              result.crash_count = qcData.crashTotal;
              result.fatalities = qcData.fatalCrash;
              result.injuries = qcData.injCrash;
              result.inspection_count_2yr = qcData.vehicleInsp + qcData.driverInsp;
              result.vehicle_inspections_2yr = qcData.vehicleInsp;
              result.vehicle_oos_2yr = qcData.vehicleOosInsp;
              result.vehicle_oos_pct = qcData.vehicleInsp > 0
                ? (qcData.vehicleOosRate).toFixed(1) : "0.0";
              result.driver_inspections_2yr = qcData.driverInsp;
              result.driver_oos_2yr = qcData.driverOosInsp;
              result.driver_oos_pct = qcData.driverInsp > 0
                ? (qcData.driverOosRate).toFixed(1) : "0.0";
            } else {
              // Fallback to Socrata queries if QCMobile is down
              const [crashes, inspStats] = await Promise.all([
                getCrashStats(carrier.dot_number),
                getInspectionStats2yr(carrier.dot_number),
              ]);
              result.safer_power_units = parseInt(carrier.power_units || "0");
              result.safer_drivers = parseInt(carrier.total_drivers || "0");
              result.safer_authority = "N/A (QCMobile unavailable)";
              result.crash_count = crashes.count;
              result.fatalities = crashes.fatalities;
              result.injuries = crashes.injuries;
              result.inspection_count_2yr = inspStats.count;
              result.vehicle_inspections_2yr = inspStats.vehicleInsp;
              result.vehicle_oos_2yr = inspStats.vehicleOOS;
              result.vehicle_oos_pct = inspStats.vehicleOOSPct;
              result.driver_inspections_2yr = inspStats.driverInsp;
              result.driver_oos_2yr = inspStats.driverOOS;
              result.driver_oos_pct = inspStats.driverOOSPct;
            }
          } catch {
            // Return partial result if enrichment fails
          }

          return result;
        })
      );
      results.push(...batchResults);
    }

    return NextResponse.json({ results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
