import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricsCards from './metrics-cards.component';
import { useBillSummary } from './metrics.resource';

const mockUseBillSummary = useBillSummary as vi.Mock;

vi.mock('./metrics.resource', () => ({
  useBillSummary: vi.fn(),
}));

vi.mock('../helpers/currency', () => ({
  useCurrencyFormatting: () => ({
    format: (amount: number) => (amount != null ? `KES ${Number(amount).toFixed(2)}` : 'KES 0.00'),
  }),
}));

const mockBillSummary = {
  totalBills: 1000,
  paidBills: 600,
  pendingBills: 300,
  exemptedBills: 100,
};

describe('MetricsCards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when data is loading', () => {
    mockUseBillSummary.mockReturnValue({ data: undefined, isLoading: true, error: null });
    render(<MetricsCards />);
    expect(screen.getByText(/Loading bill metrics.../i)).toBeInTheDocument();
  });

  it('renders error state when request fails', () => {
    mockUseBillSummary.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Internal server error'),
    });
    render(<MetricsCards />);
    expect(screen.getByText('Error State')).toBeInTheDocument();
  });

  it('renders metrics cards with bill summary data', () => {
    mockUseBillSummary.mockReturnValue({
      data: mockBillSummary,
      isLoading: false,
      error: null,
    });
    render(<MetricsCards />);
    expect(screen.getByText('Total Bills')).toBeInTheDocument();
    expect(screen.getByText('Paid Bills')).toBeInTheDocument();
    expect(screen.getByText('Pending Bills')).toBeInTheDocument();
    expect(screen.getByText('Exempted Bills')).toBeInTheDocument();
    expect(screen.getByText('KES 1000.00')).toBeInTheDocument();
    expect(screen.getByText('KES 600.00')).toBeInTheDocument();
    expect(screen.getByText('KES 300.00')).toBeInTheDocument();
    expect(screen.getByText('KES 100.00')).toBeInTheDocument();
  });
});
