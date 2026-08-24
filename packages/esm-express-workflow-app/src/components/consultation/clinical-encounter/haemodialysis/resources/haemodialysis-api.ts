import { openmrsFetch, restBaseUrl, toOmrsIsoString } from '@openmrs/esm-framework';
import { ENCOUNTER_ROLE } from '../../../../../config-schema';
import { extractFetchError } from '../../../../../shared/utils';
import { INCLUDE_FORM_IN_ENCOUNTER_POST } from '../constants/encounter-post-flags';
import { getPostDialysisObsFieldLabel } from '../constants/post-dialysis-obs-flags';
import { HAEMODIALYSIS_ENCOUNTER_TYPE_UUID, HAEMODIALYSIS_FORM_UUID } from '../concepts/haemodialysis-concepts';
import type { HaemodialysisEncounterResource, HaemodialysisObsInput } from '../utils/encounter-mapper';
import { formatObsConceptList, validateObsPayload } from '../utils/obs-payload-validation';

export const HAEMODIALYSIS_ENCOUNTER_REP =
  'custom:(uuid,encounterDatetime,encounterType:(uuid,display),' +
  'diagnoses:(diagnosis:(coded:(uuid,display),nonCoded)),' +
  'encounterProviders:(provider:(uuid,name,person:(uuid,display))),' +
  'obs:(uuid,concept:(uuid,display),value,obsDatetime,' +
  'groupMembers:(uuid,concept:(uuid,display),value,obsDatetime)))';

export type AppendHaemodialysisObsOptions = {
  /**
   * - `obs`: POST each observation to /obs (monitoring slots).
   * - `encounter`: append via POST /encounter/{uuid} (post-dialysis; coded obs match initial save).
   */
  strategy?: 'obs' | 'encounter';
  /** When true, any failed observation makes the whole save fail (no partial success). */
  failOnPartial?: boolean;
};

const isCodedObsObject = (value: unknown): value is { uuid: string } =>
  typeof value === 'object' &&
  value !== null &&
  'uuid' in value &&
  typeof (value as { uuid: unknown }).uuid === 'string';

const normalizeObsValueForRest = (value: HaemodialysisObsInput['value']): HaemodialysisObsInput['value'] => {
  if (isCodedObsObject(value)) {
    return value.uuid;
  }
  return value;
};

const prepareObsForPost = (obs: HaemodialysisObsInput[]): HaemodialysisObsInput[] =>
  obs.map((item) => {
    const obsDatetime = item.obsDatetime ? formatDatetimeForOpenMrs(item.obsDatetime) : item.obsDatetime;
    if (item.groupMembers?.length) {
      return {
        ...item,
        obsDatetime,
        groupMembers: item.groupMembers.map((member) => ({
          ...member,
          obsDatetime: member.obsDatetime ? formatDatetimeForOpenMrs(member.obsDatetime) : obsDatetime,
          value: member.value !== undefined ? normalizeObsValueForRest(member.value) : undefined,
        })),
      };
    }
    return {
      ...item,
      obsDatetime,
      value: item.value !== undefined ? normalizeObsValueForRest(item.value) : undefined,
    };
  });

const formatObsFailure = (concept: string, message: string): string => {
  const label = getPostDialysisObsFieldLabel(concept);
  return label === concept ? `${concept}: ${message}` : `${label}: ${message}`;
};

export type SaveHaemodialysisEncounterResult = {
  success: boolean;
  message: string;
  encounter?: HaemodialysisEncounterResource;
};

type EncounterContext = {
  patientUuid: string;
  locationUuid?: string;
  providerUuid?: string;
  visitUuid?: string;
  encounterDatetime: string;
};

type OpenMrsFieldError = { message?: string; code?: string };
type OpenMrsErrorBody = {
  error?: {
    message?: string;
    detail?: string;
    fieldErrors?: Record<string, OpenMrsFieldError[]>;
  };
};

const OPENMRS_ERROR_HINTS: Record<string, string> = {
  'error.value.outOfRange.low':
    'A value is below the server minimum. Check Temperature (≥35 °C) and Oxygen Sat. (≥50%).',
  'error.value.outOfRange.high': 'A value is above the server maximum. Check Respiratory rate (≤60) and other vitals.',
};

