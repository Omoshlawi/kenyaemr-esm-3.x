import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { HWR_API_NO_CREDENTIALS, RESOURCE_NOT_FOUND, UNKNOWN } from '../../constants';
import HWREmptyModal from './hwr-empty.modal.component';

const errorMessages = [
  [
    RESOURCE_NOT_FOUND,
    'The Health Work Registry is not reachable, kindly confirm your internet connectivity and try again. Do you want to continue to create an account',
  ],
  [
    HWR_API_NO_CREDENTIALS,
    'Health Care Worker Registry API credentials not configured, Kindly contact system admin. Do you want to continue to create an account',
  ],
  [
    UNKNOWN,
    'An error occurred while searching Health Worker Registry, kindly contact system admin. Do you want to continue to create an account',
  ],
] as const;

describe('HWREmptyModal', () => {
  it('renders the modal heading and registration actions', () => {
    render(<HWREmptyModal close={vi.fn()} />);

    expect(screen.getByRole('heading', { name: 'Create an Account' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Continue to registration' })).toBeVisible();
  });

  it.each(errorMessages)('renders the message for the %s error', (errorCode, expectedMessage) => {
    render(<HWREmptyModal close={vi.fn()} errorCode={errorCode} />);
    expect(screen.getByText(expectedMessage)).toBeVisible();
  });

  it('uses the health-worker-not-found message for an absent or unrecognized error code', () => {
    const { rerender } = render(<HWREmptyModal close={vi.fn()} />);
    const defaultMessage =
      'The health worker records could not be found in Health Worker registry, do you want to continue to create an account';

    expect(screen.getByText(defaultMessage)).toBeVisible();

    rerender(<HWREmptyModal close={vi.fn()} errorCode="UNRECOGNIZED" />);
    expect(screen.getByText(defaultMessage)).toBeVisible();
  });

  it('closes the modal when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(<HWREmptyModal close={close} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(close).toHaveBeenCalledOnce();
  });

  it('closes the modal when registration is continued', async () => {
    const user = userEvent.setup();
    const close = vi.fn();
    render(<HWREmptyModal close={close} />);

    await user.click(screen.getByRole('button', { name: 'Continue to registration' }));

    expect(close).toHaveBeenCalledOnce();
  });
});
