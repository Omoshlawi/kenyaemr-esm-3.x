import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import { ServiceTypeFilter } from './service-type-filter.component';
import { usePaymentFilterContext } from '../usePaymentFilterContext';
import { mockBillingEndpoints, renderWithProviders } from '../test-utils';

const mockedFetch = openmrsFetch as unknown as ReturnType<typeof vi.fn>;

const FiltersProbe = () => {
  const { filters } = usePaymentFilterContext();
  return <div data-testid="selected-service-types">{filters.serviceTypes.join(',')}</div>;
};

describe('ServiceTypeFilter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sources options from the service concept, independent of any bills', async () => {
    mockBillingEndpoints();
    const user = userEvent.setup();
    renderWithProviders(<ServiceTypeFilter />);

    await user.click(await screen.findByRole('combobox'));

    expect(screen.getByText('Consultation')).toBeInTheDocument();
    expect(screen.getByText('Lab Test')).toBeInTheDocument();

    expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/concept/'));
    expect(mockedFetch).not.toHaveBeenCalledWith(expect.stringContaining('cashier/bill'));
  });

  it('writes the selected service-type uuid into the filter context', async () => {
    mockBillingEndpoints();
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ServiceTypeFilter />
        <FiltersProbe />
      </>,
    );

    await user.click(await screen.findByRole('combobox'));
    await user.click(screen.getByText('Consultation'));

    expect(screen.getByTestId('selected-service-types')).toHaveTextContent('st-1');
  });

  it('selecting "Select All" selects every service-type uuid', async () => {
    mockBillingEndpoints();
    const user = userEvent.setup();
    renderWithProviders(
      <>
        <ServiceTypeFilter />
        <FiltersProbe />
      </>,
    );

    await user.click(await screen.findByRole('combobox'));
    await user.click(screen.getByText('Select All'));

    expect(screen.getByTestId('selected-service-types')).toHaveTextContent('st-1,st-2');
  });

  it('renders nothing when the concept has no service types', async () => {
    mockBillingEndpoints({ serviceTypeSetMembers: [] });
    renderWithProviders(<ServiceTypeFilter />);

    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('/concept/')));
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });
});
