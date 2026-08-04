import type { HaemodialysisSession } from '../types';

/** Session is closed after post-dialysis and summary are saved on the encounter. */
export function isDialysisSessionComplete(session?: HaemodialysisSession | null): boolean {
  return Boolean(session?.encounterUuid && session.postDialysis && session.summary);
}

export function formatDialysisSessionDate(session: HaemodialysisSession): string {
  const raw = session.biodata.date?.trim();
  if (raw) {
    return raw;
  }
  return session.encounterUuid ? `Session ${session.encounterUuid.slice(0, 8)}` : '—';
}
