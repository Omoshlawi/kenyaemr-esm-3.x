import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionLocation, launchWorkspace2, launchWorkspaceGroup2, openmrsFetch } from '@openmrs/esm-framework';
import { createPatient } from '../../dependants/dependants.resource';
import { findExistingLocalPatient } from '../../search-bar/search-bar.resource';
import { delinkParticipant, linkParticipantToPatient, syncStudyAttributes } from './link-participant.resource';
import { type PcsParticipant, type PcsSearchSubject } from '../pcs.types';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  openmrsFetch: vi.fn(),
  getSessionLocation: vi.fn(),
  launchWorkspace2: vi.fn(),
  launchWorkspaceGroup2: vi.fn(),
}));

vi.mock('../../dependants/dependants.resource', () => ({ createPatient: vi.fn() }));
vi.mock('../../search-bar/search-bar.resource', () => ({ findExistingLocalPatient: vi.fn() }));

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockGetSessionLocation = vi.mocked(getSessionLocation);
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
    pbidsEnrollmentAttributeType: PBIDS_ENROLLMENT_TYPE,
    cardseEnrollmentAttributeType: CARDSE_ENROLLMENT_TYPE,
    t: (_key: string, fallback: string) => fallback,
  });

/** Routes the mocked fetch by URL so each test only states what it cares about. */
const respondWith = ({ localPatient, attributes = [] }: { localPatient?: any; attributes?: Array<any> }) => {
  let customReads = 0;

  mockOpenmrsFetch.mockImplementation((url: string) => {
    if (url.includes('/attribute?v=default')) {
      return Promise.resolve({ data: { results: attributes } } as any);
    }
    if (url.includes('?v=custom')) {
      // A local subject is read twice: once to resolve it, once again after the writes. Only
      // the second is tagged, so a test asserting `reread` genuinely proves the caller got the
      // refreshed record — returning the first one is what left the row showing "PCS Link".
      customReads += 1;
      return Promise.resolve({ data: { ...localPatient, reread: customReads > 1 } } as any);
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

    const result = await link(localSubject);

    expect(mockCreatePatient).not.toHaveBeenCalled();
    expect(writes()).toContain('/ws/rest/v1/patient/local-uuid/identifier');
    // Returning the pre-write object is what made the dependants row keep offering to link.
    expect(result.reread).toBe(true);
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

  it('refuses to re-point a patient already linked to another participant', async () => {
    respondWith({
      localPatient: {
        uuid: 'local-uuid',
        identifiers: [{ uuid: 'identifier-uuid', identifier: '901-9-9-9', identifierType: { uuid: STUDY_ID_TYPE } }],
      },
    });

    // This used to overwrite the identifier in place, silently moving the child from one
    // participant to another and destroying the previous link.
    await expect(link(localSubject)).rejects.toThrow('already linked to PCS participant 901-9-9-9');
    expect(writes()).toEqual([]);
    expect(launchWorkspace2).not.toHaveBeenCalled();
  });

  it('is a no-op when the patient already holds this same participant', async () => {
    respondWith({
      localPatient: {
        uuid: 'local-uuid',
        identifiers: [{ uuid: 'identifier-uuid', identifier: '901-1-1-3', identifierType: { uuid: STUDY_ID_TYPE } }],
      },
    });

    await link(localSubject);

    // Re-linking to the same participant stays idempotent — no identifier write at all.
    expect(writes().filter((url) => url.includes('/identifier'))).toEqual([]);
    expect(launchWorkspace2).toHaveBeenCalledOnce();
  });

  it('leaves an attribute alone when it already holds the right value', async () => {
    respondWith({
      localPatient: { uuid: 'local-uuid', identifiers: [] },
      attributes: [{ uuid: 'attribute-uuid', value: 'true', attributeType: { uuid: PBIDS_ENROLLMENT_TYPE } }],
    });

    await link(localSubject);

    // PBIDS enrollment already reads 'true'; only the CARDSE attribute is written.
    expect(writes().filter((url) => url.includes('/attribute'))).toEqual(['/ws/rest/v1/person/local-uuid/attribute']);
  });

  it('writes both enrolment flags as boolean strings', async () => {
    respondWith({ localPatient: { uuid: 'local-uuid', identifiers: [] } });

    await link(localSubject);

    const attributePosts = mockOpenmrsFetch.mock.calls
      .filter(([url, options]) => url.includes('/attribute') && (options as any)?.method === 'POST')
      .map(([, options]) => (options as any).body);

    // The fixture is pbidsEnrolled: true, cardse: false — `false` is written, not skipped.
    expect(attributePosts).toEqual([
      { attributeType: PBIDS_ENROLLMENT_TYPE, value: 'true' },
      { attributeType: CARDSE_ENROLLMENT_TYPE, value: 'false' },
    ]);
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

describe('delinkParticipant', () => {
  const delink = (localPatient: any) =>
    delinkParticipant({
      localPatient,
      studyParticipantIdentifierType: STUDY_ID_TYPE,
      pbidsEnrollmentAttributeType: PBIDS_ENROLLMENT_TYPE,
      cardseEnrollmentAttributeType: CARDSE_ENROLLMENT_TYPE,
    });

  const deletes = () =>
    mockOpenmrsFetch.mock.calls.filter(([, options]) => (options as any)?.method === 'DELETE').map(([url]) => url);

  it('voids the identifier and both attributes', async () => {
    mockOpenmrsFetch.mockResolvedValue({
      data: {
        results: [
          { uuid: 'status-attr', attributeType: { uuid: PBIDS_ENROLLMENT_TYPE } },
          { uuid: 'category-attr', attributeType: { uuid: CARDSE_ENROLLMENT_TYPE } },
        ],
      },
    } as any);

    await delink({
      uuid: 'local-uuid',
      identifiers: [{ uuid: 'identifier-uuid', identifierType: { uuid: STUDY_ID_TYPE } }],
    });

    expect(deletes()).toEqual([
      '/ws/rest/v1/patient/local-uuid/identifier/identifier-uuid',
      '/ws/rest/v1/person/local-uuid/attribute/status-attr',
      '/ws/rest/v1/person/local-uuid/attribute/category-attr',
    ]);
  });

  it('still succeeds when the study data was only partly written', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [] } } as any);

    await expect(delink({ uuid: 'local-uuid', identifiers: [] })).resolves.toBeUndefined();
    expect(deletes()).toEqual([]);
  });

  it('leaves an already-voided attribute alone', async () => {
    mockOpenmrsFetch.mockResolvedValue({
      data: {
        results: [{ uuid: 'status-attr', voided: true, attributeType: { uuid: PBIDS_ENROLLMENT_TYPE } }],
      },
    } as any);

    await delink({ uuid: 'local-uuid', identifiers: [] });

    expect(deletes()).toEqual([]);
  });
});

describe('syncStudyAttributes', () => {
  const sync = () =>
    syncStudyAttributes({
      personUuid: 'local-uuid',
      participant,
      pbidsEnrollmentAttributeType: PBIDS_ENROLLMENT_TYPE,
      cardseEnrollmentAttributeType: CARDSE_ENROLLMENT_TYPE,
    });

  const posts = () =>
    mockOpenmrsFetch.mock.calls
      .filter(([, options]) => (options as any)?.method === 'POST')
      .map(([url, options]) => [url, (options as any).body]);

  /** The fixture is pbidsEnrolled: true, cardse: false. */
  const withAttributes = (attributes: Array<any>) =>
    mockOpenmrsFetch.mockImplementation((url: string, options?: any) => {
      if (options?.method === 'POST') {
        return Promise.resolve({ data: {} } as any);
      }
      return Promise.resolve({ data: { results: attributes } } as any);
    });

  it('writes only the flag that drifted and reports just that one', async () => {
    withAttributes([
      { uuid: 'pbids-attr', value: 'true', attributeType: { uuid: PBIDS_ENROLLMENT_TYPE } },
      { uuid: 'cardse-attr', value: 'true', attributeType: { uuid: CARDSE_ENROLLMENT_TYPE } },
    ]);

    await expect(sync()).resolves.toEqual(['cardse']);
    expect(posts()).toEqual([['/ws/rest/v1/person/local-uuid/attribute/cardse-attr', { value: 'false' }]]);
  });

  it('writes nothing when the patient already matches PCS', async () => {
    withAttributes([
      { uuid: 'pbids-attr', value: 'true', attributeType: { uuid: PBIDS_ENROLLMENT_TYPE } },
      { uuid: 'cardse-attr', value: 'false', attributeType: { uuid: CARDSE_ENROLLMENT_TYPE } },
    ]);

    await expect(sync()).resolves.toEqual([]);
    expect(posts()).toEqual([]);
  });

  it('creates both attributes when the patient has none', async () => {
    withAttributes([]);

    await expect(sync()).resolves.toEqual(['pbids', 'cardse']);
    expect(posts()).toEqual([
      ['/ws/rest/v1/person/local-uuid/attribute', { attributeType: PBIDS_ENROLLMENT_TYPE, value: 'true' }],
      ['/ws/rest/v1/person/local-uuid/attribute', { attributeType: CARDSE_ENROLLMENT_TYPE, value: 'false' }],
    ]);
  });

  it('propagates a write failure so the caller can report it', async () => {
    mockOpenmrsFetch.mockImplementation((_url: string, options?: any) =>
      options?.method === 'POST'
        ? Promise.reject(new Error('Attribute type not found'))
        : Promise.resolve({ data: { results: [] } } as any),
    );

    await expect(sync()).rejects.toThrow('Attribute type not found');
  });
});
