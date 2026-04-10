import { useMemo } from 'react';
import {
  FetchResponse,
  launchWorkspace2,
  launchWorkspaceGroup2,
  makeUrl,
  openmrsFetch,
  restBaseUrl,
  type Visit,
} from '@openmrs/esm-framework';
import useSWR from 'swr';
import { type EligibilityResponse, type HIEEligibilityResponse, type LocalPatientApiResponse } from '../type';
import {
  HIE_CONFIGURATION_MISSING,
  PATIENT_API_NO_CREDENTIALS,
  PATIENT_NOT_FOUND,
  RESOURCE_NOT_FOUND,
  UNKNOWN,
} from '../constant';
import { createDependentPatient, createHIEPatient } from '../dependants/dependants.resource';
import { transformToDependentPayload } from '../helper';
import { VisitFormProps } from '../start-visit-form/visit-form-workspace/visit-form.workspace';

export const searchPatientFromHIE = async (identifierType: string, searchQuery: string) => {
  const url = `${restBaseUrl}/kenyaemr/getSHAPatient/${searchQuery}/${identifierType}`;
  const response = await fetch(makeUrl(url));
  if (response.ok) {
    const responseData = await response.json();
    if (responseData?.issue) {
      throw new Error(PATIENT_NOT_FOUND);
    }
    return responseData;
  }
  if (response.status === 401) {
    throw new Error(PATIENT_API_NO_CREDENTIALS);
  } else if (response.status === 404) {
    throw new Error(RESOURCE_NOT_FOUND);
  } else if (response.status === 500) {
    throw new Error(HIE_CONFIGURATION_MISSING);
  }
  throw new Error(UNKNOWN);
};

export const usePatient = (searchQuery: string) => {
  const customRepresentation =
    'custom:(patientId,uuid,identifiers,display,patientIdentifier:(uuid,identifier),person:(gender,age,birthdate,birthdateEstimated,personName,addresses,display,dead,deathDate),attributes:(value,attributeType:(uuid,display)))';
  const url = `${restBaseUrl}/patient?q=${searchQuery}&v=${customRepresentation}`;

  const { isLoading, error, data } = useSWR<FetchResponse<LocalPatientApiResponse>>(
    searchQuery ? url : null,
    openmrsFetch,
  );

  const patient = data?.data?.results || null;

  return { patient, isLoading, error };
};

export const useSHAEligibility = (nationalId: string) => {
  const url =
    nationalId && nationalId.trim().length > 0
      ? `${restBaseUrl}/insuranceclaims/CoverageEligibilityRequest?nationalId=${nationalId}`
      : null;

  const { data, error, isLoading, mutate } = useSWR<{ data: EligibilityResponse }>(url, openmrsFetch);

  return {
    eligibilityData: data?.data,
    isLoading,
    error,
    mutate,
  };
};

export const extractPatientIdentifiers = (patient: any, isDependent = false) => {
  const identifiers: Array<{ value: string; type: string }> = [];

  if (isDependent) {
    const identifierExtensions = patient.extension?.filter((ext: any) => ext.url === 'identifiers') || [];
    identifierExtensions.forEach((ext: any) => {
      if (ext.valueIdentifier?.value && ext.valueIdentifier?.type?.coding?.[0]?.code) {
        identifiers.push({
          value: ext.valueIdentifier.value,
          type: ext.valueIdentifier.type.coding[0].code,
        });
      }
    });
  } else {
    if (patient.identifier && Array.isArray(patient.identifier)) {
      patient.identifier.forEach((id: any) => {
        if (id.value && id.type?.coding?.[0]?.code) {
          identifiers.push({
            value: id.value,
            type: id.type.coding[0].code,
          });
        }
      });
    }
  }

  return identifiers;
};

export const findExistingLocalPatient = async (patient: any, isDependent = false) => {
  const identifiers = extractPatientIdentifiers(patient, isDependent);

  if (identifiers.length === 0) {
    return null;
  }

  const prioritizedIdentifiers = identifiers.sort((a, b) => {
    const priorityOrder: Record<string, number> = { 'national-id': 1, 'sha-number': 2, 'birth-certificate': 3 };
    return (priorityOrder[a.type] || 999) - (priorityOrder[b.type] || 999);
  });

  for (const identifier of prioritizedIdentifiers) {
    try {
      const existingPatient = await searchLocalPatientByIdentifier(identifier.value, identifier.type);
      if (existingPatient) {
        return existingPatient;
      }
    } catch (error) {
      continue;
    }
  }

  return null;
};

