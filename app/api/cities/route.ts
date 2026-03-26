import { NextRequest, NextResponse } from "next/server";

const SOCRATA_BASE = "https://data.transportation.gov/resource";
const TOKEN = process.env.SOCRATA_API_TOKEN || "";
const DATASET = "az4n-8mr2"; // carriers dataset

// Cache city results to avoid repeated API calls
const cityCache = new Map<string, { results: CityResult[]; ts: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

interface CityResult {
  city: string;
  state: string;
  display: string;
  count: number;
}

export async function GET(request: NextRequest) {
  try {
    const query = (request.nextUrl.searchParams.get("q") || "").trim();

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    // Check cache
    const cacheKey = query.toUpperCase();
    const cached = cityCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json(cached.results);
    }

    // Parse input — could be "Atlanta" or "Atlanta, GA" or "Atl"
    let citySearch = query;
    let stateFilter = "";

    const commaIdx = query.indexOf(",");
    if (commaIdx > 0) {
      citySearch = query.substring(0, commaIdx).trim();
      stateFilter = query.substring(commaIdx + 1).trim().toUpperCase();
    }

    // Query Socrata for distinct city/state combinations matching the input
    const encodedCity = encodeURIComponent(citySearch.toUpperCase());
    let whereClause = `upper(phy_city) like '${encodedCity}%25'`;
    if (stateFilter && stateFilter.length === 2) {
      whereClause += ` AND phy_state='${stateFilter}'`;
    }

    const selectClause = encodeURIComponent("phy_city,phy_state,count(*) as carrier_count");
    const groupClause = encodeURIComponent("phy_city,phy_state");
    const orderClause = encodeURIComponent("carrier_count DESC");
    const url = `${SOCRATA_BASE}/${DATASET}.json?$select=${selectClause}&$where=${whereClause}&$group=${groupClause}&$order=${orderClause}&$limit=15`;

    const headers: Record<string, string> = {};
    if (TOKEN) headers["X-App-Token"] = TOKEN;

    const res = await fetch(url, { headers });
    if (!res.ok) {
      return NextResponse.json([]);
    }

    const data: Array<{ phy_city: string; phy_state: string; carrier_count: string }> = await res.json();

    const results: CityResult[] = data
      .filter((d) => d.phy_city && d.phy_state)
      .map((d) => ({
        city: d.phy_city,
        state: d.phy_state,
        display: `${d.phy_city}, ${d.phy_state}`,
        count: parseInt(d.carrier_count, 10),
      }));

    // Cache it
    cityCache.set(cacheKey, { results, ts: Date.now() });

    // Keep cache bounded
    if (cityCache.size > 1000) {
      const oldest = [...cityCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
      for (let i = 0; i < 200; i++) cityCache.delete(oldest[i][0]);
    }

    return NextResponse.json(results);
  } catch {
    return NextResponse.json([]);
  }
}
