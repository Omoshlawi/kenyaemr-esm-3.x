import { type PcsHieDependant } from '../types';

/**
 * Reads the dependants the HIE lists on a patient's record. The contact array is already in
 * hand whenever a patient has been pulled from the HIE, so this needs no request.
 */
export const getDependentsFromContacts = (patient: any): Array<PcsHieDependant> => {
  if (!patient?.contact) {
    return [];
  }

  return patient.contact.map((contact: any, index: number) => {
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
