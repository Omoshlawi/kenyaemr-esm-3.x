import React, { useEffect, useState } from 'react';
import styles from './cancel-bill.scss';
import { LineItem, MappedBill } from '../../../../types';
import { Controller, useForm } from 'react-hook-form';
import {
  ResponsiveWrapper,
  restBaseUrl,
  showSnackbar,
  useLayoutType,
  type Workspace2DefinitionProps,
  Workspace2,
} from '@openmrs/esm-framework';
import classNames from 'classnames';
import { Form, Button, ButtonSet, InlineLoading, TextArea, InlineNotification } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCancelBillPayload } from './cance-bill.resource';
import { processBillPayment } from '../../../../billing.resource';
import { mutate } from 'swr';
import { useCurrencyFormatting } from '../../../../helpers/currency';

type CancelBillWorkspaceProps = {
  patientUuid: string;
  bill: MappedBill;
  lineItem: LineItem;
};

const CancelBillWorkspace: React.FC<Workspace2DefinitionProps<CancelBillWorkspaceProps, {}, {}>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid, bill, lineItem },
}) => {
  const { t } = useTranslation();
  const { format: formatCurrency } = useCurrencyFormatting();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isTablet = useLayoutType() === 'tablet';

  const cancelSchema = z.object({
    reason: z.string().min(1, { message: 'Reason is required' }),
  });

  type CancelBillFormData = z.infer<typeof cancelSchema>;

  const {
    handleSubmit,
    control,
    formState: { isValid, isDirty, isSubmitting },
  } = useForm<CancelBillFormData>({
    resolver: zodResolver(cancelSchema),
  });

  const onSubmit = async (formData: CancelBillFormData) => {
    // Remove current line item from bill
    const payload = createCancelBillPayload(bill, lineItem, formData.reason);

    try {
      const response = await processBillPayment(payload, bill.uuid);
      if (response.ok) {
        showSnackbar({
          title: t('billUpdate', 'Bill update'),
          subtitle: t('billUpdateSuccess', 'Bill update was successful'),
          kind: 'success',
          timeoutInMs: 5000,
        });
      }
      // mutate the bill
      mutate((key) => typeof key === 'string' && key.startsWith(`${restBaseUrl}/cashier/bill`), undefined, {
        revalidate: true,
      });
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      showSnackbar({
        title: t('billUpdate', 'Bill update'),
        subtitle: t('billUpdateError', 'An error occurred while updating the bill, {{error}}', { error: error }),
        kind: 'error',
        timeoutInMs: 5000,
      });
    }
  };

  const subtitleText = `${t('currentPriceAndQuantity', 'Current price and quantity')}: ${t(
    'price',
    'Price',
  )}: ${formatCurrency(lineItem?.price)} ${t('quantity', 'Quantity')}: ${lineItem?.quantity}`;

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty, setHasUnsavedChanges]);

  return (
    <Workspace2 hasUnsavedChanges={hasUnsavedChanges} title={t('cancelBillWorkspace', 'Cancel bill workspace')}>
      <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
        <div className={styles.formContainer}>
          <InlineNotification
            title={lineItem?.billableService?.split(':')[1]}
            subtitle={subtitleText}
            kind="info"
            lowContrast
            hideCloseButton
          />
          <ResponsiveWrapper>
            <Controller
              control={control}
              name="reason"
              render={({ field }) => (
                <TextArea
                  {...field}
                  placeholder={t('pleaseEnterReason', 'Please enter reason for cancellation')}
                  labelText={t('reasonForCancellation', 'Reason for cancellation')}
                />
              )}
            />
          </ResponsiveWrapper>
        </div>
        <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
          <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button
            className={styles.button}
            disabled={!isValid || !isDirty || isSubmitting}
            kind="primary"
            type="submit">
            {isSubmitting ? (
              <InlineLoading className={styles.spinner} description={t('cancellingBill', 'Cancelling bill...')} />
            ) : (
              <span>{t('saveAndClose', 'Save & close')}</span>
            )}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default CancelBillWorkspace;
