import { NextRequest, NextResponse } from "next/server";

const SOCRATA_BASE = "https://data.transportation.gov/resource";
const TOKEN = process.env.SOCRATA_API_TOKEN || "";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

const DATASETS = {
  carriers: "az4n-8mr2",
  inspections: "fx4q-ay7w",
};

// Equipment type → FMCSA cargo registration columns
// These are filled out on the carrier's MCS-150 filing and indicate what they're
// authorized/equipped to haul. More specific than general cargo categories.
const EQUIPMENT_CARGO_FILTER: Record<string, string> = {
  van: "(crgo_genfreight='X' OR crgo_household='X' OR crgo_paperprod='X' OR crgo_beverages='X')",
  flatbed: "(crgo_metalsheet='X' OR crgo_machlrg='X' OR crgo_logpole='X' OR crgo_construct='X' OR crgo_mobilehome='X')",
  reefer: "(crgo_coldfood='X' OR crgo_produce='X' OR crgo_meat='X')",
  tanker: "(crgo_liqgas='X' OR crgo_chem='X')",
  pneumatic: "(crgo_drybulk='X')",
  bulk: "(crgo_drybulk='X' OR crgo_liqgas='X' OR crgo_chem='X' OR crgo_coalcoke='X' OR crgo_grainfeed='X')",
  intermodal: "(crgo_intermodal='X')",
  hopper: "(crgo_drybulk='X' OR crgo_grainfeed='X' OR crgo_coalcoke='X')",
};

// Geocode cache
const geoCache = new Map<string, { point: GeoPoint | null; ts: number }>();
const GEO_TTL = 24 * 60 * 60 * 1000;

interface GeoPoint { lat: number; lon: number }

interface LaneSearchRequest {
  originCity: string;
  originState: string;
  destCity: string;
  destState: string;
  radiusMiles: number;
  equipmentType?: string;
  limit?: number;
}

interface LaneBulkRequest {
  lanes: Array<{
    laneId: string;
    originCity: string;
    originState: string;
    destCity: string;
    destState: string;
  }>;
  radiusMiles: number;
  equipmentType?: string;
}

interface CarrierMatch {
  dot_number: string;
  legal_name: string;
  phy_city: string;
  phy_state: string;
  phy_zip: string;
  power_units: string;
  total_drivers: string;
  matchReason: string[];
  matchedLanes?: string[];
}

