import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Layer, NumberInput } from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { Controller, useFormContext, useWatch } from 'react-hook-form';

import { type BillingFormData } from '../../billing.resource';
import { useCurrencyFormatting } from '../../helpers/currency';
import { type BillingService } from '../../types';

import styles from './billing-form.scss';

interface BillableItemCardProps {
  index: number;
  service?: BillingService;
  onRemove: (index: number) => void;
}

const BillableItemCard: React.FC<BillableItemCardProps> = ({ index, service, onRemove }) => {
  const { t } = useTranslation();
  const { formatSimple } = useCurrencyFormatting();
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<BillingFormData>();

  const servicePrices = service?.servicePrices ?? [];
  const quantity = useWatch({ control, name: `lineItems.${index}.quantity` });
  const price = useWatch({ control, name: `lineItems.${index}.price` });

  return (
    <div className={styles.lineItem}>
      <div className={styles.lineItemHeader}>
        <div className={styles.serviceDetails}>
          <span className={styles.serviceName}>{service?.name}</span>
          {service?.shortName && <span className={styles.serviceCode}>{service.shortName}</span>}
        </div>
        <Button
          hasIconOnly
          renderIcon={TrashCan}
          iconDescription={t('delete', 'Delete')}
          kind="ghost"
          size="sm"
          onClick={() => onRemove(index)}
        />
      </div>

      <div className={styles.lineItemControls}>
        <Controller
          control={control}
          name={`lineItems.${index}.quantity`}
          render={({ field }) => (
            <Layer>
              <NumberInput
                id={`quantity-${index}`}
                label={t('qty', 'Qty')}
                min={1}
                value={field.value}
                onChange={(_event, { value }) => field.onChange(value === '' ? '' : Number(value))}
                invalid={Boolean(errors.lineItems?.[index]?.quantity)}
                invalidText={errors.lineItems?.[index]?.quantity?.message}
              />
            </Layer>
          )}
        />

        <Controller
          control={control}
          name={`lineItems.${index}.priceUuid`}
          render={({ field }) => (
            <Layer>
              <Dropdown
                id={`payment-${index}`}
                titleText={t('payment', 'Payment')}
                label={t('selectPayment', 'Select payment')}
                items={servicePrices}
                itemToString={(item) => item?.paymentMode?.name ?? item?.name ?? ''}
                selectedItem={servicePrices.find((servicePrice) => servicePrice.uuid === field.value) ?? null}
                onChange={({ selectedItem }) => {
                  field.onChange(selectedItem?.uuid ?? '');
                  setValue(`lineItems.${index}.price`, selectedItem?.price ?? 0);
                  setValue(`lineItems.${index}.priceName`, selectedItem?.name ?? 'Default');
                }}
                invalid={Boolean(errors.lineItems?.[index]?.priceUuid)}
                invalidText={errors.lineItems?.[index]?.priceUuid?.message}
              />
            </Layer>
          )}
        />
      </div>

      <div className={styles.lineItemFooter}>
        <span className={styles.unitPrice}>
          {t('unit', 'Unit')}: {formatSimple(price ?? 0)}
        </span>
        <span className={styles.lineTotal}>{formatSimple((price ?? 0) * (Number(quantity) || 0))}</span>
      </div>
    </div>
  );
};

export default BillableItemCard;
