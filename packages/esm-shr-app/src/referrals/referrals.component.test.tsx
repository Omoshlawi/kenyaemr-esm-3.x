import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { isDesktop, navigate, useLayoutType, usePagination } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ReferralTable from './referrals.component';
import { useCommunityReferrals } from './refferals.resource';

vi.mock('./refferals.resource', () => ({
  useCommunityReferrals: vi.fn(),
}));

vi.mock('./referrals-actions.component', () => ({
  default: ({ patientUuid }: { patientUuid: string }) => <button>Actions for {patientUuid}</button>,
}));

vi.mock('@openmrs/esm-framework', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-framework')>()),
  navigate: vi.fn(),
  useLayoutType: vi.fn(() => 'desktop'),
  isDesktop: vi.fn(() => true),
  usePagination: vi.fn((data) => ({
    paginated: data?.length > 10,
    goTo: vi.fn(),
    results: data,
    currentPage: 1,
  })),
}));

vi.mock('@openmrs/esm-patient-common-lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-patient-common-lib')>()),
  usePaginationInfo: vi.fn(() => ({ pageSizes: [10, 20] })),
}));

const mockUseCommunityReferrals = vi.mocked(useCommunityReferrals);
const referrals = [
  {
    id: 'referral-1',
    uuid: 'patient-1',
    nupi: 'UPI-001',
    givenName: 'Amina',
    middleName: 'N',
    familyName: 'Otieno',
    gender: 'Female',
    birthdate: '1990-01-01',
    dateReferred: '2026-07-20',
    referredFrom: 'Community unit',
    referralReasons: { category: 'Outpatient', clinicalNote: 'Review', reasonCode: 'REVIEW' },
  },
] as never;

describe('ReferralTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCommunityReferrals.mockReturnValue({
      referrals,
      isLoading: false,
      isValidating: false,
    } as never);
  });

  it('shows referred patients and their available actions', () => {
    render(<ReferralTable status="active" />);

    expect(screen.getByText('Amina N Otieno')).toBeInTheDocument();
    expect(screen.getByText('UPI-001')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions for patient-1' })).toBeInTheDocument();
  });

  it('filters the table from the user search and explains when nothing matches', async () => {
    const user = userEvent.setup();
    render(<ReferralTable status="active" />);

    await user.type(screen.getByRole('searchbox'), 'not-a-patient');

    expect(screen.queryByText('Amina N Otieno')).not.toBeInTheDocument();
    expect(screen.getByText('There are no new referrals to this facility')).toBeInTheDocument();
  });

  it('opens a completed referral patient from their name', async () => {
    const user = userEvent.setup();
    render(<ReferralTable status="completed" />);

    await user.click(screen.getByText('Amina N Otieno'));

    expect(navigate).toHaveBeenCalledWith({
      to: expect.stringContaining('patient/patient-1/chart/Patient Summary'),
    });
  });

  it('shows a loading table while referrals are being fetched', () => {
    mockUseCommunityReferrals.mockReturnValue({ referrals: [], isLoading: true, isValidating: false } as never);

    const { container } = render(<ReferralTable status="active" />);

    expect(container.querySelector('.cds--skeleton')).toBeInTheDocument();
  });

  it('shows background refresh feedback and an empty state on a smaller layout', () => {
    vi.mocked(useLayoutType).mockReturnValueOnce('tablet');
    vi.mocked(isDesktop).mockReturnValue(false);
    mockUseCommunityReferrals.mockReturnValue({
      referrals: undefined,
      isLoading: false,
      isValidating: true,
    } as never);

    render(<ReferralTable status="active" />);

    expect(screen.getByText('Referred Patients')).toBeInTheDocument();
    expect(screen.getByTitle('loading')).toBeInTheDocument();
  });

  it('lets the user move to the next page of referrals', async () => {
    const user = userEvent.setup();
    const goTo = vi.fn();
    const manyReferrals = Array.from({ length: 11 }, (_, index) => ({
      ...referrals[0],
      id: `referral-${index}`,
      uuid: `patient-${index}`,
      nupi: `UPI-${index}`,
    }));
    mockUseCommunityReferrals.mockReturnValue({
      referrals: manyReferrals,
      isLoading: false,
      isValidating: false,
    } as never);
    vi.mocked(usePagination).mockReturnValue({
      paginated: true,
      goTo,
      results: manyReferrals,
      currentPage: 1,
    } as never);

    render(<ReferralTable status="active" />);
    await user.click(screen.getByRole('button', { name: 'Next page' }));

    expect(goTo).toHaveBeenCalledWith(2);
  });
});
