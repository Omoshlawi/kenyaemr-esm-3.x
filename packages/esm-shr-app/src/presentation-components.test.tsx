import React from 'react';
import { render, screen } from '@testing-library/react';
import { useConfig } from '@openmrs/esm-framework';
import { describe, expect, it, vi } from 'vitest';
import { ReferralsHeader } from './header/referrals-header.component';
import PrintComponent from './print-layout/print.component';
import ReferralWrap from './referrals-wrap';
import SHRSummaryHeader from './shr-summary/shr-summary-header.component';

vi.mock('./referrals/referral-tabs/referrals-tabs.component', () => ({
  default: () => <div>Referral tabs</div>,
}));

describe('SHR presentation components', () => {
  it('shows the referrals page header and referral content', () => {
    render(
      <>
        <ReferralsHeader />
        <ReferralWrap />
      </>,
    );
    expect(screen.getAllByText('Referrals')).toHaveLength(2);
    expect(screen.getByText('Referral tabs')).toBeInTheDocument();
  });

  it('shows the SHR portal heading', () => {
    render(<SHRSummaryHeader />);
    expect(screen.getByRole('heading', { name: 'SHR Portal' })).toBeInTheDocument();
  });

  it('shows a configured logo in the print layout', () => {
    vi.mocked(useConfig).mockReturnValue({ logo: { src: '/logo.png', alt: 'Facility logo' } });
    render(<PrintComponent />);
    expect(screen.getByRole('img', { name: 'Facility logo' })).toHaveAttribute('src', '/logo.png');
  });

  it('leaves the print header empty when no logo is configured', () => {
    vi.mocked(useConfig).mockReturnValue({ logo: undefined });
    render(<PrintComponent />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
