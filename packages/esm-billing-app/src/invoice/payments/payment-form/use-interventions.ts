import { useMemo } from 'react';
import { type TFunction } from 'i18next';

import { type LineItem } from '../../../types';
import { type useClaimForVisit } from '../../../bill-administration/patient-billing/workspaces/create-bill/create-bill.resource';
import { tariffPreauthDeltaThreshold } from './constant';
import { type InterventionItem } from './payment.types';

type ClaimForVisit = ReturnType<typeof useClaimForVisit>;

type UseInterventionsArgs = {
  claimForVisit: ClaimForVisit;
  unPaidLineItems: Array<LineItem>;
  formatCurrency: (amount: number) => string;
  t: TFunction;
};

export function useInterventions({
  claimForVisit,
  unPaidLineItems,
  formatCurrency,
  t,
}: UseInterventionsArgs): Array<InterventionItem> {
  const sentInterventionCodes = useMemo(() => {
    const sentLines = ((claimForVisit as any)?.sent_line_items ?? []) as Array<any>;
    const unPaidUuids = new Set(unPaidLineItems.map((item) => item.uuid));
    const codes = new Set<string>();
    for (const sl of sentLines) {
      if (sl?.voided) {
        continue;
      }
      if (!sl?.intervention_code) {
        continue;
      }
      const lineUuid = sl?.openmrs_line_item_uuid ? String(sl.openmrs_line_item_uuid) : null;
      if (lineUuid && unPaidUuids.has(lineUuid)) {
        codes.add(sl.intervention_code);
      }
    }
    return codes;
  }, [claimForVisit, unPaidLineItems]);

  return useMemo(() => {
    const interventions = ((claimForVisit as any)?.interventions ?? []) as Array<any>;
    return interventions
      .filter((iv) => (iv?.status ?? '').toUpperCase() === 'ACTIVE')
      .map((iv: any) => {
        const mech = (iv?.payment_mechanism ?? '').toString().toUpperCase();
        const isPerDiem = mech.includes('DIEM');

        const catalogTariff: number | null = iv?.keph_level_tariff ?? null;
        const preauthEstimatedAmount: number | null = iv?.preauth_estimated_amount ?? null;
        const preauthApproved: boolean = iv?.preauth_approved === true;
        const accruedAmount: number | null = iv?.accrued_amount ?? null;
        const accruedDays: number | null = iv?.accrued_days ?? null;
        const effectiveAmount: number | null = isPerDiem
          ? accruedAmount
          : preauthApproved && preauthEstimatedAmount != null
          ? preauthEstimatedAmount
          : catalogTariff;

        const name = iv.intervention_name ?? t('unnamedIntervention', 'Unnamed intervention');
        const alreadySent = sentInterventionCodes.has(iv.intervention_code);

        const mechLabel = isPerDiem
          ? t('perDiem', 'Per diem')
          : mech === 'CAPITATION'
          ? t('capitation', 'Capitation')
          : mech || t('feeForService', 'Fee-for-service');
        let displayAmount: string;
        if (isPerDiem) {
          if (accruedAmount != null && accruedDays != null) {
            displayAmount = `${formatCurrency(accruedAmount)} (${accruedDays} ${
              accruedDays === 1 ? t('day', 'day') : t('days', 'days')
            })`;
          } else if (catalogTariff != null) {
            displayAmount = `${formatCurrency(catalogTariff)}/${t('day', 'day')}`;
          } else {
            displayAmount = '—';
          }
        } else if (preauthApproved && preauthEstimatedAmount != null) {
          if (catalogTariff != null && Math.abs(catalogTariff - preauthEstimatedAmount) > tariffPreauthDeltaThreshold) {
            displayAmount = `${formatCurrency(preauthEstimatedAmount)} (${t('preauthApproved', 'preauth')}, ${t(
              'catalogShort',
              'catalog',
            )} ${formatCurrency(catalogTariff)})`;
          } else {
            displayAmount = formatCurrency(preauthEstimatedAmount);
          }
        } else {
          displayAmount = catalogTariff != null ? formatCurrency(catalogTariff) : '—';
        }

        const sentSuffix = alreadySent ? ` — ${t('alreadySentForBill', 'Already sent for this bill')}` : '';

        return {
          id: `intervention-${iv.intervention_code}`,
          code: iv.intervention_code,
          subBenefitCode: iv.sub_benefit_code ?? null,
          name,
          text: `${iv.intervention_code} · ${name} · ${mechLabel} — ${displayAmount}${sentSuffix}`,
          paymentMechanism: mech || null,
          isPerDiem,
          tariff: catalogTariff,
          preauthEstimatedAmount,
          preauthApproved,
          effectiveAmount,
          accruedAmount,
          accruedDays: accruedDays != null ? Math.round(accruedDays) : null,
          needsPreauth: Boolean(iv?.needs_preauth),
          preauthExists: Boolean(iv?.preauth_exist),
          disabled: alreadySent,
          alreadySent,
        };
      });
  }, [claimForVisit, sentInterventionCodes, formatCurrency, t]);
}
