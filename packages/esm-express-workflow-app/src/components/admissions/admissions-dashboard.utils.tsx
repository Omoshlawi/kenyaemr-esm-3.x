import { formatDate as formatLocalizedDate, parseDate } from '@openmrs/esm-framework';
import { type Order } from '@openmrs/esm-patient-common-lib';
import { useTranslation } from 'react-i18next';

type TranslateOptions = {
  value?: string;
};

type TranslateFn = (key: string, defaultValue: string, options?: TranslateOptions) => string;

export const formatValue = (value: string | number | undefined | null) => (value || value === 0 ? String(value) : '--');

export const formatOrderDate = (dateValue?: string | null) => {
  if (!dateValue) {
    return '--';
  }

  return formatLocalizedDate(parseDate(dateValue));
};

export const formatTime = (dateValue?: string | null) => {
  if (!dateValue) {
    return '--';
  }

  const parsed = new Date(dateValue);
  return Number.isNaN(parsed.getTime()) ? '--' : parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const getDoseText = (order: Order) =>
  [formatValue(order.dose), order.doseUnits?.display].filter((part) => part && part !== '--').join(' ') || '--';

export const getVolumeText = (order: Order) =>
  [formatValue(order.quantity), order.quantityUnits?.display].filter((part) => part && part !== '--').join(' ') || '--';

export const getDrugDisplay = (order: Order) => {
  const nonCodedDrugName = (order as Order & { drugNonCoded?: string }).drugNonCoded;
  return order.drug?.display || nonCodedDrugName || '--';
};

export const formatAdministrationInstructions = (order: Order, t: TranslateFn) => {
  const volume = getVolumeText(order);
  const frequency = formatValue(order.frequency?.display);
  const rate = getDoseText(order);
  const duration =
    [formatValue(order.duration), order.durationUnits?.display].filter((part) => part && part !== '--').join(' ') ||
    '--';

  return [
    t('administrationVolumeValue', 'Volume: {{value}}', { value: volume }),
    t('administrationFrequencyValue', 'Frequency: {{value}}', { value: frequency }),
    t('administrationRateValue', 'Rate: {{value}}', { value: rate }),
    t('administrationDurationValue', 'Duration: {{value}}', { value: duration }),
  ].join(' | ');
};

export const useFormatAdministrationInstructions = () => {
  const { t } = useTranslation();

  const translate: TranslateFn = (key, defaultValue, options) => t(key, { defaultValue, ...(options ?? {}) });

  return (order: Order) => formatAdministrationInstructions(order, translate);
};
