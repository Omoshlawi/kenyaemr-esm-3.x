import React from 'react';
import { openmrsFetch, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import usePharmacyPatients from './usePharmacyPatients';
import usePharmacyUsers from './usePharmacyUsers';
import useUserMappedPharmacies from './useUserMappedPharmacies';
import useRegistrationTaggedPharmacies from './usePharmacies';
import usePharmacy from './usePharmacy';

const fetchMock = vi.mocked(openmrsFetch);
const wrapper = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false }}>
    {children}
  </SWRConfig>
);

describe('pharmacy mapping hooks', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('fetches and transforms pharmacy patients', async () => {
    fetchMock.mockResolvedValue({
      data: [
        {
          dateCreated: 1735776000000,
          entity: {
            uuid: 'patient-1',
            name: 'Jane Doe',
            age: 32,
            gender: 'F',
            OpenMRSID: '10001',
            'Telephone contact': '0700000000',
          },
        },
      ],
    } as any);
    const { result } = renderHook(() => usePharmacyPatients('pharmacy-1'), { wrapper });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.patients).toEqual([
      {
        uuid: 'patient-1',
        name: 'Jane Doe',
        age: 32,
        gender: 'F',
        openmrsId: '10001',
        telephoneContact: '0700000000',
        dateMapped: expect.any(String),
      },
    ]);
    expectPost('/datafilter/search?type=org.openmrs.Patient', {
      entityIdentifier: '',
      entityType: 'org.openmrs.Patient',
      basisIdentifier: 'pharmacy-1',
      basisType: 'org.openmrs.Location',
    });
  });

  it('fetches and transforms pharmacy users', async () => {
    fetchMock.mockResolvedValue({
      data: [{ dateCreated: 1735776000000, entity: { uuid: 'user-1', name: 'Ada Admin' } }],
    } as any);
    const { result } = renderHook(() => usePharmacyUsers('pharmacy-2'), { wrapper });
    await waitFor(() => expect(result.current.users).toHaveLength(1));
    expect(result.current.users[0]).toEqual({
      uuid: 'user-1',
      name: 'Ada Admin',
      dateMapped: expect.any(String),
    });
    expectPost('/datafilter/search?type=org.openmrs.User', {
      entityIdentifier: '',
      entityType: 'org.openmrs.User',
      basisIdentifier: 'pharmacy-2',
      basisType: 'org.openmrs.Location',
    });
  });

  it('fetches and transforms the current user pharmacies', async () => {
    fetchMock.mockResolvedValue({
      data: [
        {
          dateCreated: 1735776000000,
          basis: {
            uuid: 'pharmacy-1',
            name: 'Afya Pharmacy',
            cityVillage: 'Nairobi',
            countyDistrict: 'Nairobi',
            'Master Facility Code': '12345',
          },
        },
      ],
    } as any);
    const { result } = renderHook(() => useUserMappedPharmacies('user-1'), { wrapper });
    await waitFor(() => expect(result.current.pharmacies).toHaveLength(1));
    expect(result.current.pharmacies[0]).toMatchObject({
      uuid: 'pharmacy-1',
      name: 'Afya Pharmacy',
      cityVillage: 'Nairobi',
      countyDistrict: 'Nairobi',
      mflCode: '12345',
      dateMaped: expect.any(String),
    });
    expectPost('/datafilter/search', {
      entityIdentifier: 'user-1',
      entityType: 'org.openmrs.User',
      basisIdentifier: '',
      basisType: 'org.openmrs.Location',
    });
  });

  it.each([
    ['patients', () => usePharmacyPatients('p'), 'patients'],
    ['users', () => usePharmacyUsers('p'), 'users'],
    ['pharmacies', () => useUserMappedPharmacies('u'), 'pharmacies'],
  ])('returns errors and an empty %s collection', async (_label, hook, key) => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(hook, { wrapper });
    await waitFor(() => expect(result.current.error).toEqual(new Error('offline')));
    expect(result.current[key]).toEqual([]);
  });

  it('fetches registration-tagged pharmacies', async () => {
    vi.mocked(useConfig).mockReturnValue({ admissionLocationTagUuid: 'community-tag' } as any);
    fetchMock.mockResolvedValue({ data: { results: [{ uuid: 'pharmacy-1', name: 'Afya' }] } } as any);
    const { result } = renderHook(useRegistrationTaggedPharmacies, { wrapper });
    await waitFor(() => expect(result.current.pharmacies).toHaveLength(1));
    expect(fetchMock).toHaveBeenCalledWith(`${restBaseUrl}/location?tag=community-tag&v=full`);
  });

  it('fetches a pharmacy by uuid and exposes errors', async () => {
    fetchMock.mockResolvedValue({ data: { uuid: 'pharmacy-1', name: 'Afya' } } as any);
    const { result } = renderHook(() => usePharmacy('pharmacy-1'), { wrapper });
    await waitFor(() => expect(result.current.pharmacy).toMatchObject({ name: 'Afya' }));
    expect(fetchMock).toHaveBeenCalledWith(`${restBaseUrl}/location/pharmacy-1?v=full`);

    fetchMock.mockRejectedValue(new Error('missing'));
    const failed = renderHook(() => usePharmacy('missing'), { wrapper });
    await waitFor(() => expect(failed.result.current.error).toEqual(new Error('missing')));
    expect(failed.result.current.pharmacy).toBeUndefined();
  });
});

function expectPost(path: string, body: object) {
  expect(fetchMock).toHaveBeenCalledWith(`${restBaseUrl}${path}`, {
    body: JSON.stringify(body),
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: expect.any(AbortSignal),
  });
}
