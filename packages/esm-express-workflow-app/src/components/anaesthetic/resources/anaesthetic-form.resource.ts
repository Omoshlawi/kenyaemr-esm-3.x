import { openmrsFetch, restBaseUrl, toOmrsIsoString, useConfig, type FetchResponse } from '@openmrs/esm-framework';
import useSWR from 'swr';
import type { ExpressWorkflowConfig } from '../../../config-schema';
import { MCH_PARTOGRAPHY_ENCOUNTER_UUID, PARTOGRAPHY_CONCEPTS, SURGICAL_PROCEDURE_UUID } from '../types';

const YES_CONCEPT_UUID = '1065AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const NO_CONCEPT_UUID = '1066AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

/** Formats a Date to ISO 8601 with colon in timezone offset (e.g. +03:00) for OpenMRS compatibility */
function formatDateForOpenMRS(date: Date): string {
  const isoStr = toOmrsIsoString(date);
  // toOmrsIsoString may produce +0300; OpenMRS needs +03:00
  return isoStr.replace(/(\+|-)([0-9]{2})([0-9]{2})$/, '$1$2:$3');
}
const ANAESTHETIC_RECORD_ENCOUNTER_UUID = 'd14dde5b-95dc-40a1-8ff0-acad34fb58b2';
const DEFAULT_ENCOUNTER_PROVIDER_ROLE = 'a0b03050-c99b-11e0-9572-0800200c9a66';
const EVENT_DESCRIPTION_CONCEPT = PARTOGRAPHY_CONCEPTS['event-description'];
export const PROCEDURE_ORDER_TYPE_UUID = '52a447d3-a64a-11e3-9aeb-50e549534c5e';
const ANAESTHETIC_RECORD_CONCEPTS = new Set([
  SURGICAL_PROCEDURE_UUID,
  'e2d62825-9bf1-4deb-b467-025ac50b7029',
  '164377AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
  'ccc4e96e-dbd3-41ef-a81b-1bd0f5b4767e',
]);
const RECORD_METADATA_PREFIXES = {
  diagnosis: 'Diagnosis:',
  diagnosisUuid: 'Diagnosis UUID:',
  operation: 'Operation:',
  operationUuid: 'Operation UUID:',
  anaesthetist: 'Anaesthetist:',
  surgeon: 'Surgeon:',
  scrubNurse: 'Scrub Nurse:',
  typeOfPremedication: 'Type of Premedication:',
  effect: 'Effect:',
  timeGiven: 'Time Given:',
  inductionAirway: 'Induction Airway:',
  oroNasopharyngeal: 'Oro-Nasopharyngeal:',
  oroNasotrachealCuffPack: 'Oro-Nasotracheal Cuff Pack:',
  endobronchial: 'Endobronchial:',
  blind: 'Blind:',
  underMask: 'Under Mask:',
  ifIv: 'If IV:',
  armSite: 'Arm Site:',
  handSite: 'Hand Site:',
  legSite: 'Leg Site:',
  anaestheticNotes: 'Anaesthetic Notes:',
} as const;

const fetcher = (url: string) => openmrsFetch(url).then((response) => response.json());

type ProviderResource = {
  uuid: string;
  display?: string;
  name?: string;
  person?: {
    uuid: string;
    display?: string;
  };
};

type ProcedureConceptResource = {
  uuid: string;
  display: string;
};

type EncounterDefaultsResponse = {
  results?: Array<{
    uuid: string;
    encounterDatetime?: string;
    encounterProviders?: Array<{
      provider?: {
        uuid: string;
        name?: string;
        person?: {
          uuid: string;
          display?: string;
        };
      };
    }>;
    diagnoses?: Array<{
      diagnosis?: {
        coded?: {
          display?: string;
        };
      };
    }>;
  }>;
};

export type ProviderOption = {
  uuid: string;
  display: string;
};

export type ProcedureOption = {
  uuid: string;
  display: string;
};

export type DiagnosisOption = {
  uuid: string;
  display: string;
  icdCode?: string | null;
};

type DiagnosisConceptMapping = {
  display?: string;
};

type DiagnosisConceptResult = {
  uuid: string;
  display: string;
  mappings?: DiagnosisConceptMapping[];
};

type DiagnosisResponse = {
  results: Array<DiagnosisConceptResult>;
};

const DIAGNOSIS_CONCEPT_REP = 'custom:(uuid,display,mappings:(display,conceptMapType:(display)))';

