import {
  formatDate,
  openmrsFetch,
  OpenmrsResource,
  parseDate,
  restBaseUrl,
  useConfig,
  useOpenmrsPagination,
  useSession,
  useVisit,
} from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import isEmpty from 'lodash-es/isEmpty';
import sortBy from 'lodash-es/sortBy';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { z } from 'zod';
import { BillingConfig } from './config-schema';
import { extractString } from './helpers';
import { FacilityDetail, MappedBill, PatientInvoice, PaymentMethod, PaymentStatus } from './types';

export const mapBillProperties = (bill: PatientInvoice): MappedBill => {
  // create base object
  const mappedBill: MappedBill = {
    id: bill?.id,
    uuid: bill?.uuid,
    patientName: bill?.patient?.display.split('-')?.[1],
    identifier: bill?.patient?.display.split('-')?.[0],
    patientUuid: bill?.patient?.uuid,
    status: bill?.lineItems.some((item) => item?.paymentStatus === PaymentStatus.PENDING)
      ? PaymentStatus.PENDING
      : PaymentStatus.PAID,
    receiptNumber: bill?.receiptNumber,
    cashier: bill?.cashier,
    cashPointUuid: bill?.cashPoint?.uuid,
    cashPointName: bill?.cashPoint?.name,
    cashPointLocation: bill?.cashPoint?.location?.display,
    dateCreated: bill?.dateCreated ? formatDate(parseDate(bill?.dateCreated), { mode: 'wide' }) : '--',
    dateCreatedUnformatted: bill?.dateCreated,
    lineItems: bill?.lineItems.filter((li) => !li?.voided),
    billingService: extractString(
      bill?.lineItems.map((bill) => bill?.item || bill?.billableService || '--').join('  '),
    ),
    payments: bill?.payments,
    display: bill?.display,
    totalAmount: bill?.lineItems?.map((item) => item?.price * item?.quantity).reduce((prev, curr) => prev + curr, 0),
    tenderedAmount: bill?.payments?.map((item) => item?.amountTendered).reduce((prev, curr) => prev + curr, 0),
    referenceCodes: bill?.payments
      .map((payment) =>
        payment.attributes
          .filter((attr) => attr.attributeType.description === 'Reference Number')
          .map((attr) => {
            return {
              paymentMode: payment.instanceType.name,
              value: attr.value,
            };
          }),
      )
      .flat()
      .map((ref) => `${ref.paymentMode}: ${ref.value}`)
      .join(', '),
    adjustmentReason: bill?.adjustmentReason,
    balance: bill?.balance,
    totalPayments: bill?.totalPayments,
    totalDeposits: bill?.totalDeposits,
    totalExempted: bill?.totalExempted,
    closed: bill?.closed,
  };

  return mappedBill;
};
// TODO: Deprecated hook, use usePaginatedBills instead
export const useBills = (
  patientUuid: string = '',
  billStatus: PaymentStatus.PENDING | '' | string = '',
  startingDate: Date = dayjs().startOf('day').toDate(),
  endDate: Date = dayjs().endOf('day').toDate(),
) => {
  const startingDateISO = startingDate.toISOString();
  const endDateISO = endDate.toISOString();

  const url = `${restBaseUrl}/cashier/bill?status=${billStatus}&v=custom:(uuid,display,voided,voidReason,adjustedBy,cashPoint:(uuid,name),cashier:(uuid,display),dateCreated,lineItems,patient:(uuid,display))&createdOnOrAfter=${startingDateISO}&createdOnOrBefore=${endDateISO}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: { results: Array<PatientInvoice> } }>(
    patientUuid ? `${url}&patientUuid=${patientUuid}` : url,
    openmrsFetch,
    {
      errorRetryCount: 2,
    },
  );

  const sortBills = sortBy(data?.data?.results ?? [], ['dateCreated']).reverse();
  const filteredBills = billStatus === '' ? sortBills : sortBills?.filter((bill) => bill?.status === billStatus);
  const mappedResults = filteredBills?.map((bill) => mapBillProperties(bill));
  const filteredResults = mappedResults?.filter((res) => res.patientUuid === patientUuid);
  const formattedBills = isEmpty(patientUuid) ? mappedResults : filteredResults || [];

  return {
    bills: formattedBills,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

const BILLS_REP =
  'custom:(uuid,display,voided,voidReason,adjustedBy,cashPoint:(uuid,name),cashier:(uuid,display),dateCreated,lineItems,patient:(uuid,display))';

export const usePaginatedBills = (
  shouldFetchBills: boolean,
  options: {
    patientUuid?: string;
    billStatus?: PaymentStatus.PENDING | '' | string;
    startingDate?: Date;
    endDate?: Date;
    pageSize?: number;
    cashierUuids?: Array<string>;
    paymentModeUuids?: Array<string>;
    serviceTypeUuids?: Array<string>;
  } = {},
) => {
  const {
    patientUuid = '',
    billStatus = '',
    startingDate = dayjs().startOf('day').toDate(),
    endDate = dayjs().endOf('day').toDate(),
    pageSize = 10,
    cashierUuids = [],
    paymentModeUuids = [],
    serviceTypeUuids = [],
  } = options;

  const startingDateISO = startingDate.toISOString();
  const endDateISO = endDate.toISOString();

  const optionalFilters = [
    patientUuid ? `patientUuid=${patientUuid}` : '',
    cashierUuids.length ? `cashierUuid=${cashierUuids.join(',')}` : '',
    paymentModeUuids.length ? `paymentModeUuid=${paymentModeUuids.join(',')}` : '',
    serviceTypeUuids.length ? `serviceTypeUuid=${serviceTypeUuids.join(',')}` : '',
  ]
    .filter(Boolean)
    .join('&');

  const baseParams = `status=${billStatus}&v=${BILLS_REP}&createdOnOrAfter=${startingDateISO}&createdOnOrBefore=${endDateISO}`;
  const fullUrl = `${restBaseUrl}/cashier/bill?${baseParams}${optionalFilters ? `&${optionalFilters}` : ''}`;

  const {
    data: rawBills,
    error,
    isLoading,
    isValidating,
    mutate,
    totalPages,
    totalCount,
    currentPage,
    currentPageSize,
    paginated,
    showNextButton,
    showPreviousButton,
    goTo,
    goToNext,
    goToPrevious,
  } = useOpenmrsPagination<PatientInvoice>(shouldFetchBills ? fullUrl : null, pageSize, {
    swrConfig: { errorRetryCount: 2, keepPreviousData: true, revalidateOnFocus: true },
  });

  const sortBills = sortBy(rawBills ?? [], ['dateCreated']).reverse();
  const filteredBills = billStatus === '' ? sortBills : sortBills?.filter((bill) => bill?.status === billStatus);
  const mappedResults = filteredBills?.map((bill) => mapBillProperties(bill));
  const filteredResults = mappedResults?.filter((res) => res.patientUuid === patientUuid);
  const bills = isEmpty(patientUuid) ? mappedResults ?? [] : filteredResults ?? [];

  return {
    bills,
    error,
    isLoading,
    isValidating,
    mutate,
    pagination: {
      totalPages,
      totalCount,
      currentPage,
      currentPageSize,
      paginated,
      showNextButton,
      showPreviousButton,
      goTo,
      goToNext,
      goToPrevious,
      pageSize,
    },
  };
};

/**
 * Fetches the full set of bills matching the given filters in a single request, bypassing pagination.
 * Intended only for on-demand actions like exporting, where the caller genuinely needs every row.
 */
export const fetchBillsForExport = async (options: {
  billStatus?: PaymentStatus.PENDING | '' | string;
  startingDate?: Date;
  endDate?: Date;
  cashierUuids?: Array<string>;
  paymentModeUuids?: Array<string>;
  serviceTypeUuids?: Array<string>;
}): Promise<Array<MappedBill>> => {
  const {
    billStatus = '',
    startingDate = dayjs().startOf('day').toDate(),
    endDate = dayjs().endOf('day').toDate(),
    cashierUuids = [],
    paymentModeUuids = [],
    serviceTypeUuids = [],
  } = options;

  const optionalFilters = [
    cashierUuids.length ? `cashierUuid=${cashierUuids.join(',')}` : '',
    paymentModeUuids.length ? `paymentModeUuid=${paymentModeUuids.join(',')}` : '',
    serviceTypeUuids.length ? `serviceTypeUuid=${serviceTypeUuids.join(',')}` : '',
  ]
    .filter(Boolean)
    .join('&');

  const params =
    `status=${billStatus}&v=${BILLS_REP}` +
    `&createdOnOrAfter=${startingDate.toISOString()}&createdOnOrBefore=${endDate.toISOString()}` +
    `&limit=10000${optionalFilters ? `&${optionalFilters}` : ''}`;

  const { data } = await openmrsFetch<{ results: Array<PatientInvoice> }>(`${restBaseUrl}/cashier/bill?${params}`);
  const sorted = sortBy(data?.results ?? [], ['dateCreated']).reverse();
  return sorted.map((bill) => mapBillProperties(bill));
};

/**
 * Lists providers that can be used to populate the cashier filter without loading every bill.
 */
export const useCashiers = () => {
  const url = `${restBaseUrl}/provider?v=custom:(uuid,display)`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<{ uuid: string; display: string }> } }>(
    url,
    openmrsFetch,
    { errorRetryCount: 2 },
  );
  return { cashiers: data?.data?.results ?? [], isLoading, error };
};

export interface PaymentModeSummary {
  paymentModeUuid: string;
  paymentMode: string;
  total: number;
}

/**
 * Fetches payment totals grouped by payment mode from the server-side aggregation endpoint,
 * so the summary tab no longer needs to load every bill to compute the breakdown client-side.
 */
export const usePaymentModeSummary = (options: {
  billStatus?: PaymentStatus.PAID | '' | string;
  startingDate?: Date;
  endDate?: Date;
  cashierUuids?: Array<string>;
  paymentModeUuids?: Array<string>;
  serviceTypeUuids?: Array<string>;
}) => {
  const {
    billStatus = '',
    startingDate = dayjs().startOf('day').toDate(),
    endDate = dayjs().endOf('day').toDate(),
    cashierUuids = [],
    paymentModeUuids = [],
    serviceTypeUuids = [],
  } = options;

  const optionalFilters = [
    billStatus ? `status=${billStatus}` : '',
    cashierUuids.length ? `cashierUuid=${cashierUuids.join(',')}` : '',
    paymentModeUuids.length ? `paymentModeUuid=${paymentModeUuids.join(',')}` : '',
    serviceTypeUuids.length ? `serviceTypeUuid=${serviceTypeUuids.join(',')}` : '',
  ]
    .filter(Boolean)
    .join('&');

  const params =
    `createdOnOrAfter=${startingDate.toISOString()}&createdOnOrBefore=${endDate.toISOString()}` +
    `${optionalFilters ? `&${optionalFilters}` : ''}`;
  const url = `${restBaseUrl}/cashier/billPaymentModeSummary?${params}`;

  const { data, error, isLoading, isValidating, mutate } = useSWR<{
    data: { results: Array<PaymentModeSummary> };
  }>(url, openmrsFetch, { errorRetryCount: 2, keepPreviousData: true });

  return {
    summaries: data?.data?.results ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

export const useBill = (billUuid: string) => {
  const url = `${restBaseUrl}/cashier/bill/${billUuid}?includeVoided=false`;
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: PatientInvoice }>(
    billUuid ? url : null,
    openmrsFetch,
    {
      errorRetryCount: 2,
      keepPreviousData: true,
      revalidateOnFocus: true,
    },
  );

  const mapBillProperties = (bill: PatientInvoice): MappedBill => {
    // create base object
    const mappedBill: MappedBill = {
      id: bill?.id,
      uuid: bill?.uuid,
      patientName: bill?.patient?.display.split('-')?.[1],
      identifier: bill?.patient?.display.split('-')?.[0],
      patientUuid: bill?.patient?.uuid,
      status:
        bill?.lineItems.length > 1
          ? bill?.lineItems.some((item) => item?.paymentStatus === PaymentStatus.PENDING)
            ? PaymentStatus.PENDING
            : PaymentStatus.PAID
          : bill?.status,
      receiptNumber: bill?.receiptNumber,
      cashier: bill?.cashier,
      cashPointUuid: bill?.cashPoint?.uuid,
      cashPointName: bill?.cashPoint?.name,
      cashPointLocation: bill?.cashPoint?.location?.display,
      dateCreated: bill?.dateCreated ?? '--',
      dateCreatedUnformatted: bill?.dateCreated,
      lineItems: bill?.lineItems,
      billingService: bill?.lineItems.map((bill) => bill?.item).join(' '),
      payments: bill?.payments,
      totalAmount: bill?.lineItems?.map((item) => item.price * item.quantity).reduce((prev, curr) => prev + curr, 0),
      tenderedAmount: bill?.payments?.map((item) => item.amountTendered).reduce((prev, curr) => prev + curr, 0),
      totalPayments: bill?.totalPayments,
      totalDeposits: bill?.totalDeposits,
      totalExempted: bill?.totalExempted,
      balance: bill?.balance,
      closed: bill?.closed,
    };

    return mappedBill;
  };

  // filter out voided line items to prevent them from being included in the bill
  // TODO: add backend support for voided line items
  // https://thepalladiumgroup.atlassian.net/browse/KHP3-7068
  const filteredLineItems = data?.data?.lineItems?.filter((li) => !li?.voided) ?? [];
  const formattedBill = data?.data
    ? mapBillProperties({ ...data?.data, lineItems: filteredLineItems })
    : ({} as MappedBill);

  return {
    bill: formattedBill,
    error,
    isLoading,
    isValidating,
    mutate,
  };
};

export const processBillPayment = (payload, billUuid: string) => {
  const url = `${restBaseUrl}/cashier/bill/${billUuid}`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export type ProcessPhcClaimResponse = {
  success?: boolean;
  service_type?: string;
  consentToken?: string;
  invoiceNumber?: string | null;
  interventions?: string[];
  message?: string;
  error?: string;
  [key: string]: unknown;
};

export const processPhcClaim = async (visitUuid: string, billUuid: string): Promise<ProcessPhcClaimResponse> => {
  const url = `${restBaseUrl}/insuranceclaims/phc/processVisit?visitUuid=${visitUuid}&billUuid=${billUuid}`;
  const response = await openmrsFetch<ProcessPhcClaimResponse>(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data;
};

export function useDefaultFacility() {
  const { authenticated } = useSession();
  const url = '${restBaseUrl}/kenyaemr/default-facility';
  const { data, isLoading } = useSWR<{ data: FacilityDetail }>(authenticated ? url : null, openmrsFetch, {});
  return { data: data?.data, isLoading: isLoading };
}

export function useFetchSearchResults(searchVal, category) {
  let url = ``;
  if (category == 'Stock Item') {
    url = `${restBaseUrl}/stockmanagement/stockitem?v=default&limit=10&q=${searchVal}`;
  } else {
    url = `${restBaseUrl}/cashier/billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
  }
  const { data, error, isLoading, isValidating } = useSWR(searchVal ? url : null, openmrsFetch, {});

  return { data: data?.data, error, isLoading: isLoading, isValidating };
}

