import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { openmrsFetch } from '@openmrs/esm-framework';
import PaymentMethodDistribution from './payment-method-distribution.component';
import { mockBillingEndpoints, renderWithProviders } from './test-utils';

const mockedFetch = openmrsFetch as unknown as ReturnType<typeof vi.fn>;

describe('PaymentMethodDistribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the payment-mode breakdown from the server aggregation endpoint', async () => {
    mockBillingEndpoints();
    renderWithProviders(<PaymentMethodDistribution />);

    expect(await screen.findByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('MPESA')).toBeInTheDocument();
    expect(screen.getByText(/500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/1,200\.00/)).toBeInTheDocument();

    // totals come from the aggregation endpoint, not from paging the bill list client-side
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('billPaymentModeSummary')));
    expect(mockedFetch).not.toHaveBeenCalledWith(expect.stringContaining('cashier/bill?'));
  });

  it('shows the empty state when the aggregation endpoint returns nothing', async () => {
    mockBillingEndpoints({ paymentModeSummary: [] });
    renderWithProviders(<PaymentMethodDistribution />);

    expect(await screen.findByText('No payment modes found')).toBeInTheDocument();
  });

  it('passes applied filters into the aggregation query (names resolved to uuids)', async () => {
    mockBillingEndpoints();
    renderWithProviders(<PaymentMethodDistribution />, {
      initialFilters: { paymentMethods: ['Cash'], cashiers: ['prov-1'], serviceTypes: ['st-1'] },
    });

    await screen.findByText('Cash');

    await waitFor(() => {
      const summaryCall = mockedFetch.mock.calls
        .map((call) => String(call[0]))
        .find((url) => url.includes('billPaymentModeSummary') && url.includes('paymentModeUuid'));
      expect(summaryCall).toBeDefined();
      expect(summaryCall).toContain('cashierUuid=prov-1');
      expect(summaryCall).toContain('serviceTypeUuid=st-1');
      expect(summaryCall).toContain('paymentModeUuid=pm-1');
    });
  });
});
