"use client";

import React from "react";
import type { EquipmentSummary } from "@/lib/types";

const EXCLUDED_TYPES = new Set([
  "Not Applicable",
  "Incomplete Vehicle",
  "Incomplete",
  "",
  "No Body Type",
]);

const STANDARD_SIZES = new Set(["20", "28", "40", "42", "43", "45", "48", "53"]);

// Professional side-view equipment SVGs
function TractorIcon() {
  return (
    <svg viewBox="0 0 120 50" width="96" height="40" xmlns="http://www.w3.org/2000/svg">
      {/* Cab body */}
      <path d="M30 12 L70 12 L70 36 L20 36 L20 22 Z" fill="#8B9DAF" stroke="#5A6B7F" strokeWidth="1.2"/>
      {/* Hood */}
      <path d="M20 22 L8 28 L8 36 L20 36 Z" fill="#7A8C9E" stroke="#5A6B7F" strokeWidth="1.2"/>
      {/* Windshield */}
      <path d="M22 14 L30 14 L30 24 L22 22 Z" fill="#C5DCF0" stroke="#5A6B7F" strokeWidth="0.8"/>
      {/* Exhaust stack */}
      <rect x="16" y="6" width="3" height="16" rx="1" fill="#6B7B8D" stroke="#5A6B7F" strokeWidth="0.6"/>
      {/* Fifth wheel plate */}
      <rect x="58" y="34" width="16" height="3" rx="1" fill="#5A6B7F"/>
      {/* Front wheel */}
      <circle cx="16" cy="40" r="7" fill="#3D4F5F"/>
      <circle cx="16" cy="40" r="4" fill="#5A6B7F"/>
      <circle cx="16" cy="40" r="1.5" fill="#8B9DAF"/>
      {/* Rear wheels (tandem) */}
      <circle cx="52" cy="40" r="7" fill="#3D4F5F"/>
      <circle cx="52" cy="40" r="4" fill="#5A6B7F"/>
      <circle cx="52" cy="40" r="1.5" fill="#8B9DAF"/>
      <circle cx="66" cy="40" r="7" fill="#3D4F5F"/>
      <circle cx="66" cy="40" r="4" fill="#5A6B7F"/>
      <circle cx="66" cy="40" r="1.5" fill="#8B9DAF"/>
      {/* Bumper */}
      <rect x="4" y="34" width="8" height="3" rx="1" fill="#5A6B7F"/>
      {/* Headlight */}
      <rect x="6" y="28" width="3" height="3" rx="1" fill="#F0D060"/>
    </svg>
  );
}

function DryVanIcon() {
  return (
    <svg viewBox="0 0 140 50" width="112" height="40" xmlns="http://www.w3.org/2000/svg">
      {/* Trailer body */}
      <rect x="4" y="8" width="100" height="30" rx="1" fill="#C8D3DE" stroke="#5A6B7F" strokeWidth="1.2"/>
      {/* Vertical ribs */}
      {[20, 36, 52, 68, 84].map(x => (
        <line key={x} x1={x} y1="8" x2={x} y2="38" stroke="#B0BDCA" strokeWidth="0.6"/>
      ))}
      {/* Rear doors */}
      <rect x="100" y="10" width="4" height="28" fill="#A8B5C2" stroke="#5A6B7F" strokeWidth="0.8"/>
      <line x1="102" y1="10" x2="102" y2="38" stroke="#5A6B7F" strokeWidth="0.4"/>
      {/* Landing gear */}
      <line x1="10" y1="38" x2="10" y2="44" stroke="#5A6B7F" strokeWidth="1.5"/>
      <line x1="14" y1="38" x2="14" y2="44" stroke="#5A6B7F" strokeWidth="1.5"/>
      {/* Kingpin area */}
      <rect x="6" y="36" width="10" height="3" fill="#5A6B7F"/>
      {/* Rear wheels (tandem) */}
      <circle cx="80" cy="42" r="6" fill="#3D4F5F"/>
      <circle cx="80" cy="42" r="3.5" fill="#5A6B7F"/>
      <circle cx="80" cy="42" r="1.2" fill="#8B9DAF"/>
      <circle cx="94" cy="42" r="6" fill="#3D4F5F"/>
      <circle cx="94" cy="42" r="3.5" fill="#5A6B7F"/>
      <circle cx="94" cy="42" r="1.2" fill="#8B9DAF"/>
      {/* Mud flap */}
      <rect x="100" y="38" width="4" height="6" rx="1" fill="#4A5568"/>
      {/* DOT placard */}
      <rect x="44" y="14" width="16" height="10" rx="1" fill="#E8EDF2" stroke="#5A6B7F" strokeWidth="0.4"/>
    </svg>
  );
}

