import { useConfig } from '@openmrs/esm-framework';
import { BillingConfig } from '../config-schema';

// Locale (language-country) to currency mapping
export const DEFAULT_LOCALE_CURRENCY_MAP: Record<string, string> = {
  en: 'KES',
  sw: 'KES',
  am: 'ETB',
  'en-KE': 'KES',
  'sw-KE': 'KES',
  'am-ET': 'ETB',
  'en-NA': 'NAD',
  'af-NA': 'NAD',
};

const getLocale = (): string => localStorage.getItem('i18nextLng') ?? 'en';

export const getCurrentLocale = getLocale;

/**
 * Gets currency code for current locale. Optional config overrides default mapping.
 */
export const getCurrencyForLocale = (config?: BillingConfig): string => {
  const locale = getLocale();
  const map = config?.localeCurrencyMapping ?? DEFAULT_LOCALE_CURRENCY_MAP;
  return map[locale] || 'KES';
};

function formatAmount(
  amount: number,
  currency: string,
  locale: string,
  opts: Intl.NumberFormatOptions & { handleNegative?: boolean },
): string {
  const { handleNegative = false, ...intlOpts } = opts;
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    ...intlOpts,
  });
  const formatted = formatter.format(handleNegative ? Math.abs(amount) : amount);
  return handleNegative && amount < 0 ? `- ${formatted}` : formatted;
}

export function formatCurrency(amount: number, options: Intl.NumberFormatOptions = {}): string {
  return formatAmount(amount, getCurrencyForLocale(), getLocale(), { ...options, handleNegative: true });
}

export function formatCurrencySimple(amount: number, options: Intl.NumberFormatOptions = {}): string {
  return formatAmount(amount, getCurrencyForLocale(), getLocale(), options);
}

export function useCurrencyFormatting() {
  const config = useConfig<BillingConfig>();

  return {
    getCurrency: () => getCurrencyForLocale(config),
    getLocale,
    format: (amount: number, options: Intl.NumberFormatOptions = {}) =>
      formatAmount(amount, getCurrencyForLocale(config), getLocale(), { ...options, handleNegative: true }),
    formatSimple: (amount: number, options: Intl.NumberFormatOptions = {}) =>
      formatAmount(amount, getCurrencyForLocale(config), getLocale(), options),
  };
}
