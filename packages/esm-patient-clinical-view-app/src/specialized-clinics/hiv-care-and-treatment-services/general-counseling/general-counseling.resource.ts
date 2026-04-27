import {
  Encounter,
  FetchResponse,
  openmrsFetch,
  restBaseUrl,
  useConfig,
  useOpenmrsFetchAll,
} from '@openmrs/esm-framework';
import useSWR from 'swr';
import { HivCareAndTreatmentConfig } from '../../../config-schema';
import { defaultEncounterRepresentation } from '../hiv-care-and-treatment.resource';
import { useMemo } from 'react';

export const useMentallHealthAsesments = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { mentalHealthAssessmentEncounterUuid },
      forms: { mentalHealthAssesmentFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();

  const url = `${restBaseUrl}/encounter?encounterType=${mentalHealthAssessmentEncounterUuid}&patient=${patientUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, totalCount, mutate } = useOpenmrsFetchAll<Encounter>(url);
  const mentalHealthAssesments = useMemo(() => {
    return data?.filter((encounter) => encounter.form.uuid === mentalHealthAssesmentFormUuid);
  }, [mentalHealthAssesmentFormUuid, data]);

  return {
    mentalHealthAssesments,
    totalCount,
    isLoading,
    error,
    mutate,
    mentalHealthAssesmentFormUuid,
    concepts,
  };
};
export const useClosure = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { closureEncounterUuid },
      forms: { closureFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();

  const url = `${restBaseUrl}/encounter?encounterType=${closureEncounterUuid}&patient=${patientUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, totalCount, mutate } = useOpenmrsFetchAll<Encounter>(url);
  const closureEncounters = useMemo(() => {
    return data?.filter((encounter) => encounter.form.uuid === closureFormUuid);
  }, [closureFormUuid, data]);

  return {
    closureEncounters,
    totalCount,
    isLoading,
    error,
    mutate,
    closureFormUuid,
    concepts,
  };
};
