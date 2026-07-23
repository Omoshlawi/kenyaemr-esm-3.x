/**
 * Matches OpenMRS ConceptServiceImpl.isValidUuidFormat:
 * - RFC UUID (with hyphens)
 * - Legacy 32-char (CIEL-style)
 * - Extended 33–38 char (ICD-11 / source-prefixed concepts, e.g. 39A…)
 */
const RFC_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGACY_UUID_PATTERN = /^[0-9a-zA-Z]{32}$/;
const EXTENDED_UUID_PATTERN = /^[0-9a-zA-Z]{33,38}$/;

export const isValidOpenmrsUuid = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }
  return RFC_UUID_PATTERN.test(trimmed) || LEGACY_UUID_PATTERN.test(trimmed) || EXTENDED_UUID_PATTERN.test(trimmed);
};
