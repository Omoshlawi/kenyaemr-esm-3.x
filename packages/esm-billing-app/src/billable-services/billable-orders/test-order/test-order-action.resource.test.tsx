import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfig, useVisit } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { checkPaymentMethodExclusion, usePatientBills } from '../../../prompt-payment/prompt-payment.resource';
import { useTestOrderBillStatus } from './test-order-action.resource';

vi.mock('@openmrs/esm-framework', async () => ({
  ...(await vi.importActual('@openmrs/esm-framework')),
  useConfig: vi.fn(),
  useVisit: vi.fn(),
}));

vi.mock('swr', () => ({
  __esModule: true,
  default: vi.fn(),
}));

vi.mock('../../../prompt-payment/prompt-payment.resource', () => ({
  checkPaymentMethodExclusion: vi.fn(),
  usePatientBills: vi.fn(),
}));

const mockUseConfig = vi.mocked(useConfig);
const mockUseVisit = vi.mocked(useVisit);
const mockUseSWR = vi.mocked(useSWR);
const mockCheckPaymentMethodExclusion = vi.mocked(checkPaymentMethodExclusion);
const mockUsePatientBills = vi.mocked(usePatientBills);

const ORDER_UUID = 'order-uuid-123';
const PATIENT_UUID = 'patient-uuid-123';
const INPATIENT_VISIT_TYPE_UUID = 'inpatient-visit-type-uuid';
const EMERGENCY_PRIORITY_UUID = 'emergency-priority-uuid';
const EXCLUDED_PAYMENT_METHODS = ['insurance-payment-method-uuid'];

const mockConfig = {
  inPatientVisitTypeUuid: INPATIENT_VISIT_TYPE_UUID,
  paymentMethodsUuidsThatShouldNotShowPrompt: EXCLUDED_PAYMENT_METHODS,
  concepts: {
    emergencyPriorityConceptUuid: EMERGENCY_PRIORITY_UUID,
  },
} as any;

const buildActiveVisit = (visitTypeUuid = 'outpatient-visit-type-uuid') =>
  ({
    uuid: 'visit-uuid',
    visitType: { uuid: visitTypeUuid },
    attributes: [],
  } as any);

const buildQueueResponse = (priorityUuid?: string) =>
  ({
    data: {
      data: {
        results: priorityUuid ? [{ queueEntry: { priority: { uuid: priorityUuid } } }] : [],
      },
    },
    isLoading: false,
    error: null,
  } as any);

const buildBills = (paymentStatus: string) =>
  [
    {
      lineItems: [{ order: { uuid: ORDER_UUID }, paymentStatus }],
    },
  ] as any;

describe('useTestOrderBillStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseConfig.mockReturnValue(mockConfig);
    mockUseVisit.mockReturnValue({ activeVisit: buildActiveVisit() } as any);
    mockUseSWR.mockReturnValue(buildQueueResponse());
    mockCheckPaymentMethodExclusion.mockReturnValue(false);
    mockUsePatientBills.mockReturnValue({ patientBills: buildBills('PENDING'), isLoading: false, error: null } as any);
  });

  it('passes the active visit, excluded payment methods and config to checkPaymentMethodExclusion', () => {
    const activeVisit = buildActiveVisit();
    mockUseVisit.mockReturnValue({ activeVisit } as any);

    renderHook(() => useTestOrderBillStatus(ORDER_UUID, PATIENT_UUID));

    expect(mockCheckPaymentMethodExclusion).toHaveBeenCalledWith(activeVisit, EXCLUDED_PAYMENT_METHODS, mockConfig);
  });

  it('returns a loading state while the patient bills are loading', () => {
    mockUsePatientBills.mockReturnValue({ patientBills: [], isLoading: true, error: null } as any);

    const { result } = renderHook(() => useTestOrderBillStatus(ORDER_UUID, PATIENT_UUID));

    expect(result.current).toEqual({ hasPendingPayment: false, isLoading: true });
  });

  it('reports a pending payment when the order has an unpaid bill and is not excluded', () => {
    const { result } = renderHook(() => useTestOrderBillStatus(ORDER_UUID, PATIENT_UUID));

    expect(result.current).toEqual({ hasPendingPayment: true, isLoading: false });
  });

  it('does not report a pending payment when the payment method is excluded (e.g. insurance)', () => {
    mockCheckPaymentMethodExclusion.mockReturnValue(true);

    const { result } = renderHook(() => useTestOrderBillStatus(ORDER_UUID, PATIENT_UUID));

    expect(result.current).toEqual({ hasPendingPayment: false, isLoading: false });
  });

  it('does not report a pending payment for an in-patient visit', () => {
    mockUseVisit.mockReturnValue({ activeVisit: buildActiveVisit(INPATIENT_VISIT_TYPE_UUID) } as any);

    const { result } = renderHook(() => useTestOrderBillStatus(ORDER_UUID, PATIENT_UUID));

    expect(result.current).toEqual({ hasPendingPayment: false, isLoading: false });
  });

  it('does not report a pending payment for an emergency patient', () => {
    mockUseSWR.mockReturnValue(buildQueueResponse(EMERGENCY_PRIORITY_UUID));

    const { result } = renderHook(() => useTestOrderBillStatus(ORDER_UUID, PATIENT_UUID));

    expect(result.current).toEqual({ hasPendingPayment: false, isLoading: false });
  });
});