export const usePatientPaymentInfo = (patientUuid: string) => {
  const { currentVisit } = useVisit(patientUuid);
  const attributes = currentVisit?.attributes ?? [];
  const paymentInformation = attributes
    .map((attribute) => ({
      name: attribute.attributeType.name,
      value: attribute.value,
    }))
    .filter(({ name }) => name === 'Insurance scheme' || name === 'Policy Number');

  return paymentInformation;
};

export const processBillItems = (payload) => {
  const url = `${restBaseUrl}/cashier/bill`;
  return openmrsFetch(url, {
    method: 'POST',
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
  });
};

export const usePaymentModes = (excludeWaiver: boolean = true) => {
  const { excludedPaymentMode } = useConfig<BillingConfig>();
  const url = `${restBaseUrl}/cashier/paymentMode?v=full`;
  const { data, isLoading, error, mutate } = useSWR<{ data: { results: Array<PaymentMethod> } }>(url, openmrsFetch, {
    errorRetryCount: 2,
  });
  const allowedPaymentModes =
    excludedPaymentMode?.length > 0
      ? data?.data?.results.filter((mode) => !excludedPaymentMode.some((excluded) => excluded.uuid === mode.uuid)) ?? []
      : data?.data?.results ?? [];
  return {
    paymentModes: excludeWaiver ? allowedPaymentModes : data?.data?.results,
    isLoading,
    mutate,
    error,
  };
};

