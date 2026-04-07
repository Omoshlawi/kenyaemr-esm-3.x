import type { Observation, ObservationValue } from '../types/encounter';

export const MALARIA_CONCEPTS = {
  MALARIA_RAPID_TEST: '1643AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  BLOOD_SMEAR_FOR_MALARIA_PARASITES: 'b6cb864b-a240-4b6a-bba4-1f17c7b7ae8d',
} as const;

export type MalariaAdditionalConceptConfig = {
  conceptUuid: string;
  showWhenExpression?: (context: {
    formValues: Record<string, ObservationValue>;
    completeLabResults: Array<Observation>;
  }) => boolean;
};

export const malariaConceptUuidsMap: Record<string, Array<MalariaAdditionalConceptConfig>> = {
  [MALARIA_CONCEPTS.BLOOD_SMEAR_FOR_MALARIA_PARASITES]: [
    {
      conceptUuid: '1c98a484-dee7-4073-b4b4-85c7a2df8007',
    },
    {
      conceptUuid: '04d87948-2087-493c-b0e2-2b3cf19c2d46',
      showWhenExpression: ({ formValues }) =>
        formValues['1c98a484-dee7-4073-b4b4-85c7a2df8007'] === 'b82a629a-8a85-45f0-8957-713635c36a56',
    },
    {
      conceptUuid: 'e07ed6eb-356d-4a42-9e33-3151c6ff84e2',
      showWhenExpression: ({ formValues }) =>
        formValues['1c98a484-dee7-4073-b4b4-85c7a2df8007'] === 'b82a629a-8a85-45f0-8957-713635c36a56',
    },
  ],
  [MALARIA_CONCEPTS.MALARIA_RAPID_TEST]: [
    {
      conceptUuid: '1fe0ac90-80db-4d50-bcb8-f145836ae59a',
    },
  ],
};

export const allAdditionalMalariaConceptUuids: Array<string> = Array.from(
  new Set(
    Object.values(malariaConceptUuidsMap)
      .flat()
      .map((config) => config.conceptUuid),
  ),
);
