import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionLocation, launchWorkspace2, launchWorkspaceGroup2, openmrsFetch } from '@openmrs/esm-framework';
import { createPatient } from '../../dependants/dependants.resource';
import { findExistingLocalPatient } from '../../search-bar/search-bar.resource';
import { createAndLinkFromParticipant, linkDependantToParticipant } from './link-dependant.resource';
import { type PcsParticipant } from '../pcs.types';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  openmrsFetch: vi.fn(),
  getSessionLocation: vi.fn(),
  launchWorkspace2: vi.fn(),
  launchWorkspaceGroup2: vi.fn(),
}));

vi.mock('../../dependants/dependants.resource', () => ({ createPatient: vi.fn() }));
vi.mock('../../search-bar/search-bar.resource', () => ({ findExistingLocalPatient: vi.fn() }));
vi.mock('../../constant', () => ({ openmrsId: 'openmrs-id-type', openmrsIdSource: 'openmrs-id-source' }));

vi.mock('../../helper', () => ({
  generateIdentifier: vi.fn(async () => ({ data: { identifier: 'MGH-0001' } })),
  sanitizeName: (name: string) => name,
  transformToDependentPayload: (dependant: any) => ({
    name: dependant.name,
    gender: dependant.gender,
    dependentInfo: { id: dependant.id },
  }),
}));

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockCreatePatient = vi.mocked(createPatient);
const mockFindExistingLocalPatient = vi.mocked(findExistingLocalPatient);

const STUDY_ID_TYPE = 'study-id-type-uuid';
const PBIDS_ENROLLMENT_TYPE = 'pbids-enrollment-type-uuid';
const CARDSE_ENROLLMENT_TYPE = 'cardse-enrollment-type-uuid';

const participant = {
  individualId: '901-1-1-3',
  firstName: 'DENNIS',
  lastName: 'ODONGO',
  sex: 'M',
  pbidsEnrolled: true,
  cardse: false,
  mother: null,
  compound: { compoundId: '901-1', headIndividualId: '901-1-1-1', headFirstName: 'JOHN', headLastName: 'ODONGO' },
  village: { code: '901', name: 'TEST ABUYA' },
  contacts: [],
  matchedOn: null,
  matchType: null,
} as PcsParticipant;

const dependant = { id: 'CR-123', name: 'Dennis Odongo', gender: 'M', contactData: { id: 'CR-123' } };

const link = () =>
  linkDependantToParticipant({
    dependant,
    parentPhoneNumber: '0712345678',
    participant,
    studyParticipantIdentifierType: STUDY_ID_TYPE,
    pbidsEnrollmentAttributeType: PBIDS_ENROLLMENT_TYPE,
    cardseEnrollmentAttributeType: CARDSE_ENROLLMENT_TYPE,
    t: (_key: string, fallback: string) => fallback,
  });

const writes = () =>
  mockOpenmrsFetch.mock.calls.filter(([, options]) => (options as any)?.method === 'POST').map(([url]) => url);

/**
 * The by-uuid re-read is tagged so tests can tell the refreshed record apart from the one
 * resolved before the writes — that distinction is the bug this file guards.
 */
const rereadFor = (url: string) => ({
  uuid: url.split('/patient/')[1]?.split('?')[0],
  identifiers: [],
  reread: true,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionLocationDefault();
  mockOpenmrsFetch.mockImplementation((url: string, options?: any) => {
    if (url.includes('?v=custom')) {
      return Promise.resolve({ data: rereadFor(url) } as any);
    }
    if (url.endsWith('/patient') && options?.method === 'POST') {
      return Promise.resolve({ data: { uuid: 'created-uuid', identifiers: [] } } as any);
    }
    return Promise.resolve({ data: { results: [] } } as any);
  });
});

function mockGetSessionLocationDefault() {
  vi.mocked(getSessionLocation).mockResolvedValue({ uuid: 'location-uuid' } as any);
}

