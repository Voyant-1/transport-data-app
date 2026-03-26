export interface CarrierRecord {
  dot_number: string;
  legal_name: string;
  dba_name?: string;
  power_units?: string;
  phy_city?: string;
  phy_state?: string;
  phy_zip?: string;
  phy_street?: string;
  phy_country?: string;
  phy_cnty?: string;
  phone?: string;
  fax?: string;
  cell_phone?: string;
  email_address?: string;
  company_officer_1?: string;
  company_officer_2?: string;
  carrier_operation?: string;
  business_org_desc?: string;
  truck_units?: string;
  bus_units?: string;
  fleetsize?: string;
  total_drivers?: string;
  total_cdl?: string;
  total_cars?: string;
  safety_rating?: string;
  safety_rating_date?: string;
  status_code?: string;
  hm_ind?: string;
  classdef?: string;
  [key: string]: string | undefined;
}

export interface InspectionRecord {
  inspection_id: string;
  dot_number: string;
  insp_date: string;
  insp_carrier_name?: string;
  dba_name?: string;
  location?: string;
  location_desc?: string;
  report_state?: string;
  insp_state?: string;
  shipper_name?: string;
  shipping_paper_number?: string;
  insp_level_id?: string;
  viol_total?: string;
  oos_total?: string;
  driver_viol_total?: string;
  driver_oos_total?: string;
  vehicle_viol_total?: string;
  vehicle_oos_total?: string;
  hazmat_viol_total?: string;
  gross_comb_veh_wt?: string;
  insp_carrier_city?: string;
  insp_carrier_state?: string;
  post_acc_ind?: string;
  [key: string]: string | undefined;
}

export interface UnitRecord {
  inspection_id: string;
  insp_unit_type_id: string;
  insp_unit_vehicle_id_number?: string;
  [key: string]: string | undefined;
}

export interface VinResult {
  VIN: string;
  TrailerBodyType: string;
  TrailerLength: string;
  ModelYear: string;
  Make: string;
  Model: string;
  BodyClass: string;
  [key: string]: string;
}

export interface EquipmentItem {
  size: string;
  count: number;
  averageAge: number;
}

export interface EquipmentSummary {
  [equipmentType: string]: EquipmentItem[];
}

export interface SearchFilters {
  searchTerm: string;
  state: string | null;
  city: string;
  zip: string;
  radius: number;
  cargo: string | null;
  powerUnitsOp: "" | ">" | "<";
  powerUnitsValue: string;
}

export interface SearchState {
  data: CarrierRecord[];
  filters: SearchFilters;
  ui: {
    loading: boolean;
    noResults: boolean;
    selectedColumns: string[];
  };
  pagination: {
    totalRowsFetched: number;
    cumulativeResultsCount: number;
  };
}

export interface CrashRecord {
  crash_id: string;
  dot_number: string;
  report_date?: string;
  report_time?: string;
  report_state?: string;
  report_number?: string;
  location?: string;
  city?: string;
  fatalities?: string;
  injuries?: string;
  tow_away?: string;
  federal_recordable?: string;
  truck_bus_ind?: string;
  crash_carrier_name?: string;
  [key: string]: string | undefined;
}

export type SelectOption = {
  value: string;
  label: string;
};
