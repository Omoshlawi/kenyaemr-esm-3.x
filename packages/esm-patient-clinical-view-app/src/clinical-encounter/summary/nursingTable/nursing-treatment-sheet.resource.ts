import { useMemo } from 'react';
import useSWR from 'swr';
import { type FetchResponse, formatDatetime, openmrsFetch, parseDate, restBaseUrl } from '@openmrs/esm-framework';
import { type Order } from '@openmrs/esm-patient-common-lib';
import { useTranslation } from 'react-i18next';

import { DRUG_ORDER_TYPE_UUID } from '../../../constants';

type OrdersResponse = {
  results?: Array<Order>;
};

export interface NursingTreatmentSheetRow {
  id: string;
  date: string;
  drug: string;
  dose: string;
  route: string;
  provider: string;
  time: string;
  itemAndAdministrationInstructions: string;
  reviewDate: string;
}

const formatEmptyValue = (value?: string | number | null) => (value || value === 0 ? String(value) : '--');

const formatDate = (value?: string | null) => {
  if (!value) {
    return '--';
  }

  return formatDatetime(parseDate(value), { mode: 'standard', noToday: true });
};

const formatTime = (value?: string | null) => {
  if (!value) {
    return '--';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '--' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDose = (order: Order) => {
  const dose = formatEmptyValue(order.dose);
  const doseUnits = order.doseUnits?.display;

  return (
    [dose, doseUnits]
      .filter((part) => part && part !== '--')
      .join(' ')
      .trim() || '--'
  );
};

const formatVolume = (order: Order) => {
  const quantity = formatEmptyValue(order.quantity);
  const quantityUnits = order.quantityUnits?.display;

  return (
    [quantity, quantityUnits]
      .filter((part) => part && part !== '--')
      .join(' ')
      .trim() || '--'
  );
};

const formatAdministrationInstructions = (order: Order, t?: (key: string, defaultValue: string) => string) => {
  const translate = t || ((key, defaultValue) => defaultValue);
  const entries = [
    `${translate('volume', 'Volume')}: ${formatVolume(order)}`,
    `${translate('frequency', 'Frequency')}: ${formatEmptyValue(order.frequency?.display)}`,
    `${translate('rate', 'Rate')}: ${formatDose(order)}`,
    `${translate('duration', 'Duration')}: ${
      [formatEmptyValue(order.duration), order.durationUnits?.display]
        .filter((part) => part && part !== '--')
        .join(' ') || '--'
    }`,
  ];

  return entries.join(' | ');
};

const getDrugDisplay = (order: Order, fallback: string) => {
  const nonCodedDrugName = (order as Order & { drugNonCoded?: string }).drugNonCoded;
  return order.drug?.display || nonCodedDrugName || fallback;
};

export function useNursingTreatmentSheet(patientUuid: string) {
  const { t } = useTranslation();
  const apiUrl = patientUuid
    ? `${restBaseUrl}/order?patient=${patientUuid}&orderType=${DRUG_ORDER_TYPE_UUID}&v=full&limit=200`
    : null;

  const { data, error, isLoading, mutate } = useSWR<FetchResponse<OrdersResponse>, Error>(apiUrl, openmrsFetch);

  const orders = useMemo(() => {
    const results = data?.data?.results ?? [];

    return [...results].sort((left, right) => {
      const leftDate = left.dateActivated ? new Date(left.dateActivated).getTime() : 0;
      const rightDate = right.dateActivated ? new Date(right.dateActivated).getTime() : 0;

      return rightDate - leftDate;
    });
  }, [data]);

  const activeOrders = useMemo(() => orders.filter((order) => !order.dateStopped), [orders]);
  const pastOrders = useMemo(() => orders.filter((order) => Boolean(order.dateStopped)), [orders]);

  const medicationRows = useMemo<NursingTreatmentSheetRow[]>(
    () =>
      orders.map((order) => ({
        id: order.uuid,
        date: formatDate(order.dateActivated),
        drug: getDrugDisplay(order, t('unknownDrug', 'Unknown Drug')),
        dose: formatDose(order),
        route: order.route?.display || '--',
        provider: order.orderer?.person?.display || order.orderer?.display || '--',
        time: formatTime(order.dateActivated),
        itemAndAdministrationInstructions: formatAdministrationInstructions(order, t),
        reviewDate: formatDate(order.dateStopped || order.dateActivated),
      })),
    [orders, t],
  );

  const fluidAndNutritionRows = useMemo<NursingTreatmentSheetRow[]>(
    () =>
      orders.map((order) => ({
        id: `${order.uuid}-fluid`,
        date: formatDate(order.dateActivated),
        drug: getDrugDisplay(order, t('unknownItem', 'Unknown Item')),
        dose: formatDose(order),
        route: order.route?.display || '--',
        provider: order.orderer?.person?.display || order.orderer?.display || '--',
        time: formatTime(order.dateActivated),
        itemAndAdministrationInstructions: formatAdministrationInstructions(order, t),
        reviewDate: formatDate(order.dateStopped || order.dateActivated),
      })),
    [orders, t],
  );

  const localizedError = error ? t('failedToLoadDrugOrders', 'Failed to load drug orders') : undefined;

  return {
    activeOrders,
    pastOrders,
    medicationRows,
    fluidAndNutritionRows,
    isLoading,
    error: localizedError,
    mutate,
  };
}
