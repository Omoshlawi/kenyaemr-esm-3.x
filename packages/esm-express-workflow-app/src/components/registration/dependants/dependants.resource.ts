import {
  getConfig,
  getSessionLocation,
  launchWorkspace2,
  launchWorkspaceGroup2,
  openmrsFetch,
  restBaseUrl,
  showSnackbar,
  type Visit,
} from '@openmrs/esm-framework';
import { DependentPayload, HIEPatient } from '../type';
import { generateIdentifier, sanitizeName } from '../helper';
import { openmrsId, openmrsIdSource } from '../constant';
import { ExpressWorkflowConfig } from '../../../config-schema';

async function getConfigUUIDs() {
  const config = (await getConfig('@kenyaemr/esm-express-workflow-app')) as ExpressWorkflowConfig;
  return {
    shaIdNumberUUID: config.crIdentificationNumberUUID,
    shaNumberUUID: config.shaNumberUUID,
    nationalIdUUID: config.nationalIdUUID,
    passportUUID: config.passportUUID,
    birthCertificateUUID: config.birthCertificateUUID,
    phoneAttributeTypeUUID: config.phoneAttributeTypeUUID,
  };
}
import { useEffect, useState } from 'react';
import { VisitFormProps } from '../start-visit-form/visit-form-workspace/visit-form.workspace';

export interface PatientRegistrationPayload {
  name: string;
  gender: string;
  birthDate?: string;
  patientData: HIEPatient | any;
  type: 'hie-patient' | 'dependent';
  parentPhoneNumber?: string;
}

interface AddressPayload {
  address1: string;
  address2?: string;
  cityVillage: string;
  country: string;
  postalCode: string;
  stateProvince: string;
  countyDistrict?: string;
}

