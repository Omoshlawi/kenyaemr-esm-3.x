import React from 'react';
import { Drug } from '@openmrs/esm-patient-common-lib';
import { useBillableItem, useSockItemInventory } from '../useBillableItem';
import { useTranslation } from 'react-i18next';
import styles from './drug-order.scss';
import { useCurrencyFormatting } from '../../../helpers/currency';

type DrugOrderProps = {
  drug: Drug;
};

const DrugOrder: React.FC<DrugOrderProps> = ({ drug }) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();

  const { stockItem, isLoading: isLoadingInventory } = useSockItemInventory(drug?.uuid);
  const { billableItem, isLoading } = useBillableItem(drug?.concept?.uuid, drug?.uuid);
  if (isLoading || isLoadingInventory) {
    return null;
  }
  return (
    <div className={styles.drugOrderContainer}>
      {stockItem && stockItem.length > 0 ? (
        <>
          <div className={styles.bold}>{t('inStock', 'In Stock')}</div>
          {stockItem.map((item, index) => (
            <div key={index} className={styles.itemContainer}>
              <span>{item.partyName}</span>
              <span>
                {' '}
                {Math.round(item.quantity)} {item.quantityUoM}(s){' '}
              </span>
            </div>
          ))}
        </>
      ) : (
        <div className={styles.red}>{t('drugNotAvailable', 'Drug Is Not Available / Out of Stock')}</div>
      )}

      <div>
        {billableItem &&
          billableItem?.servicePrices.map((item) => (
            <div key={item.uuid} className={styles.itemContainer}>
              <span className={styles.bold}>{item.paymentMode.name}</span>
              <span>{formatCurrency(item.price)}</span>
            </div>
          ))}
      </div>
    </div>
  );
};

export default DrugOrder;
