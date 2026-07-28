import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { type Drug } from '@openmrs/esm-patient-common-lib';
import { useBillableItem, useDrugQuantityByConceptUuid } from '../useBillableItem';
import DrugOrder from './drug-order.component';

const mockUseBillableItem = useBillableItem as vi.MockedFunction<typeof useBillableItem>;
const mockUseDrugQuantityByConceptUuid = useDrugQuantityByConceptUuid as vi.MockedFunction<
  typeof useDrugQuantityByConceptUuid
>;

vi.mock('../useBillableItem', () => ({
  useBillableItem: vi.fn(),
  useDrugQuantityByConceptUuid: vi.fn(),
}));

vi.mock('../../../helpers/currency', () => ({
  useCurrencyFormatting: () => ({ format: (value: number) => `$${value}` }),
}));

const mockDrug = {
  uuid: 'drug-uuid-123',
  concept: {
    uuid: 'concept-uuid-456',
    display: 'Paracetamol',
  },
} as Drug;

describe('<DrugOrder />', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockUseBillableItem.mockReturnValue({ billableItem: undefined, isLoading: false, error: undefined });
    mockUseDrugQuantityByConceptUuid.mockReturnValue({
      quantity: 10,
      quantityUoM: 'Tablet',
      isLoading: false,
      error: undefined,
    });
  });

  test('should query drug quantity using the concept uuid, not the display name', () => {
    render(<DrugOrder drug={mockDrug} />);
    expect(mockUseDrugQuantityByConceptUuid).toHaveBeenCalledWith('concept-uuid-456');
    expect(mockUseDrugQuantityByConceptUuid).not.toHaveBeenCalledWith('Paracetamol');
  });

  test('should render an empty string when the drug has no concept uuid', () => {
    render(<DrugOrder drug={{ uuid: 'drug-uuid-123' } as Drug} />);
    expect(mockUseDrugQuantityByConceptUuid).toHaveBeenCalledWith('');
  });

  test('should display the correct number of drugs available in stock', () => {
    render(<DrugOrder drug={mockDrug} />);

    expect(screen.getByText('In Stock')).toBeInTheDocument();
    expect(screen.getByText('10 Tablet(s)')).toBeInTheDocument();
  });

  test('should display the service price for each payment mode', () => {
    mockUseBillableItem.mockReturnValue({
      billableItem: {
        uuid: 'billable-uuid-789',
        name: 'Paracetamol',
        concept: { uuid: 'concept-uuid-456', display: 'Paracetamol' },
        servicePrices: [
          { uuid: 'price-uuid-1', price: 50, paymentMode: { uuid: 'cash-uuid', name: 'Cash' } },
          { uuid: 'price-uuid-2', price: 75, paymentMode: { uuid: 'insurance-uuid', name: 'Insurance' } },
        ],
      },
      isLoading: false,
      error: undefined,
    });

    render(<DrugOrder drug={mockDrug} />);

    expect(screen.getByText('Cash')).toBeInTheDocument();
    expect(screen.getByText('$50')).toBeInTheDocument();
    expect(screen.getByText('Insurance')).toBeInTheDocument();
    expect(screen.getByText('$75')).toBeInTheDocument();
  });

  test('should render a loading indicator while inventory is loading', () => {
    mockUseDrugQuantityByConceptUuid.mockReturnValue({
      quantity: 0,
      quantityUoM: '',
      isLoading: true,
      error: undefined,
    });

    render(<DrugOrder drug={mockDrug} />);

    expect(screen.getByText('Loading drug prices and stock level info')).toBeInTheDocument();
    expect(screen.queryByText('In Stock')).not.toBeInTheDocument();
  });

  test('should render out of stock message when no drugs are available', () => {
    mockUseDrugQuantityByConceptUuid.mockReturnValue({
      quantity: 0,
      quantityUoM: '',
      isLoading: false,
      error: undefined,
    });

    render(<DrugOrder drug={mockDrug} />);

    expect(screen.getByText('Drug Is Not Available / Out of Stock')).toBeInTheDocument();
    expect(screen.queryByText('In Stock')).not.toBeInTheDocument();
  });
});
