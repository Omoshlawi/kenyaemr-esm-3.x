export type FacilityRegistryAddress = {
  country?: string;
  county_code?: string;
  county?: string;
  sub_county_code?: string;
  sub_county?: string;
  postal_address?: string;
  physical_location?: string;
  town?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type FacilityRegistryBedOccupancy = {
  totalBeds?: number;
  normalBeds?: number;
  icuBeds?: number;
  hduBeds?: number;
  dialysisBeds?: number;
  numberOfCots?: number;
};

export type FacilityRegistryRecord = {
  fr_code: string;
  fid_code?: string;
  registration_number?: string;
  official_name?: string;
  keph_level?: string;
  facility_type?: string;
  facility_ownership?: string;
  license_status?: string;
  license_number?: string;
  license_start_date?: string | null;
  license_end_date?: string | null;
  regulatory_body?: string;
  sha_contract_status?: string;
  sha_contract_start_date?: string | null;
  sha_contract_end_date?: string | null;
  is_hub?: boolean;
  facility_phone_number?: string;
  facility_email?: string;
  facility_administrator_name?: string;
  facility_administrator_email?: string;
  facility_administrator_phone?: string;
  facility_administrator_identifier?: string;
  address?: FacilityRegistryAddress;
  regulatory_operational_status?: string;
  sha_operational_status?: string;
  bed_occupancy?: FacilityRegistryBedOccupancy;
  sha_contracted_services?: Array<{ name?: string } | string>;
  last_synced_at?: string;
  last_sync_status?: 'SUCCESS' | 'FAILURE';
};

export type FacilityRegistrySyncResult = {
  success: boolean;
  fr_code: string;
  official_name: string;
  last_synced_at: string;
  last_sync_status: 'SUCCESS' | 'FAILURE';
};
