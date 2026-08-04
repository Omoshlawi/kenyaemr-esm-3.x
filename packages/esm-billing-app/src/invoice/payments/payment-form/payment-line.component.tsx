import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { Button, ComboBox, NumberInput, TextInput } from '@carbon/react';
import { TrashCan } from '@carbon/react/icons';
import { ResponsiveWrapper } from '@openmrs/esm-framework';

import InterventionSummary from './intervention-summary.component';
import { type InterventionItem, type PaymentModeFormData } from './payment.types';
import { usePaymentContext } from './payment.context';
import { sumAllocationAmount } from './payment-submission.utils';
import styles from './payment.workspace.scss';

type PaymentLineProps = {
  index: number;
  fieldsLength: number;
  onRemove: (index: number) => void;
};

const PaymentLine: React.FC<PaymentLineProps> = ({ index, fieldsLength, onRemove }) => {
  const { t } = useTranslation();
  const {
    control,
    setValue,
    formState: { errors },
  } = useFormContext<PaymentModeFormData>();
  const watchedPayments = useWatch({ control, name: 'payments' });
  const {
    paymentModes,
    interventionItems,
    insurancePaymentMethod,
    requiresShaIntervention,
    overAmountLineIndices,
    formatCurrency,
    manualAllocation,
    allocationLineItems,
    overAllocatedLineItemUuids,
  } = usePaymentContext();

  const watchedAllocations = useWatch({ control, name: `payments.${index}.allocations` });

  useEffect(() => {
    if (!manualAllocation) {
      return;
    }
    allocationLineItems.forEach((lineItem, allocationIndex) => {
      setValue(`payments.${index}.allocations.${allocationIndex}.lineItem`, lineItem.uuid, { shouldDirty: false });
    });
  }, [manualAllocation, allocationLineItems, index, setValue]);

  useEffect(() => {
    if (!manualAllocation) {
      return;
    }
    setValue(`payments.${index}.amount`, sumAllocationAmount(watchedAllocations), {
      shouldValidate: true,
      shouldDirty: true,
    });
  }, [manualAllocation, watchedAllocations, index, setValue]);

  const selectedPaymentMode = watchedPayments?.[index]?.paymentMode;
  const showReferenceCode = (selectedPaymentMode?.attributeTypes?.length ?? 0) > 0;
  const modesUsedInOtherLines = new Set<string>(
    (watchedPayments ?? [])
      .map((line, lineIndex) => (lineIndex === index ? undefined : line?.paymentMode?.uuid))
      .filter((uuid): uuid is string => Boolean(uuid)),
  );
  const availableModes = paymentModes.filter((mode) => !modesUsedInOtherLines.has(mode.uuid));

  const showInterventionsPicker = requiresShaIntervention && selectedPaymentMode?.uuid === insurancePaymentMethod;

  const selectedInterventionCode = watchedPayments?.[index]?.interventionCode;
  const selectedIntervention = interventionItems.find((iv) => iv.code === selectedInterventionCode) ?? null;
  const isOverAmount = overAmountLineIndices.has(index);

  return (
    <div className={styles.paymentLine}>
      <ResponsiveWrapper>
        <Controller
          name={`payments.${index}.paymentMode`}
          control={control}
          render={({ field: { onChange } }) => (
            <ComboBox
              id={`paymentMode-${index}`}
              itemToString={(item) => (item ? item.name : '')}
              items={availableModes}
              className={styles.paymentModeComboBox}
              selectedItem={selectedPaymentMode ?? null}
              onChange={({ selectedItem }) => {
                onChange(selectedItem);
                if (selectedItem?.uuid !== insurancePaymentMethod && watchedPayments?.[index]?.interventionCode) {
                  setValue(`payments.${index}.interventionCode`, undefined);
                }
              }}
              titleText={t('paymentMode', 'Payment Mode')}
              invalid={!!errors.payments?.[index]?.paymentMode}
              invalidText={errors.payments?.[index]?.paymentMode?.message}
            />
          )}
        />
      </ResponsiveWrapper>

      {manualAllocation ? (
        <div className={styles.allocationGroup}>
          <span className={styles.allocationGroupLabel}>
            {t('allocateAcrossLineItems', 'Allocate across line items')}
          </span>
          {allocationLineItems.map((lineItem, allocationIndex) => (
            <ResponsiveWrapper key={lineItem.uuid}>
              <Controller
                name={`payments.${index}.allocations.${allocationIndex}.amount`}
                control={control}
                render={({ field: { onChange, value } }) => (
                  <NumberInput
                    id={`allocation-${index}-${allocationIndex}`}
                    label={`${lineItem.label} (${t('balance', 'Balance')}: ${formatCurrency(lineItem.balance)})`}
                    allowEmpty
                    min={0}
                    step={0.01}
                    className={styles.paymentModeComboBox}
                    value={value ?? ''}
                    onChange={(e, { value: nextValue }) =>
                      onChange(nextValue === '' || nextValue == null ? undefined : Number(nextValue))
                    }
                    size="md"
                    invalid={overAllocatedLineItemUuids.has(lineItem.uuid)}
                    invalidText={t('allocationExceedsBalance', 'Allocation exceeds the outstanding balance')}
                  />
                )}
              />
            </ResponsiveWrapper>
          ))}
          <span className={styles.allocationTotal}>
            {t('paymentTotal', 'Payment total: {{total}}', {
              total: formatCurrency(sumAllocationAmount(watchedAllocations)),
            })}
          </span>
        </div>
      ) : (
        <ResponsiveWrapper>
          <Controller
            name={`payments.${index}.amount`}
            control={control}
            render={({ field: { onChange, value } }) => (
              <NumberInput
                id={`amount-${index}`}
                label={t('amount', 'Amount')}
                allowEmpty
                min={0}
                className={styles.paymentModeComboBox}
                value={value ?? ''}
                onChange={(e, { value: nextValue }) =>
                  onChange(nextValue === '' || nextValue == null ? undefined : Number(nextValue))
                }
                size="md"
                invalid={!!errors.payments?.[index]?.amount}
                invalidText={errors.payments?.[index]?.amount?.message}
              />
            )}
          />
        </ResponsiveWrapper>
      )}

      {showReferenceCode && (
        <ResponsiveWrapper>
          <Controller
            name={`payments.${index}.referenceCode`}
            control={control}
            render={({ field: { onChange, value } }) => (
              <TextInput
                id={`referenceCode-${index}`}
                labelText={t('referenceCode', 'Reference Code')}
                maxCount={50}
                className={styles.paymentModeComboBox}
                onChange={onChange}
                placeholder={t('enterReferenceCode', 'Enter reference code')}
                size="md"
                type="text"
                value={value ?? ''}
                invalid={!!errors.payments?.[index]?.referenceCode}
                invalidText={errors.payments?.[index]?.referenceCode?.message}
              />
            )}
          />
        </ResponsiveWrapper>
      )}

      {showInterventionsPicker && (
        <ResponsiveWrapper>
          <Controller
            name={`payments.${index}.interventionCode`}
            control={control}
            render={({ field: { onChange } }) => (
              <ComboBox
                id={`intervention-${index}`}
                titleText={t('shaIntervention', 'SHA intervention')}
                helperText={t(
                  'shaInterventionHelper',
                  'Choose which active intervention this Insurance payment is recorded against.',
                )}
                placeholder={t('selectIntervention', 'Select intervention')}
                items={interventionItems}
                itemToString={(item: InterventionItem | null) => (item ? item.text : '')}
                selectedItem={selectedIntervention}
                className={styles.paymentModeComboBox}
                onChange={({ selectedItem }) => {
                  if (selectedItem && (selectedItem as InterventionItem).disabled) {
                    return;
                  }
                  onChange(selectedItem ? (selectedItem as InterventionItem).code : undefined);
                }}
                shouldFilterItem={({ item, inputValue }: any) => {
                  if (!inputValue || !item) {
                    return true;
                  }
                  return item.text.toLowerCase().includes(inputValue.toLowerCase());
                }}
                invalid={!!errors.payments?.[index]?.interventionCode}
                invalidText={errors.payments?.[index]?.interventionCode?.message}
              />
            )}
          />

          {selectedIntervention && (
            <InterventionSummary
              intervention={selectedIntervention}
              isOverAmount={isOverAmount}
              formatCurrency={formatCurrency}
            />
          )}
        </ResponsiveWrapper>
      )}

      {fieldsLength > 1 && (
        <Button
          className={styles.removeButton}
          kind="danger--ghost"
          size="sm"
          hasIconOnly
          renderIcon={TrashCan}
          iconDescription={t('removePayment', 'Remove payment')}
          onClick={() => onRemove(index)}
        />
      )}
    </div>
  );
};

export default PaymentLine;
