import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type MockedFunction } from 'vitest';
import '@testing-library/jest-dom';
import { usePatientOrders } from '../../hooks/useOrders';
import ProceduresTabs from './procedures-tabs.component';
import type { fhir } from '@openmrs/esm-framework';

vi.mock('@openmrs/esm-framework', () => ({
  useConfig: vi.fn(() => ({
    proceduresConceptClassUuid: 'procedures-concept-class-uuid',
    imagingOrderTypeUuid: 'imaging-order-type-uuid',
  })),
  ExtensionSlot: () => <div data-testid="extension-slot" />,
}));

vi.mock('../../hooks/useOrders', () => ({
  usePatientOrders: vi.fn(),
}));

vi.mock('./procedures-table.component', () => ({
  default: () => <div data-testid="procedures-orders-table">Procedures Orders Table</div>,
}));

vi.mock('../anaesthetic/anaesthetic.component', () => ({
  default: () => <div data-testid="anaesthetic-tab-content">Anaesthetic Content</div>,
}));

const mockUsePatientOrders = usePatientOrders as MockedFunction<typeof usePatientOrders>;

describe('ProceduresTabs', () => {
  const mockPatient: fhir.Patient = {
    resourceType: 'Patient',
    id: 'test-patient-uuid',
    name: [{ given: ['John'], family: 'Doe' }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePatientOrders.mockReturnValue({
      data: [],
      isLoading: false,
      error: undefined,
      mutate: vi.fn(),
      isValidating: false,
    });
  });

  it('renders Orders, Results and Anaesthetic tabs', () => {
    render(<ProceduresTabs patientUuid="test-patient-uuid" patient={mockPatient} />);

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(3);
    expect(screen.getByRole('tab', { name: 'Orders' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Results' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Anaesthetic' })).toBeInTheDocument();
  });
});
