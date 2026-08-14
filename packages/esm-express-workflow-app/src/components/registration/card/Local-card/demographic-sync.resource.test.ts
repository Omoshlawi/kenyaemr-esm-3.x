import { vi, type MockedFunction } from 'vitest';
import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { type LocalPatient } from '../../type';
import { syncLocalPatientFromHIE } from './demographic-sync.resource';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  openmrsFetch: vi.fn(),
}));

const mockOpenmrsFetch = openmrsFetch as MockedFunction<typeof openmrsFetch>;

const phoneAttributeTypeUUID = 'b2c38640-2603-4629-aebd-3b54f33f1e3a';
const personUuid = 'person-uuid';

const buildLocalPatient = (): LocalPatient =>
  ({
    uuid: personUuid,
    person: { personName: { uuid: 'name-uuid' } },
  } as unknown as LocalPatient);

const buildHiePatient = (phone?: string): fhir.Patient => ({
  resourceType: 'Patient',
  telecom: phone ? [{ system: 'phone', value: phone }] : undefined,
});

describe('syncLocalPatientFromHIE - phone number', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenmrsFetch.mockResolvedValue({} as any);
  });

  it('posts the HIE phone number to the configured person attribute type', async () => {
    await syncLocalPatientFromHIE(buildLocalPatient(), buildHiePatient('254712345678'), { phoneAttributeTypeUUID });

    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/person/${personUuid}/attribute`,
      expect.objectContaining({
        method: 'POST',
        body: { attributeType: phoneAttributeTypeUUID, value: '254712345678' },
      }),
    );
  });

  it('does not sync the phone when the attribute type is not configured', async () => {
    await syncLocalPatientFromHIE(buildLocalPatient(), buildHiePatient('254712345678'), {});

    expect(mockOpenmrsFetch).not.toHaveBeenCalledWith(
      `${restBaseUrl}/person/${personUuid}/attribute`,
      expect.anything(),
    );
  });

  it('does not sync the phone when the HIE record has none', async () => {
    await syncLocalPatientFromHIE(buildLocalPatient(), buildHiePatient(undefined), { phoneAttributeTypeUUID });

    expect(mockOpenmrsFetch).not.toHaveBeenCalledWith(
      `${restBaseUrl}/person/${personUuid}/attribute`,
      expect.anything(),
    );
  });
});

const SHA_NUMBER_TYPE_UUID = 'sha-number-type-uuid';
const NATIONAL_ID_TYPE_UUID = 'national-id-type-uuid';
const LOCATION_UUID = 'location-uuid';

const identifierTypes = [
  { code: 'national-id', typeUuid: NATIONAL_ID_TYPE_UUID, label: 'National ID' },
  { code: 'sha-number', typeUuid: SHA_NUMBER_TYPE_UUID, label: 'SHA number' },
];

const buildLocalPatientWithIdentifiers = (): LocalPatient =>
  ({
    uuid: personUuid,
    person: { personName: { uuid: 'name-uuid' } },
    identifiers: [
      {
        uuid: 'nid-identifier-uuid',
        identifier: '12345678',
        identifierType: { uuid: NATIONAL_ID_TYPE_UUID },
        location: { uuid: LOCATION_UUID },
      },
    ],
  } as unknown as LocalPatient);

const buildHiePatientWithIdentifiers = (nationalId: string, shaNumber?: string): fhir.Patient => ({
  resourceType: 'Patient',
  identifier: [
    { value: nationalId, type: { coding: [{ code: 'national-id' }] } },
    ...(shaNumber ? [{ value: shaNumber, type: { coding: [{ code: 'sha-number' }] } }] : []),
  ],
});

describe('syncLocalPatientFromHIE - identifiers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockOpenmrsFetch.mockResolvedValue({} as any);
  });

  it('creates a missing identifier against the location of an existing local identifier', async () => {
    await syncLocalPatientFromHIE(
      buildLocalPatientWithIdentifiers(),
      buildHiePatientWithIdentifiers('12345678', 'SHA-999'),
      { identifierTypes },
    );

    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/patient/${personUuid}/identifier`,
      expect.objectContaining({
        method: 'POST',
        body: {
          identifier: 'SHA-999',
          identifierType: SHA_NUMBER_TYPE_UUID,
          location: LOCATION_UUID,
          preferred: false,
        },
      }),
    );
  });

  it('updates an existing identifier in place when the value differs', async () => {
    await syncLocalPatientFromHIE(buildLocalPatientWithIdentifiers(), buildHiePatientWithIdentifiers('87654321'), {
      identifierTypes,
    });

    expect(mockOpenmrsFetch).toHaveBeenCalledWith(
      `${restBaseUrl}/patient/${personUuid}/identifier/nid-identifier-uuid`,
      expect.objectContaining({ method: 'POST', body: { identifier: '87654321' } }),
    );
  });

  it('does not write an identifier that already matches', async () => {
    await syncLocalPatientFromHIE(buildLocalPatientWithIdentifiers(), buildHiePatientWithIdentifiers('12345678'), {
      identifierTypes,
    });

    expect(mockOpenmrsFetch).not.toHaveBeenCalledWith(
      `${restBaseUrl}/patient/${personUuid}/identifier/nid-identifier-uuid`,
      expect.anything(),
    );
  });
});