export const extractIcd11CodeFromConcept = (concept: DiagnosisConceptResult): string | null => {
  if (!concept.mappings?.length) {
    return null;
  }
  const match = concept.mappings.find(
    (mapping) =>
      mapping.display?.startsWith('ICD-11:') ||
      mapping.display?.startsWith('ICD-10-WHO:') ||
      mapping.display?.startsWith('ICD-10:'),
  );
  if (!match?.display) {
    return null;
  }
  const parts = match.display.split(':');
  return parts.length > 1 ? parts.slice(1).join(':').trim() : null;
};

const toDiagnosisOption = (concept: DiagnosisConceptResult): DiagnosisOption => ({
  uuid: concept.uuid,
  display: concept.display,
  icdCode: extractIcd11CodeFromConcept(concept),
});

export type AnaestheticEncounterDefaults = {
  encounterDate: string;
  diagnosis: string;
  anaesthetistProviderUuid: string;
  anaesthetistName: string;
};

export type AnaestheticFormValues = {
  encounterDate: string;
  diagnosis: DiagnosisOption | null;
  operation: ProcedureOption | null;
  anaesthetistProviderUuid: string;
  anaesthetistName: string;
  surgeonProviderUuid: string;
  surgeonName?: string;
  scrubNurseProviderUuid: string;
  scrubNurseName?: string;
  typeOfPremedication: string;
  effect: string;
  timeGiven: string;
  inductionAirway: string;
  blindOrUnderMask: string;
  oroNasopharyngeal: string;
  oroNasotrachealCuffPack: string;
  endobronchial: string;
  blind: string;
  underMask: string;
  ifIv: string;
  armSite: string;
  handSite: string;
  legSite: string;
  anaestheticNotes: string;
};

type SaveAnaestheticRecordResult = {
  success: boolean;
  message: string;
};

type EncounterObs = {
  concept?: { uuid?: string; display?: string };
  value?: any;
};

type AnaestheticEncounterResource = {
  uuid: string;
  encounterDatetime?: string;
  encounterProviders?: Array<{
    provider?: {
      uuid: string;
      name?: string;
      person?: { uuid?: string; display?: string };
    };
  }>;
  obs?: EncounterObs[];
};

type AnaestheticRecordsResponse = {
  results?: AnaestheticEncounterResource[];
};

export type AnaestheticRecordRow = {
  id: string;
  encounterDate: string;
  diagnosisUuid?: string;
  diagnosis: string;
  operationUuid?: string;
  operation: string;
  anaesthetist: string;
  surgeon: string;
  scrubNurse: string;
  typeOfPremedication: string;
  effect: string;
  timeGiven: string;
  inductionAirway: string;
  blindOrUnderMask: string;
  ifIv: string;
  anaestheticNotes: string;
};

const ANAESTHETIC_RECORDS_CUSTOM_REP =
  'custom:(uuid,encounterDatetime,encounterProviders:(provider:(uuid,name,person:(uuid,display))),obs:(uuid,concept:(uuid,display),value))';

export function useDiagnosis(searchQuery: string, dataSourceUuid?: string, resultLimit = 20, minChars = 3) {
  const config = useConfig();
  const resolvedSourceUuid = dataSourceUuid || (config as ExpressWorkflowConfig).icd11DataSourceUuid;
  const trimmedQuery = searchQuery.trim();
  const sourceParam = resolvedSourceUuid ? `&source=${resolvedSourceUuid}` : '';
  const searchUrl =
    trimmedQuery.length >= minChars && resolvedSourceUuid
      ? `${restBaseUrl}/concept?v=${DIAGNOSIS_CONCEPT_REP}&q=${encodeURIComponent(
          trimmedQuery,
        )}${sourceParam}&limit=${resultLimit}`
      : null;

  const {
    isLoading: isLoadingSearch,
    error: searchError,
    data: searchData,
  } = useSWR<FetchResponse<DiagnosisResponse>>(searchUrl, openmrsFetch);

  const diagnoses = (searchData?.data?.results ?? []).map(toDiagnosisOption);

  return {
    isLoading: isLoadingSearch,
    error: searchError,
    diagnoses,
  };
}

export function useAnaestheticProviderOptions() {
  const customRep = 'custom:(uuid,display,name,person:(uuid,display))';
  const url = `${restBaseUrl}/provider?v=${customRep}&limit=4`;
  const { data, error, isLoading } = useSWR<FetchResponse<{ results?: ProviderResource[] }>>(url, openmrsFetch);

  const providers: ProviderOption[] =
    (data?.data?.results ?? []).map((provider) => ({
      uuid: provider.uuid,
      display: provider.person?.display || provider.name || provider.display || provider.uuid,
    })) ?? [];

  return {
    providers,
    isLoading,
    error,
  };
}

