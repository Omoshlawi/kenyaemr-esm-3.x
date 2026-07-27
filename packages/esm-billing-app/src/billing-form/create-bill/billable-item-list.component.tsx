import React from 'react';
import { useTranslation } from 'react-i18next';
import { Layer } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import { type FieldArrayWithId } from 'react-hook-form';

import { type BillingFormData } from '../../billing.resource';
import { type BillingService } from '../../types';
import BillableItemCard from './billable-item-card.component';

import styles from './billing-form.scss';

interface BillableItemListProps {
  fields: Array<FieldArrayWithId<BillingFormData, 'lineItems', 'id'>>;
  services: Record<string, BillingService>;
  onRemove: (index: number) => void;
}

const BillableItemList: React.FC<BillableItemListProps> = ({ fields, services, onRemove }) => {
  const { t } = useTranslation();

  return (
    <>
      <div className={styles.itemsHeader}>
        <h2 className={styles.itemsHeading}>
          {t('billableItems', 'Billable Items')} ({fields.length})
        </h2>
      </div>

      {fields.length === 0 ? (
        <Layer className={styles.emptyState}>
          <Add size={20} />
          <p>{t('noBillableItems', 'Search and add billable items to create a bill')}</p>
        </Layer>
      ) : (
        <div className={styles.lineItems}>
          {fields.map((field, index) => (
            <BillableItemCard
              key={field.id}
              index={index}
              service={services[field.billableService]}
              onRemove={onRemove}
            />
          ))}
        </div>
      )}
    </>
  );
};

export default BillableItemList;
