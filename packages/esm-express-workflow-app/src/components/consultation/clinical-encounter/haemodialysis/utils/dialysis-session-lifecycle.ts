import type { HaemodialysisSession } from '../types';
import { isSessionAborted } from './monitoring-schedule';

/** Session is closed after post-dialysis and summary, or after a session-level emergency stop. */
export function isDialysisSessionComplete(session?: HaemodialysisSession | null): boolean {
  if (!session?.encounterUuid) {
    return false;
  }
  if (isSessionAborted(session.monitoringAction)) {
    return true;
  }
  return Boolean(session.postDialysis && session.summary);
}

export function formatDialysisSessionDate(session: HaemodialysisSession): string {
  const raw = session.biodata.date?.trim();
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      const hasTime = /T\d{2}:/.test(raw) || /\d{2}:\d{2}/.test(raw);
      return hasTime ? parsed.toLocaleString() : parsed.toLocaleDateString();
    }
    return raw;
  }
  return session.encounterUuid ? `Session ${session.encounterUuid.slice(0, 8)}` : '—';
}
