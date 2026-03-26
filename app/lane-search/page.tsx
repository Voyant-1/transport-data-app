"use client";

import { useState, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import CityStateInput from "@/components/CityStateInput";
import Link from "next/link";

async function getXLSX() {
  const mod = await import("xlsx");
  return mod.default || mod;
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

type SearchMode = "single" | "bulk";

export default function LaneSearchPage() {
  const [mode, setMode] = useState<SearchMode>("single");
  const [results, setResults] = useState<CarrierMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single search fields
  const [originCity, setOriginCity] = useState("");
  const [originState, setOriginState] = useState("");
  const [destCity, setDestCity] = useState("");
  const [destState, setDestState] = useState("");
  const [radius, setRadius] = useState(100);
  const [equipmentType, setEquipmentType] = useState("");

  // Display values for the autocomplete inputs
  const [originDisplay, setOriginDisplay] = useState("");
  const [destDisplay, setDestDisplay] = useState("");

  const handleSingleSearch = useCallback(async () => {
    if (!originCity || !originState || !destCity || !destState) {
      setError("Please select both origin and destination (City, State)");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setProgress("Geocoding locations and searching carriers...");

    try {
      const res = await fetch("/api/lane-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originCity,
          originState,
          destCity,
          destState,
          radiusMiles: radius,
          equipmentType: equipmentType || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `API error ${res.status}`);
      }

      const data = await res.json();
      setResults(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }, [originCity, originState, destCity, destState, radius, equipmentType]);

  const handleBulkUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResults([]);

    try {
      const XLSX = await getXLSX();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const lanes = rows.map((row, idx) => {
        const norm: Record<string, string> = {};
        for (const [key, value] of Object.entries(row)) {
          norm[key.toLowerCase().trim()] = String(value).trim();
        }
        return {
          laneId: norm["lane id"] || norm["laneid"] || norm["lane_id"] || norm["id"] || `Lane-${idx + 1}`,
          originCity: norm["origin city"] || norm["origincity"] || norm["origin_city"] || norm["o city"] || "",
          originState: norm["origin state"] || norm["originstate"] || norm["origin_state"] || norm["o state"] || norm["o st"] || "",
          destCity: norm["dest city"] || norm["destcity"] || norm["dest_city"] || norm["destination city"] || norm["d city"] || "",
          destState: norm["dest state"] || norm["deststate"] || norm["dest_state"] || norm["destination state"] || norm["d state"] || norm["d st"] || "",
        };
      }).filter((l) => l.originCity && l.originState && l.destCity && l.destState);

      if (lanes.length === 0) {
        throw new Error("No valid lanes found. Expected columns: Lane ID, Origin City, Origin State, Dest City, Dest State");
      }

      if (lanes.length > 50) {
        throw new Error(`Maximum 50 lanes per upload. Your file has ${lanes.length} lanes.`);
      }

      setProgress(`Searching ${lanes.length} lanes with ${radius}mi radius...`);

      const res = await fetch("/api/lane-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lanes,
          radiusMiles: radius,
          equipmentType: equipmentType || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `API error ${res.status}`);
      }

      const data = await res.json();
      setResults(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }, [radius, equipmentType]);

  const downloadTemplate = useCallback(async () => {
    const XLSX = await getXLSX();
    const templateData = [
      { "Lane ID": "LANE-001", "Origin City": "Chicago", "Origin State": "IL", "Dest City": "Atlanta", "Dest State": "GA" },
      { "Lane ID": "LANE-002", "Origin City": "Dallas", "Origin State": "TX", "Dest City": "Memphis", "Dest State": "TN" },
      { "Lane ID": "LANE-003", "Origin City": "Los Angeles", "Origin State": "CA", "Dest City": "Phoenix", "Dest State": "AZ" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lane Template");
    XLSX.writeFile(wb, "lane-search-template.xlsx");
  }, []);

  const exportResults = useCallback(async () => {
    if (results.length === 0) return;

    const XLSX = await getXLSX();
    const exportData = results.map((r) => ({
      "DOT Number": r.dot_number,
      "Legal Name": r.legal_name,
      "City": r.phy_city,
      "State": r.phy_state,
      "ZIP": r.phy_zip,
      "Power Units": r.power_units,
      "Drivers": r.total_drivers,
      "Match Reason": r.matchReason.join("; "),
      ...(r.matchedLanes ? { "Matched Lanes": r.matchedLanes.join(", ") } : {}),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lane Search Results");
    XLSX.writeFile(wb, `lane-search-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [results]);

  return (
    <div className="page-wrapper">
      <Navbar activeLink="lane-search" />

      <div className="content-area">
        <h1 className="page-heading">Lane Search</h1>
        <p className="page-subheading">
          Find carriers that operate between two locations based on inspection data and registered addresses.
        </p>

        {/* Mode toggle */}
        <div className="mode-toggle">
          <button
            onClick={() => setMode("single")}
            className={`mode-btn ${mode === "single" ? "active" : ""}`}
          >
            Single Lane
          </button>
          <button
            onClick={() => setMode("bulk")}
            className={`mode-btn ${mode === "bulk" ? "active" : ""}`}
          >
            Bulk Upload
          </button>
        </div>

        {/* Shared controls */}
        <div className="controls-row">
          <div>
            <label className="control-label">Radius (miles)</label>
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="select-field"
            >
              <option value={50}>50 mi</option>
              <option value={100}>100 mi</option>
              <option value={150}>150 mi</option>
              <option value={200}>200 mi</option>
              <option value={300}>300 mi</option>
            </select>
          </div>
          <div>
            <label className="control-label">Equipment Type (optional)</label>
            <select
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value)}
              className="select-field"
            >
              <option value="">Any</option>
              <option value="van">Van / Dry Van</option>
              <option value="flatbed">Flatbed</option>
              <option value="reefer">Reefer</option>
              <option value="tanker">Tanker (Liquid)</option>
              <option value="pneumatic">Pneumatic (Dry Bulk)</option>
              <option value="bulk">Bulk (All — Dry + Liquid)</option>
              <option value="hopper">Hopper / Grain</option>
              <option value="intermodal">Intermodal</option>
            </select>
          </div>
        </div>

        {/* Single Lane Search */}
        {mode === "single" && (
          <div className="search-form-box">
            <div className="lane-row">
              <div>
                <h3 className="lane-section-title">Origin</h3>
                <CityStateInput
                  value={originDisplay}
                  onChange={(city, state) => {
                    setOriginCity(city);
                    setOriginState(state);
                    setOriginDisplay(city && state ? `${city}, ${state}` : "");
                  }}
                  placeholder="Start typing a city..."
                  style={{ width: "260px" }}
                />
              </div>
              <div className="lane-arrow">→</div>
              <div>
                <h3 className="lane-section-title">Destination</h3>
                <CityStateInput
                  value={destDisplay}
                  onChange={(city, state) => {
                    setDestCity(city);
                    setDestState(state);
                    setDestDisplay(city && state ? `${city}, ${state}` : "");
                  }}
                  placeholder="Start typing a city..."
                  style={{ width: "260px" }}
                />
              </div>
            </div>
            <button
              onClick={handleSingleSearch}
              disabled={loading}
              className="btn btn-primary fw-600"
            >
              {loading ? "Searching..." : "Search Carriers"}
            </button>
          </div>
        )}

        {/* Bulk Upload */}
        {mode === "bulk" && (
          <div
            className="upload-zone"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleBulkUpload}
              style={{ display: "none" }}
            />
            <div className="upload-icon">🗺️</div>
            <p className="upload-title">
              Drop lane file here or click to browse
            </p>
            <p className="upload-hint">
              Expected columns: <code>Lane ID</code>, <code>Origin City</code>, <code>Origin State</code>, <code>Dest City</code>, <code>Dest State</code>
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: "12px" }}
            >
              Download Template
            </button>
          </div>
        )}

        {/* Progress & Error */}
        {loading && progress && (
          <div className="progress-box">
            <div className="spinner" />
            <span>{progress}</span>
          </div>
        )}

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <>
            <div className="results-summary">
              <span>
                Found <strong>{total}</strong> carriers matching your lane criteria
              </span>
              <button onClick={exportResults} className="btn btn-primary btn-sm">
                Export Excel
              </button>
            </div>

            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>DOT #</th>
                    <th>Legal Name</th>
                    <th>City</th>
                    <th>State</th>
                    <th>Power Units</th>
                    <th>Drivers</th>
                    {results[0]?.matchedLanes && <th>Matched Lanes</th>}
                    <th>Match Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.dot_number}>
                      <td>
                        <Link href={`/result/${r.dot_number}`} className="dot-link">
                          {r.dot_number}
                        </Link>
                      </td>
                      <td className="text-truncate">
                        {r.legal_name}
                      </td>
                      <td>{r.phy_city}</td>
                      <td>{r.phy_state}</td>
                      <td>{r.power_units || "-"}</td>
                      <td>{r.total_drivers || "-"}</td>
                      {r.matchedLanes && (
                        <td className="text-truncate">
                          <strong>{r.matchedLanes.length}</strong>: {r.matchedLanes.join(", ")}
                        </td>
                      )}
                      <td className="fs-11 color-muted text-truncate">
                        {r.matchReason.slice(0, 3).join("; ")}
                        {r.matchReason.length > 3 && ` +${r.matchReason.length - 3} more`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
