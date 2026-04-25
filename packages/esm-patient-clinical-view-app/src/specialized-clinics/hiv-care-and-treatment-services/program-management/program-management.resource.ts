import { Encounter, FetchResponse, openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { HivCareAndTreatmentConfig } from '../../../config-schema';
import { defaultEncounterRepresentation } from '../hiv-care-and-treatment.resource';

export const useArtTherapy = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { artTherapyEncounterUuid },
      forms: { artTherapyFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();

  const url = `${restBaseUrl}/encounter?encounterType=${artTherapyEncounterUuid}&patient=${patientUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ results: Array<Encounter>; totalCount: number }>>(
    url,
    openmrsFetch,
  );

  return {
    artTherapyEncounters: data?.data.results,
    totalCount: data?.data.totalCount,
    isLoading,
    error,
    mutate,
    artTherapyFormUuid,
    concepts,
  };
};

export const useServiceDelivertModel = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { serviceDeliveryEncounterUuid },
      forms: { serviceDeliveryModelFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();
  const url = `${restBaseUrl}/encounter?encounterType=${serviceDeliveryEncounterUuid}&patient=${patientUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ results: Array<Encounter>; totalCount: number }>>(
    url,
    openmrsFetch,
  );

  return {
    serviceDeliveryEncounters: data?.data.results,
    totalCount: data?.data.totalCount,
    isLoading,
    error,
    mutate,
    serviceDeliveryModelFormUuid,
    concepts,
  };
};

export const useTransferOut = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { transferOutEncounterUuid },
      forms: { transferOutFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();

  const url = `${restBaseUrl}/encounter?encounterType=${transferOutEncounterUuid}&patient=${patientUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ results: Array<Encounter>; totalCount: number }>>(
    url,
    openmrsFetch,
  );

  return {
    transferOutEncounters: data?.data.results,
    totalCount: data?.data.totalCount,
    isLoading,
    error,
    mutate,
    transferOutFormUuid,
    concepts,
  };
};

export const usePatientTracing = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { patientTracingEncounterUuid },
      forms: { patientTracingFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();

  const url = `${restBaseUrl}/encounter?encounterType=${patientTracingEncounterUuid}&patient=${patientUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ results: Array<Encounter>; totalCount: number }>>(
    url,
    openmrsFetch,
  );

  return {
    patientTracingEncounters: data?.data.results,
    totalCount: data?.data.totalCount,
    isLoading,
    error,
    mutate,
    patientTracingFormUuid,
    concepts,
  };
};
export const useClinicalVisit = (patientUuid: string) => {
  const {
    hivCareAndTreatment: {
      encounters: { clinicalVisitEncounterUuid },
      forms: { clinicalVisitFormUuid },
      concepts,
    },
  } = useConfig<HivCareAndTreatmentConfig>();

  const url = `${restBaseUrl}/encounter?encounterType=${clinicalVisitEncounterUuid}&patient=${patientUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<{ results: Array<Encounter>; totalCount: number }>>(
    url,
    openmrsFetch,
  );

  return {
    clinicalVisitEncounters: data?.data.results,
    totalCount: data?.data.totalCount,
    isLoading,
    error,
    mutate,
    clinicalVisitFormUuid,
    concepts,
  };
};
