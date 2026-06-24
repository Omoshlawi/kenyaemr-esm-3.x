import { type FetchResponse, openmrsFetch, type Patient, restBaseUrl, useConfig } from '@openmrs/esm-framework';
import useSWR from 'swr';
import { ReferralConfigObject } from '../config-schema';
import { useMemo } from 'react';

function extractValue(display: string) {
  const pattern = /=\s*(.*)$/;
  const match = display.match(pattern);
  if (match && match.length > 1) {
    return match[1].trim();
  }
  return display.trim();
}

const usePatient = (uuid: string) => {
  const customPresentation =
    'custom:(uuid,display,identifiers,person:(uuid,display,attributes:(uuid,display,attributeType:(uuid,display))))';
  const url = `${restBaseUrl}/patient/${uuid}?v=${customPresentation}`;
  const { phoneNumberAttributeType, nationalIdIdentifierType } = useConfig<ReferralConfigObject>();
  const { data, error, isLoading } = useSWR<FetchResponse<Patient>>(url, openmrsFetch);
  const nationalId = useMemo(
    () =>
      data?.data?.identifiers
        ?.find((id) => id.identifierType?.uuid === nationalIdIdentifierType)
        ?.display?.split('=')?.[1]
        ?.trim(),
    [data, nationalIdIdentifierType],
  );
  const patientPhoneNumber = useMemo(() => {
    const phone = data?.data?.person?.attributes?.find(
      (attr) => attr.attributeType?.uuid === phoneNumberAttributeType,
    )?.display;
    if (phone) {
      return extractValue(phone);
    }
    return undefined;
  }, [data?.data?.person?.attributes, phoneNumberAttributeType]);

  return {
    isLoading,
    error,
    patient: data?.data,
    patientName: data?.data?.person?.display,
    patientPhoneNumber,
    nationalId,
  };
};

export default usePatient;
