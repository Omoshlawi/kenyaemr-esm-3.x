import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePrintPreview } from './usePrintPreview';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>{children}</SWRConfig>
);

describe('usePrintPreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview-url');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches the pdf and returns an object URL for the preview', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    } as unknown as Response);

    const { result } = renderHook(() => usePrintPreview('/print/1'), { wrapper });

    await waitFor(() => expect(result.current.data).toBe('blob:preview-url'));
    expect(fetchSpy).toHaveBeenCalledWith('/print/1', { headers: { 'Content-Type': 'application/pdf' } });
  });
});
