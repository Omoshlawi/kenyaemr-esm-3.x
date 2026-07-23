import { useConfig } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import type { ExpressWorkflowConfig } from '../../../../../config-schema';
import {
  buildHaemodialysisAnswers,
  buildHaemodialysisConcepts,
  buildVisitDiagnosisConcepts,
} from './haemodialysis-concepts';

export function useHaemodialysisConfig() {
  const { haemodialysis } = useConfig<ExpressWorkflowConfig>();

  return useMemo(
    () => ({
      formUuid: haemodialysis.formUuid,
      encounterTypeUuid: haemodialysis.encounterTypeUuid,
      monitoringSlotIntervalMinutes: haemodialysis.monitoringSlotIntervalMinutes,
      monitoringSlotLabelsMinutes: haemodialysis.monitoringSlotLabelsMinutes,
      concepts: buildHaemodialysisConcepts(haemodialysis),
      answers: buildHaemodialysisAnswers(haemodialysis),
      visitDiagnosis: buildVisitDiagnosisConcepts(haemodialysis),
    }),
    [haemodialysis],
  );
}
