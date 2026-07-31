import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { showToast } from '@openmrs/esm-framework';
import ADREmailModal from './email.modal';

const mockShowToast = vi.mocked(showToast);

const encounter = {
  patientUuid: 'patient-uuid-001',
  encounterUuid: 'encounter-uuid-001',
  patientName: 'Jane Wanjiku',
};

function renderModal() {
  const onEmailSent = vi.fn();
  const onClose = vi.fn();
  render(<ADREmailModal encounter={encounter} onEmailSent={onEmailSent} onClose={onClose} />);
  return { onEmailSent, onClose };
}

const jsonResponse = (body: unknown, init: { ok?: boolean; status?: number } = {}) =>
  ({
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body,
  } as Response);

describe('ADREmailModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    sessionStorage.setItem('token', 'test-token');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it('renders the recipient field, the one-time-send notice and a disabled send button', () => {
    renderModal();

    expect(screen.getByText('Send ADR Report via Email')).toBeInTheDocument();
    expect(screen.getByLabelText(/recipient email address/i)).toBeInTheDocument();
    expect(screen.getByText(/This report can only be sent once per patient/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Email' })).toBeDisabled();
  });

  it('shows a validation message and keeps send disabled for an invalid email', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText(/recipient email address/i), 'not-an-email');

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send Email' })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sends the report and reports success for a valid email', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ success: true }));
    const { onEmailSent } = renderModal();

    await user.type(screen.getByLabelText(/recipient email address/i), 'nurse@hospital.org');
    await user.click(screen.getByRole('button', { name: 'Send Email' }));

    await waitFor(() => expect(onEmailSent).toHaveBeenCalledTimes(1));

    expect(fetch).toHaveBeenCalledWith(
      '/openmrs/ws/rest/v1/kenyaemr/adpdf/send-email',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }),
        body: JSON.stringify({
          patientUuid: encounter.patientUuid,
          encounterUuid: encounter.encounterUuid,
          patientName: encounter.patientName,
          recipientEmail: 'nurse@hospital.org',
        }),
      }),
    );
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ kind: 'success' }));
  });

  it('shows the already-sent message on a 409 response and does not complete', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({}, { ok: false, status: 409 }));
    const { onEmailSent } = renderModal();

    await user.type(screen.getByLabelText(/recipient email address/i), 'nurse@hospital.org');
    await user.click(screen.getByRole('button', { name: 'Send Email' }));

    expect(await screen.findByText(/This report has already been sent/i)).toBeInTheDocument();
    expect(onEmailSent).not.toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it('surfaces the server error message on a non-409 failure', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ error: 'Mailbox unavailable' }, { ok: false, status: 500 }));
    const { onEmailSent } = renderModal();

    await user.type(screen.getByLabelText(/recipient email address/i), 'nurse@hospital.org');
    await user.click(screen.getByRole('button', { name: 'Send Email' }));

    expect(await screen.findByText('Mailbox unavailable')).toBeInTheDocument();
    expect(onEmailSent).not.toHaveBeenCalled();
  });

  it('shows a network error message when the request throws', async () => {
    const user = userEvent.setup();
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { onEmailSent } = renderModal();

    await user.type(screen.getByLabelText(/recipient email address/i), 'nurse@hospital.org');
    await user.click(screen.getByRole('button', { name: 'Send Email' }));

    expect(await screen.findByText(/Network error occurred/i)).toBeInTheDocument();
    expect(onEmailSent).not.toHaveBeenCalled();
  });

  it('closes the modal when cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
