import React from 'react';
import { render, screen } from '@testing-library/react';
import { type Scheme, useSHAEligibility } from '../hie.resource';
import { CoverageStatus, EligibilityStatusCode, MemberType, SchemeName } from './constant';
import PatientBannerShaStatus from './patient-banner-sha-status.extension';
import { vi, it, describe, beforeEach, expect } from 'vitest';

vi.mock('../hie.resource', () => ({
  useSHAEligibility: vi.fn(),
}));

const mockUseSHAEligibility = vi.mocked(useSHAEligibility);

const patientUuid = 'test-patient-uuid';

/**
 * Builds a scheme that, by default, is active and within its coverage period
 * relative to the current date so it is reported as eligible by the real helper.
 */
function buildScheme(overrides: Partial<Scheme> & { schemeName: string }): Scheme {
  return {
    schemeId: 1,
    memberType: MemberType.PRIMARY,
    policy: { startDate: '2020-01-01', endDate: '2999-12-31', number: 'POL-1' },
    coverage: {
      startDate: '2020-01-01',
      endDate: '2999-12-31',
      message: '',
      reason: '',
      status: CoverageStatus.ACTIVE,
    },
    principalContributor: {
      idNumber: '123',
      idType: 'National ID',
      crNumber: 'CR-1',
      name: 'Jane Doe',
      relationship: null,
      employmentType: 'FORMAL',
      employerDetails: { name: 'Acme' },
    },
    ...overrides,
  } as Scheme;
}

function mockEligibility(value: Partial<ReturnType<typeof useSHAEligibility>>) {
  mockUseSHAEligibility.mockReturnValue({
    data: undefined,
    isPatientWhiteListed: false,
    facilityBiometricsEnforced: false,
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    ...value,
  } as ReturnType<typeof useSHAEligibility>);
}

describe('PatientBannerShaStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading indicator while eligibility is being checked', () => {
    mockEligibility({ isLoading: true });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText('Checking SHA eligibility...')).toBeInTheDocument();
  });

  it('shows an error notification when eligibility retrieval fails', () => {
    mockEligibility({ error: new Error('network down') });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText('Error retrieving HIE subscription')).toBeInTheDocument();
  });

  it('shows "Not Registered" when the member is not found', () => {
    mockEligibility({
      data: { statusCode: EligibilityStatusCode.MEMBER_NOT_FOUND, schemes: [] } as any,
    });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText('SHA')).toBeInTheDocument();
    expect(screen.getByText('Not Registered')).toBeInTheDocument();
  });

  it('shows "Not Registered" when no status code is returned', () => {
    mockEligibility({ data: { schemes: [] } as any });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText('Not Registered')).toBeInTheDocument();
  });

  it('shows "No Schemes Found" when the member is found but has no tracked schemes', () => {
    mockEligibility({
      data: { statusCode: EligibilityStatusCode.MEMBER_FOUND, schemes: [] } as any,
    });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText('No Schemes Found')).toBeInTheDocument();
    expect(screen.queryByText('Not Registered')).not.toBeInTheDocument();
  });

  it('shows "No Schemes Found" when only untracked schemes are returned', () => {
    mockEligibility({
      data: {
        statusCode: EligibilityStatusCode.MEMBER_FOUND,
        schemes: [buildScheme({ schemeName: 'UNKNOWN_SCHEME' })],
      } as any,
    });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText('No Schemes Found')).toBeInTheDocument();
  });

  it('renders a tag for each eligible tracked scheme', () => {
    mockEligibility({
      data: {
        statusCode: EligibilityStatusCode.MEMBER_FOUND,
        schemes: [buildScheme({ schemeName: SchemeName.SHIF }), buildScheme({ schemeName: SchemeName.UHC })],
      } as any,
    });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText(/^SHIF \| Eligible \|/)).toBeInTheDocument();
    expect(screen.getByText(/^UHC \| Eligible \|/)).toBeInTheDocument();
    expect(screen.queryByText('No Schemes Found')).not.toBeInTheDocument();
  });

  it('does not render a tag for a scheme whose coverage is inactive', () => {
    mockEligibility({
      data: {
        statusCode: EligibilityStatusCode.MEMBER_FOUND,
        schemes: [
          buildScheme({
            schemeName: SchemeName.TSC,
            coverage: {
              startDate: '2020-01-01',
              endDate: '2999-12-31',
              message: '',
              reason: '',
              status: CoverageStatus.INACTIVE,
            },
          }),
        ],
      } as any,
    });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText('No Schemes Found')).toBeInTheDocument();
    expect(screen.queryByText(/TSC/)).not.toBeInTheDocument();
  });

  it('does not render a tag for a scheme whose coverage period has expired', () => {
    mockEligibility({
      data: {
        statusCode: EligibilityStatusCode.MEMBER_FOUND,
        schemes: [
          buildScheme({
            schemeName: SchemeName.POMSF,
            coverage: {
              startDate: '2000-01-01',
              endDate: '2001-01-01',
              message: '',
              reason: '',
              status: CoverageStatus.ACTIVE,
            },
          }),
        ],
      } as any,
    });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText('No Schemes Found')).toBeInTheDocument();
    expect(screen.queryByText(/POMSF/)).not.toBeInTheDocument();
  });

  it('renders only the eligible schemes when an ineligible scheme is also returned', () => {
    mockEligibility({
      data: {
        statusCode: EligibilityStatusCode.MEMBER_FOUND,
        schemes: [
          buildScheme({ schemeName: SchemeName.UHC }),
          buildScheme({
            schemeName: SchemeName.TSC,
            coverage: {
              startDate: '2020-01-01',
              endDate: '2999-12-31',
              message: '',
              reason: '',
              status: CoverageStatus.INACTIVE,
            },
          }),
        ],
      } as any,
    });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText(/^UHC \| Eligible \|/)).toBeInTheDocument();
    expect(screen.queryByText(/TSC/)).not.toBeInTheDocument();
  });

  it('prefers the PRIMARY membership over a BENEFICIARY one for the same scheme', () => {
    mockEligibility({
      data: {
        statusCode: EligibilityStatusCode.MEMBER_FOUND,
        schemes: [
          buildScheme({ schemeName: SchemeName.SHIF, memberType: MemberType.BENEFICIARY }),
          buildScheme({ schemeName: SchemeName.SHIF, memberType: MemberType.PRIMARY }),
        ],
      } as any,
    });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    const tag = screen.getByText(/^SHIF \| Eligible \|/);
    expect(tag).toHaveTextContent(MemberType.PRIMARY);
    expect(tag).not.toHaveTextContent(MemberType.BENEFICIARY);
  });

  it('renders a separator between multiple scheme tags', () => {
    mockEligibility({
      data: {
        statusCode: EligibilityStatusCode.MEMBER_FOUND,
        schemes: [buildScheme({ schemeName: SchemeName.SHIF }), buildScheme({ schemeName: SchemeName.UHC })],
      } as any,
    });

    render(<PatientBannerShaStatus patientUuid={patientUuid} />);

    expect(screen.getByText('·')).toBeInTheDocument();
  });
});