const formatDatetimeForOpenMrs = (iso: string): string => iso.replace(/(\+|-)([0-9]{2})([0-9]{2})$/, '$1$2:$3');

const buildEncounterProviders = (providerUuid?: string) => {
  if (!providerUuid) {
    return undefined;
  }
  return [
    {
      provider: providerUuid,
      encounterRole: ENCOUNTER_ROLE,
    },
  ];
};

const readResponseData = async (response: Response & { data?: unknown }) => {
  if (response.data != null) {
    return response.data as { results?: HaemodialysisEncounterResource[] } & HaemodialysisEncounterResource;
  }
  return response.json();
};

const formatOpenMrsErrorBody = (body: unknown, fallback: string): string => {
  if (!body || typeof body !== 'object') {
    return fallback;
  }

  const error = (body as OpenMrsErrorBody).error;
  if (!error) {
    return extractFetchError(body, fallback);
  }

  const parts: string[] = [];
  if (error.message?.trim()) {
    parts.push(error.message.trim());
  }
  if (error.detail?.trim() && error.detail.trim() !== error.message?.trim()) {
    parts.push(error.detail.trim());
  }

  if (error.fieldErrors) {
    Object.entries(error.fieldErrors).forEach(([field, fieldErrors]) => {
      fieldErrors.forEach((item) => {
        const code = item.code?.trim();
        const hint = code ? OPENMRS_ERROR_HINTS[code] : undefined;
        if (hint) {
          parts.push(hint);
          return;
        }
        const message = item.message?.trim();
        if (message && message !== code) {
          parts.push(`${field}: ${message}`);
        } else if (code) {
          parts.push(`${field}: ${code}`);
        }
      });
    });
  }

  return parts.join(' — ') || extractFetchError(body, fallback);
};

const getResponseErrorMessage = async (
  response: Response & { responseBody?: unknown },
  fallback: string,
): Promise<string> => {
  if (response.responseBody) {
    return formatOpenMrsErrorBody(response.responseBody, fallback);
  }
  try {
    const text = await response.text();
    if (!text) {
      return fallback;
    }
    return formatOpenMrsErrorBody(JSON.parse(text), fallback);
  } catch {
    return fallback;
  }
};

export async function fetchHaemodialysisEncounters(patientUuid: string): Promise<HaemodialysisEncounterResource[]> {
  if (!patientUuid) {
    return [];
  }

  const url =
    `${restBaseUrl}/encounter?patient=${patientUuid}` +
    `&encounterType=${HAEMODIALYSIS_ENCOUNTER_TYPE_UUID}` +
    `&v=${HAEMODIALYSIS_ENCOUNTER_REP}&limit=100&order=desc`;

  try {
    const response = await openmrsFetch(url);
    if (!response.ok) {
      return [];
    }
    const data = await readResponseData(response);
    return data?.results ?? [];
  } catch {
    return [];
  }
}

