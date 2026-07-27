import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReportRequests, useReportRequestsByReportUuid } from './useReportRequests';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useReportRequestsByReportUuid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch when no report uuid is given', async () => {
    const { result } = renderHook(() => useReportRequestsByReportUuid(''), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    expect(result.current.requests).toEqual([]);
  });

  it('fetches requests scoped to the report uuid', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [{ id: 1 }] } } as never);

    const { result } = renderHook(() => useReportRequestsByReportUuid('r1'), { wrapper });

    await waitFor(() => expect(result.current.requests).toHaveLength(1));
    expect(mockOpenmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/kenyaemr/reportRequests?reportUuid=r1');
  });
});

describe('useReportRequests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches all report requests', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { results: [{ id: 1 }, { id: 2 }] } } as never);

    const { result } = renderHook(() => useReportRequests(), { wrapper });

    await waitFor(() => expect(result.current.requests).toHaveLength(2));
    expect(mockOpenmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/kenyaemr/reportRequests');
  });

  it('defaults to an empty list when results are absent', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: {} } as never);

    const { result } = renderHook(() => useReportRequests(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.requests).toEqual([]);
  });
});
