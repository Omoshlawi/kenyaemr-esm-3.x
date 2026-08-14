import { convertLocalPatientToFHIR, getNationalIdFromPatient } from './index';

const NATIONAL_ID_TYPE_UUID = '49af6cdc-7968-4abb-bf46-de10d7f4859f';

const localPatientWithNationalId = (display: string) => ({
  uuid: 'local-uuid',
  identifiers: [
    {
      identifier: '12345678',
      identifierType: { uuid: NATIONAL_ID_TYPE_UUID, display },
    },
  ],
  person: { personName: { givenName: 'Jane', familyName: 'Doe' } },
});

const hiePatientWithNationalId = (value: string): fhir.Patient => ({
  resourceType: 'Patient',
  identifier: [{ value, type: { coding: [{ code: 'national-id', display: 'National ID' }] } }],
});

describe('getNationalIdFromPatient', () => {
  it('reads the national ID from an HIE record by its code', () => {
    expect(getNationalIdFromPatient(hiePatientWithNationalId('12345678'))).toBe('12345678');
  });

  it('reads the national ID from a local record whose identifier type is displayed as "National ID"', () => {
    const fhir = convertLocalPatientToFHIR(localPatientWithNationalId('National ID'));
    expect(getNationalIdFromPatient(fhir)).toBe('12345678');
  });

  it('matches a local record by the configured identifier type UUID even when its display differs', () => {
    const fhir = convertLocalPatientToFHIR(localPatientWithNationalId('National ID Number'));
    expect(getNationalIdFromPatient(fhir)).toBeNull();
    expect(getNationalIdFromPatient(fhir, NATIONAL_ID_TYPE_UUID)).toBe('12345678');
  });

  it('trims surrounding whitespace on the returned value', () => {
    expect(getNationalIdFromPatient(hiePatientWithNationalId('  12345678  '))).toBe('12345678');
  });

  it('is case-insensitive on the "National ID" display', () => {
    const fhir = convertLocalPatientToFHIR(localPatientWithNationalId('national id'));
    expect(getNationalIdFromPatient(fhir)).toBe('12345678');
  });
});
