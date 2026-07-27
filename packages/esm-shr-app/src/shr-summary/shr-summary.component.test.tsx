import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import usePatientIdentifiers from '../hooks/usePatientIdentifiers';
import SHRSummaryPanel from './shr-summary.component';

vi.mock('../hooks/usePatientIdentifiers', () => ({ default: vi.fn() }));
vi.mock('../referrals/dependents/dependents.component', () => ({
  default: () => <div>Dependent records</div>,
}));
vi.mock('./tables/shr-summary-table.component', () => ({
  default: () => <div>Shared health records</div>,
}));

const mockUsePatientIdentifiers = vi.mocked(usePatientIdentifiers);
const patient = { resourceType: 'Patient', id: 'patient-1' } as fhir.Patient;

describe('SHRSummaryPanel', () => {
  it('lets the user move between dependents and shared records', async () => {
    const user = userEvent.setup();
    mockUsePatientIdentifiers.mockReturnValue({ isLoading: false, error: null } as never);
    render(<SHRSummaryPanel patient={patient} patientUuid="patient-1" />);

    expect(screen.getByText('Dependent records')).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Pull SHR Records' }));
    expect(screen.getByText('Shared health records')).toBeVisible();
  });

  it('shows progress while patient identifiers load', () => {
    mockUsePatientIdentifiers.mockReturnValue({ isLoading: true, error: null } as never);
    const { container } = render(<SHRSummaryPanel patient={patient} patientUuid="patient-1" />);
    expect(container.querySelector('.cds--skeleton')).toBeInTheDocument();
  });

  it('shows an error when identifiers cannot be loaded', () => {
    mockUsePatientIdentifiers.mockReturnValue({
      isLoading: false,
      error: new Error('Identifier service unavailable'),
    } as never);
    render(<SHRSummaryPanel patient={patient} patientUuid="patient-1" />);
    expect(screen.getByText('Error State')).toBeInTheDocument();
  });
});
