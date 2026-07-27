import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showModal, showSnackbar } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import usePatient from '../../hooks/usePatient';
import { sendSHAOtp, verifyOtp } from '../shr-summary.resource';
import PatientSHRSummaryTable from './shr-summary-table.component';

vi.mock('../../hooks/usePatient', () => ({ default: vi.fn() }));
vi.mock('../shr-summary.resource', () => ({
  sendSHAOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));
vi.mock('../../shrpatient-summary/shrpatient-summary.component', () => ({
  default: () => <div>Patient shared health record</div>,
}));

const modalProps = vi.hoisted(() => ({ current: null as any }));
vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  showModal: vi.fn((_name, props) => {
    modalProps.current = props;
    return vi.fn();
  }),
  showSnackbar: vi.fn(),
}));

const mockUsePatient = vi.mocked(usePatient);
const patient = { resourceType: 'Patient', id: 'patient-1' } as fhir.Patient;

describe('PatientSHRSummaryTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePatient.mockReturnValue({
      isLoading: false,
      error: null,
      patientPhoneNumber: '0712345678',
      patientName: 'Amina Otieno',
      nationalId: '12345678',
    } as never);
  });

  it('authorizes the user with OTP before showing shared records', async () => {
    const user = userEvent.setup();
    vi.mocked(sendSHAOtp).mockResolvedValue({ status: 'success', id: 'otp-request-1' } as never);
    vi.mocked(verifyOtp).mockResolvedValue({ status: 'success' } as never);
    render(<PatientSHRSummaryTable patient={patient} patientUuid="patient-1" />);

    expect(screen.getByText('SHR Records have not been pulled')).toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Pull SHR Records' })[0]);
    expect(showModal).toHaveBeenCalledWith('otp-verification-modal', expect.any(Object));

    await modalProps.current.onRequestOtp('0712345678');
    await modalProps.current.onVerify('12345');
    act(() => modalProps.current.onVerificationSuccess());

    expect(sendSHAOtp).toHaveBeenCalledWith('0712345678', '12345678');
    expect(verifyOtp).toHaveBeenCalledWith('12345', 'otp-request-1');
    expect(screen.getByText('Patient shared health record')).toBeInTheDocument();
    expect(showSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('reports an unsuccessful OTP request to the user', async () => {
    const user = userEvent.setup();
    vi.mocked(sendSHAOtp).mockResolvedValue({ status: 'failed' } as never);
    render(<PatientSHRSummaryTable patient={patient} patientUuid="patient-1" />);
    await user.click(screen.getAllByRole('button', { name: 'Pull SHR Records' })[0]);

    await expect(modalProps.current.onRequestOtp('0712345678')).rejects.toThrow('Failed to send OTP');
  });

  it('reports an incorrect OTP and supports closing and cleaning up authorization', async () => {
    const user = userEvent.setup();
    vi.mocked(sendSHAOtp).mockResolvedValue({ status: 'success', id: 'otp-request-2' } as never);
    vi.mocked(verifyOtp).mockResolvedValue({ status: 'failed' } as never);
    render(<PatientSHRSummaryTable patient={patient} patientUuid="patient-1" />);
    await user.click(screen.getAllByRole('button', { name: 'Pull SHR Records' })[0]);
    await modalProps.current.onRequestOtp('0712345678');

    await expect(modalProps.current.onVerify('00000')).rejects.toThrow('Authorization failed');
    act(() => modalProps.current.onCleanup());
    act(() => modalProps.current.onClose());
    expect(screen.getByText('SHR Records have not been pulled')).toBeInTheDocument();
  });

  it('shows loading and error feedback from the patient service', () => {
    mockUsePatient.mockReturnValue({ isLoading: true, error: null } as never);
    const { container, rerender } = render(<PatientSHRSummaryTable patient={patient} patientUuid="patient-1" />);
    expect(container.querySelector('.cds--skeleton')).toBeInTheDocument();

    mockUsePatient.mockReturnValue({ isLoading: false, error: new Error('Patient unavailable') } as never);
    rerender(<PatientSHRSummaryTable patient={patient} patientUuid="patient-1" />);
    expect(screen.getByText('Error State')).toBeInTheDocument();
  });
});
