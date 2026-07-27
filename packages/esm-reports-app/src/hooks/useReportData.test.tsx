import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useReportData } from './useReportData';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useReportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch when no request id is supplied', async () => {
    const { result } = renderHook(() => useReportData(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    expect(result.current.reportData).toBeNull();
  });

  it('loads the rendered report data for a request', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { dataSets: {}, parameters: {} } } as never);

    const { result } = renderHook(() => useReportData(42), { wrapper });

    await waitFor(() => expect(result.current.reportData).not.toBeNull());
    expect(mockOpenmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/kenyaemr/reportRequests/42/data');
  });
});
