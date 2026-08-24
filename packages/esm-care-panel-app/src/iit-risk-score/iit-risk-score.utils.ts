export interface RiskFactorEntry {
  key: string;
  label: string;
  value: string;
}

const KNOWN_RISK_FACTOR_LABELS: Record<string, string> = {
  avg_days_late_last5visits: 'Avg. days late (last 5 visits)',
  adherence: 'Adherence',
  unscheduled_visits: 'Unscheduled visits',
  months_on_art: 'Months on ART',
  most_recent_viralload: 'Most recent viral load',
};

function humanizeKey(key: string): string {
  if (KNOWN_RISK_FACTOR_LABELS[key]) {
    return KNOWN_RISK_FACTOR_LABELS[key];
  }
  return key
    .replace(/_/g, ' ')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatRiskFactorValue(value: unknown): string {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '' && !Number.isNaN(Number(trimmed))) {
      const num = Number(trimmed);
      return Number.isInteger(num) ? String(num) : num.toFixed(1);
    }
    return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  }
  return value == null ? '—' : String(value);
}

const LENIENT_ENTRY_PATTERN = /([a-zA-Z_]\w*)"?\s*:\s*"?([^",}]+)"?/g;

function extractRiskFactorsLeniently(raw: string): Array<[string, string]> {
  return Array.from(raw.matchAll(LENIENT_ENTRY_PATTERN)).map((match) => [match[1], match[2].trim()]);
}

export function parseRiskFactors(raw: string | null | undefined): Array<RiskFactorEntry> | null {
  if (!raw || typeof raw !== 'string') {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  let entries: Array<[string, unknown]>;
  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    entries = Object.entries(parsed as Record<string, unknown>);
  } catch {
    entries = extractRiskFactorsLeniently(trimmed);
  }

  if (entries.length === 0) {
    return null;
  }

  return entries.map(([key, value]) => ({
    key,
    label: humanizeKey(key),
    value: formatRiskFactorValue(value),
  }));
}
