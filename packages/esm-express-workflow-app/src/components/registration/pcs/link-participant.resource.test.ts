import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionLocation, launchWorkspace2, launchWorkspaceGroup2, openmrsFetch } from '@openmrs/esm-framework';
import { createPatient } from '../dependants/dependants.resource';
import { findExistingLocalPatient } from '../search-bar/search-bar.resource';
import { linkParticipantToPatient } from './link-participant.resource';
import { type PcsParticipant, type PcsSearchSubject } from './pcs.types';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  openmrsFetch: vi.fn(),
  getSessionLocation: vi.fn(),
  launchWorkspace2: vi.fn(),
  launchWorkspaceGroup2: vi.fn(),
}));

vi.mock('../dependants/dependants.resource', () => ({ createPatient: vi.fn() }));
vi.mock('../search-bar/search-bar.resource', () => ({ findExistingLocalPatient: vi.fn() }));

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockGetSessionLocation = vi.mocked(getSessionLocation);
const mockCreatePatient = vi.mocked(createPatient);
const mockFindExistingLocalPatient = vi.mocked(findExistingLocalPatient);

const STUDY_ID_TYPE = 'study-id-type-uuid';
const STUDY_STATUS_TYPE = 'study-status-type-uuid';
const CATEGORY_TYPE = 'category-type-uuid';

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
  matchedOn: 'name',
  matchType: 'EXACT',
} as PcsParticipant;

const localSubject: PcsSearchSubject = {
  id: 'local-uuid',
  source: 'local',
  patient: { resourceType: 'Patient', id: 'local-uuid' },
  name: 'Dennis Odongo',
};

const hieSubject: PcsSearchSubject = {
  id: 'cr-number',
  source: 'hie',
  patient: { resourceType: 'Patient', id: 'cr-number' },
  name: 'Dennis Odongo',
};

const link = (subject: PcsSearchSubject) =>
  linkParticipantToPatient({
    subject,
    participant,
    studyParticipantIdentifierType: STUDY_ID_TYPE,
    studyStatusAttributeType: STUDY_STATUS_TYPE,
    participantCategoryAttributeType: CATEGORY_TYPE,
    t: (_key: string, fallback: string) => fallback,
  });

/** Routes the mocked fetch by URL so each test only states what it cares about. */
const respondWith = ({ localPatient, attributes = [] }: { localPatient?: any; attributes?: Array<any> }) => {
  mockOpenmrsFetch.mockImplementation((url: string) => {
    if (url.includes('/attribute?v=default')) {
      return Promise.resolve({ data: { results: attributes } } as any);
    }
    if (url.includes('?v=custom')) {
      return Promise.resolve({ data: localPatient } as any);
    }
    return Promise.resolve({ data: {} } as any);
  });
};

const writes = () =>
  mockOpenmrsFetch.mock.calls.filter(([, options]) => (options as any)?.method === 'POST').map(([url]) => url);

beforeEach(() => {
  vi.clearAllMocks();
  mockGetSessionLocation.mockResolvedValue({ uuid: 'location-uuid' } as any);
});

describe('linkParticipantToPatient', () => {
  it('uses the existing record for a local patient and never creates one', async () => {
    respondWith({ localPatient: { uuid: 'local-uuid', identifiers: [] } });

    await link(localSubject);

    expect(mockCreatePatient).not.toHaveBeenCalled();
    expect(writes()).toContain('/ws/rest/v1/patient/local-uuid/identifier');
  });

  it('creates the patient for an HIE match, then writes the study data, then checks in once', async () => {
    mockFindExistingLocalPatient.mockResolvedValue(null);
    mockCreatePatient.mockResolvedValue({ uuid: 'new-uuid', identifiers: [] } as any);
    respondWith({});

    await link(hieSubject);

    expect(mockCreatePatient).toHaveBeenCalledOnce();
    expect(writes()).toEqual([
      '/ws/rest/v1/patient/new-uuid/identifier',
      '/ws/rest/v1/person/new-uuid/attribute',
      '/ws/rest/v1/person/new-uuid/attribute',
    ]);
    // The workspace must open last, and exactly once — the Check In path double-launches
    // because createHIEPatient launches internally; this must not reproduce that.
    expect(mockLaunchedAfterWrites()).toBe(true);
    expect(launchWorkspaceGroup2).toHaveBeenCalledOnce();
    expect(launchWorkspace2).toHaveBeenCalledOnce();
  });

  it('updates an existing study identifier in place rather than duplicating it', async () => {
    respondWith({
      localPatient: {
        uuid: 'local-uuid',
        identifiers: [{ uuid: 'identifier-uuid', identifier: '901-9-9-9', identifierType: { uuid: STUDY_ID_TYPE } }],
      },
    });

    await link(localSubject);

    expect(writes()).toContain('/ws/rest/v1/patient/local-uuid/identifier/identifier-uuid');
    expect(writes()).not.toContain('/ws/rest/v1/patient/local-uuid/identifier');
  });

  it('leaves an attribute alone when it already holds the right value', async () => {
    respondWith({
      localPatient: { uuid: 'local-uuid', identifiers: [] },
      attributes: [{ uuid: 'attribute-uuid', value: 'Enrolled', attributeType: { uuid: STUDY_STATUS_TYPE } }],
    });

    await link(localSubject);

    // Study status is already 'Enrolled'; only the category attribute is written.
    expect(writes().filter((url) => url.includes('/attribute'))).toEqual(['/ws/rest/v1/person/local-uuid/attribute']);
  });

  it('throws without checking in when a write fails', async () => {
    respondWith({ localPatient: { uuid: 'local-uuid', identifiers: [] } });
    mockOpenmrsFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST') {
        return Promise.reject(new Error('Identifier already in use'));
      }
      return Promise.resolve({ data: { uuid: 'local-uuid', identifiers: [] } } as any);
    });

    await expect(link(localSubject)).rejects.toThrow('Identifier already in use');
    expect(launchWorkspace2).not.toHaveBeenCalled();
  });
});

/** True when every POST was issued before the workspace was launched. */
function mockLaunchedAfterWrites() {
  return (
    vi.mocked(launchWorkspaceGroup2).mock.invocationCallOrder[0] >
    Math.max(...mockOpenmrsFetch.mock.invocationCallOrder)
  );
}