describe('linkDependantToParticipant', () => {
  it('uses the existing local record and never creates one', async () => {
    mockFindExistingLocalPatient.mockResolvedValue({ uuid: 'dependant-uuid', identifiers: [] } as any);

    await link();

    expect(mockCreatePatient).not.toHaveBeenCalled();
    // isDependent must be true, or household-number would match the parent's record.
    expect(mockFindExistingLocalPatient).toHaveBeenCalledWith(dependant.contactData, true);
    expect(writes()).toContain('/ws/rest/v1/patient/dependant-uuid/identifier');
  });

  it('creates the dependant, then stamps, then checks in exactly once', async () => {
    mockFindExistingLocalPatient.mockResolvedValue(null);
    mockCreatePatient.mockResolvedValue({ uuid: 'new-uuid', identifiers: [] } as any);

    await link();

    expect(mockCreatePatient).toHaveBeenCalledOnce();
    expect(mockCreatePatient.mock.calls[0][0]).toMatchObject({
      type: 'dependent',
      parentPhoneNumber: '0712345678',
    });
    expect(writes()).toEqual([
      '/ws/rest/v1/patient/new-uuid/identifier',
      '/ws/rest/v1/person/new-uuid/attribute',
      '/ws/rest/v1/person/new-uuid/attribute',
    ]);
    // createDependentPatient would have launched inside itself, before the writes.
    expect(vi.mocked(launchWorkspaceGroup2).mock.invocationCallOrder[0]).toBeGreaterThan(
      Math.max(...mockOpenmrsFetch.mock.invocationCallOrder),
    );
    expect(launchWorkspace2).toHaveBeenCalledOnce();
  });

  it('throws without checking in when a write fails', async () => {
    mockFindExistingLocalPatient.mockResolvedValue({ uuid: 'dependant-uuid', identifiers: [] } as any);
    mockOpenmrsFetch.mockImplementation((_url: string, options?: any) =>
      options?.method === 'POST'
        ? Promise.reject(new Error('Identifier already in use'))
        : Promise.resolve({ data: { results: [] } } as any),
    );

    await expect(link()).rejects.toThrow('Identifier already in use');
    expect(launchWorkspace2).not.toHaveBeenCalled();
  });
});

describe('createAndLinkFromParticipant', () => {
  const withContacts = {
    ...participant,
    contacts: [{ phone: '0712345678', nationalId: '12345678' }],
  } as PcsParticipant;

  const createAndLink = (subject: PcsParticipant = withContacts) =>
    createAndLinkFromParticipant({
      participant: subject,
      nationalIdUUID: 'national-id-type',
      phoneAttributeTypeUUID: 'phone-attr-type',
      studyParticipantIdentifierType: STUDY_ID_TYPE,
      pbidsEnrollmentAttributeType: PBIDS_ENROLLMENT_TYPE,
      cardseEnrollmentAttributeType: CARDSE_ENROLLMENT_TYPE,
    });

  const createBody = () =>
    (mockOpenmrsFetch.mock.calls.find(([u, o]) => u.endsWith('/patient') && (o as any)?.method === 'POST')![1] as any)
      .body;

  it('carries the phone and national ID across from the PCS contact', async () => {
    await createAndLink();

    const body = createBody();
    // The national ID is what lets `findExistingLocalPatient` match this child later, and what
    // makes OpenMRS reject a duplicate rather than silently creating a second patient.
    expect(body.identifiers).toEqual([
      expect.objectContaining({ identifierType: 'openmrs-id-type', preferred: true }),
      expect.objectContaining({ identifier: '12345678', identifierType: 'national-id-type', preferred: false }),
    ]);
    expect(body.person.attributes).toEqual([{ attributeType: 'phone-attr-type', value: '0712345678' }]);
  });

  it('creates cleanly for a participant with no contacts', async () => {
    await createAndLink(participant);

    const body = createBody();
    // An identifier entry with an empty value would be rejected outright.
    expect(body.identifiers).toHaveLength(1);
    expect(body.person.attributes).toEqual([]);
  });

  it("registers the patient from the participant's own demographics", async () => {
    await createAndLink();

    const [url, options] = mockOpenmrsFetch.mock.calls.find(
      ([u, o]) => u.endsWith('/patient') && (o as any)?.method === 'POST',
    )!;
    expect(url).toBe('/ws/rest/v1/patient');
    expect((options as any).body.person).toMatchObject({
      names: [{ preferred: true, givenName: 'DENNIS', familyName: 'ODONGO' }],
      gender: 'M',
    });
  });

  it("stamps the participant's own id rather than minting a temporary one", async () => {
    await createAndLink();

    const identifierPost = mockOpenmrsFetch.mock.calls.find(
      ([url, options]) => url.includes('/identifier') && (options as any)?.method === 'POST',
    );

    // Writing a temporary id here was the other reading of the request — this is the guard.
    expect((identifierPost![1] as any).body).toMatchObject({
      identifier: '901-1-1-3',
      identifierType: STUDY_ID_TYPE,
    });
    expect(mockOpenmrsFetch.mock.calls.some(([url]) => url.endsWith('/pbids-participants'))).toBe(false);
    expect(launchWorkspace2).toHaveBeenCalledOnce();
  });
});
