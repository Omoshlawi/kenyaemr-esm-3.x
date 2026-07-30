import React from 'react';
import { useTranslation } from 'react-i18next';
import { Tag } from '@carbon/react';
import { useCurrencyFormatting } from '../../../../helpers/currency';
import styles from './claim-submit.scss';

export interface ClaimReviewDiagnosis {
  icd_code: string;
  icd_description?: string;
  status?: string;
}

export interface ClaimReviewBillLine {
  item_name?: string | null;
  intervention_code?: string;
  line_total_amount?: number | null;
}

interface ClaimReviewSectionProps {
  diagnoses?: Array<ClaimReviewDiagnosis>;
  billLines?: Array<ClaimReviewBillLine>;
}

const ClaimReviewSection: React.FC<ClaimReviewSectionProps> = ({ diagnoses = [], billLines = [] }) => {
  const { t } = useTranslation();
  const { formatSimple } = useCurrencyFormatting();

  if (diagnoses.length === 0 && billLines.length === 0) {
    return null;
  }

  return (
    <section className={styles.previewCard}>
      {diagnoses.length > 0 && (
        <div className={styles.previewGroup}>
          <span className={styles.previewGroupTitle}>
            {t('diagnoses', 'Diagnoses')} ({diagnoses.length})
          </span>
          <ul className={styles.previewList}>
            {diagnoses.map((dx) => (
              <li key={dx.icd_code} className={styles.previewItem}>
                <code className={styles.previewCode}>{dx.icd_code}</code>
                <span className={styles.previewName}>{dx.icd_description ?? ''}</span>
                {dx.status && (
                  <Tag
                    size="sm"
                    type={dx.status === 'ATTACHED' ? 'green' : dx.status === 'REJECTED' ? 'red' : 'warm-gray'}>
                    {dx.status}
                  </Tag>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {billLines.length > 0 && (
        <div className={styles.previewGroup}>
          <span className={styles.previewGroupTitle}>
            {t('billLines', 'Bill lines')} ({billLines.length})
          </span>
          <ul className={styles.previewList}>
            {billLines.map((bl, index) => (
              <li key={`${bl.intervention_code ?? 'line'}-${index}`} className={styles.previewItem}>
                <span className={styles.previewName}>{bl.item_name ?? bl.intervention_code ?? '—'}</span>
                <span className={styles.previewAmount}>{formatSimple(Number(bl.line_total_amount ?? 0))}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
};

export default ClaimReviewSection;
