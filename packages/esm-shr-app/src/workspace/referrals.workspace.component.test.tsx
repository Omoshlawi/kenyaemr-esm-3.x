import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showSnackbar } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import usePatient from '../hooks/usePatient';
import {
  useFacilities,
  useReasons,
  useSendReferralToArtDirectory,
  useSystemSetting,
} from './referral-workspace.resource';
import FacilityReferralForm from './referrals.workspace.component';

vi.mock('../hooks/usePatient', () => ({ default: vi.fn() }));
vi.mock('./referral-workspace.resource', () => ({
  useFacilities: vi.fn(),
  useReasons: vi.fn(),
  useSendReferralToArtDirectory: vi.fn(),
  useSystemSetting: vi.fn(),
}));
vi.mock('./referral-patient-info.component', () => ({
  default: () => <div>Selected patient</div>,
}));

const mockUsePatient = vi.mocked(usePatient);
const mockUseFacilities = vi.mocked(useFacilities);
const mockUseReasons = vi.mocked(useReasons);
const mockUseSendReferral = vi.mocked(useSendReferralToArtDirectory);
const mockUseSystemSetting = vi.mocked(useSystemSetting);
const mockShowSnackbar = vi.mocked(showSnackbar);
const sendReferral = vi.fn();

describe('FacilityReferralForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSystemSetting.mockReturnValue({ mflCodeValue: '18080', isLoading: false });
    mockUseFacilities.mockReturnValue({
      data: [{ uuid: 'facility-1', name: 'Referral Hospital', attributes: [{ value: '12345' }] }],
      error: null,
    });
    mockUseReasons.mockReturnValue({
      data: [{ uuid: 'reason-1', name: { name: 'Specialist review' } }],
      error: null,
    });
    mockUseSendReferral.mockReturnValue({ mutate: sendReferral });
    mockUsePatient.mockReturnValue({
      patient: {
        uuid: 'patient-1',
        display: 'Jane Doe',
        identifiers: [],
        person: {
          display: 'Jane Doe',
          gender: 'F',
          birthdate: '1990-01-01',
          addresses: [],
          attributes: [],
          dead: false,
        },
      } as never,
      isLoading: false,
      error: null,
      patientName: 'Jane Doe',
      patientPhoneNumber: '0712345678',
      nationalId: '12345678',
    });
  });

  it('lets the user cancel the referral', async () => {
    const user = userEvent.setup();
    const closeWorkspace = vi.fn();

    render(<FacilityReferralForm closeWorkspace={closeWorkspace} patientUuid="patient-1" />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(closeWorkspace).toHaveBeenCalledOnce();
    expect(sendReferral).not.toHaveBeenCalled();
  });

  it('explains which required information is missing when submission is attempted early', () => {
    const { container } = render(<FacilityReferralForm closeWorkspace={vi.fn()} patientUuid="patient-1" />);

    fireEvent.submit(container.querySelector('form')!);

    expect(screen.getByText('Referral type is required')).toBeInTheDocument();
    expect(sendReferral).not.toHaveBeenCalled();
  });

  it('prompts for a patient when the referral workspace was opened without one', async () => {
    const user = userEvent.setup();
    render(<FacilityReferralForm closeWorkspace={vi.fn()} />);

    await user.click(screen.getByRole('combobox', { name: 'Referral Type' }));
    await user.click(screen.getByRole('option', { name: 'Facility to Facility' }));

    expect(screen.getByRole('heading', { name: 'Patient' })).toBeInTheDocument();
    expect(screen.queryByText('Selected patient')).not.toBeInTheDocument();
  });

  it('submits a referral after the user completes the required fields', async () => {
    const user = userEvent.setup();
    const closeWorkspace = vi.fn();
    sendReferral.mockResolvedValue({ success: true });

    render(<FacilityReferralForm closeWorkspace={closeWorkspace} patientUuid="patient-1" />);

    const referralType = screen.getByRole('combobox', { name: 'Referral Type' });
    await user.click(referralType);
    await user.click(screen.getByRole('option', { name: 'Facility to Facility' }));

    await user.type(screen.getByPlaceholderText('Search for facility'), 'Referral');
    await user.click(screen.getByText('Referral Hospital'));

    await user.type(screen.getByPlaceholderText('Search for referral reasons'), 'Specialist');
    await user.click(screen.getByText('Specialist review'));

    await user.type(screen.getByRole('textbox'), 'Needs specialist review');
    await user.click(screen.getByRole('button', { name: 'Submit Referral' }));

    await waitFor(() => expect(sendReferral).toHaveBeenCalledOnce());
    expect(sendReferral).toHaveBeenCalledWith(
      expect.objectContaining({
        MESSAGE_HEADER: expect.objectContaining({
          SENDING_FACILITY: '18080',
          RECEIVING_FACILITY: '12345',
        }),
        DISCONTINUATION_MESSAGE: expect.objectContaining({
          SERVICE_REQUEST: expect.objectContaining({
            RECEIVING_FACILITY_MFLCODE: '12345',
            SUPPORTING_INFO: 'Needs specialist review',
          }),
        }),
      }),
    );
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'success',
        title: 'Referral Successful',
      }),
    );
    expect(closeWorkspace).toHaveBeenCalledOnce();
  });
});
