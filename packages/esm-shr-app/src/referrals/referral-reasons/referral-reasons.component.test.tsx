import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ReferralReasonsDialogPopup from './referral-reasons.component';

const referralReasons = {
  messageId: 42,
  reasonCode: 'Fever',
  clinicalNote: 'Persistent fever for three days',
  category: 'Outpatient',
};

describe('ReferralReasonsDialogPopup', () => {
  it('shows the reason and lets the user cancel', async () => {
    const user = userEvent.setup();
    const closeModal = vi.fn();

    render(
      <ReferralReasonsDialogPopup
        closeModal={closeModal}
        referralReasons={referralReasons}
        status="active"
        handleProcessReferral={vi.fn()}
      />,
    );

    expect(screen.getByText('Fever')).toBeInTheDocument();
    expect(screen.getByText('Persistent fever for three days')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(closeModal).toHaveBeenCalledOnce();
  });

  it('closes the dialog before serving the client', async () => {
    const user = userEvent.setup();
    const closeModal = vi.fn();
    const handleProcessReferral = vi.fn();

    render(
      <ReferralReasonsDialogPopup
        closeModal={closeModal}
        referralReasons={referralReasons}
        status="active"
        handleProcessReferral={handleProcessReferral}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Serve client' }));

    expect(closeModal).toHaveBeenCalledOnce();
    expect(handleProcessReferral).toHaveBeenCalledOnce();
    expect(closeModal.mock.invocationCallOrder[0]).toBeLessThan(handleProcessReferral.mock.invocationCallOrder[0]);
  });

  it('does not offer to serve a completed referral', () => {
    render(
      <ReferralReasonsDialogPopup
        closeModal={vi.fn()}
        referralReasons={referralReasons}
        status="completed"
        handleProcessReferral={vi.fn()}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Serve client' })).not.toBeInTheDocument();
  });
});
