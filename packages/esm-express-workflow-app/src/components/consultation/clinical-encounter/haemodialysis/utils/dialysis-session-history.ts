import type { HaemodialysisSession } from '../types';
import { displayValue, postDialysisToFields, preDialysisToFields } from './formatters';
import { getCodedAnswerLabel, isLikelyConceptUuid } from '../constants/coded-answers';
import { formatDialysisSessionDate } from './dialysis-session-lifecycle';
import { isMonitoringTerminated } from './monitoring-schedule';

export type HistoryTableColumn = { key: string; header: string };

export type HistoryTableRow = Record<string, string> & { id: string };

const withSessionDate = (session: HaemodialysisSession, cells: Record<string, string>): HistoryTableRow => ({
  id: session.encounterUuid ?? formatDialysisSessionDate(session),
  sessionDate: formatDialysisSessionDate(session),
  ...cells,
});

const coded = (value?: string): string => {
  if (!value?.trim()) {
    return '—';
  }
  const label = getCodedAnswerLabel(value);
  if (label) {
    return label;
  }
  if (isLikelyConceptUuid(value)) {
    return '—';
  }
  return displayValue(value);
};

const fieldSummary = (fields: { label: string; value: string }[], max = 3): string => {
  const parts = fields
    .filter((field) => field.value && field.value !== '—')
    .slice(0, max)
    .map((field) => `${field.label}: ${field.value}`);
  return parts.length > 0 ? parts.join('; ') : '—';
};

export const SCREENING_HISTORY_COLUMNS: HistoryTableColumn[] = [
  { key: 'sessionDate', header: 'Session date' },
  { key: 'bloodGroup', header: 'Blood group' },
  { key: 'hivStatus', header: 'HIV' },
  { key: 'hepatitisBStatus', header: 'Hep B' },
  { key: 'drugAllergy', header: 'Drug allergy' },
];

export function buildScreeningHistoryRows(sessions: HaemodialysisSession[]): HistoryTableRow[] {
  return sessions.map((session) =>
    withSessionDate(session, {
      bloodGroup: coded(session.screening?.bloodGroup),
      hivStatus: coded(session.screening?.hivStatus),
      hepatitisBStatus: coded(session.screening?.hepatitisBStatus),
      drugAllergy: displayValue(session.screening?.drugAllergy),
    }),
  );
}

export const PRE_DIALYSIS_HISTORY_COLUMNS: HistoryTableColumn[] = [
  { key: 'sessionDate', header: 'Session date' },
  { key: 'weightBefore', header: 'Weight before' },
  { key: 'bloodPressure', header: 'BP' },
  { key: 'accessType', header: 'Access' },
  { key: 'summary', header: 'Summary' },
];

export function buildPreDialysisHistoryRows(sessions: HaemodialysisSession[]): HistoryTableRow[] {
  return sessions.map((session) =>
    withSessionDate(session, {
      weightBefore: displayValue(session.preDialysis?.weightBefore),
      bloodPressure: displayValue(session.preDialysis?.bloodPressure),
      accessType: coded(session.preDialysis?.accessType),
      summary: fieldSummary(preDialysisToFields(session.preDialysis)),
    }),
  );
}

export const PRESCRIPTION_HISTORY_COLUMNS: HistoryTableColumn[] = [
  { key: 'sessionDate', header: 'Session date' },
  { key: 'dialyzerType', header: 'Dialyzer' },
  { key: 'bfr', header: 'BFR' },
  { key: 'ufGoal', header: 'UF goal' },
  { key: 'duration', header: 'Duration' },
];

export function buildPrescriptionHistoryRows(sessions: HaemodialysisSession[]): HistoryTableRow[] {
  return sessions.map((session) =>
    withSessionDate(session, {
      dialyzerType: coded(session.prescription?.dialyzerType),
      bfr: displayValue(session.prescription?.bfr),
      ufGoal: displayValue(session.prescription?.ufGoal),
      duration: displayValue(session.prescription?.duration),
    }),
  );
}

export const MACHINE_CHECK_HISTORY_COLUMNS: HistoryTableColumn[] = [
  { key: 'sessionDate', header: 'Session date' },
  { key: 'machineCheckDate', header: 'Check date' },
  { key: 'bloodLeaks', header: 'Blood leaks' },
  { key: 'airDetector', header: 'Air detector' },
  { key: 'conductivity', header: 'Conductivity' },
];

export function buildMachineCheckHistoryRows(sessions: HaemodialysisSession[]): HistoryTableRow[] {
  return sessions.map((session) =>
    withSessionDate(session, {
      machineCheckDate: displayValue(session.machineCheck?.machineCheckDate),
      bloodLeaks: coded(session.machineCheck?.bloodLeaks),
      airDetector: coded(session.machineCheck?.airDetector),
      conductivity: displayValue(session.machineCheck?.conductivity),
    }),
  );
}

export const MONITORING_HISTORY_COLUMNS: HistoryTableColumn[] = [
  { key: 'sessionDate', header: 'Session date' },
  { key: 'observationCount', header: 'Observations' },
  { key: 'lastSlot', header: 'Last slot (min)' },
  { key: 'status', header: 'Status' },
];

export function buildMonitoringHistoryRows(sessions: HaemodialysisSession[]): HistoryTableRow[] {
  return sessions.map((session) => {
    const rows = session.monitoring ?? [];
    const lastSlot = rows.length > 0 ? String(Math.max(...rows.map((row) => row.slotMinute))) : '—';
    const status = isMonitoringTerminated(session.monitoringAction)
      ? `Terminated @ ${
          session.monitoringAction?.type === 'terminated' ? session.monitoringAction.atSlotMinute : '—'
        } min`
      : rows.length > 0
      ? 'Completed'
      : '—';
    return withSessionDate(session, {
      observationCount: String(rows.length),
      lastSlot,
      status,
    });
  });
}

export const POST_DIALYSIS_HISTORY_COLUMNS: HistoryTableColumn[] = [
  { key: 'sessionDate', header: 'Session date' },
  { key: 'weightAfter', header: 'Weight after' },
  { key: 'totalUfAchieved', header: 'Total UF' },
  { key: 'complications', header: 'Complications' },
  { key: 'summary', header: 'Summary' },
];

export function buildPostDialysisHistoryRows(sessions: HaemodialysisSession[]): HistoryTableRow[] {
  return sessions.map((session) =>
    withSessionDate(session, {
      weightAfter: displayValue(session.postDialysis?.weightAfter),
      totalUfAchieved: displayValue(session.postDialysis?.totalUfAchieved),
      complications: displayValue(session.postDialysis?.complications),
      summary: fieldSummary(postDialysisToFields(session.postDialysis)),
    }),
  );
}

export const SUMMARY_HISTORY_COLUMNS: HistoryTableColumn[] = [
  { key: 'sessionDate', header: 'Session date' },
  { key: 'prescribedDuration', header: 'Prescribed duration' },
  { key: 'actualDuration', header: 'Actual duration' },
  { key: 'adequacyAchieved', header: 'Adequacy' },
  { key: 'comments', header: 'Comments' },
];

export function buildSummaryHistoryRows(sessions: HaemodialysisSession[]): HistoryTableRow[] {
  return sessions.map((session) =>
    withSessionDate(session, {
      prescribedDuration: displayValue(session.summary?.prescribedDuration),
      actualDuration: displayValue(session.summary?.actualDuration),
      adequacyAchieved: coded(session.summary?.adequacyAchieved),
      comments: displayValue(session.summary?.comments),
    }),
  );
}
