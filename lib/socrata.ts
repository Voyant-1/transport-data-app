const SOCRATA_BASE = "https://data.transportation.gov/resource";
const TOKEN = process.env.SOCRATA_API_TOKEN || "";

// Dataset identifiers
const DATASETS = {
  carriers: "az4n-8mr2",
  inspections: "fx4q-ay7w",
  units: "wt8s-2hbx",
  crashes: "aayw-vxb3",
} as const;

async function socrataFetch<T>(
  dataset: string,
  params: string
): Promise<T[]> {
  const url = `${SOCRATA_BASE}/${dataset}.json?${params}`;
  const headers: Record<string, string> = {};
  if (TOKEN) {
    headers["X-App-Token"] = TOKEN;
  }
  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`Socrata API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

interface CarrierQueryParams {
  search?: string;
  state?: string;
  city?: string;
  zip?: string;
  cargo?: string;
  powerUnitsOp?: ">" | "<";
  powerUnitsValue?: string;
  limit?: number;
  offset?: number;
}

export async function fetchCarriers(params: CarrierQueryParams) {
  const { search, state, city, zip, cargo, powerUnitsOp, powerUnitsValue, limit = 1000, offset = 0 } = params;

  const whereClauses: string[] = [];

  if (search) {
    const cleaned = search.trim();
    if (/^\d+$/.test(cleaned)) {
      whereClauses.push(`dot_number=${cleaned}`);
    } else {
      whereClauses.push(`upper(legal_name) like upper('%25${encodeURIComponent(cleaned)}%25')`);
    }
  }

  if (state) {
    whereClauses.push(`phy_state='${state}'`);
  }

  if (city) {
    whereClauses.push(`upper(phy_city) like upper('%25${encodeURIComponent(city)}%25')`);
  }

  if (zip) {
    if (zip.length === 3) {
      whereClauses.push(`starts_with(phy_zip, '${zip}')`);
    } else if (zip.length === 5) {
      whereClauses.push(`phy_zip='${zip}'`);
    }
  }

  if (cargo) {
    whereClauses.push(`${cargo}='X'`);
  }

  if (powerUnitsOp && powerUnitsValue) {
    whereClauses.push(`power_units ${powerUnitsOp} ${powerUnitsValue}`);
  }

  let query = `$limit=${limit}&$offset=${offset}`;
  if (whereClauses.length > 0) {
    query += `&$where=${whereClauses.join(" AND ")}`;
  }

  return socrataFetch(DATASETS.carriers, query);
}

export async function fetchInspections(dotNumber: string, limit = 1000, offset = 0) {
  return socrataFetch(
    DATASETS.inspections,
    `$limit=${limit}&$offset=${offset}&dot_number=${dotNumber}&$select=inspection_id,dot_number,insp_date,report_state,location,location_desc,shipper_name,shipping_paper_number,insp_level_id,viol_total,oos_total,driver_viol_total,driver_oos_total,vehicle_viol_total,vehicle_oos_total,hazmat_viol_total,gross_comb_veh_wt,insp_carrier_name,insp_carrier_city,insp_carrier_state,post_acc_ind&$order=insp_date DESC`
  );
}

export async function fetchUnits(inspectionIds: string[]) {
  const soqlQuery = `$where=inspection_id IN (${inspectionIds.map((id) => `'${id}'`).join(",")})`;
  return socrataFetch(DATASETS.units, soqlQuery);
}

export async function fetchAuthority(dotNumber: string) {
  return socrataFetch(
    DATASETS.carriers,
    `$where=dot_number=${dotNumber}&$select=dot_number,legal_name,dba_name,carrier_operation,classdef,status_code,docket1prefix,docket1,docket2prefix,docket2,docket3prefix,docket3,hm_ind,interstate_beyond_100_miles,interstate_within_100_miles,intrastate_beyond_100_miles,intrastate_within_100_miles,carship`
  );
}

export async function fetchCrashes(dotNumber: string) {
  return socrataFetch(DATASETS.crashes, `dot_number=${dotNumber}&$limit=1000&$order=report_date DESC`);
}
