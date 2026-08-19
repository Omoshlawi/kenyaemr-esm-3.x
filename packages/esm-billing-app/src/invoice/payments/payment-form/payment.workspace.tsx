import React from 'react';
import { useLayoutType, Workspace2, Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { Button, ButtonSet, InlineLoading, InlineNotification } from '@carbon/react';
import { Add } from '@carbon/react/icons';
import classNames from 'classnames';
import { FormProvider } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import EffectiveCoverPicker from '../../../billing-form/pomsf/effective-pomsf.component';

import { type PaymentWorkspaceProps } from './payment.types';
import { PaymentProvider } from './payment.context';
import { usePaymentWorkspace } from './use-payment-workspace';
import PaymentLine from './payment-line.component';
import AllocationSummary from './allocation-summary.component';
import styles from './payment.workspace.scss';

const PaymentWorkspace: React.FC<Workspace2DefinitionProps<PaymentWorkspaceProps, {}, {}>> = ({
  workspaceProps,
  closeWorkspace,
}) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';

  const {
    isLoadingPaymentModes,
    hasUnsavedChanges,
    isSubmitting,
    formMethods,
    paymentContextValue,
    onSubmit,
    formatCurrency,
    totalAmount,
    allocation,
    allowPartial,
    shaError,
    setShaError,
    showEffectiveCoverPicker,
    patientUuid,
    beneficiaryCrId,
    authorizationCode,
    setSelectedScheme,
    fields,
    addPaymentLine,
    removePaymentLine,
    isAddPaymentDisabled,
    isSubmitDisabled,
  } = usePaymentWorkspace({ workspaceProps: workspaceProps!, closeWorkspace });

  if (isLoadingPaymentModes) {
    return <InlineLoading status="active" iconDescription="Loading payment modes" />;
  }

  return (
    <Workspace2 hasUnsavedChanges={hasUnsavedChanges} title={t('paymentWorkspace', 'Payment workspace')}>
      <FormProvider {...formMethods}>
        <PaymentProvider value={paymentContextValue}>
          <form noValidate onSubmit={formMethods.handleSubmit(onSubmit)} className={styles.form}>
            <div className={styles.formContainer}>
              <InlineNotification
                kind="info"
                lowContrast
                hideCloseButton
                title={t('totalAmountDueTitle', 'Total amount due')}
                subtitle={t(
                  'totalAmountDueSubtitle',
                  'The total amount due for the selected line items is {{totalAmount}}',
                  {
                    totalAmount: formatCurrency(totalAmount),
                  },
                )}
              />
              <div className={styles.summary}>
                <AllocationSummary
                  allocation={allocation}
                  totalAmount={totalAmount}
                  allowPartial={allowPartial}
                  formatCurrency={formatCurrency}
                />
                {shaError && (
                  <InlineNotification
                    kind="error"
                    lowContrast
                    title={t('shaRejectedLines', 'SHA rejected the bill lines')}
                    subtitle={shaError}
                    onCloseButtonClick={() => setShaError(null)}
                  />
                )}
              </div>

              {showEffectiveCoverPicker && (
                <EffectiveCoverPicker
                  patientUuid={patientUuid}
                  patientCRId={beneficiaryCrId}
                  consentToken={authorizationCode!}
                  onSchemeSelected={setSelectedScheme}
                />
              )}

              {fields.map((field, index) => (
                <PaymentLine key={field.id} index={index} fieldsLength={fields.length} onRemove={removePaymentLine} />
              ))}

              <Button kind="ghost" size="sm" renderIcon={Add} disabled={isAddPaymentDisabled} onClick={addPaymentLine}>
                {t('addPaymentMode', 'Add payment mode')}
              </Button>
            </div>

            <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
              <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
                {t('cancel', 'Cancel')}
              </Button>
              <Button className={styles.button} disabled={isSubmitDisabled} kind="primary" type="submit">
                {isSubmitting ? (
                  <InlineLoading className={styles.spinner} description={t('saving', 'Saving') + '...'} />
                ) : (
                  <span>{t('saveAndClose', 'Save & close')}</span>
                )}
              </Button>
            </ButtonSet>
          </form>
        </PaymentProvider>
      </FormProvider>
    </Workspace2>
  );
};

export default PaymentWorkspace;
