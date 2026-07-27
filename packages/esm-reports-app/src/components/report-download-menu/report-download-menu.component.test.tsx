import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch, showSnackbar } from '@openmrs/esm-framework';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReportDownloadMenu from './report-download-menu.component';

const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockShowSnackbar = vi.mocked(showSnackbar);

const request = {
  id: 5,
  downloadFormats: ['pdf', 'csv'] as Array<'pdf' | 'csv'>,
  downloadUrls: { pdf: '/dl/pdf', csv: '/dl/csv' },
};

describe('ReportDownloadMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock');
    globalThis.URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when no format has a download url', () => {
    const { container } = render(
      <ReportDownloadMenu request={{ id: 1, downloadFormats: ['pdf'], downloadUrls: {} }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('downloads the first format directly from the primary action', async () => {
    const user = userEvent.setup();
    mockOpenmrsFetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['x'])),
      headers: { get: () => null },
    } as never);

    render(<ReportDownloadMenu request={request} reportName="MOH 731" />);

    // The primary action exports the first declared format (pdf).
    await user.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => expect(mockOpenmrsFetch).toHaveBeenCalledWith('/dl/pdf', { headers: { Accept: '*/*' } }));
    expect(mockShowSnackbar).not.toHaveBeenCalled();
  });

  it('downloads the chosen format from the menu', async () => {
    const user = userEvent.setup();
    mockOpenmrsFetch.mockResolvedValue({
      blob: () => Promise.resolve(new Blob(['x'])),
      headers: { get: () => null },
    } as never);

    render(<ReportDownloadMenu request={request} reportName="MOH 731" />);

    await user.click(screen.getByRole('button', { name: 'Additional actions' }));
    // Two format items are rendered in declared order (pdf, csv); the second exports the CSV.
    await user.click((await screen.findAllByText(/Download as/))[1]);

    await waitFor(() => expect(mockOpenmrsFetch).toHaveBeenCalledWith('/dl/csv', { headers: { Accept: '*/*' } }));
    expect(mockShowSnackbar).not.toHaveBeenCalled();
  });

  it('shows an error snackbar when the download fails', async () => {
    const user = userEvent.setup();
    mockOpenmrsFetch.mockRejectedValue(new Error('network down'));

    render(<ReportDownloadMenu request={request} />);

    await user.click(screen.getByRole('button', { name: 'Additional actions' }));
    await user.click((await screen.findAllByText(/Download as/))[1]);

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', subtitle: 'network down' }),
      ),
    );
  });

  it('falls back to a generic message when the failure is not an Error', async () => {
    const user = userEvent.setup();
    mockOpenmrsFetch.mockRejectedValue('boom');

    render(<ReportDownloadMenu request={request} />);

    await user.click(screen.getByRole('button', { name: 'Additional actions' }));
    await user.click((await screen.findAllByText(/Download as/))[0]);

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'error', subtitle: 'Unable to download the report file.' }),
      ),
    );
  });
});
