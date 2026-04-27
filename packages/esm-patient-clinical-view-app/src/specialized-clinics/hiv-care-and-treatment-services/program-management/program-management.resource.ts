import { Encounter, restBaseUrl, useConfig, useOpenmrsFetchAll } from '@openmrs/esm-framework';
import { useMemo } from 'react';
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

  const url = `${restBaseUrl}/encounter?encounterType=${artTherapyEncounterUuid}&patient=${patientUuid}&form=${artTherapyFormUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, totalCount, mutate } = useOpenmrsFetchAll<Encounter>(url);
  const artTherapyEncounters = useMemo(() => {
    return data?.filter((encounter) => encounter.form.uuid === artTherapyFormUuid);
  }, [artTherapyFormUuid, data]);

  return {
    artTherapyEncounters,
    totalCount,
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
  const url = `${restBaseUrl}/encounter?encounterType=${serviceDeliveryEncounterUuid}&patient=${patientUuid}&form=${serviceDeliveryModelFormUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, totalCount, mutate } = useOpenmrsFetchAll<Encounter>(url);
  const serviceDeliveryEncounters = useMemo(() => {
    return data?.filter((encounter) => encounter.form.uuid === serviceDeliveryModelFormUuid);
  }, [serviceDeliveryModelFormUuid, data]);

  return {
    serviceDeliveryEncounters,
    totalCount,
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

  const url = `${restBaseUrl}/encounter?encounterType=${transferOutEncounterUuid}&patient=${patientUuid}&form=${transferOutFormUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, totalCount, mutate } = useOpenmrsFetchAll<Encounter>(url);
  const transferOutEncounters = useMemo(() => {
    return data?.filter((encounter) => encounter.form.uuid === transferOutFormUuid);
  }, [transferOutFormUuid, data]);

  return {
    transferOutEncounters,
    totalCount,
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

  const url = `${restBaseUrl}/encounter?encounterType=${patientTracingEncounterUuid}&patient=${patientUuid}&form=${patientTracingFormUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;

  const { data, error, isLoading, totalCount, mutate } = useOpenmrsFetchAll<Encounter>(url);
  const patientTracingEncounters = useMemo(() => {
    return data?.filter((encounter) => encounter.form.uuid === patientTracingFormUuid);
  }, [patientTracingFormUuid, data]);

  return {
    patientTracingEncounters,
    totalCount,
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

  const url = `${restBaseUrl}/encounter?encounterType=${clinicalVisitEncounterUuid}&patient=${patientUuid}&form=${clinicalVisitFormUuid}&v=${defaultEncounterRepresentation}&totalCount=true&limit=10&startIndex=0`;
  const { data, error, isLoading, totalCount, mutate } = useOpenmrsFetchAll<Encounter>(url);
  const clinicalVisitEncounters = useMemo(() => {
    return data?.filter((encounter) => encounter.form.uuid === clinicalVisitFormUuid);
  }, [clinicalVisitFormUuid, data]);

  return {
    clinicalVisitEncounters,
    totalCount,
    isLoading,
    error,
    mutate,
    clinicalVisitFormUuid,
    concepts,
  };
};
