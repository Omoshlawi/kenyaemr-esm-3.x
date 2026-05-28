import React from 'react';
import { Drug } from '@openmrs/esm-patient-common-lib';
import { useBillableItem, useDrugQuantityByConceptUuid, useSockItemInventory } from '../useBillableItem';
import { useTranslation } from 'react-i18next';
import styles from './drug-order.scss';
import { useCurrencyFormatting } from '../../../helpers/currency';
import { InlineLoading } from '@carbon/react';

type DrugOrderProps = {
  drug: Drug;
};

const DrugOrder: React.FC<DrugOrderProps> = ({ drug }) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const {
    quantity,
    quantityUoM,
    isLoading: isLoadingInventory,
  } = useDrugQuantityByConceptUuid(drug?.concept?.display ?? '');
  const { billableItem, isLoading } = useBillableItem(drug?.concept?.uuid, drug?.uuid);
  if (isLoading || isLoadingInventory) {
    return <InlineLoading />;
  }
  return (
    <div className={styles.drugOrderContainer}>
      {quantity > 0 ? (
        <>
          <div className={styles.bold}>{t('inStock', 'In Stock')}</div>
          <div className={styles.itemContainer}>
            {Math.round(quantity)} {quantityUoM}(s){' '}
          </div>
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
