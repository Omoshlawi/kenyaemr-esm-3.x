import React from 'react';
import { render, screen } from '@testing-library/react';
import { usePatient } from '@openmrs/esm-framework';
import { describe, expect, it, vi } from 'vitest';
import PatientInfo from './referral-patient-info.component';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  PatientPhoto: ({ patientName }: { patientName: string }) => <div>Photo for {patientName}</div>,
  usePatient: vi.fn(),
}));

const mockUsePatient = vi.mocked(usePatient);

describe('PatientInfo', () => {
  it('shows progress while patient information loads', () => {
    mockUsePatient.mockReturnValue({ isLoading: true, patient: null, error: null } as never);
    render(<PatientInfo patientUuid="patient-1" />);
    expect(screen.getByText('Loading patient data ...')).toBeInTheDocument();
  });

  it('shows an error when patient information cannot be loaded', () => {
    mockUsePatient.mockReturnValue({ isLoading: false, patient: null, error: new Error('Unavailable') } as never);
    render(<PatientInfo patientUuid="patient-1" />);
    expect(screen.getByText('Error loading patient information')).toBeInTheDocument();
  });

  it('shows the patient demographics and identifiers', () => {
    mockUsePatient.mockReturnValue({
      isLoading: false,
      error: null,
      patient: {
        id: 'patient-1',
        name: [{ given: ['Amina'], family: 'Otieno' }],
        gender: 'female',
        birthDate: '1990-01-01',
        identifier: [{ value: 'UPI-001', type: { text: 'UPI' } }],
      },
    } as never);
    render(<PatientInfo patientUuid="patient-1" />);

    expect(screen.getByRole('heading', { name: /Amina Otieno/i })).toBeInTheDocument();
    expect(screen.getByText(/female/)).toBeInTheDocument();
    expect(screen.getByText('UPI-001')).toBeInTheDocument();
  });

  it('still shows demographics when the patient has no identifiers', () => {
    mockUsePatient.mockReturnValue({
      isLoading: false,
      error: null,
      patient: {
        id: 'patient-2',
        name: [{ given: ['John'], family: 'Kamau' }],
        gender: 'male',
        birthDate: '1985-05-05',
      },
    } as never);
    render(<PatientInfo patientUuid="patient-2" />);

    expect(screen.getByRole('heading', { name: /John Kamau/i })).toBeInTheDocument();
    expect(screen.queryByText('UPI-001')).not.toBeInTheDocument();
  });
});