async function socrataFetch<T>(dataset: string, params: string): Promise<T[]> {
  const url = `${SOCRATA_BASE}/${dataset}.json?${params}`;
  const headers: Record<string, string> = {};
  if (TOKEN) headers["X-App-Token"] = TOKEN;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Socrata ${res.status}: ${text.substring(0, 200)}`);
  }
  return res.json();
}

async function geocode(city: string, state: string): Promise<GeoPoint | null> {
  const key = `${city},${state}`.toUpperCase();
  const cached = geoCache.get(key);
  if (cached && Date.now() - cached.ts < GEO_TTL) return cached.point;

  try {
    const query = encodeURIComponent(`${city}, ${state}, USA`);
    const res = await fetch(`${NOMINATIM_BASE}/search?q=${query}&format=json&limit=1&countrycodes=us`, {
      headers: { "User-Agent": "VoyantTransportApp/1.0" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.length === 0) return null;
    const point = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    geoCache.set(key, { point, ts: Date.now() });
    return point;
  } catch {
    return null;
  }
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getClosestStates(center: GeoPoint, radiusMiles: number): string[] {
  const STATE_CENTROIDS: Record<string, [number, number]> = {
    AL: [32.7, -86.8], AK: [64.0, -153.0], AZ: [34.3, -111.7], AR: [34.9, -92.4],
    CA: [37.2, -119.5], CO: [39.0, -105.5], CT: [41.6, -72.7], DE: [39.0, -75.5],
    FL: [28.6, -82.5], GA: [33.0, -83.5], HI: [20.5, -157.5], ID: [44.4, -114.6],
    IL: [40.0, -89.2], IN: [39.9, -86.3], IA: [42.0, -93.5], KS: [38.5, -98.3],
    KY: [37.8, -85.3], LA: [30.9, -92.4], ME: [45.4, -69.2], MD: [39.0, -76.8],
    MA: [42.3, -71.8], MI: [44.3, -84.5], MN: [46.3, -94.3], MS: [32.7, -89.7],
    MO: [38.6, -92.6], MT: [47.0, -109.6], NE: [41.5, -99.8], NV: [39.5, -116.9],
    NH: [43.7, -71.6], NJ: [40.1, -74.7], NM: [34.5, -106.0], NY: [42.9, -75.5],
    NC: [35.6, -79.8], ND: [47.5, -100.5], OH: [40.4, -82.8], OK: [35.6, -97.5],
    OR: [44.0, -120.5], PA: [40.9, -77.8], RI: [41.7, -71.5], SC: [34.0, -81.0],
    SD: [44.4, -100.2], TN: [35.9, -86.4], TX: [31.5, -99.3], UT: [39.3, -111.7],
    VT: [44.1, -72.6], VA: [37.5, -78.9], WA: [47.4, -120.7], WV: [38.6, -80.6],
    WI: [44.6, -89.7], WY: [43.0, -107.6],
  };

  return Object.entries(STATE_CENTROIDS)
    .map(([state, [lat, lon]]) => ({ state, dist: haversineDistance(center.lat, center.lon, lat, lon) }))
    .filter(({ dist }) => dist < radiusMiles + 200)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 3)
    .map(({ state }) => state);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.originCity) {
      const req = body as LaneSearchRequest;
      const results = await searchLane(req);
      return NextResponse.json({ results, total: results.length });
    }

    if (body.lanes) {
      const req = body as LaneBulkRequest;
      if (req.lanes.length > 50) {
        return NextResponse.json({ error: "Maximum 50 lanes per batch" }, { status: 400 });
      }

      const allCarriers = new Map<string, CarrierMatch>();

      for (let i = 0; i < req.lanes.length; i += 3) {
        const batch = req.lanes.slice(i, i + 3);
        const batchResults = await Promise.all(
          batch.map(async (lane) => {
            const results = await searchLane({
              originCity: lane.originCity,
              originState: lane.originState,
              destCity: lane.destCity,
              destState: lane.destState,
              radiusMiles: req.radiusMiles,
              equipmentType: req.equipmentType,
            });
            return { laneId: lane.laneId, results };
          })
        );

        for (const { laneId, results } of batchResults) {
          for (const carrier of results) {
            const existing = allCarriers.get(carrier.dot_number);
            if (existing) {
              existing.matchedLanes = [...new Set([...(existing.matchedLanes || []), laneId])];
              existing.matchReason = [...new Set([...existing.matchReason, ...carrier.matchReason])];
            } else {
              allCarriers.set(carrier.dot_number, { ...carrier, matchedLanes: [laneId] });
            }
          }
        }
      }

      const results = [...allCarriers.values()].sort(
        (a, b) => (b.matchedLanes?.length || 0) - (a.matchedLanes?.length || 0)
      );

      return NextResponse.json({ results, total: results.length });
    }

    return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function searchLane(req: LaneSearchRequest): Promise<CarrierMatch[]> {
  // Step 1: Geocode both points (parallel, cached)
  const [originGeo, destGeo] = await Promise.all([
    geocode(req.originCity, req.originState),
    geocode(req.destCity, req.destState),
  ]);

  if (!originGeo || !destGeo) return [];

  // Step 2: Get nearby states (pure math, no API call)
  const originStates = getClosestStates(originGeo, req.radiusMiles);
  const destStates = getClosestStates(destGeo, req.radiusMiles);
  const allStates = [...new Set([...originStates, ...destStates])];
  const stateList = allStates.map((s) => `'${s}'`).join(",");

  // Step 3: Two parallel queries:
  //   A) Carriers inspected in these states (last 2yr)
  //   B) Carriers with addresses in origin/dest states + equipment filter

  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 2);
  const cutoffStr = cutoff.toISOString().slice(0, 10).replace(/-/g, "");

  // Build equipment filter clause for the carrier query
  const equipFilter = req.equipmentType && EQUIPMENT_CARGO_FILTER[req.equipmentType]
    ? ` AND ${EQUIPMENT_CARGO_FILTER[req.equipmentType]}`
    : "";

  const addrStates = [...new Set([...originStates.slice(0, 1), ...destStates.slice(0, 1)])];
  const addrStateList = addrStates.map((s) => `'${s}'`).join(",");

  const selectCols = "dot_number,legal_name,phy_city,phy_state,phy_zip,power_units,total_drivers,classdef,carship";

  const [inspectionDots, addressCarriers] = await Promise.all([
    // A) Inspection-based candidates
    socrataFetch<{ dot_number: string; report_state: string }>(
      DATASETS.inspections,
      `$select=dot_number,report_state&$where=report_state in(${stateList}) AND insp_date>='${cutoffStr}'&$group=dot_number,report_state&$limit=5000`
    ),
    // B) Address-based candidates (with equipment filter baked in)
    socrataFetch<{
      dot_number: string; legal_name: string; phy_city: string; phy_state: string;
      phy_zip: string; power_units: string; total_drivers: string; classdef: string; carship: string;
    }>(
      DATASETS.carriers,
      `$where=phy_state in(${addrStateList})${equipFilter}&$limit=2000&$select=${selectCols}&$order=power_units DESC`
    ),
  ]);

  // Build inspection state map
  const dotStates = new Map<string, Set<string>>();
  for (const row of inspectionDots) {
    if (!dotStates.has(row.dot_number)) dotStates.set(row.dot_number, new Set());
    dotStates.get(row.dot_number)!.add(row.report_state);
  }

  // Index address carriers
  const carrierDataMap = new Map<string, typeof addressCarriers[0]>();
  for (const c of addressCarriers) {
    carrierDataMap.set(c.dot_number, c);
  }

  // Merge candidates
  const candidateDots = new Set<string>();
  const reasons = new Map<string, string[]>();

  // From inspections
  for (const [dot, states] of dotStates) {
    const nearOrigin = originStates.some((s) => states.has(s));
    const nearDest = destStates.some((s) => states.has(s));
    if (nearOrigin || nearDest) {
      candidateDots.add(dot);
      const r: string[] = [];
      if (nearOrigin) r.push(`Inspected near ${req.originCity}, ${req.originState}`);
      if (nearDest) r.push(`Inspected near ${req.destCity}, ${req.destState}`);
      reasons.set(dot, r);
    }
  }

  // From addresses
  for (const c of addressCarriers) {
    if (!candidateDots.has(c.dot_number)) {
      candidateDots.add(c.dot_number);
      reasons.set(c.dot_number, [`Address in ${c.phy_city}, ${c.phy_state}`]);
    }
  }

  // Step 4: Fetch details for inspection-based candidates we don't have yet
  // Apply equipment filter here too so we only fetch relevant carriers
  const needDetails = [...candidateDots].filter((d) => !carrierDataMap.has(d)).slice(0, 300);

  if (needDetails.length > 0) {
    const chunks: string[][] = [];
    for (let i = 0; i < needDetails.length; i += 100) {
      chunks.push(needDetails.slice(i, i + 100));
    }

    const chunkResults = await Promise.all(
      chunks.map((chunk) =>
        socrataFetch<{
          dot_number: string; legal_name: string; phy_city: string; phy_state: string;
          phy_zip: string; power_units: string; total_drivers: string; classdef: string; carship: string;
        }>(
          DATASETS.carriers,
          `$where=dot_number in(${chunk.join(",")})${equipFilter}&$limit=100&$select=${selectCols}`
        )
      )
    );

    for (const results of chunkResults) {
      for (const c of results) {
        carrierDataMap.set(c.dot_number, c);
      }
    }
  }

  // Step 5: Build final results — for-hire filter
  const carriers: CarrierMatch[] = [];
  for (const dot of candidateDots) {
    const c = carrierDataMap.get(dot);
    if (!c) continue; // No data or filtered out by equipment

    const classdef = (c.classdef || "").toUpperCase();
    const carship = (c.carship || "").toUpperCase();
    const isForHire = classdef.includes("A") || classdef.includes("B");
    const isCarrier = carship === "C" || carship === "B";
    if (!isForHire && !isCarrier) continue;

    carriers.push({
      dot_number: c.dot_number,
      legal_name: c.legal_name,
      phy_city: c.phy_city || "",
      phy_state: c.phy_state || "",
      phy_zip: c.phy_zip || "",
      power_units: c.power_units || "0",
      total_drivers: c.total_drivers || "0",
      matchReason: [...new Set(reasons.get(dot) || [])],
    });
  }

  carriers.sort((a, b) => parseInt(b.power_units || "0") - parseInt(a.power_units || "0"));

  return carriers.slice(0, req.limit || 100);
}
