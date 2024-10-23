import { openmrsFetch, restBaseUrl } from '@openmrs/esm-framework';
import { z } from 'zod';
import { coverageEligibilityResponse, patientBenefits } from './benefits-package.mock';
import { CoverageEligibilityResponse, InsurersBenefits } from '../types';

export const eligibilityRequestShema = z.object({
  patientUuid: z.string().uuid(),
  providerUuid: z.string().uuid(),
  facilityUuid: z.string().uuid(),
  diagnosisUuids: z.array(z.string()),
  packageUUid: z.string(),
  interventions: z.array(z.string()),
  isRefered: z.boolean(),
});

export const preauthSchema = z.object({
  patientUuid: z.string().uuid(),
  providerUuid: z.string().uuid(),
  facilityUuid: z.string().uuid(),
  diagnosisUuids: z.array(z.string()).nonempty('Require atleast 1 diagnoses'),
  packageUUid: z.string(),
  interventions: z.array(z.string()).nonempty('Require atleast 1 intervention'),
  patientBenefit: z.string(),
});

export const requestEligibility = async (data: z.infer<typeof eligibilityRequestShema>) => {
  // const url = `${restBaseUrl}/insuranceclaims/CoverageEligibilityRequest`;
  // const resp = await openmrsFetch(url, {
  //   body: JSON.stringify(data),
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  // });
  const benefits = coverageEligibilityResponse as Array<CoverageEligibilityResponse>;
  const insurerBenefits = benefits.reduce<Array<InsurersBenefits>>(
    (prev, curr) => [...prev, ...curr.benefits.map((b) => ({ ...b, insurer: curr.insurer }))],
    [],
  );
  return insurerBenefits;
};

export const preAuthenticateBenefit = async (
  data: z.infer<typeof preauthSchema>,
  markeAsApproved: boolean,
  benefits: Array<InsurersBenefits>,
) => {
  return benefits.map((benefit) => ({
    ...benefit,
    status:
      data.patientBenefit === benefit.packageCode
        ? markeAsApproved === true
          ? 'Approved'
          : markeAsApproved === false
          ? 'REjected'
          : 'Pending'
        : benefit.status,
  }));
};

export const ENCOUNTER_CUSTOME_REPRESENTATION =
  'custom:(uuid,display,voided,indication,startDatetime,stopDatetime,' +
  'encounters:(uuid,display,encounterDatetime,' +
  'form:(uuid,name),location:ref,' +
  'encounterType:ref,' +
  'encounterProviders:(uuid,display,' +
  'provider:(uuid,display))),' +
  'patient:(uuid,display),' +
  'visitType:(uuid,name,display),' +
  'attributes:(uuid,display,attributeType:(name,datatypeClassname,uuid),value),' +
  'location:(uuid,name,display))';