export function useAnaestheticProviderSearch(searchTerm: string) {
  const customRep = 'custom:(uuid,display,name,person:(uuid,display))';
  const query = searchTerm.trim();
  const url =
    query.length >= 3 ? `${restBaseUrl}/provider?q=${encodeURIComponent(query)}&v=${customRep}&limit=20` : null;
  const { data, error, isLoading } = useSWR<FetchResponse<{ results?: ProviderResource[] }>>(url, openmrsFetch);

  const providers: ProviderOption[] =
    (data?.data?.results ?? []).map((provider) => ({
      uuid: provider.uuid,
      display: provider.person?.display || provider.name || provider.display || provider.uuid,
    })) ?? [];

  return {
    providers,
    isLoading,
    error,
  };
}

export function useAnaestheticProcedureOptions(searchQuery = '') {
  const customRep = 'custom:(uuid,display)';
  const config = useConfig() as any;
  const proceduresConceptClassUuid = config?.proceduresConceptClassUuid ?? '8d490bf4-c2cc-11de-8d13-0010c6dffd0f';
  const trimmedQuery = searchQuery.trim();
  const baseClassUrl = `${restBaseUrl}/concept?v=${customRep}&class=${proceduresConceptClassUuid}&limit=4`;
  const baseFallbackUrl = `${restBaseUrl}/concept?v=${customRep}&limit=4`;
  const searchClassUrl =
    trimmedQuery.length >= 2
      ? `${restBaseUrl}/concept?v=${customRep}&class=${proceduresConceptClassUuid}&q=${encodeURIComponent(
          trimmedQuery,
        )}&limit=20`
      : null;
  const searchFallbackUrl =
    trimmedQuery.length >= 2
      ? `${restBaseUrl}/concept?v=${customRep}&q=${encodeURIComponent(trimmedQuery)}&limit=20`
      : null;

  const {
    data: baseClassData,
    error: baseClassError,
    isLoading: isLoadingBaseClassResults,
  } = useSWR<FetchResponse<{ results?: ProcedureConceptResource[] }>>(baseClassUrl, openmrsFetch);
  const {
    data: baseFallbackData,
    error: baseFallbackError,
    isLoading: isLoadingBaseFallbackResults,
  } = useSWR<FetchResponse<{ results?: ProcedureConceptResource[] }>>(baseFallbackUrl, openmrsFetch);
  const {
    data: searchClassData,
    error: searchClassError,
    isLoading: isLoadingSearchClassResults,
  } = useSWR<FetchResponse<{ results?: ProcedureConceptResource[] }>>(searchClassUrl, openmrsFetch);
  const {
    data: searchFallbackData,
    error: searchFallbackError,
    isLoading: isLoadingSearchFallbackResults,
  } = useSWR<FetchResponse<{ results?: ProcedureConceptResource[] }>>(searchFallbackUrl, openmrsFetch);

  const baseClassResults = baseClassData?.data?.results ?? [];
  const baseFallbackResults = baseFallbackData?.data?.results ?? [];
  const searchClassResults = searchClassData?.data?.results ?? [];
  const searchFallbackResults = searchFallbackData?.data?.results ?? [];

  const baseSourceResults = baseClassResults.length > 0 ? baseClassResults : baseFallbackResults;
  const searchSourceResults = searchClassResults.length > 0 ? searchClassResults : searchFallbackResults;
  const sourceResults = trimmedQuery.length >= 2 ? searchSourceResults : baseSourceResults;

  const procedures: ProcedureOption[] = sourceResults.map((procedure) => ({
    uuid: procedure.uuid,
    display: procedure.display,
  }));

  return {
    procedures,
    isLoading:
      isLoadingBaseClassResults ||
      isLoadingBaseFallbackResults ||
      isLoadingSearchClassResults ||
      isLoadingSearchFallbackResults,
    error: baseClassError || baseFallbackError || searchClassError || searchFallbackError,
  };
}

