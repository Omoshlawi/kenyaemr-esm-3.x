import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import useGroupedReports from './useReports';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useGroupedReports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sorts each category’s reports alphabetically by name', async () => {
    mockOpenmrsFetch.mockResolvedValue({
      data: {
        results: [
          {
            name: 'HIV',
            indicator: [
              { uuid: 'b', name: 'Beta', description: null },
              { uuid: 'a', name: 'Alpha', description: 'first' },
            ],
            patientFollowUpReports: [
              { uuid: 'z', name: 'Zeta', description: null },
              { uuid: 'm', name: 'Mu', description: null },
            ],
          },
        ],
      },
    } as never);

    const { result } = renderHook(() => useGroupedReports(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.reports[0].indicator.map((r) => r.name)).toEqual(['Alpha', 'Beta']);
    expect(result.current.reports[0].patientFollowUpReports.map((r) => r.name)).toEqual(['Mu', 'Zeta']);
    expect(mockOpenmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/kenyaemr/reports/grouped');
  });

  it('returns an empty list when the response has no results', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: {} } as never);

    const { result } = renderHook(() => useGroupedReports(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reports).toEqual([]);
  });

  it('defaults missing indicator and follow-up arrays to empty lists', async () => {
    mockOpenmrsFetch.mockResolvedValue({
      data: { results: [{ name: 'Lab' }] },
    } as never);

    const { result } = renderHook(() => useGroupedReports(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.reports[0].indicator).toEqual([]);
    expect(result.current.reports[0].patientFollowUpReports).toEqual([]);
  });

  it('surfaces fetch errors', async () => {
    mockOpenmrsFetch.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useGroupedReports(), { wrapper });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.reports).toEqual([]);
  });
});
