import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSessionLocation, launchWorkspace2, launchWorkspaceGroup2, openmrsFetch } from '@openmrs/esm-framework';
import { createPatient } from '../../dependants/dependants.resource';
import { findExistingLocalPatient } from '../../search-bar/search-bar.resource';
import {
  createAndLinkFromParticipant,
  createDependantWithTemporaryId,
  linkDependantToParticipant,
  linkHieDependantWithTemporaryId,
  useHieDependantLinkState,
} from './link-dependant.resource';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
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
  getLocalIdentifierValue: (localPatient: any, typeUuid: string) =>
    localPatient?.identifiers?.find((id: any) => id.identifierType?.uuid === typeUuid)?.identifier,
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

describe('createDependantWithTemporaryId', () => {
  const demographics = {
    firstName: 'BABY',
    middleName: 'A',
    lastName: 'ODONGO',
    sex: 'F',
    dateOfBirth: '2026-08-01',
  };

  const addDependant = () =>
    createDependantWithTemporaryId({
      demographics,
      motherIndividualId: '901-1-1-2',
      nationalIdUUID: 'national-id-type',
      phoneAttributeTypeUUID: 'phone-attr-type',
    });

  beforeEach(() => {
    mockOpenmrsFetch.mockImplementation((url: string, options?: any) => {
      if (url.includes('?v=custom')) {
        return Promise.resolve({ data: rereadFor(url) } as any);
      }
      if (url.endsWith('/patient') && options?.method === 'POST') {
        return Promise.resolve({ data: { uuid: 'infant-uuid', identifiers: [] } } as any);
      }
      if (url.endsWith('/pbids-participants') && options?.method === 'POST') {
        return Promise.resolve({ data: { ...participant, individualId: 'TMP-901-1-1-9' } } as any);
      }
      return Promise.resolve({ data: { results: [] } } as any);
    });
  });

  it('registers the patient from the form values', async () => {
    await addDependant();

    const [, options] = mockOpenmrsFetch.mock.calls.find(
      ([u, o]) => u.endsWith('/patient') && (o as any)?.method === 'POST',
    )!;
    expect((options as any).body.person).toMatchObject({
      names: [{ preferred: true, givenName: 'BABY', middleName: 'A', familyName: 'ODONGO' }],
      gender: 'F',
      birthdate: '2026-08-01',
    });
  });

  it("posts the new patient against the mother's individual ID", async () => {
    await addDependant();

    const [url, options] = mockOpenmrsFetch.mock.calls.find(
      ([u, o]) => u.endsWith('/pbids-participants') && (o as any)?.method === 'POST',
    )!;
    expect(url).toBe('/ws/rest/v1/pbids-participants');
    // Both field names are the module's, and neither is guessable from this side.
    expect((options as any).body).toEqual({ patientUuid: 'infant-uuid', motherId: '901-1-1-2' });
  });

  it('writes no identifier or attribute of its own', async () => {
    await addDependant();

    // The module sets the temporary ID and both enrolment attributes as one unit with the PCS
    // row. A client write here is exactly what would break that pairing.
    expect(writes()).toEqual(['/ws/rest/v1/patient', '/ws/rest/v1/pbids-participants']);
  });

  it('checks in once, with the record as the server left it', async () => {
    const { localPatient } = await addDependant();

    // The patient we created cannot carry what the module wrote; only the re-read can.
    expect(localPatient).toMatchObject({ uuid: 'infant-uuid', reread: true });
    expect(launchWorkspace2).toHaveBeenCalledOnce();
  });

  it('does not check in when the participant cannot be created', async () => {
    mockOpenmrsFetch.mockImplementation((url: string, options?: any) => {
      if (url.endsWith('/patient') && options?.method === 'POST') {
        return Promise.resolve({ data: { uuid: 'infant-uuid', identifiers: [] } } as any);
      }
      if (url.endsWith('/pbids-participants') && options?.method === 'POST') {
        return Promise.reject(new Error('Patient already has a study participant identifier'));
      }
      return Promise.resolve({ data: { results: [] } } as any);
    });

    await expect(addDependant()).rejects.toThrow('Patient already has a study participant identifier');
    expect(launchWorkspace2).not.toHaveBeenCalled();
  });
});

