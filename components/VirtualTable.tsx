"use client";

import React, { useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import type { CarrierRecord } from "@/lib/types";

interface VirtualTableProps {
  data: CarrierRecord[];
  columns: string[];
}

// Known minimum widths for specific column types
const COLUMN_MIN_WIDTHS: Record<string, number> = {
  dot_number: 100,
  phy_state: 70,
  phy_zip: 90,
  power_units: 90,
};

export default function VirtualTable({ data, columns }: VirtualTableProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate column widths based on content
  const columnWidths = useMemo(() => {
    const sampleSize = Math.min(data.length, 100);
    const sample = data.slice(0, sampleSize);

    const widths: Record<string, number> = {};

    columns.forEach((col) => {
      // Start with header length
      let maxLen = col.replace(/_/g, " ").length;

      // Check sample data for max content length
      for (const row of sample) {
        const val = row[col] ?? "";
        if (val.length > maxLen) {
          maxLen = val.length;
        }
      }

      // Convert char count to approximate pixel width (8px per char + padding)
      const minWidth = COLUMN_MIN_WIDTHS[col] || 80;
      widths[col] = Math.max(maxLen * 8 + 30, minWidth);
    });

    return widths;
  }, [data, columns]);

  const totalWidth = useMemo(
    () => Object.values(columnWidths).reduce((sum, w) => sum + w, 0),
    [columnWidths]
  );

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 20,
  });

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="table-container">
      {/* Fixed header */}
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", minWidth: `${totalWidth}px` }}>
          {columns.map((column) => (
            <div
              key={column}
              className="virtual-table-header"
              style={{
                width: `${columnWidths[column]}px`,
                flexShrink: 0,
              }}
            >
              {column.replace(/_/g, " ")}
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable virtualized body */}
      <div
        ref={parentRef}
        style={{ height: "600px", overflow: "auto" }}
      >
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative", minWidth: `${totalWidth}px` }}>
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = data[virtualRow.index];
            return (
              <div
                key={virtualRow.index}
                className={`virtual-table-row ${virtualRow.index % 2 === 0 ? "virtual-table-row-even" : "virtual-table-row-odd"}`}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {columns.map((column) => (
                  <div
                    key={column}
                    className="virtual-table-cell"
                    style={{
                      width: `${columnWidths[column]}px`,
                      flexShrink: 0,
                    }}
                  >
                    {column === "legal_name" ? (
                      <Link
                        href={`/result/${item.dot_number}`}
                        className="dot-link"
                        style={{ textDecoration: "underline" }}
                      >
                        {item.legal_name}
                      </Link>
                    ) : (
                      item[column] ?? ""
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
