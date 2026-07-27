import React from 'react';
import { render, screen } from '@testing-library/react';
import BillHistory from './bill-history.component';
import { useBills } from '../billing.resource';
import userEvent from '@testing-library/user-event';
import { useLaunchWorkspaceRequiringVisit } from '@openmrs/esm-patient-common-lib';

const testProps = {
  patientUuid: 'some-uuid',
};

const mockbills = useBills as vi.MockedFunction<typeof useBills>;
const mockUseLaunchWorkspaceRequiringVisit = useLaunchWorkspaceRequiringVisit as vi.MockedFunction<
  typeof useLaunchWorkspaceRequiringVisit
>;

const mockBillsData = [
  { uuid: '1', patientName: 'John Doe', identifier: '12345678', billingService: 'Checkup', totalAmount: 500 },
  { uuid: '2', patientName: 'John Doe', identifier: '12345678', billingService: 'Consulatation', totalAmount: 600 },
  { uuid: '3', patientName: 'John Doe', identifier: '12345678', billingService: 'Child services', totalAmount: 700 },
  { uuid: '4', patientName: 'John Doe', identifier: '12345678', billingService: 'Medication', totalAmount: 800 },
  { uuid: '5', patientName: 'John Doe', identifier: '12345678', billingService: 'Lab', totalAmount: 900 },
  { uuid: '6', patientName: 'John Doe', identifier: '12345678', billingService: 'Pharmacy', totalAmount: 400 },
  { uuid: '7', patientName: 'John Doe', identifier: '12345678', billingService: 'Nutrition', totalAmount: 300 },
  { uuid: '8', patientName: 'John Doe', identifier: '12345678', billingService: 'Physiotherapy', totalAmount: 200 },
  { uuid: '9', patientName: 'John Doe', identifier: '12345678', billingService: 'Dentist', totalAmount: 1100 },
  { uuid: '10', patientName: 'John Doe', identifier: '12345678', billingService: 'Neuro', totalAmount: 1200 },
  { uuid: '11', patientName: 'John Doe', identifier: '12345678', billingService: 'Outpatient', totalAmount: 1050 },
  { uuid: '12', patientName: 'John Doe', identifier: '12345678', billingService: 'MCH', totalAmount: 1300 },
];

vi.mock('../invoice/invoice-table.component', () => ({
  default: vi.fn(() => <div>Invoice table</div>),
}));

vi.mock('../billing.resource', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../billing.resource')>()),
  useBills: vi.fn(() => ({
    bills: mockBillsData,
    isLoading: false,
    isValidating: false,
    error: null,
  })),
}));

vi.mock('@openmrs/esm-patient-common-lib', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@openmrs/esm-patient-common-lib')>()),
  useLaunchWorkspaceRequiringVisit: vi.fn(),
}));

describe('BillHistory', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should render loading datatable skeleton', () => {
    mockbills.mockReturnValueOnce({ isLoading: true, isValidating: false, error: null, bills: [], mutate: vi.fn() });
    render(<BillHistory {...testProps} />);
    const loadingSkeleton = screen.getByRole('table');
    expect(loadingSkeleton).toBeInTheDocument();
    expect(loadingSkeleton).toHaveClass('cds--skeleton cds--data-table cds--data-table--zebra');
  });

  test('should render error state when API call fails', () => {
    mockbills.mockReturnValueOnce({
      isLoading: false,
      isValidating: false,
      error: new Error('some error'),
      bills: [],
      mutate: vi.fn(),
    });
    render(<BillHistory {...testProps} />);
    const errorState = screen.getByText('Error State');
    expect(errorState).toBeInTheDocument();
  });

  test('should render bills table', async () => {
    const user = userEvent.setup();
    mockbills.mockReturnValueOnce({
      isLoading: false,
      isValidating: false,
      error: null,
      bills: mockBillsData as any,
      mutate: vi.fn(),
    });
    render(<BillHistory {...testProps} />);
    expect(screen.getByText('Visit time')).toBeInTheDocument();
    expect(screen.getByText('Identifier')).toBeInTheDocument();
    const expectedColumnHeaders = [/Visit time/, /Identifier/, /Billed Items/, /Bill total/];
    expectedColumnHeaders.forEach((header) => {
      expect(screen.getByRole('button', { name: header })).toBeInTheDocument();
    });

    const tableRowGroup = screen.getAllByRole('rowgroup');
    expect(tableRowGroup).toHaveLength(2);

    // Page navigation should work as expected
    const nextPageButton = screen.getByRole('button', { name: /Next page/ });
    const prevPageButton = screen.getByRole('button', { name: /Previous page/ });

    expect(nextPageButton).toBeInTheDocument();
    expect(prevPageButton).toBeInTheDocument();

    expect(screen.getByText(/1–10 of 12 items/)).toBeInTheDocument();
    await user.click(nextPageButton);
    expect(screen.getByText(/11–12 of 12 items/)).toBeInTheDocument();
    await user.click(prevPageButton);
    expect(screen.getByText(/1–10 of 12 items/)).toBeInTheDocument();

    // clicking the row should expand the row
    const expandAllRowButton = screen.getByRole('button', { name: /Expand all rows/ });
    expect(expandAllRowButton).toBeInTheDocument();
    await user.click(expandAllRowButton);
  });

  test('should render empty state view when there are no bills', async () => {
    mockbills.mockReturnValueOnce({ isLoading: false, isValidating: false, error: null, bills: [], mutate: vi.fn() });
    render(<BillHistory {...testProps} />);
  });
});
