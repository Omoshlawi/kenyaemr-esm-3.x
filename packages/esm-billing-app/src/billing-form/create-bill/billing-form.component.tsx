import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useConfig, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { Form } from '@carbon/react';
import { mutate } from 'swr';
import { FormProvider, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { billingFormSchema, processBillItems, type BillingFormData } from '../../billing.resource';
import { type BillingService } from '../../types';
import { type BillingConfig } from '../../config-schema';
import BillableServiceSearch from './billable-service-search.component';
import BillableItemList from './billable-item-list.component';
import BillingFormFooter from './billing-form-footer.component';

import styles from './billing-form.scss';

type BillingFormProps = {
  patientUuid: string;
};

const BillingForm: React.FC<Workspace2DefinitionProps<BillingFormProps, {}, {}>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const { t } = useTranslation();
  const patientUuid = workspaceProps?.patientUuid;
  const { cashPointUuid, cashierUuid } = useConfig<BillingConfig>();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [selectedServices, setSelectedServices] = useState<Record<string, BillingService>>({});

  const form = useForm<BillingFormData>({
    resolver: zodResolver(billingFormSchema),
    defaultValues: {
      cashPoint: cashPointUuid,
      cashier: cashierUuid,
      patient: patientUuid,
      status: 'PENDING',
      lineItems: [],
      payments: [],
    },
  });

  const {
    control,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty]);

  const handleAddService = (service: BillingService) => {
    setSelectedServices((prev) => ({ ...prev, [service.uuid]: service }));
    const defaultPrice = service.servicePrices?.[0];
    append({
      billableService: service.uuid,
      quantity: 1,
      price: defaultPrice?.price ?? 0,
      priceName: defaultPrice?.name ?? 'Default',
      priceUuid: defaultPrice?.uuid ?? '',
      lineItemOrder: 0,
      order: '',
      paymentStatus: 'PENDING',
    });
  };

  const onSubmit = async (values: BillingFormData) => {
    try {
      await processBillItems(values);
      mutate((key) => typeof key === 'string' && key.startsWith(`/ws/rest/v1/cashier/bill`), undefined, {
        revalidate: true,
      });
      showSnackbar({
        title: t('billItems', 'Save Bill'),
        subtitle: t('billProcessingSuccess', 'Bill processing has been successful'),
        kind: 'success',
        timeoutInMs: 3000,
      });
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      showSnackbar({
        title: t('billProcessingError', 'Bill processing error'),
        kind: 'error',
        subtitle: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const onError = () => {
    showSnackbar({
      title: t('error', 'Error'),
      kind: 'error',
      subtitle: t('billValidationError', 'Please review the billable items before saving'),
    });
  };

  return (
    <Workspace2 hasUnsavedChanges={hasUnsavedChanges} title={t('billingForm', 'Billing Form')}>
      <FormProvider {...form}>
        <Form className={styles.form} onSubmit={handleSubmit(onSubmit, onError)}>
          <div className={styles.formContainer}>
            <BillableServiceSearch
              addedServiceUuids={fields.map((field) => field.billableService)}
              onAddService={handleAddService}
            />
            <BillableItemList fields={fields} services={selectedServices} onRemove={remove} />
          </div>

          <BillingFormFooter
            isSubmitting={isSubmitting}
            disabled={fields.length === 0}
            onCancel={() => closeWorkspace()}
          />
        </Form>
      </FormProvider>
    </Workspace2>
  );
};

export default BillingForm;
