import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';

export function processVisitInsuranceClaim(visitUuid: string) {
  return openmrsFetch(`${restBaseUrl}/insuranceclaims/phc/processVisit/?visitUuid=${visitUuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}
