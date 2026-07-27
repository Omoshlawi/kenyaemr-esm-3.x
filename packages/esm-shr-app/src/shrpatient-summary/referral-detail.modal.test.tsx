import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ReferralDetailModal from './referral-detail.modal.component';

describe('ReferralDetailModal', () => {
  it('shows referral details and closes from the footer', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const item = {
      uuid: 'referral-1',
      Category: 'Outpatient',
      priority: 'Urgent',
      dateRequested: '2026-07-25',
      requesterCode: 'FAC-100',
      reasons: 'Specialist review',
      performer: 'Referral Hospital',
      referralNote: 'Review within 24 hours',
    } as never;

    render(<ReferralDetailModal item={item} onClose={onClose} />);

    expect(screen.getByText('Referral Hospital')).toBeInTheDocument();
    expect(screen.getAllByText('Urgent')).toHaveLength(2);
    expect(screen.getByText('Specialist review')).toBeInTheDocument();
    expect(screen.getByText('Review within 24 hours')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button', { name: 'Close' });
    await user.click(closeButtons[closeButtons.length - 1]!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('shows useful fallbacks when optional referral details are missing', () => {
    render(<ReferralDetailModal item={{ uuid: 'referral-2' } as never} onClose={vi.fn()} />);

    expect(screen.getAllByText('Not available').length).toBeGreaterThan(0);
    expect(screen.getByText('No notes provided.')).toBeInTheDocument();
  });
});
