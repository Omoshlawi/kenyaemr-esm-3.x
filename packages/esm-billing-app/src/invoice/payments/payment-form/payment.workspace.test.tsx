import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, beforeEach, test, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import { showModal, showSnackbar, useConfig, useVisit } from '@openmrs/esm-framework';

import { usePaymentModes } from '../../../billing.resource';
import { PaymentStatus } from '../../../types';
import { makeAllocatedPayment, makePayment } from '../payments.resource';
import {
  useClaimForVisit,
  useVisitAttribute,
} from '../../../bill-administration/patient-billing/workspaces/create-bill/create-bill.resource';
import { dispatchClaimLinesToSha } from '../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { useFacilityRegistry } from '../../../hooks/useFacilityRegistry';
import PaymentWorkspace from './payment.workspace';

vi.mock('@openmrs/esm-framework', () => ({
  ResponsiveWrapper: ({ children }: React.PropsWithChildren) => <>{children}</>,
  Workspace2: ({ children }: React.PropsWithChildren) => <>{children}</>,
  restBaseUrl: '/ws/rest/v1',
  showModal: vi.fn(),
  showSnackbar: vi.fn(),
  useConfig: vi.fn(),
  useLayoutType: () => 'desktop',
  useVisit: vi.fn(),
}));

vi.mock('../../../billing.resource', () => ({
  usePaymentModes: vi.fn(),
}));

vi.mock('../../../types', () => ({
  PaymentStatus: { PAID: 'PAID', PENDING: 'PENDING', EXEMPTED: 'EXEMPTED' },
}));

vi.mock('../payments.resource', () => ({
  makePayment: vi.fn(),
  makeAllocatedPayment: vi.fn(),
}));

vi.mock('../../../helpers/currency', () => ({
  useCurrencyFormatting: () => ({ format: (amount: number) => `KES ${amount.toFixed(2)}` }),
}));

vi.mock('../../../prompt-payment/prompt-payment-modal.component', () => ({
  getPatientUuidFromUrl: () => 'patient-uuid',
}));

vi.mock('../../../bill-administration/patient-billing/workspaces/create-bill/create-bill.resource', () => ({
  useClaimForVisit: vi.fn(),
  useVisitAttribute: vi.fn(),
}));

vi.mock('../../../billing-form/pomsf/effective-pomsf.component', () => ({
  default: () => null,
}));

vi.mock('../../../billing-form/social-health-authority/sha-virtual-claim.resource', () => ({
  dispatchClaimLinesToSha: vi.fn(),
  lockCover: vi.fn(),
}));

vi.mock('../../../hooks/useFacilityRegistry', () => ({
  useFacilityRegistry: vi.fn(),
}));

const mockUsePaymentModes = vi.mocked(usePaymentModes);
const mockMakePayment = vi.mocked(makePayment);
const mockMakeAllocatedPayment = vi.mocked(makeAllocatedPayment);
const mockUseConfig = vi.mocked(useConfig);
const mockUseVisit = vi.mocked(useVisit);
const mockUseVisitAttribute = vi.mocked(useVisitAttribute);
const mockUseClaimForVisit = vi.mocked(useClaimForVisit);
const mockShowSnackbar = vi.mocked(showSnackbar);
const mockShowModal = vi.mocked(showModal);
const mockDispatchClaimLinesToSha = vi.mocked(dispatchClaimLinesToSha);
const mockUseFacilityRegistry = vi.mocked(useFacilityRegistry);

const cash = { uuid: 'cash-uuid', name: 'Cash', attributeTypes: [] };
const mobileMoney = {
  uuid: 'mobile-money-uuid',
  name: 'Mobile Money',
  attributeTypes: [{ uuid: 'reference-attribute-uuid', name: 'Reference number', required: true }],
};
const insurance = { uuid: 'insurance-uuid', name: 'SHA Insurance', attributeTypes: [] };

const selectedLineItems = [
  { uuid: 'line-item-1', price: 60, quantity: 2, paymentStatus: PaymentStatus.PENDING },
  { uuid: 'already-paid', price: 500, quantity: 1, paymentStatus: PaymentStatus.PAID },
];

