import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteConfirmDialog from './delete-confirm-dialog.modal';

it('cancels or confirms pharmacy access revocation', async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  const onDelete = vi.fn();
  render(<DeleteConfirmDialog onClose={onClose} onDelete={onDelete} />);
  expect(screen.getByText('Warning!')).toBeVisible();
  expect(screen.getByText('Are you sure you want to revoke access?')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Cancel' }));
  await user.click(screen.getByRole('button', { name: 'Revoke' }));
  expect(onClose).toHaveBeenCalledOnce();
  expect(onDelete).toHaveBeenCalledOnce();
});
