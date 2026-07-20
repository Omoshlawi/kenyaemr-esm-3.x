import { updateClaimStatus } from './patient-dashboard/form/claims-form.resource';

export const statusColors = {
  ENTERED: 'blue',
  ERRORED: 'red',
  REJECTED: 'red',
  CHECKED: 'green',
  VALUATED: 'purple',
};

type ProgressCallback =
  | ((payload: { completed: number; total: number; success: number; failed: number }) => void)
  | null;

/**
 * Update multiple claim statuses in sequence
 *
 * @param {Array<string>} responseUUIDs - Array of response UUIDs to update
 * @param {Function} progressCallback - Callback to track progress
 * @returns {Promise<{success: number, failed: number}>} - Object containing success and failed counts
 */
export async function updateMultipleClaimStatuses(
  responseUUIDs: Array<string>,
  progressCallback: ProgressCallback = null,
) {
  const results = { success: 0, failed: 0 };

  for (let i = 0; i < responseUUIDs.length; i++) {
    const responseUUID = responseUUIDs[i];

    try {
      await updateClaimStatus(responseUUID);
      results.success++;
    } catch (error) {
      results.failed++;
    }

    if (progressCallback) {
      progressCallback({
        completed: i + 1,
        total: responseUUIDs.length,
        success: results.success,
        failed: results.failed,
      });
    }
  }

  return results;
}

export const formatDateTime = (dateString: string) => {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  return date.toLocaleString();
};

export type ExternalApiErrorEntry = {
  raw: string;
  timestamp?: string;
  action?: string;
  http?: string;
  parsed?: {
    error?: string;
    message?: string;
    inner?: unknown;
    [key: string]: unknown;
  } | null;
};

export function parseExternalApiErrors(errString?: string): Array<ExternalApiErrorEntry> {
  if (!errString) {
    return [];
  }

  const entries: Array<ExternalApiErrorEntry> = [];
  const parts = errString
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const lineRegex = /^\[(.*?)\]\s*([^:]+):\s*(?:HTTP\s*(\d+):\s*)?(.*)$/s;

  for (const part of parts) {
    const firstLine = part.split(/\n/)[0];
    const match = firstLine.match(lineRegex);
    const entry: ExternalApiErrorEntry = { raw: part };

    if (!match) {
      try {
        entry.parsed = JSON.parse(part);
      } catch {
        entry.parsed = null;
      }

      entries.push(entry);
      continue;
    }

    entry.timestamp = match[1];
    entry.action = match[2]?.trim();
    entry.http = match[3];
    const rest = match[4]?.trim() ?? '';

    const candidate = rest || part;
    try {
      entry.parsed = JSON.parse(candidate);
    } catch {
      const firstBrace = candidate.indexOf('{');
      const lastBrace = candidate.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSub = candidate.substring(firstBrace, lastBrace + 1);
        try {
          entry.parsed = JSON.parse(jsonSub);
        } catch {
          try {
            entry.parsed = JSON.parse(jsonSub.replace(/\\"/g, '"'));
          } catch {
            entry.parsed = null;
          }
        }
      } else {
        entry.parsed = null;
      }
    }

    if (entry.parsed && typeof entry.parsed.message === 'string') {
      const inner = entry.parsed.message;
      const innerFirst = inner.indexOf('{');
      const innerLast = inner.lastIndexOf('}');

      if (innerFirst !== -1 && innerLast > innerFirst) {
        const innerJson = inner.substring(innerFirst, innerLast + 1);

        try {
          entry.parsed.inner = JSON.parse(innerJson);
        } catch {
          try {
            entry.parsed.inner = JSON.parse(innerJson.replace(/\\"/g, '"'));
          } catch {
            entry.parsed.inner = null;
          }
        }
      }
    }

    entries.push(entry);
  }

  return entries;
}
