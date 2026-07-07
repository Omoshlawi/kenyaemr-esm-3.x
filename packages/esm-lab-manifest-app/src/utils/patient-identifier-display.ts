import type { ActiveRequestOrder } from '../types';

export const EID_MANIFEST_TYPE = 1;
export const CD4_MANIFEST_TYPE = 4;
export const HPV_MANIFEST_TYPE = 5;
export const DRT_MANIFEST_TYPE = 6;
export const HEI_NUMBER_IDENTIFIER_TYPE = '0691f522-dd67-4eeb-92c8-af5083baf338';
export const CWC_NUMBER_IDENTIFIER_TYPE = '1dc8b419-35f2-4316-8d68-135f0689859b';

const manifestPayloadKeys = {
  patientIdentifier: 'patient_identifier',
  heiId: 'hei_id',
  sampleType: 'sample_type',
} as const;

export function findPatientHeiIdentifier(
  identifiers: Array<{ identifier: string; identifierType: { uuid: string } }> | undefined,
  heiNumberIdentifierType?: string,
) {
  const heiType = heiNumberIdentifierType || HEI_NUMBER_IDENTIFIER_TYPE;

  return identifiers?.find((id) => id.identifierType.uuid === heiType)?.identifier;
}

const HEI_NUMBER_PATTERN = /^\d{5}-\d{4}-\d{4}$/;

export function formatHeiNumberForDisplay(heiIdentifier?: string) {
  if (!heiIdentifier?.trim()) {
    return '';
  }

  const trimmed = heiIdentifier.trim().replaceAll(' ', '');
  if (trimmed.toUpperCase().startsWith('CWC-')) {
    return '';
  }

  if (HEI_NUMBER_PATTERN.test(trimmed)) {
    return trimmed;
  }

  const digitsOnly = trimmed.replaceAll('-', '');
  if (/^\d{13}$/.test(digitsOnly)) {
    return `${digitsOnly.slice(0, 5)}-${digitsOnly.slice(5, 9)}-${digitsOnly.slice(9)}`;
  }

  return '';
}

export function formatHeiNumberForLabExchange(heiIdentifier?: string) {
  return formatHeiNumberForDisplay(heiIdentifier);
}

export function normalizeManifestType(manifestType?: number | string | null) {
  if (manifestType === undefined || manifestType === null || manifestType === '') {
    return undefined;
  }

  const normalized = Number(manifestType);
  return Number.isNaN(normalized) ? undefined : normalized;
}

export function isEidManifest(manifestType?: number | string | null) {
  return normalizeManifestType(manifestType) === EID_MANIFEST_TYPE;
}

export function isCd4Manifest(manifestType?: number | string | null) {
  return normalizeManifestType(manifestType) === CD4_MANIFEST_TYPE;
}

export function isHpvManifest(manifestType?: number | string | null) {
  return normalizeManifestType(manifestType) === HPV_MANIFEST_TYPE;
}

export function isDrtManifest(manifestType?: number | string | null) {
  return normalizeManifestType(manifestType) === DRT_MANIFEST_TYPE;
}

export function getPatientIdentifierColumnLabel(
  manifestType: number | string | undefined | null,
  identifierColumnLabel: string | undefined,
  t: (key: string, defaultValue: string) => string,
) {
  if (identifierColumnLabel?.trim()) {
    return identifierColumnLabel;
  }

  return isEidManifest(manifestType) ? t('heiNumber', 'HEI Number') : t('cccKDODNumber', 'CCC/KDOD Number');
}

export function getActiveRequestPatientIdentifier(activeRequest: ActiveRequestOrder, isEid = false) {
  const rawIdentifier = (isEid ? activeRequest.heiNumber || activeRequest.cccKdod : activeRequest.cccKdod || '')
    .trim()
    .replaceAll(' ', '');

  return isEid ? formatHeiNumberForDisplay(rawIdentifier) : rawIdentifier;
}

export function getPatientIdentifierFromPayload(payload?: string, isEid = false) {
  if (!payload?.trim()) {
    return '';
  }

  try {
    const parsed = JSON.parse(payload) as Record<string, string>;
    const rawIdentifier = (parsed[manifestPayloadKeys.patientIdentifier] || parsed[manifestPayloadKeys.heiId] || '')
      .trim()
      .replaceAll(' ', '');

    if (!rawIdentifier) {
      return '';
    }

    return isEid ? formatHeiNumberForDisplay(rawIdentifier) : rawIdentifier;
  } catch {
    return '';
  }
}

export function inferIsEidManifest(
  manifestType: number | string | undefined | null,
  samples: Array<{ payload?: string }> = [],
) {
  if (isEidManifest(manifestType)) {
    return true;
  }

  return samples.some((sample) => {
    if (!sample.payload?.trim()) {
      return false;
    }

    try {
      const parsed = JSON.parse(sample.payload) as Record<string, unknown>;
      return manifestPayloadKeys.heiId in parsed || parsed[manifestPayloadKeys.sampleType] === 'DBS';
    } catch {
      return false;
    }
  });
}

export function getManifestSamplePatientIdentifier(
  sample: { patientIdentifier?: string; payload?: string },
  isEid = false,
) {
  if (sample.patientIdentifier?.trim()) {
    return sample.patientIdentifier.trim();
  }

  return getPatientIdentifierFromPayload(sample.payload, isEid);
}