function FlatbedIcon() {
  return (
    <svg viewBox="0 0 140 50" width="112" height="40" xmlns="http://www.w3.org/2000/svg">
      {/* Deck */}
      <rect x="4" y="28" width="104" height="4" rx="0.5" fill="#A0785A" stroke="#5A6B7F" strokeWidth="1"/>
      {/* Headboard */}
      <rect x="4" y="12" width="4" height="20" rx="0.5" fill="#8B9DAF" stroke="#5A6B7F" strokeWidth="0.8"/>
      {/* Cross members */}
      {[20, 40, 60, 80].map(x => (
        <rect key={x} x={x} y="32" width="2" height="4" fill="#5A6B7F" rx="0.3"/>
      ))}
      {/* I-beam frame rails */}
      <rect x="4" y="32" width="104" height="2" fill="#7A8C9E" stroke="#5A6B7F" strokeWidth="0.6"/>
      {/* Landing gear */}
      <line x1="10" y1="34" x2="10" y2="42" stroke="#5A6B7F" strokeWidth="1.5"/>
      <line x1="14" y1="34" x2="14" y2="42" stroke="#5A6B7F" strokeWidth="1.5"/>
      {/* Kingpin */}
      <rect x="6" y="32" width="10" height="3" fill="#5A6B7F"/>
      {/* Stake pockets */}
      {[24, 44, 64, 84].map(x => (
        <rect key={x} x={x} y="24" width="2" height="8" fill="#8B9DAF" stroke="#5A6B7F" strokeWidth="0.4"/>
      ))}
      {/* Rear wheels */}
      <circle cx="84" cy="40" r="6" fill="#3D4F5F"/>
      <circle cx="84" cy="40" r="3.5" fill="#5A6B7F"/>
      <circle cx="84" cy="40" r="1.2" fill="#8B9DAF"/>
      <circle cx="98" cy="40" r="6" fill="#3D4F5F"/>
      <circle cx="98" cy="40" r="3.5" fill="#5A6B7F"/>
      <circle cx="98" cy="40" r="1.2" fill="#8B9DAF"/>
    </svg>
  );
}

function ReeferIcon() {
  return (
    <svg viewBox="0 0 140 50" width="112" height="40" xmlns="http://www.w3.org/2000/svg">
      {/* Trailer body */}
      <rect x="4" y="8" width="100" height="30" rx="1" fill="#D4E4EC" stroke="#5A6B7F" strokeWidth="1.2"/>
      {/* Reefer unit on nose */}
      <rect x="1" y="6" width="8" height="14" rx="1.5" fill="#7BA3BE" stroke="#5A6B7F" strokeWidth="1"/>
      <rect x="2" y="8" width="6" height="4" rx="0.5" fill="#5A8CA8"/>
      {/* Vent grille lines */}
      {[10, 11.5, 13].map(y => (
        <line key={y} x1="2.5" y1={y} x2="7.5" y2={y} stroke="#5A6B7F" strokeWidth="0.4"/>
      ))}
      {/* Vertical ribs */}
      {[20, 36, 52, 68, 84].map(x => (
        <line key={x} x1={x} y1="8" x2={x} y2="38" stroke="#BDCDD8" strokeWidth="0.6"/>
      ))}
      {/* Rear doors */}
      <rect x="100" y="10" width="4" height="28" fill="#B8CCd8" stroke="#5A6B7F" strokeWidth="0.8"/>
      <line x1="102" y1="10" x2="102" y2="38" stroke="#5A6B7F" strokeWidth="0.4"/>
      {/* Landing gear */}
      <line x1="10" y1="38" x2="10" y2="44" stroke="#5A6B7F" strokeWidth="1.5"/>
      <line x1="14" y1="38" x2="14" y2="44" stroke="#5A6B7F" strokeWidth="1.5"/>
      <rect x="6" y="36" width="10" height="3" fill="#5A6B7F"/>
      {/* Rear wheels */}
      <circle cx="80" cy="42" r="6" fill="#3D4F5F"/>
      <circle cx="80" cy="42" r="3.5" fill="#5A6B7F"/>
      <circle cx="80" cy="42" r="1.2" fill="#8B9DAF"/>
      <circle cx="94" cy="42" r="6" fill="#3D4F5F"/>
      <circle cx="94" cy="42" r="3.5" fill="#5A6B7F"/>
      <circle cx="94" cy="42" r="1.2" fill="#8B9DAF"/>
    </svg>
  );
}

