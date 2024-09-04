import React from 'react';
import { BillableFormSchema } from '../form-schemas';
import { Controller, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { usePaymentModes } from '../../../billing.resource';
import styles from './service-form.scss';
import { ComboBox, NumberInput, IconButton } from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';

interface PriceFieldProps {
  field: Record<string, any>;
  index: number;
  control: Control<BillableFormSchema>;
  removeServicePrice: (index: number) => void;
  errors: Record<string, any>;
}

const PriceField: React.FC<PriceFieldProps> = ({ field, index, control, removeServicePrice, errors }) => {
  const { t } = useTranslation();
  const { paymentModes, isLoading } = usePaymentModes();
  return (
    <div key={field.id} className={styles.paymentMethods}>
      <Controller
        name={`servicePrices.${index}.paymentMode`}
        control={control}
        render={({ field }) => (
          <ComboBox
            onChange={({ selectedItem }) => field.onChange(selectedItem)}
            titleText={t('paymentMethod', 'Payment method')}
            items={paymentModes ?? []}
            itemToString={(item) => (item ? item.name : '')}
            placeholder={t('selectPaymentMode', 'Select payment mode')}
            disabled={isLoading}
            initialSelectedItem={field.value}
            invalid={!!errors?.servicePrices?.[index]?.paymentMode}
            invalidText={errors?.servicePrices?.[index]?.paymentMode?.message}
          />
        )}
      />
      <Controller
        name={`servicePrices.${index}.price`}
        control={control}
        render={({ field }) => (
          <NumberInput
            onChange={(e) => field.onChange(parseInt(e.target.value))}
            type="number"
            labelText={t('price', 'Price')}
            placeholder={t('enterPrice', 'Enter price')}
            defaultValue={field.value}
            invalid={!!errors?.servicePrices?.[index]?.price}
            invalidText={errors?.servicePrices?.[index]?.price?.message}
          />
        )}
      />
      <IconButton
        kind="danger--tertiary"
        size="md"
        label={t('delete', 'Delete')}
        onClick={() => removeServicePrice(index)}>
        <TrashCan />
      </IconButton>
    </div>
  );
};

export default PriceField;