export function useAnaestheticEncounterDefaults(
  patientUuid: string,
  currentProvider?: { uuid?: string; display?: string },
) {
  const customRep =
    'custom:(uuid,encounterDatetime,encounterProviders:(provider:(uuid,name,person:(uuid,display))),diagnoses:(diagnosis:(coded:(display))))';
  const url = patientUuid ? `${restBaseUrl}/encounter?patient=${patientUuid}&v=${customRep}&limit=1&order=desc` : null;

  const { data, error, isLoading } = useSWR<EncounterDefaultsResponse>(url, fetcher);
  const firstEncounter = data?.results?.[0];
  const firstProvider = firstEncounter?.encounterProviders?.[0]?.provider;
  const encounterDate = firstEncounter?.encounterDatetime?.slice(0, 10) || new Date().toISOString().slice(0, 10);

  return {
    defaults: {
      encounterDate,
      diagnosis: firstEncounter?.diagnoses?.[0]?.diagnosis?.coded?.display || '',
      anaesthetistProviderUuid: firstProvider?.uuid || currentProvider?.uuid || '',
      anaesthetistName:
        firstProvider?.person?.display ||
        firstProvider?.name ||
        currentProvider?.display ||
        'Current encounter provider',
    } satisfies AnaestheticEncounterDefaults,
    isLoading,
    error,
  };
}

function pushTextObservation(observations: Array<any>, concept: string, value?: string) {
  if (!value || value.trim() === '') {
    return;
  }

  observations.push({
    concept,
    value: value.trim(),
  });
}

function pushCodedObservation(observations: Array<any>, concept: string, value?: string) {
  if (!value || value.trim() === '') {
    return;
  }

  observations.push({
    concept,
    value: value.trim(),
  });
}

function pushBooleanObservation(observations: Array<any>, concept: string, value?: string) {
  if (!value || value.trim() === '') {
    return;
  }

  observations.push({
    concept,
    value: value === 'yes' ? YES_CONCEPT_UUID : NO_CONCEPT_UUID,
  });
}

function pushMetadataObservation(observations: Array<any>, label: string, value?: string) {
  if (!value || value.trim() === '') {
    return;
  }

  observations.push({
    concept: EVENT_DESCRIPTION_CONCEPT,
    value: `${label} ${value.trim()}`,
  });
}

function buildTimeObservationValue(encounterDate: string, timeValue?: string) {
  if (!timeValue || timeValue.trim() === '') {
    return '';
  }
  // OpenMRS datetime concepts expect "yyyy-MM-dd HH:mm:ss" format
  return `${encounterDate} ${timeValue}:00`;
}

function buildAnaestheticObservations(formData: AnaestheticFormValues) {
  const observations: Array<any> = [];

  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.operation, formData.operation?.display);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.operationUuid, formData.operation?.uuid);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.diagnosis, formData.diagnosis?.display);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.diagnosisUuid, formData.diagnosis?.uuid);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.anaesthetist, formData.anaesthetistName);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.surgeon, formData.surgeonName);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.scrubNurse, formData.scrubNurseName);
  // Free-text concepts
  pushTextObservation(observations, 'e2d62825-9bf1-4deb-b467-025ac50b7029', formData.typeOfPremedication);
  pushTextObservation(observations, '164377AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', formData.effect);
  pushTextObservation(observations, 'ccc4e96e-dbd3-41ef-a81b-1bd0f5b4767e', formData.anaestheticNotes);
  // Coded/Datetime concepts stored as metadata (server rejects free text for these)
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.timeGiven, formData.timeGiven);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.inductionAirway, formData.inductionAirway);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.oroNasopharyngeal, formData.oroNasopharyngeal);
  pushMetadataObservation(
    observations,
    RECORD_METADATA_PREFIXES.oroNasotrachealCuffPack,
    formData.oroNasotrachealCuffPack,
  );
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.endobronchial, formData.endobronchial);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.blind, formData.blind);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.underMask, formData.underMask);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.ifIv, formData.ifIv);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.armSite, formData.armSite);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.handSite, formData.handSite);
  pushMetadataObservation(observations, RECORD_METADATA_PREFIXES.legSite, formData.legSite);

  return observations;
}

function buildEncounterProviders(formData: AnaestheticFormValues, fallbackProviderUuid?: string) {
  const uniqueProviders = Array.from(
    new Set(
      [
        formData.anaesthetistProviderUuid,
        formData.surgeonProviderUuid,
        formData.scrubNurseProviderUuid,
        fallbackProviderUuid,
      ].filter(Boolean),
    ),
  );

  return uniqueProviders.map((providerUuid) => ({
    provider: providerUuid,
    encounterRole: DEFAULT_ENCOUNTER_PROVIDER_ROLE,
    voided: false,
  }));
}

