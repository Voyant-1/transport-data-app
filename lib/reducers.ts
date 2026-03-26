import type { CarrierRecord, SearchState } from "./types";
import { DEFAULT_COLUMNS } from "./constants";

export type SearchAction =
  | { type: "SET_FILTER"; field: string; value: string | number | null }
  | { type: "CLEAR_FILTERS" }
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; data: CarrierRecord[]; isLoadMore: boolean }
  | { type: "FETCH_ERROR" }
  | { type: "TOGGLE_COLUMN"; column: string };

export const initialSearchState: SearchState = {
  data: [],
  filters: {
    searchTerm: "",
    state: null,
    city: "",
    zip: "",
    radius: 50,
    cargo: null,
    powerUnitsOp: "",
    powerUnitsValue: "",
  },
  ui: {
    loading: false,
    noResults: false,
    selectedColumns: [...DEFAULT_COLUMNS],
  },
  pagination: {
    totalRowsFetched: 0,
    cumulativeResultsCount: 0,
  },
};

export function searchReducer(state: SearchState, action: SearchAction): SearchState {
  switch (action.type) {
    case "SET_FILTER":
      return {
        ...state,
        data: [],
        filters: { ...state.filters, [action.field]: action.value },
        pagination: { totalRowsFetched: 0, cumulativeResultsCount: 0 },
        ui: { ...state.ui, noResults: false },
      };

    case "CLEAR_FILTERS":
      return {
        ...initialSearchState,
        ui: { ...state.ui, loading: false, noResults: false },
      };

    case "FETCH_START":
      return {
        ...state,
        ui: { ...state.ui, loading: true, noResults: false },
      };

    case "FETCH_SUCCESS": {
      const { data: newData, isLoadMore } = action;
      if (newData.length === 0) {
        return {
          ...state,
          ui: { ...state.ui, loading: false, noResults: !isLoadMore },
          pagination: isLoadMore
            ? state.pagination
            : { totalRowsFetched: 0, cumulativeResultsCount: 0 },
        };
      }

      const combinedData = isLoadMore ? [...state.data, ...newData] : newData;
      // Deduplicate by dot_number
      const seen = new Set<string>();
      const uniqueData = combinedData.filter((item) => {
        if (seen.has(item.dot_number)) return false;
        seen.add(item.dot_number);
        return true;
      });

      return {
        ...state,
        data: uniqueData,
        ui: { ...state.ui, loading: false, noResults: false },
        pagination: {
          totalRowsFetched: state.pagination.totalRowsFetched + newData.length,
          cumulativeResultsCount: isLoadMore
            ? state.pagination.cumulativeResultsCount + newData.length
            : newData.length,
        },
      };
    }

    case "FETCH_ERROR":
      return {
        ...state,
        ui: { ...state.ui, loading: false, noResults: true },
      };

    case "TOGGLE_COLUMN": {
      const cols = state.ui.selectedColumns;
      const newCols = cols.includes(action.column)
        ? cols.filter((c) => c !== action.column)
        : [...cols, action.column];
      return {
        ...state,
        ui: { ...state.ui, selectedColumns: newCols },
      };
    }

    default:
      return state;
  }
}
