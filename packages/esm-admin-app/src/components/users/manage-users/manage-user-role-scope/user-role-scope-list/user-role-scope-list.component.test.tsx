import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { restBaseUrl, showModal, showSnackbar } from '@openmrs/esm-framework';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deleteUserRoleScopes, handleMutation, useUserRoleScopes } from '../../../../../user-management.resources';
import { type User, type UserRoleScope } from '../../../../../types';
import StockUserRoleScopesList from './user-role-scope-list.component';

vi.mock('../../../../../user-management.resources', () => ({
  deleteUserRoleScopes: vi.fn(),
  handleMutation: vi.fn(),
  useUserRoleScopes: vi.fn(),
}));

const user = {
  uuid: 'user-1',
  username: 'alice',
  roles: [],
} as User;

const roleScope: UserRoleScope = {
  uuid: 'scope-1',
  userUuid: 'user-1',
  role: 'Inventory Clerk',
  permanent: true,
  enabled: true,
  locations: [
    { locationUuid: 'location-1', locationName: 'Main Store', enableDescendants: true },
    { locationUuid: 'location-2', locationName: 'Pharmacy', enableDescendants: false },
  ],
  operationTypes: [
    { operationTypeUuid: 'operation-1', operationTypeName: 'Stock Issue' },
    { operationTypeUuid: 'operation-2', operationTypeName: 'Stock Receipt' },
  ],
};

const mockUseUserRoleScopes = vi.mocked(useUserRoleScopes);
const mockDeleteUserRoleScopes = vi.mocked(deleteUserRoleScopes);
const mockHandleMutation = vi.mocked(handleMutation);
const mockShowModal = vi.mocked(showModal);
const mockShowSnackbar = vi.mocked(showSnackbar);

describe('StockUserRoleScopesList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUserRoleScopes.mockReturnValue({
      items: { results: [roleScope], totalCount: 1 },
      loadingRoleScope: false,
      userRoleScopeError: undefined,
      isValidating: false,
    });
    mockShowModal.mockReturnValue(vi.fn());
  });

  it('shows a skeleton while role scopes are loading', () => {
    mockUseUserRoleScopes.mockReturnValue({
      items: undefined,
      loadingRoleScope: true,
      userRoleScopeError: undefined,
      isValidating: false,
    });

    const { container } = render(<StockUserRoleScopesList user={user} />);
    expect(container.querySelector('.cds--skeleton')).toBeInTheDocument();
  });

  it('renders only the selected user role scopes', () => {
    mockUseUserRoleScopes.mockReturnValue({
      items: {
        results: [roleScope, { ...roleScope, uuid: 'scope-2', userUuid: 'another-user', role: 'Hidden Role' }],
        totalCount: 2,
      },
      loadingRoleScope: false,
      userRoleScopeError: undefined,
      isValidating: true,
    });

    render(<StockUserRoleScopesList user={user} />);

    expect(screen.getByRole('table', { name: 'user role scope table' })).toBeVisible();
    expect(screen.getByText('Inventory Clerk')).toBeVisible();
    expect(screen.getByText('Main Store')).toBeVisible();
    expect(screen.getByText('Pharmacy')).toBeVisible();
    expect(screen.getByText('Stock Issue, Stock Receipt')).toBeVisible();
    expect(screen.getAllByText('Yes')).toHaveLength(2);
    expect(screen.queryByText('Hidden Role')).not.toBeInTheDocument();
    expect(screen.getByText('Refreshing user scopes...')).toBeVisible();
  });

  it('shows an empty state when the user has no role scopes', () => {
    mockUseUserRoleScopes.mockReturnValue({
      items: { results: [], totalCount: 0 },
      loadingRoleScope: false,
      userRoleScopeError: undefined,
      isValidating: false,
    });

    render(<StockUserRoleScopesList user={user} />);
    expect(screen.getByRole('heading', { name: 'User Role Scope' })).toBeVisible();
    expect(screen.queryByText('Inventory Clerk')).not.toBeInTheDocument();
  });

  it('passes the selected scope to the edit callback', async () => {
    const userEventInstance = userEvent.setup();
    const onEditUserRoleScope = vi.fn();
    render(<StockUserRoleScopesList user={user} onEditUserRoleScope={onEditUserRoleScope} />);

    await userEventInstance.click(screen.getByRole('button', { name: 'Options' }));
    await userEventInstance.click(await screen.findByText('Edit'));

    expect(onEditUserRoleScope).toHaveBeenCalledWith(roleScope);
  });

  it('deletes a role scope and refreshes the list after confirmation', async () => {
    const userEventInstance = userEvent.setup();
    mockDeleteUserRoleScopes.mockResolvedValue({} as Awaited<ReturnType<typeof deleteUserRoleScopes>>);
    render(<StockUserRoleScopesList user={user} />);

    await userEventInstance.click(screen.getByRole('button', { name: 'Options' }));
    await userEventInstance.click(await screen.findByText('Delete'));

    expect(mockShowModal).toHaveBeenCalledWith(
      'delete-stock-user-scope-modal',
      expect.objectContaining({ uuid: 'scope-1', onConfirmation: expect.any(Function) }),
    );
    const [, modalProps] = mockShowModal.mock.calls[0] as [string, { onConfirmation: () => void }];

    await act(async () => modalProps.onConfirmation());

    expect(mockDeleteUserRoleScopes).toHaveBeenCalledWith(['scope-1']);
    expect(mockHandleMutation).toHaveBeenCalledWith(`${restBaseUrl}/stockmanagement/userrolescope`);
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'success', subtitle: 'Stock User Scope Deleted Successfully' }),
    );
  });

  it('shows an error notification when deletion fails', async () => {
    const userEventInstance = userEvent.setup();
    mockDeleteUserRoleScopes.mockRejectedValue(new Error('Delete failed'));
    render(<StockUserRoleScopesList user={user} />);

    await userEventInstance.click(screen.getByRole('button', { name: 'Options' }));
    await userEventInstance.click(await screen.findByText('Delete'));
    const [, modalProps] = mockShowModal.mock.calls[0] as [string, { onConfirmation: () => void }];

    await act(async () => modalProps.onConfirmation());

    expect(mockHandleMutation).not.toHaveBeenCalled();
    expect(mockShowSnackbar).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'error', subtitle: 'Delete failed' }),
    );
  });
});
