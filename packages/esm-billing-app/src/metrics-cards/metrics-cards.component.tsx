import React, { useMemo } from 'react';
import { Button, InlineLoading, Layer, Tile } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { ErrorState } from '@openmrs/esm-patient-common-lib';
import classNames from 'classnames';
import dayjs from 'dayjs';

import styles from './metrics-cards.scss';
import { useBillSummary } from './metrics.resource';
import { convertToCurrency } from '../helpers';
import { Renew } from '@carbon/react/icons';

export default function MetricsCards() {
  const { t } = useTranslation();
  const { data: billSummary, isLoading, error, mutate } = useBillSummary();
  const sectionDate = dayjs().format('dddd, MMMM D, YYYY');
  const cards = useMemo(
    () => [
      { title: t('totalBillsLabel', 'Total Bills'), count: convertToCurrency(billSummary?.totalBills) },
      { title: t('paidBills', 'Paid Bills'), count: convertToCurrency(billSummary?.paidBills) },
      { title: t('pendingBills', 'Pending Bills'), count: convertToCurrency(billSummary?.pendingBills) },
      { title: t('exemptedBills', 'Exempted Bills'), count: convertToCurrency(billSummary?.exemptedBills) },
    ],
    [t, billSummary],
  );

  if (isLoading) {
    return (
      <section className={styles.container} aria-labelledby="bill-metrics-heading">
        <header className={styles.sectionHeader}>
          <span className={styles.sectionDate}>{sectionDate}</span>
        </header>
        <InlineLoading
          status="active"
          iconDescription="Loading"
          description={t('loadingBillMetrics', 'Loading bill metrics...')}
        />
      </section>
    );
  }

  if (error) {
    return <ErrorState headerTitle={t('billMetrics', 'Bill metrics')} error={error} />;
  }
  return (
    <section className={styles.container} aria-labelledby="bill-metrics-heading">
      <header className={styles.sectionHeader}>
        <span className={styles.sectionDate}>{sectionDate}</span>
        <Button
          kind="ghost"
          onClick={() => mutate()}
          size="sm"
          renderIcon={Renew}
          iconDescription={t('refreshMetrics', 'Refresh Metric')}>
          {t('refreshMetrics', 'Refresh Metric')}
        </Button>
      </header>
      <div className={styles.cardsRow}>
        {cards.map((card) => (
          <Layer key={card.title} className={classNames(styles.cardContainer)}>
            <Tile className={styles.tileContainer}>
              <div className={styles.tileHeader}>
                <div className={styles.headerLabelContainer}>
                  <label className={styles.headerLabel}>{card.title}</label>
                </div>
              </div>
              <div>
                <p className={styles.totalsValue}>{card.count}</p>
              </div>
            </Tile>
          </Layer>
        ))}
      </div>
    </section>
  );
}