export async function createPatient(payload: PatientRegistrationPayload, t: any) {
  try {
    const { patientData, type, gender, birthDate } = payload;
    const configUUIDs = await getConfigUUIDs();
    const resolveIdentifierType = (code: string): string => {
      const map: Record<string, string> = {
        'sha-number': configUUIDs.shaNumberUUID,
        'national-id': configUUIDs.nationalIdUUID,
        'passport-number': configUUIDs.passportUUID,
        'birth-certificate': configUUIDs.birthCertificateUUID,
        'sha-id-number': configUUIDs.shaIdNumberUUID,
      };
      return map[code] ?? '';
    };
    const sessionLocation = await getSessionLocation();
    const locationUuid = sessionLocation?.uuid ?? '';

    let identifiers: Array<{
      identifier: string;
      identifierType: string;
      location: string;
      preferred: boolean;
    }> = [];
    let givenName = '';
    let middleName = '';
    let familyName = '';
    let patientBirthDate = birthDate;
    let patientGender = gender;
    let addresses: AddressPayload[] = [];

    if (type === 'hie-patient') {
      const hiePatient = patientData as HIEPatient;

      identifiers =
        hiePatient.identifier
          ?.map((id) => ({
            identifier: id.value,
            identifierType: resolveIdentifierType(id.type.coding[0].code),
            location: locationUuid,
            preferred: false,
          }))
          .filter((identifier) => identifier.identifierType) || [];

      identifiers.push({
        identifier: hiePatient?.id,
        identifierType: resolveIdentifierType('sha-id-number'),
        location: locationUuid,
        preferred: false,
      });

      const patientName = hiePatient.name?.[0];
      if (patientName) {
        givenName = patientName.given?.[0] || '';
        middleName = patientName.given?.slice(1).join(' ') || '';
        familyName = patientName.family || '';

        if (!givenName && !familyName && patientName.text) {
          const nameParts = patientName.text.trim().split(' ');
          givenName = nameParts[0] || '';
          middleName = nameParts.slice(1, -1).join(' ');
          familyName = nameParts[nameParts.length - 1] || '';
        }
      }

      patientBirthDate = hiePatient.birthDate;
      patientGender = hiePatient.gender;

      addresses =
        hiePatient.address?.map((addr) => ({
          address1: '',
          address2: '',
          cityVillage: addr.city || '',
          country: addr.country || '',
          postalCode: '',
          stateProvince: '',
          countyDistrict: '',
        })) || [];
    } else if (type === 'dependent') {
      const dependentInfo = patientData;

      identifiers =
        dependentInfo.extension
          ?.filter((ext: any) => ext.url === 'identifiers' && ext.valueIdentifier)
          .map((ext: any) => ({
            identifier: ext.valueIdentifier.value,
            identifierType: resolveIdentifierType(ext.valueIdentifier.type.coding[0].code),
            location: locationUuid,
            preferred: false,
          }))
          .filter((identifier: any) => identifier.identifierType) || [];

      // contact.id (dependentInfo.id) IS the dependent's own CR number when sha-id-number is not in extensions
      const alreadyHasShaId = identifiers.some((id) => id.identifierType === resolveIdentifierType('sha-id-number'));
      if (!alreadyHasShaId && dependentInfo?.id && String(dependentInfo.id).startsWith('CR')) {
        identifiers.push({
          identifier: dependentInfo.id,
          identifierType: resolveIdentifierType('sha-id-number'),
          location: locationUuid,
          preferred: false,
        });
      }

      const birthdate = dependentInfo.extension?.find(
        (ext: any) => ext.url === 'https://ts.kenya-hie.health/fhir/StructureDefinition/date_of_birth',
      )?.valueString;

      const givenNames = dependentInfo.name?.given || [];
      familyName = dependentInfo.name?.family || '';

      if (givenNames.length > 0) {
        givenName = givenNames[0];
        middleName = givenNames.slice(1).join(' ');
      } else if (dependentInfo.name?.text) {
        const nameParts = dependentInfo.name.text.trim().split(' ');
        givenName = nameParts[0] || '';
        middleName = nameParts.slice(1, -1).join(' ');
        if (!familyName && nameParts.length > 1) {
          familyName = nameParts[nameParts.length - 1];
        }
      }

      patientBirthDate = birthdate;
      patientGender = dependentInfo.gender;
      addresses = [
        {
          address1: '',
          cityVillage: '',
          country: dependentInfo.address?.country || '',
          postalCode: '',
          stateProvince: '',
        },
      ];
    }

    if (identifiers.length > 0) {
      identifiers[0].preferred = true;
    }

    const { phoneAttributeTypeUUID } = configUUIDs;
    const phoneAttributes: Array<{ attributeType: string; value: string }> = [];
    if (type === 'hie-patient') {
      const phoneContact = patientData.telecom?.find((t: any) => t.system === 'phone');
      if (phoneContact?.value) {
        phoneAttributes.push({
          attributeType: phoneAttributeTypeUUID,
          value: phoneContact.value,
        });
      }
    } else if (type === 'dependent') {
      const { parentPhoneNumber } = payload;
      if (parentPhoneNumber) {
        phoneAttributes.push({
          attributeType: phoneAttributeTypeUUID,
          value: parentPhoneNumber,
        });
      }
    }

    const defaultAddress: AddressPayload = {
      address1: '',
      cityVillage: '',
      country: '',
      postalCode: '',
      stateProvince: '',
    };

    const registrationPayload = {
      person: {
        names: [
          {
            preferred: true,
            givenName: sanitizeName(givenName) || 'Unknown',
            middleName: sanitizeName(middleName) || '',
            familyName: sanitizeName(familyName) || 'Unknown',
          },
        ],
        gender: patientGender?.charAt(0).toUpperCase() || 'U',
        birthdate: patientBirthDate || null,
        birthdateEstimated: !patientBirthDate,
        attributes: phoneAttributes,
        addresses: addresses.length > 0 ? addresses : [defaultAddress],
      },
      identifiers: [...identifiers],
    };

    try {
      const identifierResponse = await generateIdentifier(openmrsIdSource);
      const location = await getSessionLocation();

      if (!location?.uuid) {
        throw new Error('Could not determine session location');
      }

      const openmrsIdentifier = {
        identifier: identifierResponse.data.identifier,
        identifierType: openmrsId,
        location: location.uuid,
        preferred: identifiers.length === 0,
      };

      registrationPayload.identifiers.push(openmrsIdentifier);

      if (identifiers.length > 0) {
        registrationPayload.identifiers.forEach((id) => {
          if (id.identifierType !== openmrsId) {
            id.preferred = false;
          }
        });
        openmrsIdentifier.preferred = true;
      }
    } catch (identifierError) {
      throw new Error('Failed to generate OpenMRS identifier');
    }

    if (registrationPayload.identifiers.length === 0) {
      throw new Error('No valid identifiers found for the patient');
    }

    const response = await openmrsFetch<{ uuid: string }>(`${restBaseUrl}/patient`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: registrationPayload,
    });

    const patientType = type === 'hie-patient' ? 'patient' : 'dependent';

    showSnackbar({
      title: t(`${patientType}RegisteredSuccessfully`, `${patientType} registered successfully`),
      subtitle: t(`${patientType}RegisteredSuccessfullySubtitle`, `You can now start a visit for the ${patientType}`),
      kind: 'success',
      isLowContrast: true,
    });

    return response.data;
  } catch (error: any) {
    const patientType = payload.type === 'hie-patient' ? 'Patient' : 'Dependent';
    let errorMessage = t(
      `${patientType.toLowerCase()}RegistrationFailedSubtitle`,
      'Please try again or contact support',
    );

    if (error?.response?.data?.error?.message) {
      errorMessage = error.response.data.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    showSnackbar({
      title: t(`${patientType.toLowerCase()}RegistrationFailed`, `${patientType} registration failed`),
      subtitle: errorMessage,
      kind: 'error',
      isLowContrast: true,
    });

    throw error;
  }
}

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

