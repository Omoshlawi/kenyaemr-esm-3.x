import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import {
  fetchPerson,
  fetchUser,
  pharmacyAssignmentFormSchema,
  revokePharamacyAssignment,
  saveMapping,
} from './pharmacy.resources';

const fetchMock = vi.mocked(openmrsFetch);

describe('pharmacy resources', () => {
  beforeEach(() => fetchMock.mockReset());

  it('searches patients and users with an abort signal', async () => {
    fetchMock.mockResolvedValue({ data: { results: [{ uuid: 'one' }] } } as any);
    const controller = new AbortController();
    await expect(fetchPerson('Jane Doe', controller)).resolves.toEqual([{ uuid: 'one' }]);
    expect(fetchMock).toHaveBeenLastCalledWith(`${restBaseUrl}/patient?q=Jane Doe`, {
      signal: controller.signal,
    });

    await expect(fetchUser('Jane', controller)).resolves.toEqual([{ uuid: 'one' }]);
    expect(fetchMock).toHaveBeenLastCalledWith(`${restBaseUrl}/user?q=Jane&v=custom:(uuid,display,person:(display))`, {
      signal: controller.signal,
    });
  });

  it.each([
    ['maps', saveMapping, '/datafilter/entitybasismap', 'mapped'],
    ['revokes', revokePharamacyAssignment, '/datafilter/revoke', 'revoked'],
  ])('%s an assignment using JSON', async (_name, operation, path, text) => {
    const payload = {
      entityIdentifier: 'entity',
      entityType: 'org.openmrs.Patient' as const,
      basisIdentifier: 'pharmacy',
      basisType: 'org.openmrs.Location' as const,
    };
    fetchMock.mockResolvedValue({ ok: true, text: vi.fn().mockResolvedValue(text) } as any);
    await expect(operation(payload)).resolves.toBe(text);
    expect(fetchMock).toHaveBeenCalledWith(`${restBaseUrl}${path}`, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
    });
  });

  it('rejects unsuccessful mapping and revoke responses', async () => {
    const payload = {
      entityIdentifier: 'entity',
      entityType: 'org.openmrs.User' as const,
      basisIdentifier: 'pharmacy',
    };
    fetchMock.mockResolvedValue({ ok: false } as any);
    await expect(saveMapping(payload)).rejects.toThrow('Error mapping patient');
    await expect(revokePharamacyAssignment(payload)).rejects.toThrow('Error revoking mapping');
  });

  it('validates required assignment fields and defaults the basis type', () => {
    expect(
      pharmacyAssignmentFormSchema.parse({
        entityIdentifier: 'entity',
        entityType: 'org.openmrs.User',
        basisIdentifier: 'pharmacy',
      }).basisType,
    ).toBe('org.openmrs.Location');
    expect(() =>
      pharmacyAssignmentFormSchema.parse({
        entityIdentifier: '',
        entityType: 'org.openmrs.User',
        basisIdentifier: '',
      }),
    ).toThrow();
  });
});
