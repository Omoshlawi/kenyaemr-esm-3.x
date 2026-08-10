import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import usePatientIdentifiers from '../hooks/usePatientIdentifiers';
import SHRSummaryPanel from './shr-summary.component';

vi.mock('../hooks/usePatientIdentifiers', () => ({ default: vi.fn() }));
vi.mock('./hie-shr-dashboard/hie-shr-dashboard.component', () => ({
  default: () => <div>HIE dashboard</div>,
}));

const mockUsePatientIdentifiers = vi.mocked(usePatientIdentifiers);
const patient = { resourceType: 'Patient', id: 'patient-1' } as fhir.Patient;

describe('SHRSummaryPanel', () => {
  it('shows the shared health records dashboard', () => {
    mockUsePatientIdentifiers.mockReturnValue({ isLoading: false, error: null } as never);
    render(<SHRSummaryPanel patient={patient} patientUuid="patient-1" />);

    expect(screen.getByRole('tab', { name: 'SHARED HEALTH RECORDS (HIE)' })).toBeVisible();
    expect(screen.getByText('HIE dashboard')).toBeVisible();
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