export async function createDependentPatient(dependent: DependentPayload, t: any) {
  const payload: PatientRegistrationPayload = {
    name: dependent.name,
    gender: dependent.gender,
    patientData: dependent.dependentInfo,
    type: 'dependent',
    parentPhoneNumber: dependent.parentPhoneNumber,
  };

  const result = await createPatient(payload, t);
  await launchCheckInWorkspace(result, result.uuid);
  return result;
}

/**
 * Updates the phone attribute on a dependent's local patient record to the parent's phone number.
 * Fetches the person's current attributes (with UUIDs) to update or create the attribute.
 */
async function updatePhoneAttribute(personUuid: string, parentPhoneNumber: string, phoneAttributeTypeUUID: string) {
  const sanitized = parentPhoneNumber.trim();
  if (!sanitized) {
    return;
  }

  const response = await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute?v=default`);
  const attributes: any[] = response?.data?.results ?? [];
  const existing = attributes.find((a: any) => a.attributeType?.uuid === phoneAttributeTypeUUID && !a.voided);

  if (existing) {
    if (existing.value === sanitized) {
      return;
    }
    await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute/${existing.uuid}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { value: sanitized },
    });
  } else {
    await openmrsFetch(`${restBaseUrl}/person/${personUuid}/attribute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { attributeType: phoneAttributeTypeUUID, value: sanitized },
    });
  }
}

/**
 * Patches a locally registered dependent patient's SHA/CR identifiers and phone attribute
 * when they don't match the values coming from the HIE contact data.
 */
