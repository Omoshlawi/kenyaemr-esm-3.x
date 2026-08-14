import { type TFunction } from 'i18next';

import { type LineItem } from '../../../types';
import {
  addEmergencyProtocol,
  dispatchClaimLinesToSha,
  lockCover,
} from '../../../billing-form/social-health-authority/sha-virtual-claim.resource';
import { type SupplementaryScheme } from '../../../billing-form/social-health-authority/type';
import {
  extractFetchError,
  extractUpstreamError,
} from '../../../claims/claims-management/table/virtual-claim-preauth/utils';
import { type InterventionItem, type PaymentLine } from './payment.types';

export function hasShaInsuranceLine(payments: Array<PaymentLine>, insurancePaymentMethod: string): boolean {
  return payments.some((line) => line.paymentMode?.uuid === insurancePaymentMethod && Boolean(line.interventionCode));
}

export function isShaInsuranceLine(line: PaymentLine, isSHAVisit: boolean, insurancePaymentMethod: string): boolean {
  return isSHAVisit && line.paymentMode?.uuid === insurancePaymentMethod && Boolean(line.interventionCode);
}

export type ShaCoverLockResult = { ok: boolean; error?: string };

export async function lockShaCover({
  authorizationCode,
  selectedScheme,
  t,
}: {
  authorizationCode: string;
  selectedScheme: SupplementaryScheme;
  t: TFunction;
}): Promise<ShaCoverLockResult> {
  const principalCr = selectedScheme?.principalContributor?.crNumber;
  const policyNumber = selectedScheme?.policy?.number;

  if (!principalCr || !policyNumber) {
    return {
      ok: false,
      error: t(
        'coverMissingPolicyNumber',
        'The selected cover has no policy number from SHA it cannot be locked. Choose another cover or contact SHA.',
      ),
    };
  }

  const lockResult = await lockCover({
    consentToken: authorizationCode,
    principalCrId: principalCr,
    policyNumber,
  });
  if (!lockResult.ok) {
    return { ok: false, error: lockResult.error ?? t('coverLockFailedShort', 'Cover lock failed') };
  }
  return { ok: true };
}

export type ShaLineResult = {
  ok: boolean;
  reason?: 'intervention-not-found' | 'dispatch-failed';
  code?: string;
  error?: string;
};

export async function dispatchShaLine({
  line,
  interventionItems,
  authorizationCode,
  unPaidLineItems,
  t,
}: {
  line: PaymentLine;
  interventionItems: Array<InterventionItem>;
  authorizationCode: string | null;
  unPaidLineItems: Array<LineItem>;
  t: TFunction;
}): Promise<ShaLineResult> {
  const intervention = interventionItems.find((iv) => iv.code === line.interventionCode);
  if (!intervention) {
    return { ok: false, reason: 'intervention-not-found', code: line.interventionCode! };
  }

  const shaPortionLine = {
    uuid: unPaidLineItems[0]?.uuid ?? '',
    price: line.amount!,
    quantity: 1,
  };

  const dispatch = await dispatchClaimLinesToSha(
    authorizationCode ?? '',
    {
      code: intervention.code,
      isPerDiem: intervention.isPerDiem,
      paymentMechanism: intervention.paymentMechanism,
    },
    [shaPortionLine],
    t,
  );
  if (!dispatch.ok) {
    return { ok: false, reason: 'dispatch-failed', error: dispatch.error };
  }
  return { ok: true };
}

export async function dispatchEmergencyProtocol({
  line,
  interventionItems,
  authorizationCode,
  unPaidLineItems,
  t,
}: {
  line: PaymentLine;
  interventionItems: Array<InterventionItem>;
  authorizationCode: string | null;
  unPaidLineItems: Array<LineItem>;
  t: TFunction;
}): Promise<ShaLineResult> {
  const intervention = interventionItems.find((iv) => iv.code === line.interventionCode);
  if (!intervention) {
    return { ok: false, reason: 'intervention-not-found', code: line.interventionCode! };
  }
  if (!line.protocolCode) {
    return {
      ok: false,
      reason: 'dispatch-failed',
      error: t('protocolRequired', 'Select a protocol for the emergency line'),
    };
  }

  try {
    const response = await addEmergencyProtocol({
      consentToken: authorizationCode ?? '',
      protocolCode: line.protocolCode,
      interventionCode: intervention.code,
      unitPrice: line.amount!,
      quantity: 1,
      openmrsLineItemUuid: unPaidLineItems[0]?.uuid,
    });
    if (!response?.success) {
      return {
        ok: false,
        reason: 'dispatch-failed',
        error: extractUpstreamError(response, t('protocolAddFailedShort', 'Failed to add protocol')),
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: 'dispatch-failed', error: extractFetchError(error) };
  }
}
