import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useSHRSummary } from '../hooks/useSHRSummary';
import SharedHealthRecordsSummary from './shrpatient-summary.component';

vi.mock('../hooks/useSHRSummary', () => ({ useSHRSummary: vi.fn() }));
vi.mock('./shrDataTable.component', () => ({ default: () => <div>Summary records</div> }));
vi.mock('../print-layout/print.component', () => ({ default: () => <div>Printable patient details</div> }));

const mockUseSHRSummary = vi.mocked(useSHRSummary);
const summary = {
  vitals: [{ uuid: 'vital-1', name: 'Weight', value: '70 kg', dateRecorded: '2026-07-25' }],
  labResults: [],
  complaints: [],
  diagnosis: [],
  allergies: [],
  conditions: [],
  medications: [],
  referrals: [],
};

describe('SharedHealthRecordsSummary', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not offer actions while loading and shows error feedback', () => {
    mockUseSHRSummary.mockReturnValue({ data: undefined, isLoading: true, isError: null } as never);
    const { rerender } = render(<SharedHealthRecordsSummary patientUuid="patient-1" />);
    expect(screen.queryByRole('button', { name: 'Print' })).not.toBeInTheDocument();

    mockUseSHRSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: new Error('Summary unavailable'),
    } as never);
    rerender(<SharedHealthRecordsSummary patientUuid="patient-1" />);
    expect(screen.getByText('Error State')).toBeInTheDocument();
  });

  it('prints the visible patient summary when requested', async () => {
    vi.useFakeTimers();
    mockUseSHRSummary.mockReturnValue({ data: summary, isLoading: false, isError: null } as never);
    const printWindow = {
      document: { documentElement: { innerHTML: '' } },
      focus: vi.fn(),
      print: vi.fn(),
      close: vi.fn(),
    };
    vi.spyOn(window, 'open').mockReturnValue(printWindow as never);

    render(<SharedHealthRecordsSummary patientUuid="patient-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Print' }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });

    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(printWindow.document.documentElement.innerHTML).toContain('Printable patient details');
    expect(printWindow.print).toHaveBeenCalledOnce();
    expect(printWindow.close).toHaveBeenCalledOnce();
  });
});
