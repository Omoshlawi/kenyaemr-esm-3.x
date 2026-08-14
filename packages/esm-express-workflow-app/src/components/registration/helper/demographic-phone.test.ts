import {
  convertLocalPatientToFHIR,
  getDemographicDifferences,
  getLocalPatientPhone,
  getPhoneFromFhirPatient,
} from './index';

const localWithPhone = (phone?: string) => ({
  uuid: 'local-uuid',
  person: { personName: { givenName: 'Jane', familyName: 'Doe' }, gender: 'F', birthdate: '1990-01-01' },
  attributes: phone ? [{ value: phone, attributeType: { uuid: 'attr', display: 'Telephone Number' } }] : [],
});

const hieWithPhone = (phone?: string): fhir.Patient => ({
  resourceType: 'Patient',
  name: [{ given: ['Jane'], family: 'Doe' }],
  gender: 'female',
  birthDate: '1990-01-01',
  telecom: phone ? [{ system: 'phone', value: phone }] : undefined,
});

describe('phone demographic sync helpers', () => {
  it('reads the phone from a local person attribute labelled as a telephone/mobile/phone', () => {
    expect(getLocalPatientPhone(localWithPhone('0712345678'))).toBe('0712345678');
    expect(getLocalPatientPhone(localWithPhone(undefined))).toBeUndefined();
  });

  it('exposes the local phone as FHIR telecom', () => {
    expect(getPhoneFromFhirPatient(convertLocalPatientToFHIR(localWithPhone('0712345678')))).toBe('0712345678');
    expect(convertLocalPatientToFHIR(localWithPhone(undefined)).telecom).toBeUndefined();
  });

  it('flags a phone difference when the numbers differ', () => {
    const differences = getDemographicDifferences(
      convertLocalPatientToFHIR(localWithPhone('0712345678')),
      hieWithPhone('0722999999'),
    );
    expect(differences).toContainEqual({ field: 'phone', localValue: '0712345678', hieValue: '0722999999' });
  });

  it('treats the same number in different formats as equal', () => {
    const differences = getDemographicDifferences(
      convertLocalPatientToFHIR(localWithPhone('0712345678')),
      hieWithPhone('+254712345678'),
    );
    expect(differences.some((difference) => difference.field === 'phone')).toBe(false);
  });

  it('does not flag a phone difference when either side is missing a number', () => {
    const differences = getDemographicDifferences(
      convertLocalPatientToFHIR(localWithPhone(undefined)),
      hieWithPhone('0722999999'),
    );
    expect(differences.some((difference) => difference.field === 'phone')).toBe(false);
  });
});