export async function updateDependentIdentifiers(
  localPatient: any,
  dependent: any,
  options?: { parentPhoneNumber?: string; phoneAttributeTypeUUID?: string },
) {
  const configUUIDs = await getConfigUUIDs();
  const expectedCrNumber = dependent.shaIdNumber ?? (String(dependent.id ?? '').startsWith('CR') ? dependent.id : null);
  const expectedShaNumber = dependent.shaNumber ?? null;

  const existingCrIdentifier = localPatient.identifiers?.find(
    (id: any) => id.identifierType?.uuid === configUUIDs.shaIdNumberUUID,
  );
  const existingShaIdentifier = localPatient.identifiers?.find(
    (id: any) => id.identifierType?.uuid === configUUIDs.shaNumberUUID,
  );

  const { parentPhoneNumber, phoneAttributeTypeUUID = configUUIDs.phoneAttributeTypeUUID } = options ?? {};

  const sessionLocation = await getSessionLocation();
  const locationUuid = sessionLocation?.uuid ?? '';

  const updates: Promise<any>[] = [];

  if (parentPhoneNumber) {
    updates.push(updatePhoneAttribute(localPatient.uuid, parentPhoneNumber, phoneAttributeTypeUUID));
  }

  if (expectedCrNumber && existingCrIdentifier?.identifier !== expectedCrNumber) {
    const patchCr = async () => {
      if (existingCrIdentifier) {
        await openmrsFetch(`${restBaseUrl}/patient/${localPatient.uuid}/identifier/${existingCrIdentifier.uuid}`, {
          method: 'DELETE',
        });
      }
      await openmrsFetch(`${restBaseUrl}/patient/${localPatient.uuid}/identifier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          identifier: expectedCrNumber,
          identifierType: configUUIDs.shaIdNumberUUID,
          location: locationUuid,
          preferred: false,
        },
      });
    };
    updates.push(patchCr());
  }

  if (expectedShaNumber && existingShaIdentifier?.identifier !== expectedShaNumber) {
    const patchSha = async () => {
      if (existingShaIdentifier) {
        await openmrsFetch(`${restBaseUrl}/patient/${localPatient.uuid}/identifier/${existingShaIdentifier.uuid}`, {
          method: 'DELETE',
        });
      }
      await openmrsFetch(`${restBaseUrl}/patient/${localPatient.uuid}/identifier`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          identifier: expectedShaNumber,
          identifierType: configUUIDs.shaNumberUUID,
          location: locationUuid,
          preferred: false,
        },
      });
    };
    updates.push(patchSha());
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
}

export async function createHIEPatient(hiePatient: HIEPatient, t: any) {
  const patientName =
    hiePatient.name?.[0]?.text ||
    `${hiePatient.name?.[0]?.given?.join(' ') || ''} ${hiePatient.name?.[0]?.family || ''}`.trim() ||
    'Unknown Patient';

  const payload: PatientRegistrationPayload = {
    name: patientName,
    gender: hiePatient.gender,
    birthDate: hiePatient.birthDate,
    patientData: hiePatient,
    type: 'hie-patient',
  };

  const result = await createPatient(payload, t);
  await launchCheckInWorkspace(result, result.uuid);
  return result;
}

export const getDependentsFromContacts = (patient: HIEPatient) => {
  if (!patient?.contact) {
    return [];
  }

  return patient.contact.map((contact, index) => {
    const relationship = contact.relationship?.[0]?.coding?.[0]?.display || 'Unknown';

    const name =
      contact.name?.text?.trim() ||
      `${contact.name?.given?.join(' ') || ''} ${contact.name?.family || ''}`.trim() ||
      'Unknown';

    const phoneContact = contact.telecom?.find((t) => t.system === 'phone');
    const phoneNumber = phoneContact?.value || 'N/A';

    const emailContact = contact.telecom?.find((t) => t.system === 'email');
    const email = emailContact?.value || 'N/A';

    const gender = contact.gender || 'Unknown';

    const birthDateExtension = contact.extension?.find(
      (ext) => ext.url === 'https://ts.kenya-hie.health/fhir/StructureDefinition/date_of_birth',
    );
    const birthDate = birthDateExtension?.valueString || 'Unknown';

    const identifierExtensions = contact.extension?.filter((ext) => ext.url === 'identifiers') || [];
    const shaNumber = identifierExtensions.find((ext) => ext.valueIdentifier?.type?.coding?.[0]?.code === 'sha-number')
      ?.valueIdentifier?.value;
    const shaIdNumber = identifierExtensions.find(
      (ext) => ext.valueIdentifier?.type?.coding?.[0]?.code === 'sha-id-number',
    )?.valueIdentifier?.value;
    const nationalId = identifierExtensions.find(
      (ext) => ext.valueIdentifier?.type?.coding?.[0]?.code === 'national-id',
    )?.valueIdentifier?.value;
    const birthCertificate = identifierExtensions.find(
      (ext) => ext.valueIdentifier?.type?.coding?.[0]?.code === 'birth-certificate',
    )?.valueIdentifier?.value;

    return {
      id: contact.id || `contact-${index}`,
      name,
      relationship,
      phoneNumber,
      email,
      gender,
      birthDate,
      shaNumber,
      nationalId,
      birthCertificate,
      contactData: contact,
      shaIdNumber,
    };
  });
};

export const useActiveVisit = (patientUuid: string | null) => {
  const [activeVisit, setActiveVisit] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patientUuid) {
      setActiveVisit(null);
      return;
    }

    const fetchActiveVisit = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/openmrs/ws/rest/v1/visit?patient=${patientUuid}&includeInactive=false&v=default`,
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const visits = data?.results || [];
        setActiveVisit(visits.length > 0 ? visits[0] : null);
      } catch (err: any) {
        setError(err);
        setActiveVisit(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveVisit();
  }, [patientUuid]);

  return { activeVisit, isLoading, error };
};

export const useMultipleActiveVisits = (patientUuids: (string | null)[]) => {
  const [visits, setVisits] = useState<Array<{ activeVisit: any; isLoading: boolean }>>([]);

  useEffect(() => {
    const fetchAllActiveVisits = async () => {
      const visitPromises = patientUuids.map(async (uuid) => {
        if (!uuid) {
          return { activeVisit: null, isLoading: false };
        }

        try {
          const response = await fetch(`/openmrs/ws/rest/v1/visit?patient=${uuid}&includeInactive=false&v=default`);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          const visitResults = data?.results || [];
          return { activeVisit: visitResults.length > 0 ? visitResults[0] : null, isLoading: false };
        } catch (error) {
          return { activeVisit: null, isLoading: false };
        }
      });

      const visitResults = await Promise.all(visitPromises);
      setVisits(visitResults);
    };

    if (patientUuids.length > 0) {
      setVisits(patientUuids.map(() => ({ activeVisit: null, isLoading: true })));
      fetchAllActiveVisits();
    } else {
      setVisits([]);
    }
  }, [patientUuids]);

  return visits;
};
