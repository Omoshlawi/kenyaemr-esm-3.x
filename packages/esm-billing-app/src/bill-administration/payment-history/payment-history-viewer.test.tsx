import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { openmrsFetch } from '@openmrs/esm-framework';
import { exportToExcel } from '../../helpers/excelExport';
import { PaymentHistoryViewer } from './payment-history-viewer.component';
import { mockBillingEndpoints, paidBills, renderWithProviders } from './test-utils';

vi.mock('@openmrs/esm-api', async () => {
  const actual = await vi.importActual<any>('@openmrs/esm-api');
  const mock = await vi.importActual<any>('@openmrs/esm-api/mock');
  return { ...actual, openmrsFetch: mock.openmrsFetch };
});

vi.mock('../../helpers/excelExport', () => ({
  exportToExcel: vi.fn(),
}));

const mockedFetch = openmrsFetch as unknown as ReturnType<typeof vi.fn>;
const mockedExport = exportToExcel as unknown as ReturnType<typeof vi.fn>;

describe('PaymentHistoryViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders one row per paid bill with the human-readable service name and formatted total', async () => {
    mockBillingEndpoints();
    renderWithProviders(<PaymentHistoryViewer />);

    expect(await screen.findByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('MRN001')).toBeInTheDocument();
    expect(screen.getByText('Mary Smith')).toBeInTheDocument();

    // extractServiceName strips the "svc-1:" uuid prefix off the billableService
    expect(screen.getByText('Consultation')).toBeInTheDocument();
    expect(screen.getByText('Lab Test')).toBeInTheDocument();

    // totals are currency-formatted from the summed payments
    expect(screen.getByText(/500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/1,200\.00/)).toBeInTheDocument();

    // reference code comes from the payment attribute
    expect(screen.getByText(/REF-100/)).toBeInTheDocument();
  });

  it('shows the empty state when the bill endpoint returns no results', async () => {
    mockBillingEndpoints({ bills: [], billsTotalCount: 0 });
    renderWithProviders(<PaymentHistoryViewer />);

    expect(await screen.findByText('No transaction history')).toBeInTheDocument();
  });

  it('drives pagination from the server: navigating pages refetches with a new startIndex', async () => {
    const user = userEvent.setup();
    mockBillingEndpoints({ billsTotalCount: 25 });
    renderWithProviders(<PaymentHistoryViewer />);

    await screen.findByText('John Doe');

    // first page fetched with startIndex=0
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('startIndex=0')));

    await user.click(screen.getByRole('button', { name: /next page/i }));

    // navigating to page 2 refetches the bill list from the server (startIndex=10), not client slicing
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('startIndex=10')));
  });

  it('maps applied filters into bill query params (payment-method names resolved to uuids)', async () => {
    mockBillingEndpoints();
    renderWithProviders(<PaymentHistoryViewer />, {
      initialFilters: { paymentMethods: ['Cash'], cashiers: ['prov-1'], serviceTypes: ['st-1'] },
    });

    await screen.findByText('John Doe');

    await waitFor(() => {
      const billCall = mockedFetch.mock.calls
        .map((call) => String(call[0]))
        .find((url) => url.includes('cashier/bill') && url.includes('paymentModeUuid'));
      expect(billCall).toBeDefined();
      expect(billCall).toContain('cashierUuid=prov-1');
      expect(billCall).toContain('serviceTypeUuid=st-1');
      expect(billCall).toContain('paymentModeUuid=pm-1');
    });
  });

  it('exports the full filtered set (not just the current page) via exportToExcel', async () => {
    const user = userEvent.setup();
    mockBillingEndpoints({ billsTotalCount: 25 });
    renderWithProviders(<PaymentHistoryViewer />);

    await screen.findByText('John Doe');
    await user.click(screen.getByRole('button', { name: /download/i }));

    // export pulls the whole set in one request (limit=10000)
    await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith(expect.stringContaining('limit=10000')));

    await waitFor(() => expect(mockedExport).toHaveBeenCalledTimes(1));
    const [rows] = mockedExport.mock.calls[0];
    expect(rows).toHaveLength(paidBills.length);
    expect(rows.map((row: { 'Patient Name': string }) => row['Patient Name'])).toEqual(
      expect.arrayContaining(['John Doe', 'Mary Smith']),
    );
  });
});
