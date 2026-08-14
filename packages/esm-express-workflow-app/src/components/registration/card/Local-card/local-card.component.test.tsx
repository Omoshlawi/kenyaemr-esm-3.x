import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfig } from '@openmrs/esm-framework';
import LocalPatientCard from './local-card.component';
import { type HIEBundleResponse, type LocalResponse } from '../../type';

const NATIONAL_ID_TYPE_UUID = '49af6cdc-7968-4abb-bf46-de10d7f4859f';
const NATIONAL_ID = '12345678';

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
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

vi.mock('../../dependants/dependants.resource', () => ({
  useMultipleActiveVisits: () => [{ activeVisit: null }],
}));

vi.mock('../HIE-card/hie-card.resource', () => ({
  otpManager: { setOtpSource: vi.fn(), verifyOTP: vi.fn(), cleanupExpiredOTPs: vi.fn() },
  useOtpSource: () => ({ otpSource: null, isLoading: false, error: null }),
  cleanupAllOTPs: vi.fn(),
}));

const mockUseConfig = vi.mocked(useConfig);

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
  attributes: [{ value: '0712345678', attributeType: { uuid: 'attr', display: 'Telephone Number' } }],
} as unknown as LocalResponse[number];

const hieBundleFor = (nationalId: string | null): HIEBundleResponse =>
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
              telecom: [{ system: 'phone', value: '0722999999' }],
            },
          },
        ]
      : [],
  } as unknown as HIEBundleResponse);

const renderCard = (hieSearchResults: Array<HIEBundleResponse> | null) =>
  render(
    <LocalPatientCard
      localSearchResults={[localPatient]}
      syncedPatients={new Set()}
      searchedNationalId={NATIONAL_ID}
      hieSearchResults={hieSearchResults}
    />,
  );

describe('LocalPatientCard - compare & sync button', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfig.mockReturnValue({ enableDemographicSync: true, nationalIdUUID: NATIONAL_ID_TYPE_UUID } as any);
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
