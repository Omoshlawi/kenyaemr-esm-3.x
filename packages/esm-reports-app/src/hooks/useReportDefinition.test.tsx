import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { SWRConfig } from 'swr';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestReport, useReportDefinition } from './useReportDefinition';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('useReportDefinition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch and returns empty parameters when the uuid is missing', async () => {
    const { result } = renderHook(() => useReportDefinition(''), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBeFalsy());
    expect(mockOpenmrsFetch).not.toHaveBeenCalled();
    expect(result.current.report).toBeNull();
    expect(result.current.parameters).toEqual([]);
  });

  it('exposes the report and its definition parameters', async () => {
    mockOpenmrsFetch.mockResolvedValue({
      data: { uuid: 'r1', name: 'Report', definition: { parameters: [{ name: 'startDate' }] } },
    } as never);

    const { result } = renderHook(() => useReportDefinition('r1'), { wrapper });

    await waitFor(() => expect(result.current.report).not.toBeNull());
    expect(mockOpenmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/kenyaemr/reports/r1');
    expect(result.current.parameters).toEqual([{ name: 'startDate' }]);
  });

  it('defaults parameters to an empty array when the definition is null', async () => {
    mockOpenmrsFetch.mockResolvedValue({ data: { uuid: 'r2', name: 'No def', definition: null } } as never);

    const { result } = renderHook(() => useReportDefinition('r2'), { wrapper });

    await waitFor(() => expect(result.current.report).not.toBeNull());
    expect(result.current.parameters).toEqual([]);
  });
});

describe('requestReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the parameter values to the report requests endpoint', () => {
    mockOpenmrsFetch.mockResolvedValue({} as never);

    requestReport('r1', { startDate: '2026-01-01' });

    expect(mockOpenmrsFetch).toHaveBeenCalledWith('/ws/rest/v1/kenyaemr/reports/r1/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { startDate: '2026-01-01' },
    });
  });
});
