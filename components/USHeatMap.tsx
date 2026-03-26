"use client";

import { useMemo } from "react";
import { STATE_PATHS } from "./usStatePathsData";

// Small states that need external labels with leader lines
const SMALL_STATES = new Set(["CT", "DE", "DC", "MA", "MD", "NH", "NJ", "RI", "VT"]);

// Manual label offsets for small states (positioned outside the state with a leader line)
const LABEL_OFFSETS: Record<string, { lx: number; ly: number }> = {
  CT: { lx: 870, ly: 215 },
  DE: { lx: 870, ly: 265 },
  DC: { lx: 870, ly: 285 },
  MA: { lx: 870, ly: 195 },
  MD: { lx: 870, ly: 305 },
  NH: { lx: 870, ly: 135 },
  NJ: { lx: 870, ly: 245 },
  RI: { lx: 870, ly: 225 },
  VT: { lx: 870, ly: 155 },
};

interface USHeatMapProps {
  stateData: [string, number][]; // [stateCode, count][]
  totalInspections: number;
}

export default function USHeatMap({ stateData, totalInspections }: USHeatMapProps) {
  const { maxCount, stateMap } = useMemo(() => {
    const map = new Map<string, number>();
    let max = 0;
    for (const [state, count] of stateData) {
      map.set(state, count);
      if (count > max) max = count;
    }
    return { maxCount: max, stateMap: map };
  }, [stateData]);

  // Color scale: light gray (unvisited) → light blue → dark blue (#005e8c)
  const getColor = (count: number): string => {
    if (count === 0) return "#e8ecf0";
    const intensity = Math.sqrt(count / maxCount); // sqrt for better distribution
    const r = Math.round(200 - intensity * 200);
    const g = Math.round(220 - intensity * (220 - 94));
    const b = Math.round(240 - intensity * (240 - 140));
    return `rgb(${r},${g},${b})`;
  };

  const isLightColor = (count: number): boolean => {
    if (count === 0) return true;
    const intensity = Math.sqrt(count / maxCount);
    return intensity < 0.45;
  };

  return (
    <div>
      <svg
        viewBox="-10 0 970 620"
        style={{ width: "100%", maxWidth: "800px", height: "auto" }}
        role="img"
        aria-label="US heat map of inspection states"
      >
        {/* Render all state paths */}
        {Object.entries(STATE_PATHS).map(([state, { d, cx, cy }]) => {
          const count = stateMap.get(state) || 0;
          const pct = totalInspections > 0 ? ((count / totalInspections) * 100).toFixed(1) : "0";
          const isSmall = SMALL_STATES.has(state);
          const offset = LABEL_OFFSETS[state];

          return (
            <g key={state}>
              <path
                d={d}
                fill={getColor(count)}
                stroke="#fff"
                strokeWidth="1.2"
                strokeLinejoin="round"
                style={{ cursor: count > 0 ? "pointer" : "default" }}
              >
                <title>{`${state}: ${count.toLocaleString()} inspections (${pct}%)`}</title>
              </path>

              {/* State labels */}
              {count > 0 && !isSmall && (
                <text
                  x={cx}
                  y={cy}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="9"
                  fontWeight="600"
                  fill={isLightColor(count) ? "#333" : "#fff"}
                  style={{ pointerEvents: "none" }}
                >
                  {state}
                </text>
              )}

              {/* Small state labels with leader lines */}
              {count > 0 && isSmall && offset && (
                <>
                  <line
                    x1={cx}
                    y1={cy}
                    x2={offset.lx - 20}
                    y2={offset.ly}
                    stroke="#999"
                    strokeWidth="0.5"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={offset.lx - 16}
                    y={offset.ly}
                    textAnchor="start"
                    dominantBaseline="central"
                    fontSize="8.5"
                    fontWeight="600"
                    fill="#333"
                    style={{ pointerEvents: "none" }}
                  >
                    {state}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend gradient */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px", justifyContent: "center" }}>
        <span style={{ fontSize: "11px", color: "#666" }}>0</span>
        <div style={{
          width: "200px", height: "12px", borderRadius: "6px",
          background: "linear-gradient(to right, #e8ecf0, #7ab3d4, #005e8c)",
          border: "1px solid #ddd",
        }} />
        <span style={{ fontSize: "11px", color: "#666" }}>{maxCount.toLocaleString()}</span>
        <span style={{ fontSize: "11px", color: "#999", marginLeft: "8px" }}>inspections</span>
      </div>

      {/* Top 10 states table */}
      <div style={{ marginTop: "16px" }}>
        <table className="tab-data-table" style={{ maxWidth: "400px", margin: "0 auto" }}>
          <thead>
            <tr>
              <th>State</th>
              <th>Inspections</th>
              <th>% of Total</th>
            </tr>
          </thead>
          <tbody>
            {stateData.slice(0, 10).map(([state, count]) => (
              <tr key={state}>
                <td><strong>{state}</strong></td>
                <td>{count.toLocaleString()}</td>
                <td>{totalInspections > 0 ? ((count / totalInspections) * 100).toFixed(1) : 0}%</td>
              </tr>
            ))}
            {stateData.length > 10 && (
              <tr>
                <td colSpan={3} style={{ textAlign: "center", fontStyle: "italic", color: "#999" }}>
                  +{stateData.length - 10} more states
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
