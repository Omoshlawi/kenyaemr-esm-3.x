import { useMemo } from 'react';
import dayjs from 'dayjs';
import { usePaginatedBills, usePaymentModes } from '../../billing.resource';
import { PaymentStatus, Filter } from '../../types';
import { usePaymentFilterContext } from './usePaymentFilterContext';

function extractServiceName(billableService: string): string {
  const parts = billableService.split(':');
  if (parts.length === 1) {
    return billableService.trim();
  }
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return parts[0].trim().match(uuidPattern) ? parts[1].trim() : parts[0].trim();
}

/**
 * Maps the payment-history filters to the query params the bill endpoint understands.
 * Payment methods are stored as names in the UI, so they are resolved to uuids here.
 */
export const usePaymentHistoryQueryFilters = (filters: Filter) => {
  const { paymentModes } = usePaymentModes(false);

  return useMemo(() => {
    const paymentModeUuids = (filters.paymentMethods ?? [])
      .map((name) => paymentModes?.find((mode) => mode.name === name)?.uuid)
      .filter((uuid): uuid is string => Boolean(uuid));

    return {
      cashierUuids: filters.cashiers ?? [],
      serviceTypeUuids: filters.serviceTypes ?? [],
      paymentModeUuids,
    };
  }, [filters.paymentMethods, filters.cashiers, filters.serviceTypes, paymentModes]);
};

export const usePaymentTransactionHistory = (filters: Filter, pageSize: number = 10) => {
  const { dateRange } = usePaymentFilterContext();
  const { cashierUuids, serviceTypeUuids, paymentModeUuids } = usePaymentHistoryQueryFilters(filters);

  const { bills, isLoading, isValidating, error, pagination } = usePaginatedBills(true, {
    billStatus: PaymentStatus.PAID,
    startingDate: dayjs(dateRange[0]).toDate(),
    endDate: dayjs(dateRange[1]).toDate(),
    cashierUuids,
    serviceTypeUuids,
    paymentModeUuids,
    pageSize,
  });

  const mappedBills = useMemo(
    () =>
      (bills ?? []).map((bill) => ({
        ...bill,
        lineItems: bill.lineItems.map((item) => ({
          ...item,
          billableService: extractServiceName(item.billableService),
        })),
      })),
    [bills],
  );

  return { bills: mappedBills, isLoading, isValidating, error, pagination };
};
