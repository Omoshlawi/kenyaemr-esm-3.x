import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import { CashierFilter } from './cashier-filter.component';
import { usePaymentFilterContext } from '../usePaymentFilterContext';
import { mockBillingEndpoints, renderWithProviders } from '../test-utils';

const mockedFetch = openmrsFetch as unknown as ReturnType<typeof vi.fn>;

const FiltersProbe = () => {
  const { filters } = usePaymentFilterContext();
  return <div data-testid="selected-cashiers">{filters.cashiers.join(',')}</div>;
};

describe('CashierFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sources options from the provider endpoint, independent of any bills', async () => {
    mockBillingEndpoints();
    const user = userEvent.setup();
    renderWithProviders(<CashierFilter />);

    await user.click(await screen.findByRole('combobox'));

    expect(screen.getByText('Jane Cashier')).toBeInTheDocument();
    expect(screen.getByText('Sam Clerk')).toBeInTheDocument();

    // options come from /provider, never from loading the bill list
    expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/provider'));
    expect(mockedFetch).not.toHaveBeenCalledWith(expect.stringContaining('cashier/bill'));
  });

  it('writes the selected provider uuid (not display) into the filter context', async () => {
    mockBillingEndpoints();
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <CashierFilter />
        <FiltersProbe />
      </>,
    );

    await user.click(await screen.findByRole('combobox'));
    await user.click(screen.getByText('Jane Cashier'));

    expect(screen.getByTestId('selected-cashiers')).toHaveTextContent('prov-1');
  });

  it('selecting "All Cashiers" selects every provider uuid', async () => {
    mockBillingEndpoints();
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <CashierFilter />
        <FiltersProbe />
      </>,
    );

    await user.click(await screen.findByRole('combobox'));
    await user.click(screen.getByText('All Cashiers'));

    expect(screen.getByTestId('selected-cashiers')).toHaveTextContent('prov-1,prov-2');
  });

  it('renders nothing when there are no providers', async () => {
    mockBillingEndpoints({ providers: [] });
    renderWithProviders(<CashierFilter />);

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/provider')));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
