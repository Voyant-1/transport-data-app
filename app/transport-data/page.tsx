"use client";

import { useReducer, useEffect, useCallback, useState } from "react";
import Select from "react-select";
import Navbar from "@/components/Navbar";
import VirtualTable from "@/components/VirtualTable";
import { STATE_OPTIONS, CARGO_OPTIONS, ALL_COLUMNS, RECORDS_PER_PAGE, MAX_RECORDS } from "@/lib/constants";
import { searchReducer, initialSearchState } from "@/lib/reducers";
import type { SelectOption } from "@/lib/types";

export default function TransportDataPage() {
  const [state, dispatch] = useReducer(searchReducer, initialSearchState);
  const { data, filters, ui, pagination } = state;
  const [showColumns, setShowColumns] = useState(false);

  const fetchData = useCallback(
    async (offset: number, isLoadMore: boolean, signal?: AbortSignal) => {
      dispatch({ type: "FETCH_START" });

      try {
        const params = new URLSearchParams();
        if (filters.searchTerm) params.set("search", filters.searchTerm);
        if (filters.state) params.set("state", filters.state);
        if (filters.city) params.set("city", filters.city);

        // ZIP + Radius logic
        if (filters.zip) {
          if (/^\d{5}$/.test(filters.zip) && filters.radius > 25) {
            params.set("zip", filters.zip.substring(0, 3));
          } else if (/^\d{5}$/.test(filters.zip) && filters.radius <= 25) {
            params.set("zip", filters.zip);
          } else {
            params.set("zip", filters.zip);
          }
        }

        if (filters.cargo) params.set("cargo", filters.cargo);
        if (filters.powerUnitsOp) params.set("powerUnitsOp", filters.powerUnitsOp);
        if (filters.powerUnitsValue) params.set("powerUnitsValue", filters.powerUnitsValue);
        params.set("limit", String(RECORDS_PER_PAGE));
        params.set("offset", String(offset));

        const response = await fetch(`/api/socrata/carriers?${params}`, { signal });

        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }

        const newData = await response.json();
        dispatch({ type: "FETCH_SUCCESS", data: newData, isLoadMore });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        dispatch({ type: "FETCH_ERROR" });
      }
    },
    [filters]
  );

  // Fetch when filters change
  useEffect(() => {
    const hasFilters =
      filters.searchTerm || filters.state || filters.city || filters.zip ||
      filters.cargo || filters.powerUnitsOp || filters.powerUnitsValue;

    if (!hasFilters) return;

    const controller = new AbortController();
    fetchData(0, false, controller.signal);

    return () => controller.abort();
  }, [fetchData, filters]);

  const handleLoadMore = useCallback(() => {
    if (pagination.totalRowsFetched < MAX_RECORDS) {
      fetchData(pagination.totalRowsFetched, true);
    }
  }, [fetchData, pagination.totalRowsFetched]);

  const toggleColumns = () => setShowColumns((prev) => !prev);

  const clearFilters = () => dispatch({ type: "CLEAR_FILTERS" });

  return (
    <div className="page-wrapper">
      <Navbar activeLink="transport-data" />

      <div className="content-container">
        <h1 className="page-title">Transportation Data Search</h1>

        <div className="filter-bar">
          <div className="filter-row">
            <div className="filter-group grow">
              <label>Search</label>
              <input
                className="input-field"
                placeholder="DOT number or Legal Name"
                value={filters.searchTerm}
                onChange={(e) => dispatch({ type: "SET_FILTER", field: "searchTerm", value: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <label>State</label>
              <Select
                options={STATE_OPTIONS}
                value={STATE_OPTIONS.find((o) => o.value === filters.state) || null}
                onChange={(opt: SelectOption | null) =>
                  dispatch({ type: "SET_FILTER", field: "state", value: opt?.value || null })
                }
                placeholder="Select State"
                isClearable
                isSearchable
                styles={{
                  control: (base) => ({ ...base, minWidth: "160px", fontSize: "14px" }),
                  menu: (base) => ({ ...base, zIndex: 20 }),
                }}
              />
            </div>
            <div className="filter-group">
              <label>City</label>
              <input
                className="input-field"
                placeholder="City"
                value={filters.city}
                onChange={(e) => dispatch({ type: "SET_FILTER", field: "city", value: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <label>ZIP Code</label>
              <input
                className="input-field"
                style={{ width: "100px" }}
                maxLength={5}
                placeholder="ZIP"
                value={filters.zip}
                onChange={(e) => dispatch({ type: "SET_FILTER", field: "zip", value: e.target.value })}
              />
            </div>
            <div className="filter-group">
              <label>Radius (mi)</label>
              <select
                className="select-field"
                value={filters.radius}
                onChange={(e) => dispatch({ type: "SET_FILTER", field: "radius", value: Number(e.target.value) })}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
              </select>
            </div>
          </div>
          <div className="filter-row">
            <div className="filter-group">
              <label>Cargo Type</label>
              <Select
                options={CARGO_OPTIONS}
                value={CARGO_OPTIONS.find((o) => o.value === filters.cargo) || null}
                onChange={(opt: SelectOption | null) =>
                  dispatch({ type: "SET_FILTER", field: "cargo", value: opt?.value || null })
                }
                placeholder="Select Cargo"
                isClearable
                isSearchable
                styles={{
                  control: (base) => ({ ...base, minWidth: "180px", fontSize: "14px" }),
                  menu: (base) => ({ ...base, zIndex: 20 }),
                }}
              />
            </div>
            <div className="filter-group">
              <label>Power Units</label>
              <div style={{ display: "flex", gap: "4px" }}>
                <select
                  className="select-field"
                  style={{ width: "50px" }}
                  value={filters.powerUnitsOp}
                  onChange={(e) => dispatch({ type: "SET_FILTER", field: "powerUnitsOp", value: e.target.value })}
                >
                  <option value=""></option>
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                </select>
                <input
                  className="input-field"
                  type="number"
                  style={{ width: "80px" }}
                  placeholder="#"
                  value={filters.powerUnitsValue}
                  onChange={(e) => dispatch({ type: "SET_FILTER", field: "powerUnitsValue", value: e.target.value })}
                />
              </div>
            </div>
            <div className="filter-group" style={{ position: "relative" }}>
              <label>&nbsp;</label>
              <button className="btn btn-secondary btn-sm" onClick={toggleColumns}>
                Columns &#9662;
              </button>
              {showColumns && (
                <div className="column-dropdown">
                  {ALL_COLUMNS.map((col) => (
                    <label key={col}>
                      <input
                        type="checkbox"
                        checked={ui.selectedColumns.includes(col)}
                        onChange={() => dispatch({ type: "TOGGLE_COLUMN", column: col })}
                      />
                      {col.replace(/_/g, " ")}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="filter-group">
              <label>&nbsp;</label>
              <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        <div className="results-count" aria-live="polite">
          {ui.loading ? (
            <p>Loading data...</p>
          ) : (
            <p>
              {pagination.cumulativeResultsCount > 0
                ? `Total results: ${pagination.cumulativeResultsCount}`
                : "No results found"}
            </p>
          )}
        </div>

        {data.length > 0 ? (
          <VirtualTable data={data} columns={ui.selectedColumns} />
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  {ui.selectedColumns.map((column) => (
                    <th key={column} scope="col">{column.replace(/_/g, " ")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={ui.selectedColumns.length}>
                    {ui.loading ? "Loading..." : ui.noResults ? "No matching results found" : "Start a search"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {data.length > 0 && !ui.noResults && pagination.totalRowsFetched < MAX_RECORDS && (
          <button
            onClick={handleLoadMore}
            disabled={ui.loading}
            className="load-more-button"
          >
            {ui.loading ? "Loading..." : "Load More"}
          </button>
        )}
      </div>
    </div>
  );
}