const bill = {
  uuid: 'bill-uuid',
  id: 42,
  receiptNumber: 'RCPT-42',
  patientName: 'Jane Doe',
};

const workspaceProps = {
  workspaceProps: { selectedLineItems, bill },
  closeWorkspace: vi.fn(),
  promptBeforeClosing: vi.fn(),
  closeWorkspaceWithSavedChanges: vi.fn(),
  setTitle: vi.fn(),
};

const makeClaimForVisit = (overrides: Record<string, unknown> = {}) =>
  ({
    authorizationCode: null,
    workflowState: null,
    virtualClaimUuid: null,
    schemeCode: null,
    serviceType: null,
    interventions: [],
    sent_line_items: [],
    hasNoClaim: false,
    isLoading: false,
    error: null,
    mutate: vi.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useClaimForVisit>);

const feeForServiceIntervention = {
  intervention_code: 'SHA-001',
  intervention_name: 'General consultation',
  status: 'ACTIVE',
  payment_mechanism: 'FEE_FOR_SERVICE',
  keph_level_tariff: 120,
  preauth_approved: false,
};

const perDiemIntervention = {
  intervention_code: 'SHA-DIEM',
  intervention_name: 'Inpatient stay',
  status: 'ACTIVE',
  payment_mechanism: 'PER_DIEM',
  accrued_amount: 100,
  accrued_days: 2,
  keph_level_tariff: 50,
};

const renderWorkspace = () => render(<PaymentWorkspace {...(workspaceProps as any)} />);

const choosePaymentMode = async (user: ReturnType<typeof userEvent.setup>, name: RegExp | string, lineIndex = 0) => {
  const combobox = screen.getAllByRole('combobox', { name: /Payment Mode/i })[lineIndex];
  await user.click(combobox);
  await user.click(screen.getByRole('option', { name }));
};

const enterAmount = async (user: ReturnType<typeof userEvent.setup>, amount: string, lineIndex = 0) => {
  const amountInput = screen.getAllByRole('spinbutton', { name: /Amount/i })[lineIndex];
  await user.clear(amountInput);
  await user.type(amountInput, amount);
};

const saveButton = () => screen.getByRole('button', { name: /Save & close/i });

describe('PaymentWorkspace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfig.mockReturnValue({
      visitAttributeTypes: { insuranceScheme: 'insurance-scheme-uuid' },
      insurancePaymentMethod: 'insurance-uuid',
    });
    mockUseVisit.mockReturnValue({ activeVisit: { uuid: 'visit-uuid' } } as ReturnType<typeof useVisit>);
    mockUseVisitAttribute.mockReturnValue({ isSHA: false } as ReturnType<typeof useVisitAttribute>);
    mockUseClaimForVisit.mockReturnValue(makeClaimForVisit());
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [cash, mobileMoney, insurance] as any,
      isLoading: false,
      error: null,
      mutate: vi.fn(),
    });
    mockShowModal.mockReturnValue(vi.fn());
    mockMakePayment.mockResolvedValue({ ok: true, data: { uuid: 'payment-uuid' } } as any);
    mockMakeAllocatedPayment.mockResolvedValue({ ok: true, data: { uuid: 'payment-uuid' } } as any);
    mockDispatchClaimLinesToSha.mockResolvedValue({ ok: true } as any);
    mockUseFacilityRegistry.mockReturnValue({
      facility: undefined,
      facilityLevel: '',
      isLoading: false,
      error: null,
      notYetSynced: false,
      mutate: vi.fn(),
    } as unknown as ReturnType<typeof useFacilityRegistry>);
  });

  test('shows a loading state while payment modes are loading', () => {
    mockUsePaymentModes.mockReturnValue({
      paymentModes: [],
      isLoading: true,
      error: null,
      mutate: vi.fn(),
    });

    renderWorkspace();

    expect(screen.getByText('Loading payment modes')).toBeInTheDocument();
  });

  test('shows the amount due and keeps save disabled until the bill is fully allocated', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    expect(screen.getByText('Total amount due')).toBeInTheDocument();
    expect(screen.getByText('Amount remaining')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await choosePaymentMode(user, 'Cash');
    await enterAmount(user, '100');

    expect(screen.getByText('Amount remaining')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(mockMakePayment).not.toHaveBeenCalled();
  });

  test('records a cash payment, prints the receipt and closes the workspace', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await choosePaymentMode(user, 'Cash');
    await enterAmount(user, '120');

    await waitFor(() => expect(saveButton()).toBeEnabled());
    await user.click(saveButton());

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Payment saved', kind: 'success' }),
      ),
    );
    expect(mockMakePayment).toHaveBeenCalledWith('bill-uuid', expect.objectContaining({ amount: 120 }));
    expect(mockShowModal).toHaveBeenCalledWith('print-preview-modal', expect.anything());
    expect(workspaceProps.closeWorkspace).toHaveBeenCalledWith({ discardUnsavedChanges: true });
  });

  test('requires a reference code for a payment mode that needs one before saving', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await choosePaymentMode(user, 'Mobile Money');
    await enterAmount(user, '120');

    expect(screen.getByRole('textbox', { name: /Reference Code/i })).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    await user.type(screen.getByRole('textbox', { name: /Reference Code/i }), 'MPESA-123');
    await waitFor(() => expect(saveButton()).toBeEnabled());
    await user.click(saveButton());

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Payment saved', kind: 'success' }),
      ),
    );
    expect(workspaceProps.closeWorkspace).toHaveBeenCalledWith({ discardUnsavedChanges: true });
  });

  test('splits a bill across two payment modes', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await choosePaymentMode(user, 'Cash');
    await enterAmount(user, '60');

    await user.click(screen.getByRole('button', { name: /Add payment mode/i }));

    await choosePaymentMode(user, 'Mobile Money', 1);
    await enterAmount(user, '60', 1);
    await user.type(screen.getByRole('textbox', { name: /Reference Code/i }), 'MPESA-123');

    await waitFor(() => expect(saveButton()).toBeEnabled());
    await user.click(saveButton());

    await waitFor(() => expect(mockMakePayment).toHaveBeenCalledTimes(2));
    expect(mockShowSnackbar).toHaveBeenCalledWith(expect.objectContaining({ title: 'Payment saved', kind: 'success' }));
    expect(workspaceProps.closeWorkspace).toHaveBeenCalledWith({ discardUnsavedChanges: true });
  });

  test('keeps the workspace open and tells the user when payment fails', async () => {
    const user = userEvent.setup();
    mockMakePayment.mockResolvedValue({
      ok: false,
      responseBody: { error: { message: 'Payment service unavailable' } },
    } as any);
    renderWorkspace();

    await choosePaymentMode(user, 'Cash');
    await enterAmount(user, '120');
    await waitFor(() => expect(saveButton()).toBeEnabled());
    await user.click(saveButton());

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error processing payment',
          kind: 'error',
          subtitle: expect.stringContaining('Payment service unavailable'),
        }),
      ),
    );
    expect(workspaceProps.closeWorkspace).not.toHaveBeenCalled();
    expect(mockShowModal).not.toHaveBeenCalled();
  });

  test('warns about a partial payment and closes when one of several payments fails', async () => {
    const user = userEvent.setup();
    mockMakePayment
      .mockResolvedValueOnce({ ok: true, data: { uuid: 'payment-uuid' } } as any)
      .mockResolvedValueOnce({ ok: false, responseBody: { error: { message: 'Second payment rejected' } } } as any);
    renderWorkspace();

    await choosePaymentMode(user, 'Cash');
    await enterAmount(user, '60');

    await user.click(screen.getByRole('button', { name: /Add payment mode/i }));

    await choosePaymentMode(user, 'Mobile Money', 1);
    await enterAmount(user, '60', 1);
    await user.type(screen.getByRole('textbox', { name: /Reference Code/i }), 'MPESA-123');

    await waitFor(() => expect(saveButton()).toBeEnabled());
    await user.click(saveButton());

    await waitFor(() =>
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Partial payment saved', kind: 'warning' }),
      ),
    );
    expect(workspaceProps.closeWorkspace).toHaveBeenCalledWith({ discardUnsavedChanges: true });
  });

  describe('partial bill payment', () => {
    const enablePartialConfig = () =>
      mockUseConfig.mockReturnValue({
        visitAttributeTypes: { insuranceScheme: 'insurance-scheme-uuid' },
        insurancePaymentMethod: 'insurance-uuid',
        enablePartialBillPayment: true,
      });

    test('keeps save disabled for a partial tender when the flag is off', async () => {
      const user = userEvent.setup();
      renderWorkspace();

      await choosePaymentMode(user, 'Cash');
      await enterAmount(user, '50');

      expect(screen.getByText('Amount remaining')).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
      expect(mockMakePayment).not.toHaveBeenCalled();
    });

    test('posts a partial tender to the allocated endpoint with line-item allocations', async () => {
      enablePartialConfig();
      const user = userEvent.setup();
      renderWorkspace();

      await choosePaymentMode(user, 'Cash');
      await enterAmount(user, '50');

      expect(screen.getByText('Partial payment')).toBeInTheDocument();
      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      await waitFor(() =>
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'Payment saved', kind: 'success' }),
        ),
      );
      expect(mockMakeAllocatedPayment).toHaveBeenCalledWith(
        'bill-uuid',
        expect.objectContaining({ amount: 50, allocations: [{ lineItem: 'line-item-1', amount: 50 }] }),
      );
      expect(mockMakePayment).not.toHaveBeenCalled();
      expect(mockShowModal).toHaveBeenCalledWith(
        'print-preview-modal',
        expect.objectContaining({
          documentUrl: expect.stringContaining('lineItemUuids=line-item-1&paymentsUuids=payment-uuid'),
        }),
      );
      expect(workspaceProps.closeWorkspace).toHaveBeenCalledWith({ discardUnsavedChanges: true });
    });

    test('uses the outstanding balance as the amount due for a partially paid line item', async () => {
      enablePartialConfig();
      const user = userEvent.setup();
      const partiallyPaidItems = [
        {
          uuid: 'line-item-1',
          price: 60,
          quantity: 2,
          paymentStatus: PaymentStatus.PENDING,
          balance: 40,
          settlementStatus: 'PARTIALLY_PAID',
        },
      ];
      render(
        <PaymentWorkspace
          {...({ ...workspaceProps, workspaceProps: { selectedLineItems: partiallyPaidItems, bill } } as any)}
        />,
      );

      await choosePaymentMode(user, 'Cash');
      await enterAmount(user, '40');

      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      await waitFor(() =>
        expect(mockMakeAllocatedPayment).toHaveBeenCalledWith(
          'bill-uuid',
          expect.objectContaining({ amount: 40, allocations: [{ lineItem: 'line-item-1', amount: 40 }] }),
        ),
      );
    });

    test('blocks saving when a partial tender exceeds the total amount due', async () => {
      enablePartialConfig();
      const user = userEvent.setup();
      renderWorkspace();

      await choosePaymentMode(user, 'Cash');
      await enterAmount(user, '200');

      expect(await screen.findByText('Amount overpaid')).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
      expect(mockMakePayment).not.toHaveBeenCalled();
    });

    const multipleUnpaidItems = [
      { uuid: 'line-item-1', price: 60, quantity: 1, paymentStatus: PaymentStatus.PENDING },
      { uuid: 'line-item-2', price: 40, quantity: 1, paymentStatus: PaymentStatus.PENDING },
    ];

    const renderWithItems = (items: typeof multipleUnpaidItems) =>
      render(
        <PaymentWorkspace {...({ ...workspaceProps, workspaceProps: { selectedLineItems: items, bill } } as any)} />,
      );

    const setAllocation = async (user: ReturnType<typeof userEvent.setup>, name: RegExp, amount: string) => {
      const input = screen.getByRole('spinbutton', { name });
      await user.clear(input);
      await user.type(input, amount);
    };

    test('lets the cashier allocate a partial tender across multiple line items', async () => {
      enablePartialConfig();
      const user = userEvent.setup();
      renderWithItems(multipleUnpaidItems);

      await choosePaymentMode(user, 'Cash');
      await setAllocation(user, /line-item-1/i, '60');
      await setAllocation(user, /line-item-2/i, '30');

      expect(screen.getByText('Partial payment')).toBeInTheDocument();
      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      await waitFor(() =>
        expect(mockMakeAllocatedPayment).toHaveBeenCalledWith(
          'bill-uuid',
          expect.objectContaining({
            amount: 90,
            allocations: [
              { lineItem: 'line-item-1', amount: 60 },
              { lineItem: 'line-item-2', amount: 30 },
            ],
          }),
        ),
      );
      expect(mockMakePayment).not.toHaveBeenCalled();
      expect(mockShowModal).toHaveBeenCalledWith(
        'print-preview-modal',
        expect.objectContaining({
          documentUrl: expect.stringContaining('lineItemUuids=line-item-1,line-item-2&paymentsUuids=payment-uuid'),
        }),
      );
    });

    test('accepts decimal allocation amounts and submits the exact values without native step validation', async () => {
      // Regression: the browser's native HTML5 `stepMismatch` validation rejected decimals such as
      // 12.50 on submit. The form opts out of native validation (`noValidate`) and defers to RHF, and
      // the inputs convert their string value with `Number()`, so decimals must flow through untouched.
      enablePartialConfig();
      const user = userEvent.setup();
      const { container } = renderWithItems(multipleUnpaidItems);

      expect(container.querySelector('form')).toHaveAttribute('novalidate');

      await choosePaymentMode(user, 'Cash');
      await setAllocation(user, /line-item-1/i, '12.50');
      await setAllocation(user, /line-item-2/i, '7.25');

      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      await waitFor(() =>
        expect(mockMakeAllocatedPayment).toHaveBeenCalledWith(
          'bill-uuid',
          expect.objectContaining({
            amount: 19.75,
            allocations: [
              { lineItem: 'line-item-1', amount: 12.5 },
              { lineItem: 'line-item-2', amount: 7.25 },
            ],
          }),
        ),
      );
      expect(mockMakePayment).not.toHaveBeenCalled();
    });

    test('excludes a line item with no allocation from the receipt', async () => {
      enablePartialConfig();
      const user = userEvent.setup();
      renderWithItems(multipleUnpaidItems);

      await choosePaymentMode(user, 'Cash');
      await setAllocation(user, /line-item-1/i, '60');

      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      await waitFor(() =>
        expect(mockMakeAllocatedPayment).toHaveBeenCalledWith(
          'bill-uuid',
          expect.objectContaining({ amount: 60, allocations: [{ lineItem: 'line-item-1', amount: 60 }] }),
        ),
      );
      expect(mockShowModal).toHaveBeenCalledWith(
        'print-preview-modal',
        expect.objectContaining({
          documentUrl: expect.stringContaining('lineItemUuids=line-item-1&paymentsUuids=payment-uuid'),
        }),
      );
      const [, printArgs] = mockShowModal.mock.calls.find(([name]) => name === 'print-preview-modal')!;
      expect((printArgs as { documentUrl: string }).documentUrl).not.toContain('line-item-2');
    });

    test('blocks saving when an allocation exceeds a line item balance', async () => {
      enablePartialConfig();
      const user = userEvent.setup();
      renderWithItems(multipleUnpaidItems);

      await choosePaymentMode(user, 'Cash');
      await setAllocation(user, /line-item-1/i, '80');

      expect(await screen.findByText('Allocation exceeds the outstanding balance')).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
      expect(mockMakeAllocatedPayment).not.toHaveBeenCalled();
    });

    test('shows the distribution UI on an SHA visit when paying with a non-insurance mode', async () => {
      enablePartialConfig();
      mockUseVisitAttribute.mockReturnValue({ isSHA: true } as ReturnType<typeof useVisitAttribute>);
      const user = userEvent.setup();
      renderWithItems(multipleUnpaidItems);

      await choosePaymentMode(user, 'Cash');
      await setAllocation(user, /line-item-1/i, '40');
      await setAllocation(user, /line-item-2/i, '20');

      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      await waitFor(() =>
        expect(mockMakeAllocatedPayment).toHaveBeenCalledWith(
          'bill-uuid',
          expect.objectContaining({
            amount: 60,
            allocations: [
              { lineItem: 'line-item-1', amount: 40 },
              { lineItem: 'line-item-2', amount: 20 },
            ],
          }),
        ),
      );
      expect(mockMakePayment).not.toHaveBeenCalled();
    });
  });

  describe('SHA insurance workflow', () => {
    beforeEach(() => {
      mockUseVisitAttribute.mockReturnValue({ isSHA: true } as ReturnType<typeof useVisitAttribute>);
    });

    test('requires an intervention for an insurance payment then dispatches and records it', async () => {
      const user = userEvent.setup();
      mockUseClaimForVisit.mockReturnValue(
        makeClaimForVisit({ authorizationCode: 'auth-code', interventions: [feeForServiceIntervention] }),
      );
      renderWorkspace();

      await choosePaymentMode(user, 'SHA Insurance');

      expect(screen.getByRole('combobox', { name: /SHA intervention/i })).toBeInTheDocument();
      await enterAmount(user, '120');
      expect(saveButton()).toBeDisabled();

      const interventionCombobox = screen.getByRole('combobox', { name: /SHA intervention/i });
      await user.click(interventionCombobox);
      await user.click(screen.getByRole('option', { name: /SHA-001/i }));

      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      await waitFor(() => expect(mockDispatchClaimLinesToSha).toHaveBeenCalled());
      expect(mockMakePayment).toHaveBeenCalledWith('bill-uuid', expect.objectContaining({ amount: 120 }));
      expect(mockShowSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Payment saved', kind: 'success' }),
      );
      expect(workspaceProps.closeWorkspace).toHaveBeenCalledWith({ discardUnsavedChanges: true });
    });

    test('blocks saving when the amount exceeds a per-diem intervention accrual', async () => {
      const user = userEvent.setup();
      mockUseClaimForVisit.mockReturnValue(
        makeClaimForVisit({ authorizationCode: 'auth-code', interventions: [perDiemIntervention] }),
      );
      renderWorkspace();

      await choosePaymentMode(user, 'SHA Insurance');
      await enterAmount(user, '120');

      const interventionCombobox = screen.getByRole('combobox', { name: /SHA intervention/i });
      await user.click(interventionCombobox);
      await user.click(screen.getByRole('option', { name: /SHA-DIEM/i }));

      expect(await screen.findByText('Amount exceeds accrued')).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
      expect(mockMakePayment).not.toHaveBeenCalled();
    });

    test('surfaces an error and keeps the workspace open when SHA rejects the claim line', async () => {
      const user = userEvent.setup();
      mockDispatchClaimLinesToSha.mockResolvedValue({ ok: false, error: 'SHA rejected the intervention' } as any);
      mockUseClaimForVisit.mockReturnValue(
        makeClaimForVisit({ authorizationCode: 'auth-code', interventions: [feeForServiceIntervention] }),
      );
      renderWorkspace();

      await choosePaymentMode(user, 'SHA Insurance');
      await enterAmount(user, '120');

      const interventionCombobox = screen.getByRole('combobox', { name: /SHA intervention/i });
      await user.click(interventionCombobox);
      await user.click(screen.getByRole('option', { name: /SHA-001/i }));

      await waitFor(() => expect(saveButton()).toBeEnabled());
      await user.click(saveButton());

      await waitFor(() =>
        expect(mockShowSnackbar).toHaveBeenCalledWith(
          expect.objectContaining({ title: 'SHA rejected the bill lines', kind: 'error' }),
        ),
      );
      expect(mockMakePayment).not.toHaveBeenCalled();
      expect(workspaceProps.closeWorkspace).not.toHaveBeenCalled();
    });
  });
});
