import { Visit, openmrsFetch, restBaseUrl, useConfig, useVisit } from '@openmrs/esm-framework';
import { useMemo } from 'react';
import useSWR from 'swr';
import { mapBillProperties } from '../billing.resource';
import { BillingConfig } from '../config-schema';
import { BillingPromptType, MappedBill, PatientInvoice } from '../types';
import dayjs from 'dayjs';

interface BillingPromptResult {
  shouldShowBillingPrompt: boolean;
  isLoading: boolean;
  error: Error | null;
  activeVisit: Visit | null;
  bills: Array<MappedBill>;
  isInsuranceVisit: boolean;
  billingDuration?: {
    isWithinPromptDuration: boolean;
    hoursSinceLastBill: number;
    lastDateBilled: Date;
    mostRecentBill: MappedBill;
  };
}

const isCurrentVisitInPatient = (visit: Visit | null, inPatientVisitTypeUuid: string): boolean => {
  if (!visit?.visitType?.uuid) {
    return false;
  }
  return visit.visitType.uuid === inPatientVisitTypeUuid;
};

const getVisitAttributeValue = (visit: Visit | null, attributeTypeUuid: string): unknown => {
  if (!visit?.attributes || !attributeTypeUuid) {
    return undefined;
  }
  const attr = visit.attributes.find((a) => a?.attributeType?.uuid === attributeTypeUuid);
  return attr?.value;
};

const extractUuid = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, any>;
    return obj.uuid ?? obj.valueCoded?.uuid;
  }
  return undefined;
};

export const isInsurancePaymentMethod = (activeVisit: Visit | null, config: BillingConfig): boolean => {
  if (!activeVisit) {
    return false;
  }

  const paymentMethodAttrTypeUuid = config?.visitAttributeTypes?.paymentMethods;
  const insuranceSchemeAttrTypeUuid = config?.visitAttributeTypes?.insuranceScheme;
  const configuredInsuranceMethodUuid = config?.insurancePaymentMethod;
  const excludedPaymentMethods = config?.paymentMethodsUuidsThatShouldNotShowPrompt ?? [];

  const paymentMethodValue = getVisitAttributeValue(activeVisit, paymentMethodAttrTypeUuid);
  const paymentMethodUuid = extractUuid(paymentMethodValue);
  const insuranceSchemeValue = getVisitAttributeValue(activeVisit, insuranceSchemeAttrTypeUuid);

  if (paymentMethodUuid && excludedPaymentMethods.includes(paymentMethodUuid)) {
    return true;
  }

  if (paymentMethodUuid && configuredInsuranceMethodUuid && paymentMethodUuid === configuredInsuranceMethodUuid) {
    return true;
  }

  if (insuranceSchemeValue !== undefined && insuranceSchemeValue !== null && insuranceSchemeValue !== '') {
    return true;
  }

  return false;
};

export const checkPaymentMethodExclusion = (
  activeVisit: Visit | null,
  _excludedPaymentMethods: string[],
  config?: BillingConfig,
): boolean => {
  if (!config) {
    return false;
  }
  return isInsurancePaymentMethod(activeVisit, config);
};

const calculateBillBalance = (bills: Array<MappedBill>): number => {
  return bills.reduce((acc, curr) => acc + curr.balance, 0);
};

const shouldShowPrompt = (
  activeVisit: Visit | null,
  patientBillBalance: number,
  inPatientVisitTypeUuid: string,
): boolean => {
  const isInPatient = isCurrentVisitInPatient(activeVisit, inPatientVisitTypeUuid);
  return patientBillBalance > 0 && !isInPatient;
};

const hasOnlyOrderBills = (bills: Array<MappedBill>): boolean => {
  const flattenedBills = bills.flatMap((bill) => bill.lineItems);
  if (flattenedBills.length === 0) {
    return false;
  }
  return flattenedBills.every((item) => item?.order);
};

export const useBillingPrompt = (
  patientUuid: string,
  promptType: BillingPromptType = 'billing-orders',
): BillingPromptResult => {
  const config = useConfig<BillingConfig>();
  const { activeVisit, isLoading: isLoadingVisit } = useVisit(patientUuid);
  const { patientBills: bills, isLoading: isLoadingBills, error } = usePatientBills(patientUuid);

  const { inPatientVisitTypeUuid } = config;

  const isLoading = isLoadingBills || isLoadingVisit;

  const isInsuranceVisit = isInsurancePaymentMethod(activeVisit, config);
  const patientBillBalance = calculateBillBalance(bills);
  const hasOnlyOrders = hasOnlyOrderBills(bills);
  const billingDuration = checkBillingDuration(bills, config);

  if (isLoading) {
    return {
      shouldShowBillingPrompt: false,
      isLoading: true,
      error,
      activeVisit,
      bills,
      isInsuranceVisit: false,
      billingDuration,
    };
  }

  if (isInsuranceVisit) {
    return {
      shouldShowBillingPrompt: false,
      isLoading: false,
      error,
      activeVisit,
      bills,
      isInsuranceVisit: true,
      billingDuration,
    };
  }

  if (promptType === 'patient-chart' && hasOnlyOrders) {
    return {
      shouldShowBillingPrompt: false,
      isLoading: false,
      error,
      activeVisit,
      bills,
      isInsuranceVisit: false,
      billingDuration,
    };
  }

  if (promptType === 'patient-chart' && config?.promptDuration?.enable && !billingDuration.isWithinPromptDuration) {
    return {
      shouldShowBillingPrompt: false,
      isLoading: false,
      error,
      activeVisit,
      bills,
      isInsuranceVisit: false,
      billingDuration,
    };
  }

  return {
    shouldShowBillingPrompt: shouldShowPrompt(activeVisit, patientBillBalance, inPatientVisitTypeUuid),
    isLoading: false,
    error,
    activeVisit,
    bills,
    isInsuranceVisit: false,
    billingDuration,
  };
};

export const usePatientBills = (patientUuid: string) => {
  const { patientBillsUrl } = useConfig<BillingConfig>();
  const url = patientBillsUrl.replace('${restBaseUrl}', restBaseUrl);
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: { results: Array<PatientInvoice> } }>(
    patientUuid ? `${url}&patientUuid=${patientUuid}&includeVoided=true` : null,
    openmrsFetch,
    {
      errorRetryCount: 2,
    },
  );

  const patientBills = useMemo(() => {
    return data?.data?.results?.map(mapBillProperties) ?? [];
  }, [data?.data?.results]);

  return {
    patientBills: patientBills ?? [],
    isLoading,
    error,
    isValidating,
    mutate,
  };
};

const checkBillingDuration = (bills: Array<MappedBill> = [], config: BillingConfig) => {
  if (!config?.promptDuration?.enable || bills.length === 0) {
    return {
      isWithinPromptDuration: false,
      hoursSinceLastBill: 0,
      lastDateBilled: new Date(),
      mostRecentBill: null,
    };
  }

  const sortedBills = [...bills].sort((a, b) => dayjs(b.dateCreated).diff(dayjs(a.dateCreated)));

  const mostRecentBill = sortedBills[0];
  const lastDateBilled = new Date(mostRecentBill?.dateCreatedUnformatted);
  const currentDate = new Date();

  const hoursSinceLastBill = dayjs(currentDate).diff(dayjs(lastDateBilled), 'hour');

  return {
    isWithinPromptDuration: hoursSinceLastBill <= config.promptDuration.duration,
    hoursSinceLastBill,
    lastDateBilled,
    mostRecentBill,
  };
};