export async function createHaemodialysisEncounter(
  context: EncounterContext,
  obs: HaemodialysisObsInput[],
): Promise<SaveHaemodialysisEncounterResult> {
  if (!context.patientUuid) {
    return { success: false, message: 'Patient is required' };
  }
  if (obs.length === 0) {
    return { success: false, message: 'No observations to save' };
  }

  const payloadValidationError = validateObsPayload(obs);
  if (payloadValidationError) {
    return { success: false, message: payloadValidationError };
  }

  const payload: Record<string, unknown> = {
    patient: context.patientUuid,
    encounterType: HAEMODIALYSIS_ENCOUNTER_TYPE_UUID,
    encounterDatetime: formatDatetimeForOpenMrs(context.encounterDatetime || toOmrsIsoString(new Date())),
    obs: prepareObsForPost(obs),
  };

  if (INCLUDE_FORM_IN_ENCOUNTER_POST) {
    payload.form = HAEMODIALYSIS_FORM_UUID;
  }

  if (context.locationUuid) {
    payload.location = context.locationUuid;
  }

  if (context.visitUuid) {
    payload.visit = context.visitUuid;
  }

  const encounterProviders = buildEncounterProviders(context.providerUuid);
  if (encounterProviders) {
    payload.encounterProviders = encounterProviders;
  }

  try {
    const response = await openmrsFetch(`${restBaseUrl}/encounter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const baseMessage = await getResponseErrorMessage(response, 'Failed to save haemodialysis encounter');
      return {
        success: false,
        message: `${baseMessage}. Obs sent (${obs.length}): ${formatObsConceptList(obs)}`,
      };
    }

    const encounter = (await readResponseData(response)) as HaemodialysisEncounterResource;
    return { success: true, message: 'Haemodialysis session saved', encounter };
  } catch (error) {
    return {
      success: false,
      message: extractFetchError(error, 'Failed to save haemodialysis encounter'),
    };
  }
}

const postSingleObs = async (
  encounterUuid: string,
  patientUuid: string,
  item: HaemodialysisObsInput,
): Promise<{ ok: boolean; message: string }> => {
  const payload: Record<string, unknown> = {
    person: patientUuid,
    encounter: encounterUuid,
    concept: item.concept,
    obsDatetime: item.obsDatetime ?? toOmrsIsoString(new Date()),
  };

  if (item.value !== undefined) {
    payload.value = normalizeObsValueForRest(item.value);
  }

  const response = await openmrsFetch(`${restBaseUrl}/obs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await getResponseErrorMessage(response, `Failed to save observation ${item.concept}`);
    return { ok: false, message };
  }

  return { ok: true, message: '' };
};

const appendObsViaObsEndpoint = async (
  encounterUuid: string,
  patientUuid: string,
  obs: HaemodialysisObsInput[],
  failOnPartial = false,
): Promise<SaveHaemodialysisEncounterResult> => {
  const failures: string[] = [];

  for (const item of obs) {
    if (item.groupMembers?.length) {
      return {
        success: false,
        message: 'Obs groups must be saved via encounter update, not the obs endpoint',
      };
    }

    const result = await postSingleObs(encounterUuid, patientUuid, item);
    if (!result.ok) {
      failures.push(formatObsFailure(item.concept, result.message));
    }
  }

  if (failures.length > 0) {
    const message = failures.join(' — ');
    if (failOnPartial || failures.length === obs.length) {
      return { success: false, message };
    }
    return { success: true, message: `Saved with warnings: ${message}` };
  }

  return { success: true, message: 'Observations saved' };
};

const appendObsViaEncounterPost = async (
  encounterUuid: string,
  obs: HaemodialysisObsInput[],
): Promise<SaveHaemodialysisEncounterResult> => {
  const payloadObs = prepareObsForPost(obs);
  const response = await openmrsFetch(`${restBaseUrl}/encounter/${encounterUuid}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ obs: payloadObs }),
  });

  if (!response.ok) {
    const baseMessage = await getResponseErrorMessage(response, 'Failed to update haemodialysis encounter');
    return {
      success: false,
      message: `${baseMessage}. Obs sent (${obs.length}): ${formatObsConceptList(obs)}`,
    };
  }

  const encounter = (await readResponseData(response)) as HaemodialysisEncounterResource;
  return { success: true, message: 'Haemodialysis session updated', encounter };
};

export async function appendHaemodialysisObservations(
  encounterUuid: string,
  obs: HaemodialysisObsInput[],
  patientUuid?: string,
  options?: AppendHaemodialysisObsOptions,
): Promise<SaveHaemodialysisEncounterResult> {
  if (!encounterUuid) {
    return { success: false, message: 'Encounter is required' };
  }
  if (obs.length === 0) {
    return { success: false, message: 'No observations to save' };
  }

  const payloadValidationError = validateObsPayload(obs);
  if (payloadValidationError) {
    return { success: false, message: payloadValidationError };
  }

  const hasObsGroups = obs.some((item) => item.groupMembers?.length);
  const strategy = options?.strategy ?? (patientUuid && !hasObsGroups ? 'obs' : 'encounter');
  const failOnPartial = options?.failOnPartial ?? false;

  try {
    if (strategy === 'obs') {
      if (!patientUuid) {
        return { success: false, message: 'Patient is required for obs endpoint saves' };
      }
      return await appendObsViaObsEndpoint(encounterUuid, patientUuid, obs, failOnPartial);
    }

    return await appendObsViaEncounterPost(encounterUuid, obs);
  } catch (error) {
    return {
      success: false,
      message: extractFetchError(error, 'Failed to update haemodialysis encounter'),
    };
  }
}
