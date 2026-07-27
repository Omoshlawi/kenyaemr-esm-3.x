import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { showModal } from '@openmrs/esm-framework';
import { describe, expect, it, vi } from 'vitest';
import ReferralSummaryAction from './referral-summary-actions.component';

describe('ReferralSummaryAction', () => {
  it('opens referral details and wires the modal close action', async () => {
    const user = userEvent.setup();
    const dismiss = vi.fn();
    vi.mocked(showModal).mockReturnValue(dismiss);
    const item = { uuid: 'referral-1', name: 'Referral' } as never;

    render(<ReferralSummaryAction item={item} />);
    await user.click(screen.getByRole('button', { name: 'View Details' }));

    expect(showModal).toHaveBeenCalledWith('view-refferal-detail-modal', expect.objectContaining({ item }));

    const modalProps = vi.mocked(showModal).mock.calls[0][1] as { onClose: () => void };
    modalProps.onClose();
    expect(dismiss).toHaveBeenCalledOnce();
  });
});