export const useBillableItems = () => {
  const url = `${restBaseUrl}/cashier/billableService?v=custom:(uuid,name,shortName,serviceStatus,serviceType:(display),servicePrices:(uuid,name,price,paymentMode))`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);
  const [searchTerm, setSearchTerm] = useState('');
  const allItems = useMemo(() => data?.data?.results ?? [], [data]);
  const filteredItems = useMemo(
    () => allItems.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [allItems, searchTerm],
  );
  // Level 2 facilities bill a single, fixed service for outpatient visits — found by service type
  // rather than uuid so it keeps working if the billable service is re-created. The name varies by
  // facility ("Clinical Consultation", "Adult Consultation", "Consultation", ...), so only the
  // service type (a coded concept, not free text) is matched exactly.
  const consultationService = useMemo(() => {
    const match = allItems.find(
      (item: any) =>
        (item?.serviceType?.display ?? '').toLowerCase() === 'clinical consultation' &&
        (item?.name ?? '').toLowerCase().includes('consultation'),
    );
    return match ?? null;
  }, [allItems]);
  return {
    lineItems: filteredItems,
    consultationService,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
  };
};
export const useCashPoint = () => {
  const url = `${restBaseUrl}/cashier/cashPoint`;
  const { data, isLoading, error } = useSWR<{ data: { results: Array<OpenmrsResource> } }>(url, openmrsFetch);
  const cashPoints = useMemo(() => data?.data?.results ?? [], [data]);

  return { isLoading, error, cashPoints };
};

