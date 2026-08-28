import { useMemo } from 'react';
import { useConfig } from '@openmrs/esm-framework';
import { type IdentifierTypeUuids } from '../types';
import { type PcsConfig } from '../config-schema';

/**
 * The identifier and attribute types a created patient's HIE identifiers are written against,
 * gathered in one place so every caller passes the same set.
 */
export function useIdentifierTypeUuids(): IdentifierTypeUuids {
  const {
    nationalIdUUID,
    shaNumberUUID,
    passportUUID,
    birthCertificateUUID,
    crIdentificationNumberUUID,
    phoneAttributeTypeUUID,
  } = useConfig<PcsConfig>();

  return useMemo(
    () => ({
      nationalIdUUID,
      shaNumberUUID,
      passportUUID,
      birthCertificateUUID,
      crIdentificationNumberUUID,
      phoneAttributeTypeUUID,
    }),
    [
      nationalIdUUID,
      shaNumberUUID,
      passportUUID,
      birthCertificateUUID,
      crIdentificationNumberUUID,
      phoneAttributeTypeUUID,
    ],
  );
}