function buildAnaestheticPayload(
  patientUuid: string,
  formData: AnaestheticFormValues,
  locationUuid?: string,
  providerUuid?: string,
) {
  const observations = buildAnaestheticObservations(formData);

  if (!patientUuid) {
    throw new Error('Patient UUID is required');
  }

  if (!formData.encounterDate) {
    throw new Error('Encounter date is required');
  }

  if (observations.length === 0) {
    throw new Error('No anaesthetic observations to save');
  }

  // Use date only (no time) to avoid "encounter datetime should be before current date" errors
  // The actual time is stored in the "Time Given:" metadata observation
  const payload: Record<string, any> = {
    patient: patientUuid,
    encounterType: { uuid: ANAESTHETIC_RECORD_ENCOUNTER_UUID },
    encounterDatetime: formData.encounterDate,
    obs: observations,
  };

  if (locationUuid) {
    payload.location = locationUuid;
  }

  const encounterProviders = buildEncounterProviders(formData, providerUuid);
  if (encounterProviders.length > 0) {
    payload.encounterProviders = encounterProviders;
  }

  return payload;
}

function parseMetadataValue(observations: EncounterObs[] = [], prefix: string) {
  const found = observations.find(
    (obs) =>
      obs.concept?.uuid === EVENT_DESCRIPTION_CONCEPT && typeof obs.value === 'string' && obs.value.startsWith(prefix),
  );

  if (!found || typeof found.value !== 'string') {
    return '';
  }

  return found.value.slice(prefix.length).trim();
}

function normalizeObservationValue(value: any) {
  if (value == null) {
    return '';
  }
  if (typeof value === 'object' && 'display' in value) {
    return String(value.display ?? '');
  }
  return String(value);
}

