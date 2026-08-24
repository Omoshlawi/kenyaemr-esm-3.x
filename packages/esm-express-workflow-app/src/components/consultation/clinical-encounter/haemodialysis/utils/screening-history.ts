import type { HaemodialysisSession, ScreeningStatus } from '../types';

export type ScreeningRepeatFlags = {
  hivStatus?: boolean;
  hepatitisCStatus?: boolean;
  hepatitisBStatus?: boolean;
  syphilisStatus?: boolean;
};

export const SEROLOGY_KEYS = ['hivStatus', 'hepatitisCStatus', 'hepatitisBStatus', 'syphilisStatus'] as const;
export type SerologyKey = (typeof SEROLOGY_KEYS)[number];

const SEROLOGY_DATE_KEY: Record<
  SerologyKey,
  'hivTestDate' | 'hepatitisCTestDate' | 'hepatitisBTestDate' | 'syphilisTestDate'
> = {
  hivStatus: 'hivTestDate',
  hepatitisCStatus: 'hepatitisCTestDate',
  hepatitisBStatus: 'hepatitisBTestDate',
  syphilisStatus: 'syphilisTestDate',
};

export const getSerologyDateKey = (key: SerologyKey) => SEROLOGY_DATE_KEY[key];

export function toScreeningDateOnly(value?: string): string | undefined {
  if (!value?.trim()) {
    return undefined;
  }
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1];
}

export function formatScreeningTestDate(value?: string): string {
  const dateOnly = toScreeningDateOnly(value);
  if (!dateOnly) {
    return '';
  }
  const parsed = new Date(`${dateOnly}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return dateOnly;
  }
  return parsed.toLocaleDateString();
}

export function derivePatientScreening(sessions: HaemodialysisSession[]): ScreeningStatus {
  const chronological = [...sessions].reverse();
  const latestWith = (hasValue: (screening?: ScreeningStatus) => boolean) =>
    sessions.find((session) => hasValue(session.screening))?.screening;
  const earliestWith = (hasValue: (screening?: ScreeningStatus) => boolean) =>
    chronological.find((session) => hasValue(session.screening))?.screening;

  const blood = earliestWith((screening) => Boolean(screening?.bloodGroup));
  const hiv = latestWith((screening) => Boolean(screening?.hivStatus));
  const hepatitisC = latestWith((screening) => Boolean(screening?.hepatitisCStatus));
  const hepatitisB = latestWith((screening) => Boolean(screening?.hepatitisBStatus));
  const syphilis = latestWith((screening) => Boolean(screening?.syphilisStatus));
  const allergy = latestWith((screening) => Boolean(screening?.drugAllergy));

  return {
    bloodGroup: blood?.bloodGroup,
    hivStatus: hiv?.hivStatus,
    hivTestDate: hiv?.hivTestDate,
    hepatitisCStatus: hepatitisC?.hepatitisCStatus,
    hepatitisCTestDate: hepatitisC?.hepatitisCTestDate,
    hepatitisBStatus: hepatitisB?.hepatitisBStatus,
    hepatitisBTestDate: hepatitisB?.hepatitisBTestDate,
    syphilisStatus: syphilis?.syphilisStatus,
    syphilisTestDate: syphilis?.syphilisTestDate,
    drugAllergy: allergy?.drugAllergy,
  };
}

export function mergeScreeningDisplay(patient: ScreeningStatus, session?: ScreeningStatus): ScreeningStatus {
  const mergeSerology = (key: SerologyKey): ScreeningStatus => {
    const dateKey = SEROLOGY_DATE_KEY[key];
    if (session?.[key]) {
      return { [key]: session[key], [dateKey]: session[dateKey] ?? patient[dateKey] };
    }
    return { [key]: patient[key], [dateKey]: patient[dateKey] };
  };

  return {
    bloodGroup: session?.bloodGroup || patient.bloodGroup,
    ...mergeSerology('hivStatus'),
    ...mergeSerology('hepatitisCStatus'),
    ...mergeSerology('hepatitisBStatus'),
    ...mergeSerology('syphilisStatus'),
    drugAllergy: session?.drugAllergy || patient.drugAllergy,
  };
}

export function hasCapturedBloodGroup(previous?: ScreeningStatus): boolean {
  return Boolean(previous?.bloodGroup);
}

export function shouldCaptureSerology(
  key: SerologyKey,
  previous?: ScreeningStatus,
  repeats?: ScreeningRepeatFlags,
): boolean {
  return !previous?.[key] || Boolean(repeats?.[key]);
}

export function buildScreeningObsPayload(
  screening: ScreeningStatus,
  repeats: ScreeningRepeatFlags | undefined,
  previous?: ScreeningStatus,
): ScreeningStatus {
  const payload: ScreeningStatus = {
    drugAllergy: screening.drugAllergy,
  };

  if (!hasCapturedBloodGroup(previous)) {
    payload.bloodGroup = screening.bloodGroup;
  }

  SEROLOGY_KEYS.forEach((key) => {
    if (!shouldCaptureSerology(key, previous, repeats)) {
      return;
    }
    payload[key] = screening[key];
    payload[SEROLOGY_DATE_KEY[key]] = screening[SEROLOGY_DATE_KEY[key]];
  });

  return payload;
}

export function toScreeningObsDatetime(testDate: string | undefined, fallback: string): string {
  const dateOnly = toScreeningDateOnly(testDate);
  if (!dateOnly) {
    return fallback;
  }
  const fallbackDate = toScreeningDateOnly(fallback);
  if (dateOnly === fallbackDate) {
    return fallback;
  }
  return `${dateOnly}T12:00:00`;
}
