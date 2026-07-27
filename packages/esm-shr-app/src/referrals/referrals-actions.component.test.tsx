import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { navigate, showModal, showSnackbar } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import usePatient from '../hooks/usePatient';
import { sendSHAOtp, verifyOtp } from '../shr-summary/shr-summary.resource';
import CommunityReferralActions from './referrals-actions.component';
import { processCommunityReferral } from './refferals.resource';

vi.mock('../hooks/usePatient', () => ({ default: vi.fn() }));
vi.mock('./refferals.resource', () => ({ processCommunityReferral: vi.fn() }));
vi.mock('../shr-summary/shr-summary.resource', () => ({
  sendSHAOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

const mockUsePatient = vi.mocked(usePatient);
const mockProcessCommunityReferral = vi.mocked(processCommunityReferral);
const mockSendSHAOtp = vi.mocked(sendSHAOtp);
const mockVerifyOtp = vi.mocked(verifyOtp);
const mockShowModal = vi.mocked(showModal);
const mockShowSnackbar = vi.mocked(showSnackbar);
const mockNavigate = vi.mocked(navigate);

const referralData = {
  messageId: 42,
  reasonCode: 'Fever',
  clinicalNote: 'Persistent fever',
  category: 'Outpatient',
};

describe('CommunityReferralActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePatient.mockReturnValue({
      error: null,
      isLoading: false,
      patient: undefined,
      patientName: 'Jane Doe',
      patientPhoneNumber: '0712345678',
      nationalId: '12345678',
    });
  });

  it('opens the referral reasons and allows the user to close them', async () => {
    const user = userEvent.setup();
    const dismiss = vi.fn();
    mockShowModal.mockReturnValue(dismiss);

    render(<CommunityReferralActions status="completed" referralData={referralData} patientUuid="patient-1" />);

    expect(screen.queryByRole('button', { name: 'Serve client' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View reasons' }));

    expect(mockShowModal).toHaveBeenCalledWith(
      'referral-reasons-dialog',
      expect.objectContaining({
        referralReasons: referralData,
        status: 'completed',
      }),
    );

    const modalProps = mockShowModal.mock.calls[0][1] as { closeModal: () => void };
    modalProps.closeModal();
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('serves a client after successful OTP verification', async () => {
    const user = userEvent.setup();
    const dismiss = vi.fn();
    mockShowModal.mockReturnValue(dismiss);
    mockSendSHAOtp.mockResolvedValue({ status: 'success', id: 'otp-request-1' } as never);
    mockVerifyOtp.mockResolvedValue({ status: 'success', data: {}, error: null } as never);
    mockProcessCommunityReferral.mockResolvedValue({ data: { uuid: 'registered-patient' } } as never);

    render(<CommunityReferralActions status="active" referralData={referralData} patientUuid="patient-1" />);
    await user.click(screen.getByRole('button', { name: 'Serve client' }));

    expect(mockShowModal).toHaveBeenCalledWith(
      'otp-verification-modal',
      expect.objectContaining({
        phoneNumber: '0712345678',
        otpLength: 5,
      }),
    );

    const otpProps = mockShowModal.mock.calls[0][1] as {
      onRequestOtp: (phone: string) => Promise<void>;
      onVerify: (otp: string) => Promise<void>;
      onVerificationSuccess: () => void;
    };

    await otpProps.onRequestOtp('0712345678');
    expect(mockSendSHAOtp).toHaveBeenCalledWith('0712345678', '12345678');

    await otpProps.onVerify('12345');
    expect(mockVerifyOtp).toHaveBeenCalledWith('12345', 'otp-request-1');

    otpProps.onVerificationSuccess();

    await waitFor(() => {
      expect(mockProcessCommunityReferral).toHaveBeenCalledWith(42);
      expect(mockNavigate).toHaveBeenCalledWith({
        to: '/openmrs/spa/patient/registered-patient/chart/Patient Summary',
      });
    });
    expect(dismiss).toHaveBeenCalledOnce();
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('shows feedback when serving the client fails', async () => {
    const user = userEvent.setup();
    const dismiss = vi.fn();
    mockShowModal.mockReturnValue(dismiss);
    mockProcessCommunityReferral.mockRejectedValue(new Error('Registration unavailable'));

    render(<CommunityReferralActions status="active" referralData={referralData} patientUuid="patient-1" />);
    await user.click(screen.getByRole('button', { name: 'Serve client' }));

    const otpProps = mockShowModal.mock.calls[0][1] as { onVerificationSuccess: () => void };
    otpProps.onVerificationSuccess();

    await waitFor(() => {
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          kind: 'error',
          title: 'Process referral',
        }),
      );
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
