import React, { ReactElement, ReactNode, useState } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SWRConfig } from 'swr';
import dayjs from 'dayjs';
import { openmrsFetch } from '@openmrs/esm-framework';
import { Filter, PatientInvoice, Timesheet } from '../../types';
import { PaymentFilterContext } from './usePaymentFilterContext';

/**
 * Test-only helpers for the payment-history feature.
 *
 * Philosophy: mock ONLY the network boundary (`openmrsFetch`) and let every real hook / SWR run.
 * Components are rendered inside a fresh SWR cache (so state does not bleed between tests) and a
 * seedable copy of the real PaymentFilterContext value.
 */

const mockedOpenmrsFetch = openmrsFetch as unknown as ReturnType<typeof vi.fn>;

export interface FetchRoute {
  /** Substring matched against the request URL. First match in array order wins. */
  match: string;
  /** The payload returned as `{ data: response }`. */
  response: unknown;
}

/**
 * Points `openmrsFetch` at an ordered list of routes. Routes are matched by URL substring in order,
 * so put the most specific path first (e.g. `billPaymentModeSummary` before `bill`). Unmatched URLs
 * resolve to an empty result set instead of the default hanging promise.
 */
export const setFetchRoutes = (routes: Array<FetchRoute>) => {
  mockedOpenmrsFetch.mockImplementation((url: string) => {
    const route = routes.find((r) => url.includes(r.match));
    return Promise.resolve({ data: route ? route.response : { results: [] } });
  });
};

/**
 * Convenience wrapper that wires up every endpoint the payment-history screens touch. Order matters:
 * `billPaymentModeSummary` is matched before `cashier/bill`, and `billPaymentModeSummary` before
 * `paymentMode`.
 */
export const mockBillingEndpoints = (
  overrides: {
    bills?: Array<PatientInvoice>;
    billsTotalCount?: number;
    billsLinks?: Array<{ rel: 'prev' | 'next'; uri: string }>;
    providers?: Array<{ uuid: string; display: string }>;
    paymentModes?: Array<{ uuid: string; name: string }>;
    serviceTypeSetMembers?: Array<{ uuid: string; display: string; id: number }>;
    paymentModeSummary?: Array<{ paymentModeUuid: string; paymentMode: string; total: number }>;
  } = {},
) => {
  const {
    bills = paidBills,
    billsTotalCount = bills.length,
    billsLinks = [],
    providers = mockProviders,
    paymentModes = mockPaymentModes,
    serviceTypeSetMembers = mockServiceTypeSetMembers,
    paymentModeSummary = mockPaymentModeSummary,
  } = overrides;

  setFetchRoutes([
    { match: 'billPaymentModeSummary', response: { results: paymentModeSummary } },
    { match: '/provider', response: { results: providers } },
    { match: '/concept/', response: { setMembers: serviceTypeSetMembers } },
    { match: 'cashier/paymentMode', response: { results: paymentModes } },
    { match: 'cashier/bill', response: { results: bills, links: billsLinks, totalCount: billsTotalCount } },
  ]);
};

interface TestFilterProviderProps {
  children: ReactNode;
  initialFilters?: Filter;
  initialDateRange?: [Date, Date];
}

const defaultFilters: Filter = { paymentMethods: [], cashiers: [], serviceTypes: [] };
const defaultDateRange: [Date, Date] = [dayjs().startOf('day').toDate(), dayjs().endOf('day').toDate()];

/**
 * A seedable stand-in for PaymentFilterProvider. It supplies the REAL context shape backed by real
 * `useState`, so `setFilters` works for interaction tests while `initialFilters` lets URL-assertion
 * tests preset the state. This is legitimate setup, not hook mocking.
 */
export const TestFilterProvider = ({ children, initialFilters, initialDateRange }: TestFilterProviderProps) => {
  const [filters, setFilters] = useState<Filter>(initialFilters ?? defaultFilters);
  const [dateRange, setDateRange] = useState<[Date, Date]>(initialDateRange ?? defaultDateRange);
  const [appliedFilters, setAppliedFilters] = useState<string[]>([]);
  const [appliedTimesheet, setAppliedTimesheet] = useState<Timesheet | undefined>(undefined);

  const value = {
    dateRange,
    setDateRange,
    appliedFilters,
    setAppliedFilters,
    appliedTimesheet,
    setAppliedTimesheet,
    resetFilters: () => {
      setAppliedFilters([]);
      setAppliedTimesheet(undefined);
    },
    getAllAppliedFilters: () => appliedFilters,
    filters,
    setFilters,
  };

  return <PaymentFilterContext.Provider value={value}>{children}</PaymentFilterContext.Provider>;
};

