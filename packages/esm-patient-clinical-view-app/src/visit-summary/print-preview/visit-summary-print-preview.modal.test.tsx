import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithSwr } from '../../../../../tools/test-helpers';
import VisitSummaryPrintPreviewModal from './visit-summary-print-preview.modal';
import { mockPatient } from '../visit-summary.mock';

const mockFetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mockFetch);
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderModal(onClose = vi.fn()) {
  renderWithSwr(<VisitSummaryPrintPreviewModal onClose={onClose} visitUuid="visit-1" patient={mockPatient} />);
  return onClose;
}

describe('VisitSummaryPrintPreviewModal', () => {
  it('shows a loading indicator while the preview is being fetched', () => {
    mockFetch.mockReturnValue(new Promise(() => {}));

    renderModal();

    expect(screen.getByText('Loading visit summary...')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();
  });

  it('shows an error state when the preview fails to load', async () => {
    mockFetch.mockRejectedValue(new Error('network error'));

    renderModal();

    expect(await screen.findByText('Error State')).toBeInTheDocument();
  });

  it('renders the preview iframe and a print button on success', async () => {
    mockFetch.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) });

    renderModal();

    expect(await screen.findByTitle('Visit Summary Preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print' })).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    mockFetch.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) });
    const user = userEvent.setup();
    const onClose = renderModal();

    await screen.findByTitle('Visit Summary Preview');
    const closeButton = screen
      .getAllByRole('button', { name: 'Close' })
      .find((button) => button.textContent === 'Close');
    await user.click(closeButton!);

    expect(onClose).toHaveBeenCalled();
  });

  it('triggers printing when the print button is clicked', async () => {
    mockFetch.mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(8) });
    const user = userEvent.setup();
    renderModal();

    await screen.findByTitle('Visit Summary Preview');

    await user.click(screen.getByRole('button', { name: 'Print' }));

    // The click handler runs without error and the preview remains visible.
    expect(screen.getByTitle('Visit Summary Preview')).toBeInTheDocument();
  });
});
