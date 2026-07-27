import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteBillableServiceModal from './delete-billable-service.modal';
import { deleteBillableService } from '../../service-catalog/billable-service.resource';
import { showSnackbar } from '@openmrs/esm-framework';
import type { ChargeAble } from '../../service-catalog/charge-summary.resource';

vi.mock('../../service-catalog/billable-service.resource', () => ({
  deleteBillableService: vi.fn(),
}));
vi.mock('@openmrs/esm-framework', () => ({
  showSnackbar: vi.fn(),
  restBaseUrl: 'http://fake-api',
}));
vi.mock('swr', () => ({
  mutate: vi.fn(),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultText: string) => defaultText,
  }),
}));

describe('<DeleteBillableServiceModal />', () => {
  const fullItem: ChargeAble = {
    uuid: '123',
    name: 'Test Service',
    shortName: 'TS',
    serviceStatus: 'ENABLED',
    stockItem: 'stock',
    serviceType: { uuid: 'st-1', display: 'Service Type' },
    servicePrices: [{ uuid: 'sp-1', name: 'Standard Price', price: 100 }],
    concept: { uuid: 'c-1', display: 'Concept Display' },
  };
  const closeModal = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header, message, and both buttons', () => {
    render(<DeleteBillableServiceModal closeModal={closeModal} chargeableItem={fullItem} />);

    expect(screen.getByText('Delete Chargeable Item')).toBeInTheDocument();
    expect(screen.getByText(`Are you sure you want to delete the chargeable item {{name}}?`)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Delete/ })).toBeEnabled();
  });

  it('invokes closeModal when cancel is clicked', async () => {
    render(<DeleteBillableServiceModal closeModal={closeModal} chargeableItem={fullItem} />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(closeModal).toHaveBeenCalledTimes(1);
  });

  it('performs delete flow and shows success snackbar', async () => {
    (deleteBillableService as vi.Mock).mockResolvedValue(undefined);

    render(<DeleteBillableServiceModal closeModal={closeModal} chargeableItem={fullItem} />);

    const deleteBtn = screen.getByRole('button', { name: /Delete/ });
    await userEvent.click(deleteBtn);

    await waitFor(() => {
      expect(deleteBillableService).toHaveBeenCalledWith(fullItem.uuid);
      expect(showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Chargeable item deleted successfully',
          kind: 'success',
        }),
      );

      expect(closeModal).toHaveBeenCalled();
    });

    // button re-enabled
    expect(screen.getByRole('button', { name: /Delete/ })).toBeEnabled();
  });

  it('shows error snackbar on delete failure', async () => {
    (deleteBillableService as vi.Mock).mockRejectedValue(new Error('failure'));

    render(<DeleteBillableServiceModal closeModal={closeModal} chargeableItem={fullItem} />);

    await userEvent.click(screen.getByRole('button', { name: /Delete/ }));

    await waitFor(() => {
      expect(showSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error deleting chargeable item',
          kind: 'error',
        }),
      );
      expect(closeModal).not.toHaveBeenCalled();
    });

    expect(screen.getByRole('button', { name: /Delete/ })).toBeEnabled();
  });
});
