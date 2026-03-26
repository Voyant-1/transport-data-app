"use client";

import { useEffect, useState, useCallback, useMemo, use } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import EquipmentDisplay from "@/components/EquipmentDisplay";
import USHeatMap from "@/components/USHeatMap";
import { EQUIPMENT_TYPE_MAPPING } from "@/lib/constants";
import type {
  InspectionRecord,
  UnitRecord,
  VinResult,
  EquipmentSummary,
  EquipmentItem,
  CarrierRecord,
  CrashRecord,
} from "@/lib/types";

type TabName = "authority" | "lanes" | "insurance" | "crashes" | "inspections";

const MAX_VINS_TO_DECODE = 200;

export default function ResultDetailsPage({
  params,
}: {
  params: Promise<{ dotNumber: string }>;
}) {
  const { dotNumber } = use(params);

  const [carrierInfo, setCarrierInfo] = useState<CarrierRecord | null>(null);
  const [carrierLoading, setCarrierLoading] = useState(true);

  // QCMobile carrier data (replaces SAFER scraping)
  interface SaferData {
    powerUnits: number;
    drivers: number;
    usdotStatus: string;
    operatingAuthority: string;
    entityType: string;
    outOfServiceDate: string;
    mcNumbers: string[];
    // QCMobile extras
    crashTotal?: number;
    fatalCrash?: number;
    injCrash?: number;
    towawayCrash?: number;
    vehicleInsp?: number;
    vehicleOosInsp?: number;
    vehicleOosRate?: number;
    vehicleOosRateNationalAvg?: string;
    driverInsp?: number;
    driverOosInsp?: number;
    driverOosRate?: number;
    driverOosRateNationalAvg?: string;
    safetyRating?: string;
    safetyRatingDate?: string;
    allowedToOperate?: boolean;
  }
  const [saferData, setSaferData] = useState<SaferData | null>(null);
  const [saferLoading, setSaferLoading] = useState(true);

  const [inspections, setInspections] = useState<InspectionRecord[]>([]);
  const [equipmentSummary, setEquipmentSummary] = useState<EquipmentSummary>({});
  const [equipmentLoading, setEquipmentLoading] = useState(true);
  const [equipmentProgress, setEquipmentProgress] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabName>("authority");
  const [inspectionWindow, setInspectionWindow] = useState<number>(2); // years
  const [crashWindow, setCrashWindow] = useState<number>(2); // years

  const [authorityData, setAuthorityData] = useState<CarrierRecord[] | null>(null);
  const [crashData, setCrashData] = useState<CrashRecord[] | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [insuranceData, setInsuranceData] = useState<any | null>(null);
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});

  const calculateEquipmentSummary = (vinResults: VinResult[]) => {
    const equipmentMap: Record<string, Record<string, { count: number; totalYear: number }>> = {};

    vinResults.forEach((vin) => {
      const equipmentType = EQUIPMENT_TYPE_MAPPING[vin.TrailerBodyType] || vin.TrailerBodyType;
      if (!equipmentType) return;

      const length = vin.TrailerLength || "Unknown";
      if (!equipmentMap[equipmentType]) equipmentMap[equipmentType] = {};
      if (!equipmentMap[equipmentType][length]) {
        equipmentMap[equipmentType][length] = { count: 0, totalYear: 0 };
      }

      equipmentMap[equipmentType][length].count++;
      equipmentMap[equipmentType][length].totalYear += parseInt(vin.ModelYear, 10) || 0;
    });

    const summary: EquipmentSummary = {};
    const currentYear = new Date().getFullYear();

    Object.keys(equipmentMap).forEach((type) => {
      summary[type] = Object.keys(equipmentMap[type]).map((size): EquipmentItem => {
        const equipment = equipmentMap[type][size];
        const averageAge = currentYear - Math.round(equipment.totalYear / equipment.count);
        return { size, count: equipment.count, averageAge };
      });
    });

    setEquipmentSummary(summary);
  };

  // FAST: Fetch basic carrier info
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`/api/socrata/carriers?search=${dotNumber}&limit=1`, { signal: controller.signal });
        if (res.ok) {
          const data: CarrierRecord[] = await res.json();
          if (data.length > 0) setCarrierInfo(data[0]);
        }
      } catch { /* non-fatal */ }
      finally { setCarrierLoading(false); }
    })();
    return () => controller.abort();
  }, [dotNumber]);

  // Fetch SAFER snapshot for power units and driver count
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setSaferLoading(true);
        const res = await fetch(`/api/safer/snapshot?dotNumber=${dotNumber}`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setSaferData({
            powerUnits: data.powerUnits || 0,
            drivers: data.drivers || 0,
            usdotStatus: data.usdotStatus || "",
            operatingAuthority: data.operatingAuthority || "",
            entityType: data.entityType || "",
            outOfServiceDate: data.outOfServiceDate || "",
            mcNumbers: data.mcNumbers || [],
            crashTotal: data.crashTotal,
            fatalCrash: data.fatalCrash,
            injCrash: data.injCrash,
            towawayCrash: data.towawayCrash,
            vehicleInsp: data.vehicleInsp,
            vehicleOosInsp: data.vehicleOosInsp,
            vehicleOosRate: data.vehicleOosRate,
            vehicleOosRateNationalAvg: data.vehicleOosRateNationalAvg,
            driverInsp: data.driverInsp,
            driverOosInsp: data.driverOosInsp,
            driverOosRate: data.driverOosRate,
            driverOosRateNationalAvg: data.driverOosRateNationalAvg,
            safetyRating: data.safetyRating,
            safetyRatingDate: data.safetyRatingDate,
            allowedToOperate: data.allowedToOperate,
          });
        }
      } catch { /* non-fatal */ }
      finally { setSaferLoading(false); }
    })();
    return () => controller.abort();
  }, [dotNumber]);

  // BACKGROUND: Fetch inspections + equipment
  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    (async () => {
      try {
        setEquipmentLoading(true);
        setEquipmentProgress("Fetching inspections...");

        let allInspections: InspectionRecord[] = [];
        let offset = 0;
        let hasMore = true;

        while (hasMore) {
          const res = await fetch(
            `/api/socrata/inspections?dotNumber=${dotNumber}&limit=1000&offset=${offset}`,
            { signal }
          );
          if (!res.ok) break;
          const batch: InspectionRecord[] = await res.json();
          allInspections = [...allInspections, ...batch];
          setInspections(allInspections);
          setEquipmentProgress(`Fetched ${allInspections.length} inspections...`);
          hasMore = batch.length === 1000;
          offset += 1000;
        }

        if (allInspections.length === 0) {
          setEquipmentLoading(false);
          setEquipmentProgress("");
          return;
        }

        // Fetch unit data
        setEquipmentProgress("Fetching equipment data...");
        const inspectionIds = allInspections.map((i) => i.inspection_id);
        const unitsRes = await fetch("/api/socrata/units", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inspectionIds }),
          signal,
        });

        if (unitsRes.ok) {
          const allUnits: UnitRecord[] = await unitsRes.json();
          const vehicleIds = allUnits
            .filter((u) => u.insp_unit_type_id === "9" || u.insp_unit_type_id === "14")
            .map((u) => u.insp_unit_vehicle_id_number)
            .filter((vin): vin is string => !!vin);

          const uniqueVins = [...new Set(vehicleIds)].slice(0, MAX_VINS_TO_DECODE);

          if (uniqueVins.length > 0) {
            setEquipmentProgress(`Decoding ${uniqueVins.length} VINs...`);
            const vinRes = await fetch("/api/vin/decode", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ vehicleIds: uniqueVins }),
              signal,
            });
            if (vinRes.ok) {
              const vinResults: VinResult[] = await vinRes.json();
              calculateEquipmentSummary(vinResults);
            }
          }
        }

        setEquipmentLoading(false);
        setEquipmentProgress("");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unknown error");
        setEquipmentLoading(false);
      }
    })();

    return () => controller.abort();
  }, [dotNumber]);

  // Lazy-load tab data
  const fetchTabData = useCallback(async (tab: TabName) => {
    if (tab === "inspections" || tab === "lanes") return;

    if (tab === "authority" && authorityData !== null) return;
    if (tab === "crashes" && crashData !== null) return;
    if (tab === "insurance" && insuranceData !== null) return;

    setTabLoading((prev) => ({ ...prev, [tab]: true }));

    try {
      const apiPath = tab === "insurance" ? `/api/insurance` : `/api/socrata/${tab}`;
      const res = await fetch(`${apiPath}?dotNumber=${dotNumber}`);
      if (!res.ok) throw new Error(`Failed to fetch ${tab}`);
      const data = await res.json();

      if (tab === "authority") setAuthorityData(data);
      if (tab === "crashes") setCrashData(data);
      if (tab === "insurance") setInsuranceData(data);
    } catch {
      if (tab === "authority") setAuthorityData([]);
      if (tab === "crashes") setCrashData([]);
      if (tab === "insurance") setInsuranceData([]);
    } finally {
      setTabLoading((prev) => ({ ...prev, [tab]: false }));
    }
  }, [dotNumber, authorityData, crashData, insuranceData]);

  useEffect(() => { fetchTabData(activeTab); }, [activeTab, fetchTabData]);

  // Normalize shipper name for grouping
  const normalizeShipper = useCallback((name: string): string => {
    let n = name.toUpperCase().trim();
    // Remove common suffixes
    n = n.replace(/[.,]+$/g, "");
    n = n.replace(/\b(INC|LLC|LTD|CORP|CORPORATION|COMPANY|CO|LP|L\.?P\.?|L\.?L\.?C\.?|I\.?N\.?C\.?)\.?\s*$/gi, "").trim();
    n = n.replace(/[.,]+$/g, "").trim();
    // Remove EDI / C/O references
    n = n.replace(/\s+EDI\b.*$/i, "").trim();
    n = n.replace(/\s+C\/O\b.*$/i, "").trim();
    // Normalize spaces
    n = n.replace(/\s+/g, " ");
    return n;
  }, []);

  // Filter inspections by time window
  const filteredInspections = useMemo(() => {
    if (inspectionWindow === 0) return inspections; // 0 = all time
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - inspectionWindow);
    const cutoffStr = cutoff.toISOString().slice(0, 4) + cutoff.toISOString().slice(5, 7) + cutoff.toISOString().slice(8, 10);
    return inspections.filter((insp) => (insp.insp_date || "") >= cutoffStr);
  }, [inspections, inspectionWindow]);

  // Filter crashes by time window
  const filteredCrashes = useMemo(() => {
    if (!crashData || crashData.length === 0) return [];
    if (crashWindow === 0) return crashData;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - crashWindow);
    const cutoffStr = cutoff.toISOString().slice(0, 4) + cutoff.toISOString().slice(5, 7) + cutoff.toISOString().slice(8, 10);
    return crashData.filter((c) => (c.report_date || "") >= cutoffStr);
  }, [crashData, crashWindow]);

  // Derived data from inspections
  const { lanes, topShippers, inspectionStats } = useMemo(() => {
    const laneMap: Record<string, number> = {};
    const rawShipperMap: Record<string, number> = {};
    const normalizedToRaw: Record<string, Record<string, number>> = {};
    let totalViolations = 0;
    let totalOOS = 0;

    const JUNK_NAMES = new Set([
      "N/A", "NA", "NONE", "EMPTY", "XX", "CARRIER", "SELF", "SAME",
      "SAME AS CARRIER", "UNK", "UNLOADED", "RESIDENCE", "CARRIER - RESIDUE",
    ]);

    filteredInspections.forEach((insp) => {
      const state = insp.report_state;
      if (state) laneMap[state] = (laneMap[state] || 0) + 1;

      const shipper = insp.shipper_name?.trim();
      if (shipper && shipper.length > 2 && !JUNK_NAMES.has(shipper.toUpperCase()) && !/^\d+$/.test(shipper)) {
        const normalized = normalizeShipper(shipper);
        if (normalized.length < 2) return;
        rawShipperMap[normalized] = (rawShipperMap[normalized] || 0) + 1;

        if (!normalizedToRaw[normalized]) normalizedToRaw[normalized] = {};
        normalizedToRaw[normalized][shipper] = (normalizedToRaw[normalized][shipper] || 0) + 1;
      }

      totalViolations += parseInt(insp.viol_total || "0", 10);
      totalOOS += parseInt(insp.oos_total || "0", 10);
    });

    // Second pass: merge names that share a common prefix (min 5 chars, 80% match)
    const sortedKeys = Object.keys(rawShipperMap).sort();
    const mergeMap: Record<string, string> = {}; // maps a key to its canonical group

    for (let i = 0; i < sortedKeys.length; i++) {
      if (mergeMap[sortedKeys[i]]) continue;
      const base = sortedKeys[i];
      mergeMap[base] = base;

      for (let j = i + 1; j < sortedKeys.length; j++) {
        if (mergeMap[sortedKeys[j]]) continue;
        const candidate = sortedKeys[j];

        // Check if one starts with the other (min 5 char prefix)
        const shorter = base.length <= candidate.length ? base : candidate;
        const longer = base.length <= candidate.length ? candidate : base;

        if (shorter.length >= 5 && longer.startsWith(shorter)) {
          mergeMap[candidate] = base;
        }
      }
    }

    // Build merged shipper counts
    const mergedMap: Record<string, { count: number; variants: Record<string, number> }> = {};
    for (const [key, count] of Object.entries(rawShipperMap)) {
      const canonical = mergeMap[key] || key;
      if (!mergedMap[canonical]) mergedMap[canonical] = { count: 0, variants: {} };
      mergedMap[canonical].count += count;

      // Merge raw name variants
      const rawNames = normalizedToRaw[key] || {};
      for (const [rawName, rawCount] of Object.entries(rawNames)) {
        mergedMap[canonical].variants[rawName] = (mergedMap[canonical].variants[rawName] || 0) + rawCount;
      }
    }

    // Pick the best display name (most frequent raw variant)
    const topShippersList: [string, number, string[]][] = Object.entries(mergedMap)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 25)
      .map(([, data]) => {
        const variants = Object.entries(data.variants).sort((a, b) => b[1] - a[1]);
        const displayName = variants[0][0]; // Most frequent raw name
        const otherNames = variants.length > 1
          ? variants.slice(1).map(([name]) => name)
          : [];
        return [displayName, data.count, otherNames] as [string, number, string[]];
      });

    return {
      lanes: Object.entries(laneMap).sort((a, b) => b[1] - a[1]),
      topShippers: topShippersList,
      inspectionStats: { totalViolations, totalOOS, count: inspections.length },
    };
  }, [filteredInspections]);

  const pageReady = !carrierLoading || inspections.length > 0;

  if (!pageReady && !error) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div className="loading-spinner">
          Loading carrier data for DOT #{dotNumber}...
        </div>
      </div>
    );
  }

  if (error && !carrierInfo && inspections.length === 0) {
    return (
      <div className="page-wrapper">
        <Navbar />
        <div className="error-container">
          <h2>Something went wrong</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="retry-button">Try Again</button>
          <Link href="/transport-data">Back to Search</Link>
        </div>
      </div>
    );
  }

  const carrierName = carrierInfo?.legal_name || inspections[0]?.insp_carrier_name || "N/A";
  const dbaName = carrierInfo?.dba_name || inspections[0]?.dba_name || "N/A";

  // Format date from YYYYMMDD to readable
  const formatDate = (d?: string) => {
    if (!d || d.length < 8) return d || "N/A";
    return `${d.slice(4, 6)}/${d.slice(6, 8)}/${d.slice(0, 4)}`;
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      {/* Carrier Info Header */}
      <div className="carrier-info">
        <div className="carrier-details">
          <h2>Carrier Information</h2>
          <p><strong>Legal Name:</strong> {carrierName}</p>
          <p><strong>DBA:</strong> {dbaName}</p>
          <p><strong>DOT Number:</strong> {dotNumber}</p>
          {carrierInfo && (
            <>
              <p><strong>Location:</strong> {carrierInfo.phy_city}, {carrierInfo.phy_state} {carrierInfo.phy_zip}</p>
              <p><strong>Phone:</strong> {carrierInfo.phone || "N/A"}</p>
              <p><strong>Power Units:</strong> {saferLoading ? "Loading..." : (saferData?.powerUnits || carrierInfo.power_units || "N/A")}</p>
              <p><strong>Total Drivers:</strong> {saferLoading ? "Loading..." : (saferData?.drivers || carrierInfo.total_drivers || "N/A")}</p>
              {saferData?.operatingAuthority && (
                <p><strong>Authority:</strong>{" "}
                  <span className={saferData.operatingAuthority.includes("NOT") ? "text-error font-semibold" : "text-success font-semibold"}>
                    {saferData.operatingAuthority}
                  </span>
                </p>
              )}
              {saferData?.usdotStatus && (
                <p><strong>USDOT Status:</strong>{" "}
                  <span className={saferData.usdotStatus === "ACTIVE" ? "text-success font-semibold" : "text-error font-semibold"}>
                    {saferData.usdotStatus}
                  </span>
                </p>
              )}
              {saferData?.mcNumbers && saferData.mcNumbers.length > 0 && (
                <p><strong>MC #:</strong> {saferData.mcNumbers.join(", ")}</p>
              )}
              <p><strong>Safety Rating:</strong> {carrierInfo.safety_rating || "N/A"}</p>
            </>
          )}
          {inspectionStats.count > 0 && (
            <div className="carrier-stats-box">
              <p><strong>Total Inspections:</strong> {inspectionStats.count}</p>
              <p><strong>Total Violations:</strong> {inspectionStats.totalViolations}</p>
              <p><strong>Out of Service:</strong> {inspectionStats.totalOOS}</p>
            </div>
          )}
        </div>
      </div>

      {/* Equipment Display with Icons */}
      <div className="equipment-section">
        {equipmentLoading ? (
          <div className="equipment-loading">
            {equipmentProgress || "Loading equipment data..."}
          </div>
        ) : (
          <EquipmentDisplay
            summary={equipmentSummary}
            powerUnits={saferData?.powerUnits ? String(saferData.powerUnits) : carrierInfo?.power_units}
            driverCount={saferData?.drivers ? String(saferData.drivers) : carrierInfo?.total_drivers}
          />
        )}
      </div>

      {/* Tabs */}
      <div className="content-container">
        <div className="tab-navigation" role="tablist" aria-label="Carrier detail tabs">
          {(["authority", "lanes", "insurance", "crashes", "inspections"] as TabName[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={activeTab === tab ? "active-tab" : ""}
              role="tab"
              aria-selected={activeTab === tab}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === "inspections" && filteredInspections.length > 0 && ` (${filteredInspections.length})`}
              {tab === "crashes" && crashData && crashData.length > 0 && ` (${crashData.length})`}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          {/* AUTHORITY TAB */}
          {activeTab === "authority" && (
            <section>
              <h2>Authority</h2>
              {tabLoading.authority ? (
                <p>Loading authority data...</p>
              ) : authorityData && authorityData.length > 0 ? (
                <table className="tab-data-table">
                  <thead><tr><th>Field</th><th>Value</th></tr></thead>
                  <tbody>
                    {Object.entries(authorityData[0]).map(([key, value]) => (
                      <tr key={key}>
                        <td>{key.replace(/_/g, " ")}</td>
                        <td>{String(value ?? "N/A")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No authority data available</p>
              )}
            </section>
          )}

          {/* LANES TAB - with top shippers */}
          {activeTab === "lanes" && (
            <section>
              <div className="results-summary">
                <div>
                  <span className="color-muted">
                    Showing <strong>{filteredInspections.length}</strong> of {inspections.length} inspections
                  </span>
                </div>
                <div className="flex-center-gap-8">
                  <label htmlFor="timeWindow" className="color-muted">Time window:</label>
                  <select
                    id="timeWindow"
                    value={inspectionWindow}
                    onChange={(e) => setInspectionWindow(Number(e.target.value))}
                    className="select-field"
                  >
                    <option value={1}>Last 1 year</option>
                    <option value={2}>Last 2 years</option>
                    <option value={5}>Last 5 years</option>
                    <option value={0}>All time</option>
                  </select>
                </div>
              </div>
              <div className="lanes-split">
                {/* Lanes - US Heat Map */}
                <div className="lanes-split-col">
                  <h2>Inspection States</h2>
                  {lanes.length > 0 ? (
                    <USHeatMap stateData={lanes} totalInspections={inspectionStats.count} />
                  ) : (
                    <p>{equipmentLoading ? "Loading..." : "No lane data available"}</p>
                  )}
                </div>

                {/* Top Shippers */}
                <div className="lanes-split-col">
                  <h2>Top Shippers (from Inspections)</h2>
                  {topShippers.length > 0 ? (
                    <table className="tab-data-table">
                      <thead>
                        <tr>
                          <th>Shipper / Consignee</th>
                          <th>Appearances</th>
                          <th>Also Listed As</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topShippers.map(([shipper, count, variants]) => (
                          <tr key={shipper}>
                            <td><strong>{shipper}</strong></td>
                            <td>{count}</td>
                            <td className="fs-11 color-muted text-truncate">
                              {variants.length > 0 ? variants.slice(0, 3).join(", ") + (variants.length > 3 ? ` +${variants.length - 3} more` : "") : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p>{equipmentLoading ? "Loading..." : "No shipper data available"}</p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* INSURANCE TAB */}
          {activeTab === "insurance" && (
            <section>
              <h2>Insurance Coverage</h2>
              {tabLoading.insurance ? (
                <p>Loading insurance data...</p>
              ) : insuranceData ? (
                <>
                  <p className="fs-small color-muted" style={{ marginBottom: "16px" }}>
                    Source: FMCSA Licensing & Insurance |{" "}
                    <a
                      href={`https://li-public.fmcsa.dot.gov/LIVIEW/pkg_carrquery.prc_carrlist?n_dotno=${dotNumber}&s_prefix=MC&n_docketno=&s_legalname=&s_dbaname=&s_state=`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="dot-link"
                    >
                      View on FMCSA L&I
                    </a>
                  </p>

                  {/* Coverage Summary Cards */}
                  {insuranceData.coverage && (
                    <div className="stats-box">
                      {/* BIPD Card */}
                      <div className={`stats-card ${insuranceData.bipd_status === "compliant" ? "success" : insuranceData.bipd_status === "non-compliant" ? "error" : "neutral"}`}>
                        <div className="stats-card-header">
                          <span className="stats-card-label">BIPD (Primary)</span>
                          <span className={`status-badge ${insuranceData.bipd_status === "compliant" ? "success" : insuranceData.bipd_status === "non-compliant" ? "error" : "neutral"}`}>
                            {insuranceData.bipd_status === "compliant" ? "COMPLIANT" : insuranceData.bipd_status === "non-compliant" ? "NON-COMPLIANT" : "N/A"}
                          </span>
                        </div>
                        <div className="stats-card-body">
                          <div>Required: <strong>${(insuranceData.coverage.bipd.requiredAmount || 0).toLocaleString()},000</strong></div>
                          <div>On File: <strong>${(insuranceData.coverage.bipd.onFileAmount || 0).toLocaleString()},000</strong></div>
                        </div>
                      </div>

                      {/* Cargo Card */}
                      <div className={`stats-card ${insuranceData.cargo_status === "compliant" ? "success" : insuranceData.cargo_status === "non-compliant" ? "error" : "neutral"}`}>
                        <div className="stats-card-header">
                          <span className="stats-card-label">Cargo Insurance</span>
                          <span className={`status-badge ${insuranceData.cargo_status === "compliant" ? "success" : insuranceData.cargo_status === "non-compliant" ? "error" : "neutral"}`}>
                            {insuranceData.cargo_status === "compliant" ? "ON FILE" : insuranceData.cargo_status === "not_required" ? "NOT REQ" : insuranceData.cargo_status === "non-compliant" ? "MISSING" : "N/A"}
                          </span>
                        </div>
                        <div className="stats-card-body">
                          {insuranceData.coverage.cargo.required ? (
                            <div>On File: <strong>${(insuranceData.coverage.cargo.onFileAmount || 0).toLocaleString()},000</strong></div>
                          ) : (
                            <div>Not Required</div>
                          )}
                        </div>
                      </div>

                      {/* Bond/Surety Card */}
                      <div className={`stats-card ${insuranceData.bond_status === "compliant" ? "success" : insuranceData.bond_status === "non-compliant" ? "error" : "neutral"}`}>
                        <div className="stats-card-header">
                          <span className="stats-card-label">Bond / Surety</span>
                          <span className={`status-badge ${insuranceData.bond_status === "compliant" ? "success" : insuranceData.bond_status === "non-compliant" ? "error" : "neutral"}`}>
                            {insuranceData.bond_status === "compliant" ? "ON FILE" : insuranceData.bond_status === "not_required" ? "NOT REQ" : insuranceData.bond_status === "non-compliant" ? "MISSING" : "N/A"}
                          </span>
                        </div>
                        <div className="stats-card-body">
                          {insuranceData.coverage.bond.required ? (
                            <div>On File: <strong>${(insuranceData.coverage.bond.onFileAmount || 0).toLocaleString()},000</strong></div>
                          ) : (
                            <div>Not Required</div>
                          )}
                        </div>
                      </div>

                      {/* Authority Summary Card */}
                      {insuranceData.authority && insuranceData.authority.length > 0 && (
                        <div className="stats-card neutral">
                          <div className="stats-card-label" style={{ marginBottom: "8px" }}>Authority Status</div>
                          {insuranceData.authority.map((auth: { docketNumber: string; commonStatus: string; contractStatus: string; brokerStatus: string; property: boolean; passenger: boolean; hhg: boolean; broker: boolean }, i: number) => (
                            <div key={i} className="authority-detail-grid">
                              <span>Docket:</span>
                              <strong>{auth.docketNumber}</strong>
                              <span>Common:</span>
                              <strong className={auth.commonStatus === "A" ? "text-success" : "text-error"}>
                                {auth.commonStatus === "A" ? "Active" : auth.commonStatus === "I" ? "Inactive" : auth.commonStatus || "N/A"}
                              </strong>
                              <span>Contract:</span>
                              <strong className={auth.contractStatus === "A" ? "text-success" : "color-muted"}>
                                {auth.contractStatus === "A" ? "Active" : auth.contractStatus === "I" ? "Inactive" : auth.contractStatus || "N/A"}
                              </strong>
                              <span>Broker:</span>
                              <strong className={auth.brokerStatus === "A" ? "text-success" : "color-muted"}>
                                {auth.brokerStatus === "A" ? "Active" : auth.brokerStatus === "I" ? "Inactive" : auth.brokerStatus || "N/A"}
                              </strong>
                              <span>Authorized:</span>
                              <strong>{[auth.property && "Property", auth.passenger && "Passenger", auth.hhg && "HHG", auth.broker && "Broker"].filter(Boolean).join(", ") || "None"}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Per-policy detail table (if available from blob file) */}
                  {insuranceData.policies && insuranceData.policies.length > 0 && (
                    <>
                      <h3 className="section-subheading">Active / Pending Policies</h3>
                      <table className="tab-data-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Insurance Carrier</th>
                            <th>Policy #</th>
                            <th>Coverage Limit</th>
                            <th>Effective Date</th>
                            <th>Cancellation Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {insuranceData.policies.map((ins: { insurance_type: string; insurance_carrier: string; policy_number: string; coverage_to: number; effective_date: string; cancellation_date: string }, idx: number) => (
                            <tr key={idx}>
                              <td>{ins.insurance_type || "N/A"}</td>
                              <td>{ins.insurance_carrier || "N/A"}</td>
                              <td style={{ fontFamily: "monospace" }} className="fs-11">{ins.policy_number || "N/A"}</td>
                              <td>{ins.coverage_to ? `$${Number(ins.coverage_to).toLocaleString()},000` : "N/A"}</td>
                              <td>{ins.effective_date || "N/A"}</td>
                              <td>{ins.cancellation_date || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  {(!insuranceData.policies || insuranceData.policies.length === 0) && !insuranceData.coverage && (
                    <p className="color-muted">No detailed insurance records found for this DOT number.</p>
                  )}
                </>
              ) : (
                <p>No insurance data available.</p>
              )}
            </section>
          )}

          {/* CRASHES TAB */}
          {activeTab === "crashes" && (
            <section>
              <div className="results-summary">
                <h2 className="section-title" style={{ margin: 0 }}>Crashes</h2>
                <div className="flex-center-gap-8">
                  <span className="color-muted">
                    Showing <strong>{filteredCrashes.length}</strong> of {crashData?.length || 0}
                  </span>
                  <select
                    value={crashWindow}
                    onChange={(e) => setCrashWindow(Number(e.target.value))}
                    className="select-field"
                    aria-label="Crash time window"
                  >
                    <option value={1}>Last 1 year</option>
                    <option value={2}>Last 2 years</option>
                    <option value={5}>Last 5 years</option>
                    <option value={0}>All time</option>
                  </select>
                </div>
              </div>
              {tabLoading.crashes ? (
                <p>Loading crash data...</p>
              ) : filteredCrashes.length > 0 ? (
                <>
                  <div className="crash-stats-bar">
                    <strong>Total Crashes:</strong> {filteredCrashes.length} |{" "}
                    <strong>Fatalities:</strong> {filteredCrashes.reduce((s, c) => s + parseInt(c.fatalities || "0", 10), 0)} |{" "}
                    <strong>Injuries:</strong> {filteredCrashes.reduce((s, c) => s + parseInt(c.injuries || "0", 10), 0)} |{" "}
                    <strong>Tow-Away:</strong> {filteredCrashes.filter((c) => c.tow_away === "Y" || c.tow_away === "Yes").length}
                  </div>
                  <div className="legend-bar">
                    <span><span className="legend-swatch swatch-error" /> Fatalities reported</span>
                    <span><span className="legend-swatch swatch-warning" /> Injuries reported</span>
                  </div>
                  <table className="tab-data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>State</th>
                        <th>Location</th>
                        <th>City</th>
                        <th>Fatalities</th>
                        <th>Injuries</th>
                        <th>Tow Away</th>
                        <th>Report #</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCrashes.map((crash, idx) => (
                        <tr key={idx}>
                          <td>{formatDate(crash.report_date)}</td>
                          <td>{crash.report_state || "N/A"}</td>
                          <td>{crash.location || "N/A"}</td>
                          <td>{crash.city || "N/A"}</td>
                          <td className={parseInt(crash.fatalities || "0") > 0 ? "text-error font-bold" : ""}>
                            {crash.fatalities || "0"}
                          </td>
                          <td className={parseInt(crash.injuries || "0") > 0 ? "text-warning" : ""}>
                            {crash.injuries || "0"}
                          </td>
                          <td>{crash.tow_away === "Y" || crash.tow_away === "Yes" ? "Yes" : crash.tow_away === "N" || crash.tow_away === "No" ? "No" : crash.tow_away || "N/A"}</td>
                          <td>{crash.report_number || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <p>No crash data for the selected time period</p>
              )}
            </section>
          )}

          {/* INSPECTIONS TAB - more granular */}
          {activeTab === "inspections" && (
            <section>
              <div className="results-summary">
                <h2 className="section-title" style={{ margin: 0 }}>Inspections</h2>
                <div className="flex-center-gap-8">
                  <span className="color-muted">
                    Showing <strong>{filteredInspections.length}</strong> of {inspections.length}
                  </span>
                  <select
                    value={inspectionWindow}
                    onChange={(e) => setInspectionWindow(Number(e.target.value))}
                    className="select-field"
                    aria-label="Inspection time window"
                  >
                    <option value={1}>Last 1 year</option>
                    <option value={2}>Last 2 years</option>
                    <option value={5}>Last 5 years</option>
                    <option value={0}>All time</option>
                  </select>
                </div>
              </div>
              {filteredInspections.length > 0 ? (
                <>
                <div className="legend-bar">
                  <span><span className="legend-swatch swatch-oos" /> Out-of-Service violation(s)</span>
                  <span><span className="legend-swatch swatch-outline" /> <strong>Bold</strong> = has violations</span>
                </div>
                <div className="inspection-scroll">
                  <table className="tab-data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>State</th>
                        <th>Location</th>
                        <th>Level</th>
                        <th>Violations</th>
                        <th>OOS</th>
                        <th>Driver Viol.</th>
                        <th>Vehicle Viol.</th>
                        <th>Shipper</th>
                        <th>GVW (lbs)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInspections.map((insp, idx) => {
                        const hasOOS = parseInt(insp.oos_total || "0") > 0;
                        return (
                          <tr key={idx} className={hasOOS ? "row-oos" : ""}>
                            <td>{formatDate(insp.insp_date)}</td>
                            <td>{insp.report_state || "N/A"}</td>
                            <td title={insp.location_desc}>{insp.location_desc || insp.location || "N/A"}</td>
                            <td>{insp.insp_level_id || "N/A"}</td>
                            <td className={parseInt(insp.viol_total || "0") > 0 ? "font-bold" : ""}>
                              {insp.viol_total || "0"}
                            </td>
                            <td className={hasOOS ? "text-error font-bold" : ""}>
                              {insp.oos_total || "0"}
                            </td>
                            <td>{insp.driver_viol_total || "0"}</td>
                            <td>{insp.vehicle_viol_total || "0"}</td>
                            <td className="text-truncate"
                              title={insp.shipper_name}>
                              {insp.shipper_name && insp.shipper_name !== "N/A" ? insp.shipper_name : "-"}
                            </td>
                            <td>{insp.gross_comb_veh_wt ? Number(insp.gross_comb_veh_wt).toLocaleString() : "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                </>
              ) : equipmentLoading ? (
                <p>Loading inspections...</p>
              ) : (
                <p>No inspection data available</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
