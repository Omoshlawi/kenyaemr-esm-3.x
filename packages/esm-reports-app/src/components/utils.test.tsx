import React from 'react';
import { render } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { downloadFormatLabel, downloadReportRequestFile, getDownloadFormatIcon, isUnixTimestampString } from './utils';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);

describe('isUnixTimestampString', () => {
  it('accepts a valid 10-digit unix timestamp', () => {
    expect(isUnixTimestampString('1700000000')).toBe(true);
  });

  it('trims surrounding whitespace before validating', () => {
    expect(isUnixTimestampString('  1700000000  ')).toBe(true);
  });

  it('rejects values that are not exactly ten digits', () => {
    expect(isUnixTimestampString('123')).toBe(false);
    expect(isUnixTimestampString('123456789012')).toBe(false);
  });

  it('rejects non-numeric strings', () => {
    expect(isUnixTimestampString('not-a-number')).toBe(false);
  });
});

describe('getDownloadFormatIcon', () => {
  it('renders an icon for each supported format', () => {
    (['pdf', 'csv', 'excel', 'json', 'adx'] as const).forEach((format) => {
      const { container, unmount } = render(getDownloadFormatIcon(format));
      expect(container.querySelector('svg')).toBeInTheDocument();
      unmount();
    });
  });
});

describe('downloadFormatLabel', () => {
  it('exposes a human label for every format', () => {
    expect(downloadFormatLabel).toEqual({ pdf: 'PDF', csv: 'CSV', excel: 'Excel', json: 'JSON', adx: 'ADX' });
  });
});

describe('downloadReportRequestFile', () => {
  const clickSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    clickSpy.mockReset();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(clickSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('names the download from the content-disposition header when present', async () => {
    const blob = new Blob(['data']);
    mockOpenmrsFetch.mockResolvedValueOnce({
      blob: () => Promise.resolve(blob),
      headers: { get: () => 'attachment; filename="my-report.csv"' },
    } as unknown as Awaited<ReturnType<typeof openmrsFetch>>);

    await downloadReportRequestFile('/download/1', 'fallback.csv');

    const anchor = document.querySelector('a');
    expect(clickSpy).toHaveBeenCalled();
    // anchor is removed after click, so assert the created object URL was cleaned up
    expect(globalThis.URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(globalThis.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(anchor).toBeNull();
  });

  it('falls back to the provided filename when no header is returned', async () => {
    mockOpenmrsFetch.mockResolvedValueOnce({
      blob: () => Promise.resolve(new Blob(['data'])),
      headers: { get: () => null },
    } as unknown as Awaited<ReturnType<typeof openmrsFetch>>);

    await downloadReportRequestFile('/download/2', 'fallback.pdf');

    expect(clickSpy).toHaveBeenCalled();
  });
});
