import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, InlineNotification, Tag } from '@carbon/react';
import { type ClaimPreviewResponse } from './claim-submit-resource';
import { useCurrencyFormatting } from '../../../../helpers/currency';
import styles from './claim-submit.scss';

interface ClaimShaPreviewProps {
  preview: ClaimPreviewResponse | null;
  isLoading: boolean;
  error?: unknown;
  /** intervention_code → tariff, used to price emergency interventions SHA's preview returns at 0. */
  fallbackTariffs?: Record<string, number>;
}

const ClaimShaPreview: React.FC<ClaimShaPreviewProps> = ({ preview, isLoading, error, fallbackTariffs }) => {
  const { t } = useTranslation();
  const { formatSimple } = useCurrencyFormatting();

  if (isLoading) {
    return (
      <section className={styles.previewCard}>
        <InlineLoading description={t('loadingShaPreview', 'Loading SHA preview…')} />
      </section>
    );
  }

  const shaError = (preview && preview.sha_error) || (error ? String((error as Error)?.message ?? error) : null);
  if (error || !preview || preview.sha_error || !preview.sha) {
    return (
      <section className={styles.previewCard}>
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('shaPreviewUnavailable', 'SHA preview unavailable')}
          subtitle={
            shaError ??
            t('shaPreviewUnavailableSubtitle', 'Could not load the claim preview from SHA. You can still submit.')
          }
        />
      </section>
    );
  }

  const sha = preview.sha;
  const workflowState = sha.workflow_state ?? preview.local?.workflow_state;
  const interventions = sha.interventions ?? [];

  return (
    <section className={styles.previewCard}>
      <div className={styles.previewHeaderRow}>
        <h6 className={styles.summaryTitle}>{t('reviewBeforeSubmitting', 'Review before submitting')}</h6>
        <Tag size="sm" type={preview.ready_to_dispatch ? 'green' : 'warm-gray'}>
          {preview.ready_to_dispatch ? t('readyToDispatch', 'Ready to dispatch') : t('notReady', 'Not ready')}
        </Tag>
      </div>

      {workflowState && (
        <div className={styles.summaryRow}>
          <span className={styles.summaryLabel}>{t('workflowState', 'Workflow state')}</span>
          <span className={styles.summaryValue}>{workflowState}</span>
        </div>
      )}

      {interventions.length > 0 && (
        <div className={styles.previewGroup}>
          <span className={styles.previewGroupTitle}>
            {t('interventions', 'Interventions')} ({interventions.length})
          </span>
          <ul className={styles.previewList}>
            {interventions.map((iv, index) => {
              // SHA returns these as strings ("0", "2600"), so coerce and take the first positive.
              const positive = (value: unknown): number | undefined => {
                const n = Number(value);
                return Number.isFinite(n) && n > 0 ? n : undefined;
              };
              const amount =
                positive(iv.accrued_per_diem_amount) ??
                positive(iv.keph_level_tarrif) ??
                (iv.intervention_code ? positive(fallbackTariffs?.[iv.intervention_code]) : undefined);
              return (
                <li key={iv.intervention_code ?? `sha-iv-${index}`} className={styles.previewItem}>
                  <code className={styles.previewCode}>{iv.intervention_code ?? '—'}</code>
                  <span className={styles.previewName}>{iv.intervention_name ?? ''}</span>
                  {amount != null && <span className={styles.previewAmount}>{formatSimple(Number(amount))}</span>}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};

export default ClaimShaPreview;