export const renderWithProviders = (
  ui: ReactElement,
  options: {
    initialFilters?: Filter;
    initialDateRange?: [Date, Date];
    renderOptions?: Omit<RenderOptions, 'wrapper'>;
  } = {},
) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <TestFilterProvider initialFilters={options.initialFilters} initialDateRange={options.initialDateRange}>
        {children}
      </TestFilterProvider>
    </SWRConfig>
  );

  return render(ui, { wrapper: Wrapper, ...options.renderOptions });
};

// ----- Fixtures -----

export const mockProviders = [
  { uuid: 'prov-1', display: 'Jane Cashier' },
  { uuid: 'prov-2', display: 'Sam Clerk' },
];

export const mockPaymentModes = [
  { uuid: 'pm-1', name: 'Cash' },
  { uuid: 'pm-2', name: 'MPESA' },
];

export const mockServiceTypeSetMembers = [
  { uuid: 'st-1', display: 'Consultation', id: 1 },
  { uuid: 'st-2', display: 'Lab Test', id: 2 },
];

export const mockPaymentModeSummary = [
  { paymentModeUuid: 'pm-1', paymentMode: 'Cash', total: 500 },
  { paymentModeUuid: 'pm-2', paymentMode: 'MPESA', total: 1200 },
];

export const paidBills = [
  {
    id: 1,
    uuid: 'bill-1',
    patient: { uuid: 'pt-1', display: 'MRN001-John Doe' },
    status: 'PAID',
    receiptNumber: 'RC-1',
    cashier: { uuid: 'prov-1', display: 'Jane Cashier' },
    cashPoint: { uuid: 'cp-1', name: 'Main', location: { display: 'Hospital' } },
    dateCreated: '2026-07-20T10:00:00.000+0300',
    lineItems: [
      {
        uuid: 'li-1',
        voided: false,
        item: '',
        billableService: '11111111-1111-1111-1111-111111111111:Consultation',
        quantity: 1,
        price: 500,
        paymentStatus: 'PAID',
        serviceTypeUuid: 'st-1',
      },
    ],
    payments: [
      {
        uuid: 'pay-1',
        amountTendered: 500,
        instanceType: { uuid: 'pm-1', name: 'Cash' },
        dateCreated: '2026-07-20T10:05:00.000+0300',
        attributes: [{ value: 'REF-100', attributeType: { description: 'Reference Number' } }],
      },
    ],
    display: 'RC-1',
    balance: 0,
    totalPayments: 500,
    totalDeposits: 0,
    totalExempted: 0,
    closed: false,
  },
  {
    id: 2,
    uuid: 'bill-2',
    patient: { uuid: 'pt-2', display: 'MRN002-Mary Smith' },
    status: 'PAID',
    receiptNumber: 'RC-2',
    cashier: { uuid: 'prov-2', display: 'Sam Clerk' },
    cashPoint: { uuid: 'cp-1', name: 'Main', location: { display: 'Hospital' } },
    dateCreated: '2026-07-21T09:00:00.000+0300',
    lineItems: [
      {
        uuid: 'li-2',
        voided: false,
        item: '',
        billableService: '22222222-2222-2222-2222-222222222222:Lab Test',
        quantity: 1,
        price: 1200,
        paymentStatus: 'PAID',
        serviceTypeUuid: 'st-2',
      },
    ],
    payments: [
      {
        uuid: 'pay-2',
        amountTendered: 1200,
        instanceType: { uuid: 'pm-2', name: 'MPESA' },
        dateCreated: '2026-07-21T09:05:00.000+0300',
        attributes: [],
      },
    ],
    display: 'RC-2',
    balance: 0,
    totalPayments: 1200,
    totalDeposits: 0,
    totalExempted: 0,
    closed: false,
  },
] as unknown as Array<PatientInvoice>;