function normalizeTimeObservationValue(value: any) {
  const normalizedValue = normalizeObservationValue(value);
  if (!normalizedValue) {
    return '';
  }

  const dateTime = new Date(normalizedValue);
  if (Number.isNaN(dateTime.getTime())) {
    return normalizedValue;
  }

  return dateTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getObservationValue(observations: EncounterObs[] = [], conceptUuid: string) {
  const found = observations.find((obs) => obs.concept?.uuid === conceptUuid);
  return found ? normalizeObservationValue(found.value) : '';
}

function normalizeBooleanValue(rawValue: string) {
  if (rawValue === YES_CONCEPT_UUID) {
    return 'Yes';
  }
  if (rawValue === NO_CONCEPT_UUID) {
    return 'No';
  }
  return rawValue;
}

function isAnaestheticRecordEncounter(encounter: AnaestheticEncounterResource) {
  const observations = encounter.obs ?? [];
  return observations.some((obs) => {
    const conceptUuid = obs.concept?.uuid;
    if (conceptUuid && ANAESTHETIC_RECORD_CONCEPTS.has(conceptUuid)) {
      return true;
    }
    if (conceptUuid === EVENT_DESCRIPTION_CONCEPT && typeof obs.value === 'string') {
      return Object.values(RECORD_METADATA_PREFIXES).some((prefix) => obs.value.startsWith(prefix));
    }
    return false;
  });
}

function mapEncounterToAnaestheticRecord(encounter: AnaestheticEncounterResource): AnaestheticRecordRow {
  const observations = encounter.obs ?? [];

  const inductionAirway = parseMetadataValue(observations, RECORD_METADATA_PREFIXES.inductionAirway);
  const legacyOroNasopharyngeal = parseMetadataValue(observations, RECORD_METADATA_PREFIXES.oroNasopharyngeal);
  const legacyOroNasotracheal = parseMetadataValue(observations, RECORD_METADATA_PREFIXES.oroNasotrachealCuffPack);
  const legacyEndobronchial = parseMetadataValue(observations, RECORD_METADATA_PREFIXES.endobronchial);

  const blind = parseMetadataValue(observations, RECORD_METADATA_PREFIXES.blind);
  const underMask = parseMetadataValue(observations, RECORD_METADATA_PREFIXES.underMask);

  const ifIv = parseMetadataValue(observations, RECORD_METADATA_PREFIXES.ifIv);
  const legacyArmSite = parseMetadataValue(observations, RECORD_METADATA_PREFIXES.armSite);
  const legacyHandSite = parseMetadataValue(observations, RECORD_METADATA_PREFIXES.handSite);
  const legacyLegSite = parseMetadataValue(observations, RECORD_METADATA_PREFIXES.legSite);

  return {
    id: encounter.uuid,
    encounterDate: encounter.encounterDatetime ? new Date(encounter.encounterDatetime).toLocaleDateString() : '',
    diagnosisUuid: parseMetadataValue(observations, RECORD_METADATA_PREFIXES.diagnosisUuid),
    diagnosis: parseMetadataValue(observations, RECORD_METADATA_PREFIXES.diagnosis),
    operationUuid: parseMetadataValue(observations, RECORD_METADATA_PREFIXES.operationUuid),
    operation:
      parseMetadataValue(observations, RECORD_METADATA_PREFIXES.operation) ||
      getObservationValue(observations, SURGICAL_PROCEDURE_UUID),
    anaesthetist: parseMetadataValue(observations, RECORD_METADATA_PREFIXES.anaesthetist),
    surgeon: parseMetadataValue(observations, RECORD_METADATA_PREFIXES.surgeon),
    scrubNurse: parseMetadataValue(observations, RECORD_METADATA_PREFIXES.scrubNurse),
    typeOfPremedication: getObservationValue(observations, 'e2d62825-9bf1-4deb-b467-025ac50b7029'),
    effect: getObservationValue(observations, '164377AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'),
    timeGiven: parseMetadataValue(observations, RECORD_METADATA_PREFIXES.timeGiven),
    inductionAirway:
      inductionAirway ||
      (legacyOroNasopharyngeal
        ? 'ORO/Nasopharyngeal R/L'
        : legacyOroNasotracheal
        ? 'ORO/Nasotraceal Cuff Pack'
        : legacyEndobronchial
        ? 'Endobronchial R/L'
        : ''),
    blindOrUnderMask: blind ? 'Blind' : underMask ? 'Under Mask' : '',
    ifIv: ifIv || (legacyArmSite ? 'ARM' : legacyHandSite ? 'Hand' : legacyLegSite ? 'Leg' : ''),
    anaestheticNotes: getObservationValue(observations, 'ccc4e96e-dbd3-41ef-a81b-1bd0f5b4767e'),
  };
}

export function useAnaestheticRecords(patientUuid: string) {
  const { data, error, isLoading, mutate } = useSWR<AnaestheticRecordRow[]>(
    patientUuid ? (['anaesthetic-records', patientUuid] as const) : null,
    ([, uuid]: readonly [string, string]) => getAnaestheticRecords(uuid),
  );

  return {
    records: data ?? [],
    isLoading,
    error,
    mutate,
  };
}

function buildAnaestheticRecordsUrl(patientUuid: string) {
  return `${restBaseUrl}/encounter?patient=${patientUuid}&encounterType=${ANAESTHETIC_RECORD_ENCOUNTER_UUID}&v=${ANAESTHETIC_RECORDS_CUSTOM_REP}&limit=100&order=desc`;
}

export async function getAnaestheticRecords(patientUuid: string): Promise<AnaestheticRecordRow[]> {
  if (!patientUuid) {
    return [];
  }

  const response = await openmrsFetch(buildAnaestheticRecordsUrl(patientUuid));
  const data = (await response.json()) as AnaestheticRecordsResponse;

  return (data?.results ?? [])
    .filter(isAnaestheticRecordEncounter)
    .map(mapEncounterToAnaestheticRecord)
    .sort((left, right) => new Date(right.encounterDate).getTime() - new Date(left.encounterDate).getTime());
}

export async function saveAnaestheticRecord(
  patientUuid: string,
  formData: AnaestheticFormValues,
  locationUuid?: string,
  providerUuid?: string,
): Promise<SaveAnaestheticRecordResult> {
  try {
    const payload = buildAnaestheticPayload(patientUuid, formData, locationUuid, providerUuid);

    const response = await openmrsFetch(`${restBaseUrl}/encounter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to save anaesthetic record');
    }

    return {
      success: true,
      message: 'Anaesthetic form saved successfully',
    };
  } catch (error: any) {
    const serverDetail =
      error?.responseBody?.error?.message ||
      error?.responseBody?.error?.detail ||
      (error instanceof Error ? error.message : 'Failed to save anaesthetic record');

    // Include field-level errors for debugging
    const fieldErrors = error?.responseBody?.error?.fieldErrors;
    let fullMessage = serverDetail;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const fieldMessages = Object.entries(fieldErrors)
        .map(([field, errors]: [string, any]) => `${field}: ${(errors as any[]).map((e) => e.message).join(', ')}`)
        .join('; ');
      if (fieldMessages) {
        fullMessage = `${serverDetail} — ${fieldMessages}`;
      }
    }

    return {
      success: false,
      message: fullMessage,
    };
  }
}