export const createPatientBill = (payload) => {
  const postUrl = `${restBaseUrl}/cashier/bill`;
  return openmrsFetch(postUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
};

export function createVisitAttribute(visitUuid: string, attributeType: string, value: string) {
  return openmrsFetch(`${restBaseUrl}/visit/${visitUuid}/attribute`, {
    method: 'POST',
    headers: { 'Content-type': 'application/json' },
    body: { attributeType, value },
  });
}

export const useConceptAnswers = (conceptUuid: string) => {
  const url = `${restBaseUrl}/concept/${conceptUuid}`;
  const { data, isLoading, error } = useSWR<{ data: { answers: Array<OpenmrsResource> } }>(url, openmrsFetch);
  return { conceptAnswers: data?.data?.answers, isLoading, error };
};

export const billingFormSchema = z.object({
  cashPoint: z.string().uuid(),
  cashier: z.string().uuid(),
  patient: z.string().uuid(),
  payments: z.array(z.string()),
  status: z.enum(['PENDING']),
  lineItems: z
    .array(
      z.object({
        billableService: z.string().uuid(),
        quantity: z.number({ coerce: true }).min(1),
        price: z.number({ coerce: true }),
        priceName: z.string().optional().default('Default'),
        priceUuid: z.string().uuid(),
        lineItemOrder: z.number().optional().default(0),
        order: z.string().optional().default(''),
        paymentStatus: z.enum(['PENDING']),
      }),
    )
    .min(1),
});

export type BillingFormData = z.infer<typeof billingFormSchema>;

export const addPaymentToBill = (billUuid: string, payload: Record<string, any>) => {
  const url = `${restBaseUrl}/cashier/bill/${billUuid}/payment`;
  return openmrsFetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
};
