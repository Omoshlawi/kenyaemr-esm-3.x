import { useMemo } from 'react';
import { openmrsFetch, type OpenmrsResource } from '@openmrs/esm-framework';
import useSWRImmutable from 'swr/immutable';

/**
 * Global property holding the document-type -> endpoint map. The value is a JSON
 * object whose keys are claim document types (see DOCUMENT_TYPES) and whose values
 * are EMR endpoint templates that download/generate the document. Templates may
 * contain `{param}` placeholders resolved at runtime, e.g.
 * `/openmrs/ws/rest/v1/bill/{billUuid}`.
 */
export const CLAIM_DOCUMENT_ENDPOINTS_GP = 'kenyaemr.billing.claimDocumentEndpoints';

export type ClaimDocumentEndpointMap = Record<string, string>;

export function useClaimDocumentEndpoints() {
  const { data, error, isLoading } = useSWRImmutable<{ data: { results: Array<OpenmrsResource> } }, Error>(
    `/ws/rest/v1/systemsetting?q=${CLAIM_DOCUMENT_ENDPOINTS_GP}&v=full`,
    openmrsFetch,
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  );

  const endpoints = useMemo<ClaimDocumentEndpointMap>(() => {
    const raw = data?.data?.results?.find((r) => r.property === CLAIM_DOCUMENT_ENDPOINTS_GP)?.value;
    if (!raw || typeof raw !== 'string') {
      return {};
    }
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as ClaimDocumentEndpointMap;
      }
    } catch {
      // malformed global property — treated as no configured endpoints
    }
    return {};
  }, [data]);

  return { endpoints, isLoading, error };
}
