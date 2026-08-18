import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SWRConfig } from 'swr';
import { openmrsFetch, useConfig } from '@openmrs/esm-framework';
import { launchOtpVerificationModal } from '../../../../shared/otp-verification';
import LocalPatientCard from './local-card.component';
import { type HIEBundleResponse, type LocalResponse } from '../../type';

const NATIONAL_ID_TYPE_UUID = '49af6cdc-7968-4abb-bf46-de10d7f4859f';
const NATIONAL_ID = '12345678';

const LOCAL_PHONE = '0712345678';
const HIE_PHONE = '0722999999';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  openmrsFetch: vi.fn(),
  useConfig: vi.fn(),
  useSession: vi.fn(() => ({ sessionLocation: { uuid: 'loc-uuid' } })),
  showModal: vi.fn(() => () => {}),
  PatientPhoto: () => null,
  launchWorkspace2: vi.fn(),
  launchWorkspaceGroup2: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (_key: string, fallback: string) => fallback }),
}));

vi.mock('../../patient-banner/patient-banner.component', () => ({
  EnhancedPatientBannerPatientInfo: () => null,
}));

vi.mock('../../dependants/dependants.component', () => ({ default: () => null }));

// launchOtpVerificationModal is the boundary that receives the phone number the
// OTP is sent to; mock it so we can assert which number the card chose.
vi.mock('../../../../shared/otp-verification', () => ({
  launchOtpVerificationModal: vi.fn(),
}));

const mockUseConfig = vi.mocked(useConfig);
const mockOpenmrsFetch = vi.mocked(openmrsFetch);
const mockLaunchOtpVerificationModal = vi.mocked(launchOtpVerificationModal);

const localPatient = {
  patientId: 1,
  uuid: 'local-uuid',
  display: 'Jane Doe',
  identifiers: [
    {
      identifier: NATIONAL_ID,
      identifierType: { uuid: NATIONAL_ID_TYPE_UUID, display: 'National ID Number' },
    },
  ],
  person: {
    gender: 'F',
    birthdate: '1990-01-01',
    personName: { display: 'Jane Doe', givenName: 'Jane', familyName: 'Doe' },
  },
  attributes: [{ value: LOCAL_PHONE, attributeType: { uuid: 'attr', display: 'Telephone Number' } }],
} as unknown as LocalResponse[number];

const hieBundleFor = (nationalId: string | null, telecom?: fhir.ContactPoint[]): HIEBundleResponse =>
  ({
    total: nationalId ? 1 : 0,
    entry: nationalId
      ? [
          {
            resource: {
              resourceType: 'Patient',
              id: 'hie-uuid',
              identifier: [{ value: nationalId, type: { coding: [{ code: 'national-id', display: 'National ID' }] } }],
              name: [{ given: ['Jane'], family: 'Doe' }],
              gender: 'female',
              birthDate: '1990-01-01',
              telecom: telecom ?? [{ system: 'phone', value: HIE_PHONE }],
            },
          },
        ]
      : [],
  } as unknown as HIEBundleResponse);

const renderCard = (hieSearchResults: Array<HIEBundleResponse> | null) =>
  render(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <LocalPatientCard
        localSearchResults={[localPatient]}
        syncedPatients={new Set()}
        searchedNationalId={NATIONAL_ID}
        hieSearchResults={hieSearchResults}
      />
    </SWRConfig>,
  );

describe('LocalPatientCard - compare & sync button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfig.mockReturnValue({ enableDemographicSync: true, nationalIdUUID: NATIONAL_ID_TYPE_UUID } as any);
    // Only the network boundary is stubbed; the real useOtpSource hook runs.
    mockOpenmrsFetch.mockResolvedValue({ data: { otpSource: 'hie' } } as any);
    // useMultipleActiveVisits uses raw fetch under the hood; keep it offline.
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })),
    );
  });

  it('shows the sync action when a matching HIE record exists, even though the local identifier type display is non-standard', () => {
    renderCard([hieBundleFor(NATIONAL_ID)]);
    expect(screen.getByRole('button', { name: 'Review & sync' })).toBeInTheDocument();
  });

  it('does not show the sync action when the feature is disabled', () => {
    mockUseConfig.mockReturnValue({ enableDemographicSync: false, nationalIdUUID: NATIONAL_ID_TYPE_UUID } as any);
    renderCard([hieBundleFor(NATIONAL_ID)]);
    expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument();
  });

  it('does not show the sync action when no HIE record matches the national ID', () => {
    renderCard([hieBundleFor('99999999')]);
    expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument();
  });

  it('does not show the sync action when there are no HIE results at all', () => {
    renderCard(null);
    expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument();
  });
});

describe('LocalPatientCard - OTP phone number preference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfig.mockReturnValue({ enableDemographicSync: true, nationalIdUUID: NATIONAL_ID_TYPE_UUID } as any);
    mockOpenmrsFetch.mockResolvedValue({ data: { otpSource: 'hie' } } as any);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ results: [] }) })),
    );
  });

  it('prefers the HIE phone number over the local copy when a matching HIE record has a phone', async () => {
    const user = userEvent.setup();
    renderCard([hieBundleFor(NATIONAL_ID, [{ system: 'phone', value: HIE_PHONE }])]);

    // Wait for the real useOtpSource hook to resolve and enable the button.
    const sendOtpButton = await screen.findByRole('button', { name: 'Send OTP' });
    await waitFor(() => expect(sendOtpButton).toBeEnabled());

    await user.click(sendOtpButton);

    expect(mockLaunchOtpVerificationModal).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: HIE_PHONE }));
  });

  it('falls back to the local phone number when the matching HIE record has no phone', async () => {
    const user = userEvent.setup();
    renderCard([hieBundleFor(NATIONAL_ID, [])]);

    const sendOtpButton = await screen.findByRole('button', { name: 'Send OTP' });
    await waitFor(() => expect(sendOtpButton).toBeEnabled());

    await user.click(sendOtpButton);

    expect(mockLaunchOtpVerificationModal).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: LOCAL_PHONE }));
  });

  it('falls back to the local phone number when there is no matching HIE record', async () => {
    const user = userEvent.setup();
    renderCard([hieBundleFor('99999999')]);

    const sendOtpButton = await screen.findByRole('button', { name: 'Send OTP' });
    await waitFor(() => expect(sendOtpButton).toBeEnabled());

    await user.click(sendOtpButton);

    expect(mockLaunchOtpVerificationModal).toHaveBeenCalledWith(expect.objectContaining({ phoneNumber: LOCAL_PHONE }));
  });
});
