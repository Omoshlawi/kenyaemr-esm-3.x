import React, { type ComponentProps } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useConfig } from '@openmrs/esm-framework';
import { useBillableServiceByName } from '../../hooks/useBillableServices';
import { processBillItems } from '../../billing.resource';
import { type BillingService } from '../../types';
import BillingForm from './billing-form.component';

const PATIENT_UUID = '8673ee4f-e2ab-4077-ba55-4980f408773e';
const CASH_POINT_UUID = '54065383-b4d4-42d2-af4d-d250a1fd2590';
const CASHIER_UUID = '19e08924-4fbf-4c3f-9a5c-6f5f1bf0b3a1';
const CONSULTATION_UUID = '11111111-1111-4111-8111-111111111111';
const CONSULTATION_CASH_PRICE_UUID = 'aaaaaaa1-1111-4111-8111-111111111111';

const consultation: BillingService = {
  uuid: CONSULTATION_UUID,
  name: 'Paediatric Consultation',
  shortName: 'CONS-092',
  serviceStatus: 'ENABLED',
  serviceType: { display: 'Consultation' },
  servicePrices: [
    { uuid: CONSULTATION_CASH_PRICE_UUID, name: 'Cash', price: 150, paymentMode: { uuid: 'pm-cash', name: 'Cash' } },
    {
      uuid: 'aaaaaaa2-1111-4111-8111-111111111111',
      name: 'NHIF',
      price: 300,
      paymentMode: { uuid: 'pm-nhif', name: 'NHIF' },
    },
  ],
};

const paracetamol: BillingService = {
  uuid: '33333333-3333-4333-8333-333333333333',
  name: 'Paracetamol Syrup 100ml',
  shortName: 'PHARM-011',
  serviceStatus: 'ENABLED',
  serviceType: { display: 'Drug' },
  servicePrices: [],
};

const mockServices = [consultation, paracetamol];

vi.mock('../../hooks/useBillableServices', () => ({
  useBillableServiceByName: vi.fn(),
}));

vi.mock('../../billing.resource', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../billing.resource')>();
  return { ...actual, processBillItems: vi.fn() };
});

const mockUseBillableServiceByName = vi.mocked(useBillableServiceByName);
const mockUseConfig = vi.mocked(useConfig);
const mockProcessBillItems = vi.mocked(processBillItems);

function renderForm() {
  const closeWorkspace = vi.fn().mockResolvedValue(true);
  const props = {
    closeWorkspace,
    workspaceProps: { patientUuid: PATIENT_UUID },
    launchChildWorkspace: vi.fn(),
    windowProps: null,
    groupProps: null,
    workspaceName: 'billingForm',
    windowName: 'billing',
    isRootWorkspace: true,
    showActionMenu: false,
  } as unknown as ComponentProps<typeof BillingForm>;
  render(<BillingForm {...props} />);
  return { closeWorkspace, user: userEvent.setup() };
}

async function addConsultation(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('searchbox'), 'Paediatric');
  await user.click(await screen.findByRole('button', { name: /Paediatric Consultation/ }));
}

describe('BillingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfig.mockReturnValue({ cashPointUuid: CASH_POINT_UUID, cashierUuid: CASHIER_UUID } as any);
    mockProcessBillItems.mockResolvedValue({} as any);
    mockUseBillableServiceByName.mockImplementation((searchTerm: string) => ({
      isLoading: false,
      error: null,
      billableServices: searchTerm
        ? mockServices.filter((service) => service.name.toLowerCase().includes(searchTerm.toLowerCase()))
        : [],
    }));
  });

  it('starts with an empty bill and a disabled save button', () => {
    renderForm();

    expect(screen.getByText(/Billable Items \(0\)/)).toBeInTheDocument();
    expect(screen.getByText('Search and add billable items to create a bill')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save & close' })).toBeDisabled();
  });

  it('surfaces matching services as the user types', async () => {
    const { user } = renderForm();

    await user.type(screen.getByRole('searchbox'), 'Paediatric');

    expect(await screen.findByRole('button', { name: /Paediatric Consultation/ })).toBeInTheDocument();
  });

  it('reports when a search matches nothing', async () => {
    const { user } = renderForm();

    await user.type(screen.getByRole('searchbox'), 'zzzzz');

    expect(await screen.findByText('No results found for "{{searchTerm}}"')).toBeInTheDocument();
  });

  it('adds a selected service as a line item and closes the results dropdown', async () => {
    const { user } = renderForm();

    await addConsultation(user);

    expect(screen.getByText(/Billable Items \(1\)/)).toBeInTheDocument();
    expect(screen.getByText('Paediatric Consultation')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Paediatric Consultation/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save & close' })).toBeEnabled();
  });

  it('recalculates the line total when the quantity changes', async () => {
    const { user } = renderForm();
    await addConsultation(user);

    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '2' } });

    expect(screen.getByText(/KES\s*300\.00/)).toBeInTheDocument();
  });

  it('removes a line item and returns to the empty state', async () => {
    const { user } = renderForm();
    await addConsultation(user);
    expect(screen.getByText(/Billable Items \(1\)/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.getByText(/Billable Items \(0\)/)).toBeInTheDocument();
    expect(screen.getByText('Search and add billable items to create a bill')).toBeInTheDocument();
  });

  it('prevents adding a service that has no price', async () => {
    const { user } = renderForm();

    await user.type(screen.getByRole('searchbox'), 'Paracetamol');
    const option = await screen.findByRole('button', { name: /Paracetamol Syrup/ });

    expect(option).toBeDisabled();
    expect(screen.getByText('Service price for item not available')).toBeInTheDocument();
    expect(screen.getByText(/Billable Items \(0\)/)).toBeInTheDocument();
  });

  it('submits the bill and closes the workspace on save', async () => {
    const { user, closeWorkspace } = renderForm();
    await addConsultation(user);

    await user.click(screen.getByRole('button', { name: 'Save & close' }));

    await waitFor(() => expect(mockProcessBillItems).toHaveBeenCalledTimes(1));
    expect(mockProcessBillItems).toHaveBeenCalledWith(
      expect.objectContaining({
        patient: PATIENT_UUID,
        cashPoint: CASH_POINT_UUID,
        cashier: CASHIER_UUID,
        status: 'PENDING',
        lineItems: expect.arrayContaining([
          expect.objectContaining({
            billableService: CONSULTATION_UUID,
            quantity: 1,
            price: 150,
            priceUuid: CONSULTATION_CASH_PRICE_UUID,
            paymentStatus: 'PENDING',
          }),
        ]),
      }),
    );
    await waitFor(() => expect(closeWorkspace).toHaveBeenCalledWith({ discardUnsavedChanges: true }));
  });
});
