import type { HaemodialysisSession, MonitoringRow } from '../types';
import { displayValue, postDialysisToFields, preDialysisToFields } from './formatters';
import { getCodedAnswerLabel, isLikelyConceptUuid } from '../constants/coded-answers';
import { formatDialysisSessionDate } from './dialysis-session-lifecycle';
import { formatScreeningTestDate } from './screening-history';
import { compareMonitoringRows, formatClockTime, formatObservationTime, formatSlotLabel } from './monitoring-slots';
import { parseMonitoringDatetime } from './monitoring-datetime';

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

const formatScreeningHistoryResult = (value?: string, testDate?: string): string => {
  const result = coded(value);
  if (result === '—') {
    return result;
  }
  const date = formatScreeningTestDate(testDate);
  return date ? `${result} (${date})` : result;
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
  { key: 'hepatitisCStatus', header: 'Hep C' },
  { key: 'syphilisStatus', header: 'Syphilis' },
  { key: 'drugAllergy', header: 'Drug allergy' },
];

export function buildScreeningHistoryRows(sessions: HaemodialysisSession[]): HistoryTableRow[] {
  return sessions.map((session) =>
    withSessionDate(session, {
      bloodGroup: coded(session.screening?.bloodGroup),
      hivStatus: formatScreeningHistoryResult(session.screening?.hivStatus, session.screening?.hivTestDate),
      hepatitisBStatus: formatScreeningHistoryResult(
        session.screening?.hepatitisBStatus,
        session.screening?.hepatitisBTestDate,
      ),
      hepatitisCStatus: formatScreeningHistoryResult(
        session.screening?.hepatitisCStatus,
        session.screening?.hepatitisCTestDate,
      ),
      syphilisStatus: formatScreeningHistoryResult(
        session.screening?.syphilisStatus,
        session.screening?.syphilisTestDate,
      ),
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
  { key: 'slot', header: 'Slot' },
  { key: 'recordedAt', header: 'Recorded at' },
  { key: 'bp', header: 'BP' },
  { key: 'pulse', header: 'Pulse' },
  { key: 'temp', header: 'Temp' },
  { key: 'ufRemoved', header: 'UF removed' },
  { key: 'heparin', header: 'Heparin' },
  { key: 'remarks', header: 'Remarks' },
];

export const CURRENT_MONITORING_READING_COLUMNS: HistoryTableColumn[] = [
  { key: 'slot', header: 'Slot' },
  { key: 'recordedAt', header: 'Recorded at' },
  { key: 'bp', header: 'BP (mmHg)' },
  { key: 'pulse', header: 'Pulse (bpm)' },
  { key: 'temp', header: 'Temp (°C)' },
  { key: 'ufRemoved', header: 'UF Removed (mL)' },
  { key: 'heparin', header: 'Heparin (Units)' },
  { key: 'remarks', header: 'Remarks' },
];

const formatReadingClockTime = (row: MonitoringRow, startedAt?: Date): string => {
  const recorded = parseMonitoringDatetime(row.recordedAt);
  if (recorded) {
    return formatClockTime(recorded);
  }
  const observationTime = formatObservationTime(row, startedAt);
  return observationTime || '—';
};

export function buildCurrentMonitoringReadingRows(rows: MonitoringRow[], startedAt?: Date): HistoryTableRow[] {
  return [...rows].sort(compareMonitoringRows).map((row, index) => ({
    id: row.uuid ?? `${row.slotMinute}-${row.recordedAt ?? index}-${index}`,
    slot: formatSlotLabel(row.slotMinute),
    recordedAt: formatReadingClockTime(row, startedAt),
    bp: displayValue(row.bp),
    pulse: displayValue(row.pulse),
    temp: displayValue(row.temp),
    ufRemoved: displayValue(row.ufRemoved),
    heparin: displayValue(row.heparin),
    remarks: displayValue(row.remarks),
  }));
}

export function buildMonitoringHistoryRows(sessions: HaemodialysisSession[]): HistoryTableRow[] {
  return sessions.flatMap((session) => {
    const observations = [...(session.monitoring ?? [])].sort(compareMonitoringRows);
    if (observations.length === 0) {
      return [
        {
          id: `${session.encounterUuid ?? formatDialysisSessionDate(session)}-monitoring-empty`,
          sessionDate: formatDialysisSessionDate(session),
          slot: '—',
          recordedAt: '—',
          bp: '—',
          pulse: '—',
          temp: '—',
          ufRemoved: '—',
          heparin: '—',
          remarks: '—',
        },
      ];
    }

    return observations.map((row, index) => ({
      id: `${session.encounterUuid ?? formatDialysisSessionDate(session)}-${row.slotMinute}-${
        row.recordedAt ?? index
      }-${index}`,
      sessionDate: formatDialysisSessionDate(session),
      slot: formatSlotLabel(row.slotMinute),
      recordedAt: formatObservationTime(row),
      bp: displayValue(row.bp),
      pulse: displayValue(row.pulse),
      temp: displayValue(row.temp),
      ufRemoved: displayValue(row.ufRemoved),
      heparin: displayValue(row.heparin),
      remarks: displayValue(row.remarks),
    }));
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