async function launchCheckInWorkspace(patient: any, patientUuid: string) {
  await launchWorkspaceGroup2('ewf-patient-chart', {
    patient,
    patientUuid,
    visitContext: null as unknown as Visit,
    mutateVisitContext: () => {},
  });

  launchWorkspace2<VisitFormProps, {}, {}>(
    'custom-start-visit-workspace-form',
    {
      openedFrom: 'registration-check-in',
      showPatientHeader: false,
    },
    {},
    null,
  );
}

export const registerOrLaunchHIEPatient = async (hiePatient: any, t: any) => {
  try {
    const existingLocalPatient = await findExistingLocalPatient(hiePatient, false);

    if (existingLocalPatient) {
      return existingLocalPatient;
    } else {
      return await createHIEPatient(hiePatient, t);
    }
  } catch (error) {
    throw error;
  }
};

export const registerOrLaunchDependent = async (dependent: any, t: any) => {
  try {
    const existingLocalPatient = await findExistingLocalPatient(dependent.contactData, true);

    if (existingLocalPatient) {
      await launchCheckInWorkspace(existingLocalPatient, existingLocalPatient.uuid);
      return existingLocalPatient;
    } else {
      const dependentPayload = transformToDependentPayload(dependent);
      return await createDependentPatient(dependentPayload, t);
    }
  } catch (error) {
    throw error;
  }
};

export const searchMultipleDependentsLocally = async (dependents: any[]) => {
  const results = new Map();

  for (const dependent of dependents) {
    try {
      const existingPatient = await findExistingLocalPatient(dependent.contactData, true);
      results.set(dependent.id, existingPatient);
    } catch (error) {
      results.set(dependent.id, null);
    }
  }

  return results;
};

export const searchLocalPatientByIdentifier = async (identifierValue: string, identifierType?: string) => {
  if (!identifierValue) {
    return null;
  }

  try {
    const customRepresentation =
      'custom:(patientId,uuid,identifiers,display,patientIdentifier:(uuid,identifier),person:(gender,age,birthdate,birthdateEstimated,personName,addresses,display,dead,deathDate),attributes:(value,attributeType:(uuid,display)))';

    let response = await openmrsFetch(
      `${restBaseUrl}/patient?identifier=${encodeURIComponent(identifierValue)}&v=${customRepresentation}`,
    );

    if (response?.data?.results && response.data.results.length > 0) {
      return response.data.results[0];
    }

    if (!identifierType) {
      response = await openmrsFetch(
        `${restBaseUrl}/patient?q=${encodeURIComponent(identifierValue)}&v=${customRepresentation}`,
      );

      if (response?.data?.results && response.data.results.length > 0) {
        const matchingPatients = response.data.results.filter((patient: any) => {
          return patient.identifiers?.some(
            (id: any) => id.identifier === identifierValue || id.display?.includes(identifierValue),
          );
        });

        if (matchingPatients.length > 0) {
          return matchingPatients[0];
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
};

export const useLocalPatientByIdentifier = (identifierValue: string | null) => {
  const { data, error, isLoading } = useSWR(
    identifierValue ? `local-patient-${identifierValue}` : null,
    () => (identifierValue ? searchLocalPatientByIdentifier(identifierValue) : null),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 300000,
    },
  );

  return {
    localPatient: data,
    isLoading,
    error,
  };
};

export const searchLocalPatientsByIdentifiers = async (identifiers: Array<{ value: string; type: string }>) => {
  const results = await Promise.allSettled(
    identifiers.map((identifier) => searchLocalPatientByIdentifier(identifier.value, identifier.type)),
  );

  return results.map((result, index) => ({
    identifier: identifiers[index],
    patient: result.status === 'fulfilled' ? result.value : null,
    error: result.status === 'rejected' ? result.reason : null,
  }));
};