describe('linkHieDependantWithTemporaryId', () => {
  const addFromHie = () =>
    linkHieDependantWithTemporaryId({
      dependant,
      parentPhoneNumber: '0712345678',
      motherIndividualId: '901-1-1-2',
      t: (_key: string, fallback: string) => fallback,
    });

  beforeEach(() => {
    mockOpenmrsFetch.mockImplementation((url: string, options?: any) => {
      if (url.includes('?v=custom')) {
        return Promise.resolve({ data: rereadFor(url) } as any);
      }
      if (url.endsWith('/pbids-participants') && options?.method === 'POST') {
        return Promise.resolve({ data: { ...participant, individualId: 'TMP-901-1-1-9' } } as any);
      }
      return Promise.resolve({ data: { results: [] } } as any);
    });
  });

  it('reuses the local record when the child is already registered here', async () => {
    mockFindExistingLocalPatient.mockResolvedValue({ uuid: 'existing-uuid', identifiers: [] } as any);

    await addFromHie();

    // Creating here would duplicate a patient the HIE contact already resolves to.
    expect(mockCreatePatient).not.toHaveBeenCalled();
    // isDependent must be true, or household-number would match the mother's own record.
    expect(mockFindExistingLocalPatient).toHaveBeenCalledWith(dependant.contactData, true);
    expect(
      mockOpenmrsFetch.mock.calls.find(
        ([u, o]) => u.endsWith('/pbids-participants') && (o as any)?.method === 'POST',
      )![1],
    ).toMatchObject({ body: { patientUuid: 'existing-uuid' } });
  });

  it('creates the child from the HIE contact when she is not registered here', async () => {
    mockFindExistingLocalPatient.mockResolvedValue(null);
    mockCreatePatient.mockResolvedValue({ uuid: 'new-uuid', identifiers: [] } as any);

    await addFromHie();

    expect(mockCreatePatient).toHaveBeenCalledOnce();
    expect(mockCreatePatient.mock.calls[0][0]).toMatchObject({ type: 'dependent', parentPhoneNumber: '0712345678' });
  });

  it("posts the resolved patient against the mother's individual ID", async () => {
    mockFindExistingLocalPatient.mockResolvedValue({ uuid: 'existing-uuid', identifiers: [] } as any);

    await addFromHie();

    const [url, options] = mockOpenmrsFetch.mock.calls.find(
      ([u, o]) => u.endsWith('/pbids-participants') && (o as any)?.method === 'POST',
    )!;
    expect(url).toBe('/ws/rest/v1/pbids-participants');
    // Both field names are the module's, and neither is guessable from this side.
    expect((options as any).body).toEqual({ patientUuid: 'existing-uuid', motherId: '901-1-1-2' });
  });

  it('writes no identifier or attribute of its own', async () => {
    mockFindExistingLocalPatient.mockResolvedValue({ uuid: 'existing-uuid', identifiers: [] } as any);

    await addFromHie();

    // The module sets the temporary ID and both enrolment attributes as one unit with the PCS
    // row. A client write here is exactly what would break that pairing.
    expect(writes()).toEqual(['/ws/rest/v1/pbids-participants']);
  });

  it('starts the visit once, with the record as the server left it', async () => {
    mockFindExistingLocalPatient.mockResolvedValue({ uuid: 'existing-uuid', identifiers: [] } as any);

    const { localPatient } = await addFromHie();

    // The record we resolved cannot carry what the module wrote; only the re-read can.
    expect(localPatient).toMatchObject({ uuid: 'existing-uuid', reread: true });
    expect(launchWorkspace2).toHaveBeenCalledOnce();
  });

  it('does not start a visit when the participant cannot be created', async () => {
    mockFindExistingLocalPatient.mockResolvedValue({ uuid: 'existing-uuid', identifiers: [] } as any);
    mockOpenmrsFetch.mockImplementation((url: string, options?: any) =>
      url.endsWith('/pbids-participants') && options?.method === 'POST'
        ? Promise.reject(new Error('Patient already has a study participant identifier'))
        : Promise.resolve({ data: { results: [] } } as any),
    );

    await expect(addFromHie()).rejects.toThrow('Patient already has a study participant identifier');
    expect(launchWorkspace2).not.toHaveBeenCalled();
  });
});

describe('useHieDependantLinkState', () => {
  const candidates = [
    { id: 'CR-linked', contactData: { id: 'CR-linked' } },
    { id: 'CR-free', contactData: { id: 'CR-free' } },
  ];

  it('marks the candidates whose local patient already holds a study ID', async () => {
    mockFindExistingLocalPatient.mockImplementation(async (contactData: any) =>
      contactData.id === 'CR-linked'
        ? { uuid: 'p1', identifiers: [{ identifier: '901-1-1-3', identifierType: { uuid: STUDY_ID_TYPE } }] }
        : null,
    );

    // Fresh SWR cache per render, so nothing leaks between cases.
    const { result } = renderHook(() => useHieDependantLinkState(candidates, [STUDY_ID_TYPE, 'temp-id-type']), {
      wrapper: ({ children }) => React.createElement(SWRConfig, { value: { provider: () => new Map() } }, children),
    });

    // Waiting on the data itself rather than on isChecking, which is briefly false before
    // SWR has begun.
    await waitFor(() => expect(result.current.linkedById['CR-linked']).toBe('901-1-1-3'));

    // The marked one is what the modal disables; the unmarked one stays selectable.
    expect(result.current.linkedById).toEqual({ 'CR-linked': '901-1-1-3', 'CR-free': undefined });
  });
});
