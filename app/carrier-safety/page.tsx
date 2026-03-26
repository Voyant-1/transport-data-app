"use client";

import { useState, useCallback, useRef } from "react";
import Navbar from "@/components/Navbar";
import Link from "next/link";

async function getXLSX() {
  const mod = await import("xlsx");
  return mod.default || mod;
}

interface SafetyResult {
  input_name: string;
  input_city?: string;
  input_state?: string;
  input_zip?: string;
  input_dot?: string;
  matched: boolean;
  match_type?: "exact_dot" | "fuzzy_name";
  other_candidates?: Array<{ dot_number: string; legal_name: string; phy_city: string; phy_state: string; power_units: string }>;
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
  safer_power_units?: number;
  safer_drivers?: number;
  safer_authority?: string;
  crash_count?: number;
  fatalities?: number;
  injuries?: number;
  inspection_count_2yr?: number;
  vehicle_inspections_2yr?: number;
  vehicle_oos_2yr?: number;
  vehicle_oos_pct?: string;
  driver_inspections_2yr?: number;
  driver_oos_2yr?: number;
  driver_oos_pct?: string;
}

export default function CarrierSafetyPage() {
  const [results, setResults] = useState<SafetyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = useCallback(async () => {
    const XLSX = await getXLSX();
    const templateData = [
      { "Carrier Name": "Schneider National Inc", "City": "Green Bay", "State": "WI", "ZIP": "54307", "DOT Number": "" },
      { "Carrier Name": "Werner Enterprises", "City": "Omaha", "State": "NE", "ZIP": "", "DOT Number": "53467" },
      { "Carrier Name": "", "City": "", "State": "", "ZIP": "", "DOT Number": "164311" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    ws["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 8 }, { wch: 10 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Safety Check Template");
    XLSX.writeFile(wb, "carrier-safety-check-template.xlsx");
  }, []);

  const parseExcelFile = useCallback(async (file: File) => {
    const XLSX = await getXLSX();
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      throw new Error("Excel file is empty");
    }

    // Normalize column headers (case-insensitive)
    return rows.map((row) => {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key.toLowerCase().trim()] = String(value).trim();
      }

      return {
        name: normalized["carrier name"] || normalized["name"] || normalized["legal name"] || normalized["carrier"] || "",
        city: normalized["city"] || normalized["phy_city"] || "",
        state: normalized["state"] || normalized["phy_state"] || normalized["st"] || "",
        zip: normalized["zip"] || normalized["phy_zip"] || normalized["zipcode"] || normalized["zip code"] || "",
        dot: normalized["dot"] || normalized["dot number"] || normalized["dot_number"] || normalized["dot #"] || normalized["usdot"] || "",
      };
    }).filter((r) => r.name || r.dot);
  }, []);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError("");
    setResults([]);
    setLoading(true);

    try {
      const rows = await parseExcelFile(file);
      if (rows.length > 100) {
        setError("Maximum 100 carriers per upload. Your file has " + rows.length + " rows.");
        setLoading(false);
        return;
      }

      setProgress(`Processing ${rows.length} carriers...`);

      // Process in batches of 10
      const allResults: SafetyResult[] = [];
      for (let i = 0; i < rows.length; i += 10) {
        const batch = rows.slice(i, i + 10);
        setProgress(`Processing carriers ${i + 1}-${Math.min(i + 10, rows.length)} of ${rows.length}...`);

        const res = await fetch("/api/safety-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: batch }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `API error ${res.status}`);
        }

        const data = await res.json();
        allResults.push(...data.results);
        setResults([...allResults]);
      }

      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file");
    } finally {
      setLoading(false);
    }
  }, [parseExcelFile]);

  const exportToCSV = useCallback(() => {
    if (results.length === 0) return;

    const headers = [
      "Input Name", "Input City", "Input State", "Input ZIP", "Input DOT",
      "Match Type", "DOT Number", "Legal Name", "DBA", "City", "State", "ZIP", "Phone",
      "Power Units (SAFER)", "Drivers (SAFER)", "Authority",
      "Safety Rating", "Status",
      "Crash Count", "Fatalities", "Injuries",
      "Inspections (2yr)", "Vehicle Insp", "Vehicle OOS", "Vehicle OOS %",
      "Driver Insp", "Driver OOS", "Driver OOS %",
      "Alternate DOTs",
    ];

    const csvRows = results.map((r) => [
      r.input_name, r.input_city || "", r.input_state || "", r.input_zip || "", r.input_dot || "",
      !r.matched ? "No Match" : r.match_type === "exact_dot" ? "Exact (DOT)" : "Fuzzy (Name)",
      r.dot_number || "", r.legal_name || "", r.dba_name || "",
      r.phy_city || "", r.phy_state || "", r.phy_zip || "", r.phone || "",
      r.safer_power_units || r.power_units || "", r.safer_drivers || r.total_drivers || "",
      r.safer_authority || "",
      r.safety_rating || "", r.status_code || "",
      r.crash_count ?? "", r.fatalities ?? "", r.injuries ?? "",
      r.inspection_count_2yr ?? "", r.vehicle_inspections_2yr ?? "",
      r.vehicle_oos_2yr ?? "", r.vehicle_oos_pct ? `${r.vehicle_oos_pct}%` : "",
      r.driver_inspections_2yr ?? "", r.driver_oos_2yr ?? "",
      r.driver_oos_pct ? `${r.driver_oos_pct}%` : "",
      r.other_candidates?.map(c => `${c.dot_number} (${c.legal_name})`).join("; ") || "",
    ]);

    const csv = [headers, ...csvRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `carrier-safety-check-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  const exportToExcel = useCallback(async () => {
    if (results.length === 0) return;

    const XLSX = await getXLSX();
    const exportData = results.map((r) => ({
      "Input Name": r.input_name,
      "Input City": r.input_city || "",
      "Input State": r.input_state || "",
      "Input ZIP": r.input_zip || "",
      "Input DOT": r.input_dot || "",
      "Match Type": !r.matched ? "No Match" : r.match_type === "exact_dot" ? "Exact (DOT)" : "Fuzzy (Name)",
      "DOT Number": r.dot_number || "",
      "Legal Name": r.legal_name || "",
      "DBA": r.dba_name || "",
      "City": r.phy_city || "",
      "State": r.phy_state || "",
      "ZIP": r.phy_zip || "",
      "Phone": r.phone || "",
      "Power Units (SAFER)": r.safer_power_units || r.power_units || "",
      "Drivers (SAFER)": r.safer_drivers || r.total_drivers || "",
      "Authority": r.safer_authority || "",
      "Safety Rating": r.safety_rating || "",
      "Status": r.status_code || "",
      "Crash Count": r.crash_count ?? "",
      "Fatalities": r.fatalities ?? "",
      "Injuries": r.injuries ?? "",
      "Inspections (2yr)": r.inspection_count_2yr ?? "",
      "Vehicle Inspections": r.vehicle_inspections_2yr ?? "",
      "Vehicle OOS": r.vehicle_oos_2yr ?? "",
      "Vehicle OOS %": r.vehicle_oos_pct ? `${r.vehicle_oos_pct}%` : "",
      "Driver Inspections": r.driver_inspections_2yr ?? "",
      "Driver OOS": r.driver_oos_2yr ?? "",
      "Driver OOS %": r.driver_oos_pct ? `${r.driver_oos_pct}%` : "",
      "Alternate DOTs": r.other_candidates?.map(c => `${c.dot_number} (${c.legal_name})`).join("; ") || "",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Safety Check");
    XLSX.writeFile(wb, `carrier-safety-check-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [results]);

  const matchedCount = results.filter((r) => r.matched).length;
  const unmatchedCount = results.filter((r) => !r.matched).length;
  const fuzzyCount = results.filter((r) => r.match_type === "fuzzy_name").length;

  const toggleCandidates = (idx: number) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div className="page-wrapper">
      <Navbar activeLink="carrier-safety" />

      <div className="content-area">
        <h1 className="page-heading">Carrier Safety Check</h1>
        <p className="page-subheading">
          Upload an Excel file with carrier names and locations or DOT numbers to get safety data for all carriers at once.
        </p>

        {/* Upload Section */}
        <div
          className="upload-zone"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#005e8c"; }}
          onDragLeave={(e) => { e.currentTarget.style.borderColor = "#d1d9e6"; }}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "#d1d9e6";
            const file = e.dataTransfer.files[0];
            if (file && fileInputRef.current) {
              const dt = new DataTransfer();
              dt.items.add(file);
              fileInputRef.current.files = dt.files;
              fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            style={{ display: "none" }}
          />
          <div className="upload-icon">📁</div>
          <p className="upload-title">
            {fileName || "Drop Excel file here or click to browse"}
          </p>
          <p className="upload-hint">
            Accepts .xlsx, .xls, .csv — Max 100 carriers per upload
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
            className="btn btn-secondary btn-sm"
            style={{ marginTop: "12px" }}
          >
            Download Template
          </button>
        </div>

        {/* Expected format guide */}
        <div className="format-guide">
          <strong>Expected columns:</strong>{" "}
          <code>Carrier Name</code>, <code>City</code>, <code>State</code>, <code>ZIP</code> — OR —{" "}
          <code>Carrier Name</code>, <code>DOT Number</code>
          <br />
          <span className="color-muted">Column headers are flexible — the system recognizes common variations.</span>
        </div>

        {/* Progress */}
        {loading && (
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
            {/* Summary bar */}
            <div className="results-summary">
              <div className="results-counts">
                <span><strong>{results.length}</strong> total</span>
                <span className="text-success">✓ <strong>{matchedCount}</strong> matched</span>
                {fuzzyCount > 0 && (
                  <span className="text-warning">⚠ <strong>{fuzzyCount}</strong> fuzzy (review recommended)</span>
                )}
                {unmatchedCount > 0 && (
                  <span className="text-error">✗ <strong>{unmatchedCount}</strong> not found</span>
                )}
              </div>
              <div className="results-actions">
                <button onClick={exportToCSV} className="btn btn-secondary btn-sm">
                  Export CSV
                </button>
                <button onClick={exportToExcel} className="btn btn-primary btn-sm">
                  Export Excel
                </button>
              </div>
            </div>

            {/* Results table */}
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Input Name</th>
                    <th>Match</th>
                    <th>DOT #</th>
                    <th>Legal Name</th>
                    <th>City</th>
                    <th>State</th>
                    <th>Authority</th>
                    <th>Power Units</th>
                    <th>Drivers</th>
                    <th>Safety Rating</th>
                    <th>Crashes</th>
                    <th>Fatalities</th>
                    <th>Injuries</th>
                    <th>Insp (2yr)</th>
                    <th>Veh Insp</th>
                    <th>Veh OOS</th>
                    <th>Veh OOS %</th>
                    <th>Drv Insp</th>
                    <th>Drv OOS</th>
                    <th>Drv OOS %</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => {
                    const isFuzzy = r.match_type === "fuzzy_name";
                    const hasCandidates = isFuzzy && r.other_candidates && r.other_candidates.length > 0;
                    const isExpanded = expandedRows.has(idx);

                    return (
                      <>
                        <tr
                          key={idx}
                          className={!r.matched ? "row-unmatched" : isFuzzy ? "row-fuzzy" : (r.fatalities && r.fatalities > 0) ? "row-fatality" : ""}
                        >
                          <td className="text-truncate">{r.input_name}</td>
                          <td className="fw-600 fs-11">
                            {!r.matched ? (
                              <span className="text-error">✗ None</span>
                            ) : r.match_type === "exact_dot" ? (
                              <span className="text-success">✓ DOT</span>
                            ) : (
                              <span
                                className="text-warning"
                                style={{ cursor: hasCandidates ? "pointer" : "default" }}
                                onClick={() => { if (hasCandidates) toggleCandidates(idx); }}
                                title={hasCandidates ? "Click to see other possible matches" : undefined}
                              >
                                ⚠ Fuzzy{hasCandidates ? ` ▾` : ""}
                              </span>
                            )}
                          </td>
                          <td>
                            {r.dot_number ? (
                              <Link href={`/result/${r.dot_number}`} className="dot-link">
                                {r.dot_number}
                              </Link>
                            ) : "-"}
                          </td>
                          <td className="text-truncate">{r.legal_name || "-"}</td>
                          <td>{r.phy_city || "-"}</td>
                          <td>{r.phy_state || "-"}</td>
                          <td className={`fw-600 ${r.safer_authority?.includes("NOT") ? "text-error" : r.safer_authority?.includes("AUTHORIZED") ? "text-success" : ""}`}>
                            {r.safer_authority || "-"}
                          </td>
                          <td>{r.safer_power_units || r.power_units || "-"}</td>
                          <td>{r.safer_drivers || r.total_drivers || "-"}</td>
                          <td>{r.safety_rating || "-"}</td>
                          <td className={(r.crash_count || 0) > 0 ? "fw-600" : ""}>{r.crash_count ?? "-"}</td>
                          <td className={(r.fatalities || 0) > 0 ? "text-error font-bold" : ""}>
                            {r.fatalities ?? "-"}
                          </td>
                          <td className={(r.injuries || 0) > 0 ? "text-warning" : ""}>{r.injuries ?? "-"}</td>
                          <td>{r.inspection_count_2yr ?? "-"}</td>
                          <td>{r.vehicle_inspections_2yr ?? "-"}</td>
                          <td>{r.vehicle_oos_2yr ?? "-"}</td>
                          <td className={`${parseFloat(r.vehicle_oos_pct || "0") > 30 ? "text-error fw-600" : parseFloat(r.vehicle_oos_pct || "0") > 20 ? "text-warning fw-600" : ""}`}>
                            {r.vehicle_oos_pct ? `${r.vehicle_oos_pct}%` : "-"}
                          </td>
                          <td>{r.driver_inspections_2yr ?? "-"}</td>
                          <td>{r.driver_oos_2yr ?? "-"}</td>
                          <td className={`${parseFloat(r.driver_oos_pct || "0") > 10 ? "text-error fw-600" : parseFloat(r.driver_oos_pct || "0") > 5 ? "text-warning fw-600" : ""}`}>
                            {r.driver_oos_pct ? `${r.driver_oos_pct}%` : "-"}
                          </td>
                        </tr>
                        {/* Expandable candidate rows for fuzzy matches */}
                        {isExpanded && hasCandidates && r.other_candidates!.map((c, cidx) => (
                          <tr
                            key={`${idx}-alt-${cidx}`}
                            className="row-candidate"
                          >
                            <td className="color-muted" style={{ paddingLeft: "24px", fontStyle: "italic" }}>
                              ↳ Alt match #{cidx + 2}
                            </td>
                            <td className="color-muted fs-11">candidate</td>
                            <td>
                              <Link href={`/result/${c.dot_number}`} className="dot-link">
                                {c.dot_number}
                              </Link>
                            </td>
                            <td>{c.legal_name}</td>
                            <td>{c.phy_city}</td>
                            <td>{c.phy_state}</td>
                            <td colSpan={14} className="color-muted">
                              {parseInt(c.power_units || "0").toLocaleString()} power units — click DOT # to view full details
                            </td>
                          </tr>
                        ))}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Color legend */}
            <div className="legend-bar">
              <span><span className="legend-swatch row-unmatched" /> Not matched</span>
              <span><span className="legend-swatch row-fuzzy" /> Fuzzy match (review)</span>
              <span><span className="legend-swatch row-fatality" /> Has fatalities</span>
              <span className="text-error"><strong>Red %</strong> = above national average OOS rate</span>
              <span className="color-muted">Click <strong>⚠ Fuzzy ▾</strong> to see alternate matches</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
