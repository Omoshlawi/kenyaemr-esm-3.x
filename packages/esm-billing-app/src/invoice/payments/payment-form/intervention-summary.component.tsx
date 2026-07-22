import React from 'react';
import { useTranslation } from 'react-i18next';
import { InlineNotification, Tag } from '@carbon/react';

import { tariffPreauthDeltaThreshold } from './constant';
import { type InterventionItem } from './payment.types';
import styles from './payment.workspace.scss';

type InterventionSummaryProps = {
  intervention: InterventionItem;
  isOverAmount: boolean;
  formatCurrency: (amount: number) => string;
};

const InterventionSummary: React.FC<InterventionSummaryProps> = ({ intervention, isOverAmount, formatCurrency }) => {
  const { t } = useTranslation();

  return (
    <div className={styles.interventionSummary}>
      <div className={styles.interventionSummaryRow}>
        <code className={styles.interventionCode}>{intervention.code}</code>
        <span className={styles.interventionName}>{intervention.name}</span>
        {intervention.paymentMechanism && (
          <Tag
            size="sm"
            type={intervention.isPerDiem ? 'teal' : intervention.paymentMechanism === 'CAPITATION' ? 'blue' : 'gray'}>
            {intervention.isPerDiem
              ? t('perDiem', 'Per diem')
              : intervention.paymentMechanism === 'CAPITATION'
              ? t('capitation', 'Capitation')
              : intervention.paymentMechanism}
          </Tag>
        )}
        {intervention.preauthApproved && (
          <Tag size="sm" type="green">
            {t('preauthApprovedTag', 'Preauth approved')}
          </Tag>
        )}
      </div>

      <div className={styles.interventionSummaryDetails}>
        {intervention.isPerDiem ? (
          <>
            {intervention.accruedAmount != null && (
              <div className={styles.interventionSummaryDetail}>
                <span className={styles.interventionSummaryDetailLabel}>{t('accruedAmount', 'Accrued')}</span>
                <span className={styles.interventionSummaryDetailValue}>
                  {formatCurrency(intervention.accruedAmount)}
                </span>
              </div>
            )}
            {intervention.accruedDays != null && (
              <div className={styles.interventionSummaryDetail}>
                <span className={styles.interventionSummaryDetailLabel}>{t('days', 'Days')}</span>
                <span className={styles.interventionSummaryDetailValue}>{intervention.accruedDays}</span>
              </div>
            )}
            {intervention.tariff != null && (
              <div className={styles.interventionSummaryDetail}>
                <span className={styles.interventionSummaryDetailLabel}>{t('perDayRate', 'Per day')}</span>
                <span className={styles.interventionSummaryDetailValue}>{formatCurrency(intervention.tariff)}</span>
              </div>
            )}
          </>
        ) : (
          <>
            {intervention.preauthApproved && intervention.preauthEstimatedAmount != null ? (
              <>
                <div className={styles.interventionSummaryDetail}>
                  <span className={styles.interventionSummaryDetailLabel}>
                    {t('preauthApprovedAmount', 'SHA approved')}
                  </span>
                  <span className={styles.interventionSummaryDetailValue}>
                    {formatCurrency(intervention.preauthEstimatedAmount)}
                  </span>
                </div>
                {intervention.tariff != null &&
                  Math.abs(intervention.tariff - intervention.preauthEstimatedAmount) > tariffPreauthDeltaThreshold && (
                    <div className={styles.interventionSummaryDetail}>
                      <span className={styles.interventionSummaryDetailLabel}>
                        {t('catalogTariff', 'Catalog tariff')}
                      </span>
                      <span className={styles.interventionSummaryDetailValue}>
                        {formatCurrency(intervention.tariff)}
                      </span>
                    </div>
                  )}
              </>
            ) : (
              intervention.tariff != null && (
                <div className={styles.interventionSummaryDetail}>
                  <span className={styles.interventionSummaryDetailLabel}>{t('kephLevelTr', 'Tariff')}</span>
                  <span className={styles.interventionSummaryDetailValue}>{formatCurrency(intervention.tariff)}</span>
                </div>
              )
            )}
          </>
        )}
      </div>

      {isOverAmount && intervention.isPerDiem && intervention.accruedAmount != null && (
        <InlineNotification
          kind="warning"
          lowContrast
          hideCloseButton
          title={t('amountExceedsAccrued', 'Amount exceeds accrued')}
          subtitle={t(
            'maxPayableForDays',
            'Maximum payable is {{max}} (accrued so far) for {{days}} {{dayLabel}} admitted',
            {
              max: formatCurrency(intervention.accruedAmount),
              days: intervention.accruedDays ?? 0,
              dayLabel: (intervention.accruedDays ?? 0) === 1 ? t('day', 'day') : t('days', 'days'),
            },
          )}
          className={styles.accruedWarning}
        />
      )}
    </div>
  );
};

export default InterventionSummary;
