import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, InlineLoading, Layer, Tile } from '@carbon/react';
import { Renew } from '@carbon/react/icons';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import { formatDate } from '@openmrs/esm-framework';
import dayjs from 'dayjs';
import { useClaimsMetrics } from '../hooks/useClaimsMetrics';
import styles from './claims-cards.scss';

type SubItem = { label: string; value: number | string };

function ClaimsMetricCard({ title, total, items }: { title: string; total: number | string; items: SubItem[] }) {
  return (
    <Layer className={styles.cardContainer}>
      <Tile className={styles.tile}>
        <h4 className={styles.cardTitle}>{title}</h4>
        <div className={styles.cardBody}>
          <p className={styles.mainCount}>{total}</p>
          <div className={styles.subItemsGrid}>
            {items.map(({ label, value }) => (
              <div key={label} className={styles.subItem}>
                <span className={styles.subLabel}>{label}</span>
                <span className={styles.subValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </Tile>
    </Layer>
  );
}

export default function ClaimsCards() {
  const { t } = useTranslation();
  const { data, isLoading, error, mutate } = useClaimsMetrics();
  const sectionDate = formatDate(dayjs().toDate());

  if (isLoading) {
    return (
      <section className={styles.container}>
        <header className={styles.sectionHeader}>
          <span className={styles.sectionDate}>{sectionDate}</span>
        </header>
        <InlineLoading
          status="active"
          iconDescription="Loading"
          description={t('loadingClaimsMetrics', 'Loading claims metrics...')}
        />
      </section>
    );
  }

  if (error) {
    return <ErrorState headerTitle={t('claimsMetrics', 'Claims metrics')} error={error} />;
  }

  const providerState = data?.metrics?.provider_side?.by_workflow_state;
  const payerState = data?.metrics?.payer_side?.by_workflow_state;

  const providerTotal = [
    providerState?.DRAFT,
    providerState?.DRAFT_PROVIDER,
    providerState?.DRAFT_RESUBMIT,
    providerState?.ELECTIVE_DRAFT,
    providerState?.ELECTIVE_APPROVED,
    providerState?.SUBMITTED,
    providerState?.FAILED_TO_SUBMIT,
    providerState?.CLOSED,
  ].reduce<number>((sum, v) => sum + (v ?? 0), 0);

  const payerTotal = [
    payerState?.APPROVED,
    payerState?.REJECTED,
    payerState?.SENT_BACK,
    payerState?.MANUAL_REVIEW,
    payerState?.CLINICAL_REVIEW,
    payerState?.MEDICAL_REVIEW,
    payerState?.UNDER_SURVEILLANCE,
    payerState?.SENT_FOR_PAYMENT_PROCESSING,
    payerState?.PAYMENT_COMPLETED,
    payerState?.PARTIALLY_PAID,
    payerState?._not_yet_at_payer,
  ].reduce<number>((sum, v) => sum + (v ?? 0), 0);

  const providerItems: SubItem[] = [
    { label: t('draft', 'Draft'), value: providerState?.DRAFT ?? 0 },
    { label: t('draftProvider', 'Draft Provider'), value: providerState?.DRAFT_PROVIDER ?? 0 },
    { label: t('draftResubmit', 'Draft Resubmit'), value: providerState?.DRAFT_RESUBMIT ?? 0 },
    { label: t('electiveDraft', 'Elective Draft'), value: providerState?.ELECTIVE_DRAFT ?? 0 },
    { label: t('electiveApproved', 'Elective Approved'), value: providerState?.ELECTIVE_APPROVED ?? 0 },
    { label: t('submitted', 'Submitted'), value: providerState?.SUBMITTED ?? 0 },
    { label: t('failedToSubmit', 'Failed to Submit'), value: providerState?.FAILED_TO_SUBMIT ?? 0 },
    { label: t('closed', 'Closed'), value: providerState?.CLOSED ?? 0 },
  ];

  const payerItems: SubItem[] = [
    { label: t('approved', 'Approved'), value: payerState?.APPROVED ?? 0 },
    { label: t('rejected', 'Rejected'), value: payerState?.REJECTED ?? 0 },
    { label: t('sentBack', 'Sent Back'), value: payerState?.SENT_BACK ?? 0 },
    { label: t('manualReview', 'Manual Review'), value: payerState?.MANUAL_REVIEW ?? 0 },
    { label: t('clinicalReview', 'Clinical Review'), value: payerState?.CLINICAL_REVIEW ?? 0 },
    { label: t('medicalReview', 'Medical Review'), value: payerState?.MEDICAL_REVIEW ?? 0 },
    { label: t('underSurveillance', 'Under Surveillance'), value: payerState?.UNDER_SURVEILLANCE ?? 0 },
    { label: t('sentForPayment', 'Sent for Payment'), value: payerState?.SENT_FOR_PAYMENT_PROCESSING ?? 0 },
    { label: t('paymentCompleted', 'Payment Completed'), value: payerState?.PAYMENT_COMPLETED ?? 0 },
    { label: t('partiallyPaid', 'Partially Paid'), value: payerState?.PARTIALLY_PAID ?? 0 },
    { label: t('notYetAtPayer', 'Not Yet at Payer'), value: payerState?._not_yet_at_payer ?? 0 },
  ];

  return (
    <section className={styles.container}>
      <header className={styles.sectionHeader}>
        <span className={styles.sectionDate}>{sectionDate}</span>
        <Button
          kind="ghost"
          onClick={() => mutate()}
          size="sm"
          renderIcon={Renew}
          iconDescription={t('refreshMetrics', 'Refresh Metrics')}>
          {t('refreshMetrics', 'Refresh Metrics')}
        </Button>
      </header>

      <div className={styles.cardsRow}>
        <ClaimsMetricCard
          title={t('claimsOverview', 'Claims Overview')}
          total={data?.metrics?.total_claims ?? 0}
          items={[
            {
              label: t('totalAmountKes', 'Total Amount (KES)'),
              value: (data?.metrics?.total_claim_amount_kes ?? 0).toLocaleString(),
            },
          ]}
        />
        <ClaimsMetricCard title={t('providerSide', 'Provider Side')} total={providerTotal} items={providerItems} />
        <ClaimsMetricCard title={t('payerSide', 'Payer Side')} total={payerTotal} items={payerItems} />
      </div>
    </section>
  );
}
