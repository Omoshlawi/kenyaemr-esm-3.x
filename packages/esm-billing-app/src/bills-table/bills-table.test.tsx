import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { usePaginatedBills } from '../billing.resource';
import BillsTable from './bills-table.component';
import userEvent from '@testing-library/user-event';

const mockbills = usePaginatedBills as vi.Mock;

const mockBillsData = [
  { uuid: '1', patientName: 'John Doe', identifier: '12345678', visitType: 'Checkup', patientUuid: 'uuid1' },
  { uuid: '2', patientName: 'Mary Smith', identifier: '98765432', visitType: 'Wake up', patientUuid: 'uuid2' },
];

vi.mock('../billing.resource', () => ({
  paginatedBillRep: 'custom:(uuid,dateCreated,lineItems,patient:(uuid,display),status)',
  usePaginatedBills: vi.fn(() => ({
    bills: mockBillsData,
    isLoading: false,
    isValidating: false,
    error: null,
    pagination: { goTo: vi.fn(), currentPage: 1, totalCount: 0 },
  })),
}));

vi.mock('@openmrs/esm-patient-common-lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-patient-common-lib')>()),
  usePaginationInfo: () => ({ pageSizes: [10] }),
}));

describe('BillsTable', () => {
  let user;

  beforeEach(() => {
    user = userEvent.setup();
    mockbills.mockReturnValue({
      bills: mockBillsData,
      isLoading: false,
      isValidating: false,
      error: null,
      pagination: { goTo: vi.fn(), currentPage: 1, totalCount: 0 },
    });
  });

  it.skip('renders data table with pending bills', () => {
    render(<BillsTable />);

    expect(screen.getByText('Visit time')).toBeInTheDocument();
    expect(screen.getByText('Identifier')).toBeInTheDocument();
    const expectedColumnHeaders = [/Visit time/, /Identifier/, /Name/, /Billing service/];
    expectedColumnHeaders.forEach((header) => {
      expect(screen.getByRole('columnheader', { name: new RegExp(header, 'i') })).toBeInTheDocument();
    });

    const patientNameLink = screen.getByText('John Doe');
    expect(patientNameLink).toBeInTheDocument();
    expect(patientNameLink.tagName).toBe('A');
  });

  it('displays empty state when there are no bills', () => {
    mockbills.mockImplementation(() => ({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: null,
      pagination: { goTo: vi.fn(), currentPage: 1, totalCount: 0 },
    }));

    render(<BillsTable />);

    expect(screen.getByText(/there are no bills to display/i)).toBeInTheDocument();
  });

  it('should not display the table when the data is loading', () => {
    mockbills.mockImplementation(() => ({
      bills: [],
      isLoading: true,
      isValidating: false,
      error: null,
      pagination: { goTo: vi.fn(), currentPage: 1, totalCount: 0 },
    }));

    render(<BillsTable />);

    const expectedColumnHeaders = [/Visit time/, /Identifier/, /Name/, /Billing service/, /Department/];
    expectedColumnHeaders.forEach((header) => {
      expect(screen.queryByRole('columnheader', { name: new RegExp(header, 'i') })).not.toBeInTheDocument();
    });
  });

  it('should display the error state when there is error', () => {
    mockbills.mockImplementation(() => ({
      bills: [],
      isLoading: false,
      isValidating: false,
      error: 'Error in fetching data',
      pagination: { goTo: vi.fn(), currentPage: 1, totalCount: 0 },
    }));

    render(<BillsTable />);

    expect(screen.getByText(/Error State/i)).toBeInTheDocument();
  });

  test('should filter bills by search term and bill payment status', async () => {
    render(<BillsTable />);

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'John Doe');

    // Search is performed server-side, so the search term is forwarded to the query hook
    await waitFor(() =>
      expect(mockbills).toHaveBeenCalledWith(
        true,
        expect.objectContaining({ q: 'John Doe', billStatus: '', pageSize: 10 }),
      ),
    );

    // Should filter the table when bill payment status combobox is changed
    const billCategorySelect = screen.getAllByRole('combobox')[0];
    expect(billCategorySelect).toBeInTheDocument();
    await user.click(billCategorySelect, { name: 'All bills' });
    expect(mockbills).toHaveBeenCalledWith(true, expect.objectContaining({ billStatus: '', pageSize: 10 }));

    await user.click(screen.getByText('Pending bills'));
    expect(screen.getByText('Pending bills')).toBeInTheDocument();
    expect(mockbills).toHaveBeenCalledWith(true, expect.objectContaining({ billStatus: 'PENDING', pageSize: 10 }));
  });

  test('should show the loading spinner while retrieving data', () => {
    mockbills.mockImplementation(() => ({
      bills: [],
      isLoading: true,
      isValidating: false,
      error: null,
      pagination: { goTo: vi.fn(), currentPage: 1, totalCount: 0 },
    }));

    render(<BillsTable />);

    const dataTableSkeleton = screen.getByRole('table');
    expect(dataTableSkeleton).toBeInTheDocument();
    expect(dataTableSkeleton).toHaveClass('cds--skeleton cds--data-table cds--data-table--zebra');
  });

  test('should render patient name as a link', async () => {
    render(<BillsTable />);

    const patientNameLink = screen.getByRole('link', { name: 'John Doe' });
    expect(patientNameLink).toBeInTheDocument();
  });
});
