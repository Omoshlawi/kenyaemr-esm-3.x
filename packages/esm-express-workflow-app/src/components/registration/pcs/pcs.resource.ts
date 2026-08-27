import useSWR from 'swr';
import { getPatientName, restBaseUrl } from '@openmrs/esm-framework';
import { getNationalIdFromPatient, getPhoneFromFhirPatient } from '../helper';
import { searchMockParticipants } from './pcs-mock-data';
import {
  type PcsApiError,
  type PcsCompound,
  type PcsMother,
  type PcsParticipant,
  type PcsParticipantFilters,
  type PcsParticipantSearchResponse,
  type PcsSearchSubject,
} from './pcs.types';

/** The API's own defaults, restated so the URL we build is explicit about them. */
const DEFAULT_LIMIT = 50;
const DEFAULT_START_INDEX = 0;

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

interface ParticipantSearchOptions {
  limit?: number;
  startIndex?: number;
  fuzzy?: boolean;
}

/** The default query for a newly authorized patient: their name, plus their phone when on file. */
export function toPcsParticipantFilters(subject: PcsSearchSubject): PcsParticipantFilters {
  return {
    name: subject.name ?? '',
    village: '',
    phone: subject.phoneNumber ?? '',
  };
}

/** The API rejects an unfiltered request with a 400, so hold it rather than provoke one. */
export function hasAnyFilter(filters: PcsParticipantFilters | null): boolean {
  return Boolean(filters && (filters.name.trim() || filters.village.trim() || filters.phone.trim()));
}

/**
 * Builds the participant search URL. Blank filters are omitted — the API AND-combines
 * whatever it is given. Returns null when nothing is set, which doubles as SWR's
 * "don't fetch yet" key.
 */
export function buildParticipantSearchUrl(
  filters: PcsParticipantFilters | null,
  { limit = DEFAULT_LIMIT, startIndex = DEFAULT_START_INDEX, fuzzy = true }: ParticipantSearchOptions = {},
): string | null {
  if (!hasAnyFilter(filters)) {
    return null;
  }

  const params = new URLSearchParams();
  (['name', 'village', 'phone'] as const).forEach((filter) => {
    const value = filters![filter].trim();
    if (value) {
      params.set(filter, value);
    }
  });
  params.set('limit', String(limit));
  params.set('startIndex', String(startIndex));
  params.set('fuzzy', String(fuzzy));

  return `${restBaseUrl}/pbids-participants?${params}`;
}

/**
 * Replace the two lines below with the real call and delete
 * `pcs-mock-data.ts`:
 *
 *   const { data } = await openmrsFetch<PcsParticipantSearchResponse>(url);
 *   return data;
 *
 */
async function fetchParticipants(url: string): Promise<PcsParticipantSearchResponse> {
  await sleep(900);
  return searchMockParticipants(url);
}

/**
 * Searches the PCS registry. The URL is the SWR key, so editing a filter refetches and an
 * unchanged query dedupes.
 */
export function usePcsParticipantSearch(filters: PcsParticipantFilters | null, options?: ParticipantSearchOptions) {
  const url = buildParticipantSearchUrl(filters, options);

  const { data, isLoading, error } = useSWR(url, fetchParticipants, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
  });

  return {
    participants: data?.results ?? [],
    totalCount: data?.totalCount ?? 0,
    isLoading,
    error,
  };
}

/**
 * Surfaces the API's own wording. `openmrsFetch` attaches the failure body — an `ApiError`
 * — to the thrown error, and its `message` is more useful than a generic HTTP string.
 */
export function getPcsErrorMessage(error: unknown): string | undefined {
  const apiError = (error as { responseBody?: Partial<PcsApiError> } | undefined)?.responseBody;
  return apiError?.message || (error as Error | undefined)?.message;
}

/** A downed VPN to the SQL Server is the common failure, and reads very differently to a bug. */
export function isPcsUnavailable(error: unknown): boolean {
  return (error as { responseBody?: Partial<PcsApiError> } | undefined)?.responseBody?.status === 503;
}

export function formatParticipantName(participant: PcsParticipant): string {
  return [participant.firstName, participant.middleName, participant.lastName].filter(Boolean).join(' ');
}

export function formatMotherName(mother: PcsMother): string {
  return [mother.firstName, mother.middleName, mother.lastName].filter(Boolean).join(' ');
}

export function formatCompoundHeadName(compound: PcsCompound): string {
  return [compound.headFirstName, compound.headMiddleName, compound.headLastName].filter(Boolean).join(' ');
}

/** Contacts are a list; the first one carrying anything identifying is what the tile shows. */
export function getPrimaryContact(participant: PcsParticipant) {
  return participant.contacts?.find((contact) => contact.phone || contact.nationalId) ?? participant.contacts?.[0];
}

/** Normalizes either side of the search results (local or HIE) into a PCS search subject. */
export function toPcsSearchSubject(
  patient: fhir.Patient,
  source: PcsSearchSubject['source'],
  nationalIdUUID?: string,
): PcsSearchSubject {
  return {
    id: patient.id!,
    source,
    name: getPatientName(patient),
    gender: patient.gender,
    birthDate: patient.birthDate,
    nationalId: getNationalIdFromPatient(patient, nationalIdUUID),
    phoneNumber: getPhoneFromFhirPatient(patient) ?? null,
  };
}