function TankIcon() {
  return (
    <svg viewBox="0 0 140 50" width="112" height="40" xmlns="http://www.w3.org/2000/svg">
      {/* Tank barrel */}
      <ellipse cx="56" cy="22" rx="50" ry="14" fill="#C8D3DE" stroke="#5A6B7F" strokeWidth="1.2"/>
      {/* End caps */}
      <ellipse cx="8" cy="22" rx="4" ry="14" fill="#B0BDCA" stroke="#5A6B7F" strokeWidth="0.8"/>
      <ellipse cx="104" cy="22" rx="4" ry="14" fill="#B0BDCA" stroke="#5A6B7F" strokeWidth="0.8"/>
      {/* Banding / barrel rings */}
      {[30, 56, 82].map(x => (
        <ellipse key={x} cx={x} cy="22" rx="1" ry="13" fill="none" stroke="#A0AEBE" strokeWidth="0.8"/>
      ))}
      {/* Manway hatches on top */}
      {[30, 56, 82].map(x => (
        <circle key={x} cx={x} cy="9" r="3" fill="#8B9DAF" stroke="#5A6B7F" strokeWidth="0.6"/>
      ))}
      {/* Frame under tank */}
      <rect x="8" y="34" width="96" height="2" fill="#7A8C9E" stroke="#5A6B7F" strokeWidth="0.6"/>
      {/* Landing gear */}
      <line x1="14" y1="36" x2="14" y2="42" stroke="#5A6B7F" strokeWidth="1.5"/>
      <line x1="18" y1="36" x2="18" y2="42" stroke="#5A6B7F" strokeWidth="1.5"/>
      <rect x="10" y="34" width="12" height="3" fill="#5A6B7F"/>
      {/* Rear wheels */}
      <circle cx="82" cy="42" r="6" fill="#3D4F5F"/>
      <circle cx="82" cy="42" r="3.5" fill="#5A6B7F"/>
      <circle cx="82" cy="42" r="1.2" fill="#8B9DAF"/>
      <circle cx="96" cy="42" r="6" fill="#3D4F5F"/>
      <circle cx="96" cy="42" r="3.5" fill="#5A6B7F"/>
      <circle cx="96" cy="42" r="1.2" fill="#8B9DAF"/>
      {/* Discharge valve */}
      <rect x="96" y="30" width="6" height="3" rx="1" fill="#7A8C9E"/>
    </svg>
  );
}

function ChassisIcon() {
  return (
    <svg viewBox="0 0 140 50" width="112" height="40" xmlns="http://www.w3.org/2000/svg">
      {/* Main frame rails */}
      <rect x="4" y="24" width="104" height="3" rx="0.5" fill="#7A8C9E" stroke="#5A6B7F" strokeWidth="1"/>
      <rect x="4" y="30" width="104" height="3" rx="0.5" fill="#7A8C9E" stroke="#5A6B7F" strokeWidth="1"/>
      {/* Cross members */}
      {[15, 35, 55, 75, 95].map(x => (
        <rect key={x} x={x} y="24" width="2" height="9" fill="#8B9DAF" stroke="#5A6B7F" strokeWidth="0.4"/>
      ))}
      {/* Twist locks for container */}
      {[10, 30, 70, 100].map(x => (
        <rect key={x} x={x} y="21" width="4" height="4" rx="1" fill="#5A6B7F"/>
      ))}
      {/* Gooseneck */}
      <path d="M4 27 L4 18 L12 18 L12 27" fill="none" stroke="#5A6B7F" strokeWidth="1.2"/>
      {/* Rear wheels */}
      <circle cx="84" cy="38" r="6" fill="#3D4F5F"/>
      <circle cx="84" cy="38" r="3.5" fill="#5A6B7F"/>
      <circle cx="84" cy="38" r="1.2" fill="#8B9DAF"/>
      <circle cx="98" cy="38" r="6" fill="#3D4F5F"/>
      <circle cx="98" cy="38" r="3.5" fill="#5A6B7F"/>
      <circle cx="98" cy="38" r="1.2" fill="#8B9DAF"/>
    </svg>
  );
}

function GenericTrailerIcon() {
  return (
    <svg viewBox="0 0 140 50" width="112" height="40" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="100" height="28" rx="2" fill="#C8D3DE" stroke="#5A6B7F" strokeWidth="1.2"/>
      <rect x="6" y="36" width="10" height="3" fill="#5A6B7F"/>
      <line x1="10" y1="38" x2="10" y2="44" stroke="#5A6B7F" strokeWidth="1.5"/>
      <line x1="14" y1="38" x2="14" y2="44" stroke="#5A6B7F" strokeWidth="1.5"/>
      <circle cx="82" cy="42" r="6" fill="#3D4F5F"/>
      <circle cx="82" cy="42" r="3.5" fill="#5A6B7F"/>
      <circle cx="82" cy="42" r="1.2" fill="#8B9DAF"/>
      <circle cx="96" cy="42" r="6" fill="#3D4F5F"/>
      <circle cx="96" cy="42" r="3.5" fill="#5A6B7F"/>
      <circle cx="96" cy="42" r="1.2" fill="#8B9DAF"/>
    </svg>
  );
}

