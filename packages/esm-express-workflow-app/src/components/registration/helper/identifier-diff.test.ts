import { getIdentifierDifferences, type SyncableIdentifierType } from './index';

const NATIONAL_ID_TYPE_UUID = 'national-id-type-uuid';
const SHA_NUMBER_TYPE_UUID = 'sha-number-type-uuid';

const identifierTypes: Array<SyncableIdentifierType> = [
  { code: 'national-id', typeUuid: NATIONAL_ID_TYPE_UUID, label: 'National ID' },
  { code: 'sha-number', typeUuid: SHA_NUMBER_TYPE_UUID, label: 'SHA number' },
];

const localPatient = (identifiers: Array<{ typeUuid: string; value: string }>) => ({
  uuid: 'local-uuid',
  identifiers: identifiers.map(({ typeUuid, value }) => ({
    identifier: value,
    identifierType: { uuid: typeUuid },
  })),
});

const hiePatient = (identifiers: Array<{ code: string; value: string }>): fhir.Patient => ({
  resourceType: 'Patient',
  identifier: identifiers.map(({ code, value }) => ({ value, type: { coding: [{ code }] } })),
});

describe('getIdentifierDifferences', () => {
  it('flags an identifier that exists in the HIE but is missing locally', () => {
    const differences = getIdentifierDifferences(
      localPatient([{ typeUuid: NATIONAL_ID_TYPE_UUID, value: '12345678' }]),
      hiePatient([
        { code: 'national-id', value: '12345678' },
        { code: 'sha-number', value: 'SHA-999' },
      ]),
      identifierTypes,
    );

    expect(differences).toContainEqual({
      field: 'identifier',
      label: 'SHA number',
      localValue: '',
      hieValue: 'SHA-999',
    });
  });

  it('flags an identifier whose local value differs from the HIE', () => {
    const differences = getIdentifierDifferences(
      localPatient([{ typeUuid: SHA_NUMBER_TYPE_UUID, value: 'SHA-111' }]),
      hiePatient([{ code: 'sha-number', value: 'SHA-999' }]),
      identifierTypes,
    );

    expect(differences).toContainEqual({
      field: 'identifier',
      label: 'SHA number',
      localValue: 'SHA-111',
      hieValue: 'SHA-999',
    });
  });

  it('does not flag identifiers that already match (case/whitespace-insensitive)', () => {
    const differences = getIdentifierDifferences(
      localPatient([{ typeUuid: SHA_NUMBER_TYPE_UUID, value: ' sha-999 ' }]),
      hiePatient([{ code: 'sha-number', value: 'SHA-999' }]),
      identifierTypes,
    );

    expect(differences).toHaveLength(0);
  });

  it('ignores identifier types that are not configured', () => {
    const differences = getIdentifierDifferences(
      localPatient([]),
      hiePatient([{ code: 'sha-number', value: 'SHA-999' }]),
      [{ code: 'sha-number', typeUuid: '', label: 'SHA number' }],
    );

    expect(differences).toHaveLength(0);
  });
});
