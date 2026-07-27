import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { showModal, usePatient } from '@openmrs/esm-framework';
import VisitSummaryHeader from './visit-summary-header.component';
import { mockPatient, mockVisits } from './visit-summary.mock';

const mockUsePatient = vi.mocked(usePatient);
const mockShowModal = vi.mocked(showModal);

const defaultProps = {
  patientUuid: 'patient-1',
  visitUuid: 'visit-1',
  visitDate: '2024-01-15T09:00:00.000+0300',
  visitType: 'Outpatient',
  weight: undefined,
  visits: mockVisits,
  onVisitChange: vi.fn(),
};

function renderHeader(props: Partial<React.ComponentProps<typeof VisitSummaryHeader>> = {}) {
  return render(<VisitSummaryHeader {...defaultProps} {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePatient.mockReturnValue({
    patient: mockPatient,
    isLoading: false,
    error: null,
    patientUuid: 'patient-1',
  });
});

describe('VisitSummaryHeader', () => {
  it('shows the case summary label and the current visit type', () => {
    renderHeader();

    expect(screen.getByText('CASE SUMMARY:')).toBeInTheDocument();
    expect(screen.getByText(/Outpatient/)).toBeInTheDocument();
  });

  it('falls back to a "Select visit" label when there is no visit date', () => {
    renderHeader({ visitDate: '', visitType: '' });

    expect(screen.getByText('Select visit')).toBeInTheDocument();
  });

  it('opens the visit dropdown and lists the available visits', async () => {
    const user = userEvent.setup();
    renderHeader();

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /CASE SUMMARY/ }));

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(2);
  });

  it('filters the visit list by the search term', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: /CASE SUMMARY/ }));
    await user.type(screen.getByPlaceholderText('Search visits...'), 'Inpatient');

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(1);
    expect(options[0]).toHaveTextContent(/Inpatient/);
  });

  it('calls onVisitChange and closes the dropdown when a visit is selected', async () => {
    const user = userEvent.setup();
    const onVisitChange = vi.fn();
    renderHeader({ onVisitChange });

    await user.click(screen.getByRole('button', { name: /CASE SUMMARY/ }));
    await user.type(screen.getByPlaceholderText('Search visits...'), 'Inpatient');
    await user.click(screen.getByRole('button', { name: /Inpatient/ }));

    expect(onVisitChange).toHaveBeenCalledWith('visit-2');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('opens the print preview modal when the print button is clicked', async () => {
    const user = userEvent.setup();
    renderHeader();

    await user.click(screen.getByRole('button', { name: 'Print' }));

    expect(mockShowModal).toHaveBeenCalledWith(
      'visit-summary-print-preview-modal',
      expect.objectContaining({ visitUuid: 'visit-1', patient: mockPatient }),
    );
  });
});