function getIcon(type: string) {
  const lower = type.toLowerCase();
  if (lower.includes("dry van") || lower.includes("box") || lower.includes("van enclosed")) return <DryVanIcon />;
  if (lower.includes("flatbed") || lower.includes("platform")) return <FlatbedIcon />;
  if (lower.includes("reefer") || lower.includes("refrigerated")) return <ReeferIcon />;
  if (lower.includes("tank")) return <TankIcon />;
  if (lower.includes("chassis") || lower.includes("intermodal")) return <ChassisIcon />;
  if (lower.includes("tractor") || lower.includes("truck-tractor")) return <TractorIcon />;
  return <GenericTrailerIcon />;
}

interface EquipmentDisplayProps {
  summary: EquipmentSummary;
  powerUnits?: string;
  driverCount?: string;
}

export default function EquipmentDisplay({ summary, powerUnits, driverCount }: EquipmentDisplayProps) {
  const filteredTypes = Object.entries(summary).filter(
    ([type]) => !EXCLUDED_TYPES.has(type) && type.trim() !== ""
  );

  const aggregated = filteredTypes.map(([type, items]) => {
    const totalCount = items.reduce((sum, item) => sum + item.count, 0);
    const itemsWithAge = items.filter((item) => item.averageAge > 0 && item.averageAge < 100);
    const avgAge = itemsWithAge.length > 0
      ? Math.round(itemsWithAge.reduce((sum, item) => sum + item.averageAge * item.count, 0) /
          itemsWithAge.reduce((sum, item) => sum + item.count, 0))
      : 0;
    const standardItems = items.filter(
      (item) => item.size && STANDARD_SIZES.has(String(Math.round(Number(item.size))))
    );
    const sizes = [...new Set(standardItems.map((item) => `${Math.round(Number(item.size))}'`))].join(", ");
    return { type, totalCount, avgAge, sizes };
  }).filter((item) => item.totalCount > 0);

  if (aggregated.length === 0 && !powerUnits && !driverCount) {
    return <p style={{ color: "var(--color-text-muted)" }}>No equipment data available</p>;
  }

  return (
    <div className="equipment-display">
      <h3 className="fleet-title">
        Fleet Overview (SAFER + Observed Equipment)
      </h3>

      <div className="fleet-grid">
        {powerUnits && Number(powerUnits) > 0 && (
          <div className="fleet-item">
            <div style={{ opacity: 0.9 }}><TractorIcon /></div>
            <div style={{ marginTop: "10px" }}>
              <span className="fleet-count">{powerUnits}</span>
              <span className="fleet-label">Power Units</span>
            </div>
          </div>
        )}

        {driverCount && Number(driverCount) > 0 && (
          <div className="fleet-item">
            <div style={{ opacity: 0.9 }}>
              <svg viewBox="0 0 80 50" width="80" height="40" xmlns="http://www.w3.org/2000/svg">
                {/* Driver icon - person with steering wheel */}
                <circle cx="28" cy="14" r="8" fill="#8B9DAF" stroke="#5A6B7F" strokeWidth="1"/>
                <path d="M16 44 L16 30 C16 24 22 20 28 20 C34 20 40 24 40 30 L40 44" fill="#7A8C9E" stroke="#5A6B7F" strokeWidth="1"/>
                <circle cx="52" cy="16" r="7" fill="#8B9DAF" stroke="#5A6B7F" strokeWidth="1"/>
                <path d="M42 44 L42 32 C42 27 47 23 52 23 C57 23 62 27 62 32 L62 44" fill="#7A8C9E" stroke="#5A6B7F" strokeWidth="1"/>
              </svg>
            </div>
            <div style={{ marginTop: "10px" }}>
              <span className="fleet-count">{driverCount}</span>
              <span className="fleet-label">Drivers</span>
            </div>
          </div>
        )}

        {aggregated.map(({ type, totalCount, avgAge, sizes }) => (
          <div key={type} className="fleet-item">
            <div style={{ opacity: 0.9 }}>{getIcon(type)}</div>
            <div style={{ marginTop: "10px" }}>
              <span className="fleet-count">{totalCount}</span>
              <span className="fleet-label">{type}</span>
              {sizes && <span className="fleet-sublabel">{sizes}</span>}
              {avgAge > 0 && <span className="fleet-sublabel">~{avgAge} yr avg</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
