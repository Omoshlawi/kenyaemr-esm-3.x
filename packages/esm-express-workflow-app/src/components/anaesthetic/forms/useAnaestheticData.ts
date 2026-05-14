import { useCervixData, UseCervixDataResult } from '../resources/anaesthetic.resource';
export function useCervixFormData(patientUuid: string): UseCervixDataResult {
  return useCervixData(patientUuid);
}
export type {
  CervixFormData,
  CervixObservation,
  CervixEncounter,
  SaveCervixDataResponse,
} from '../resources/anaesthetic.resource';

export {
  saveCervixFormData,
  deleteCervixEncounter,
  MCH_PARTOGRAPHY_ENCOUNTER_UUID,
} from '../resources/anaesthetic.resource';
