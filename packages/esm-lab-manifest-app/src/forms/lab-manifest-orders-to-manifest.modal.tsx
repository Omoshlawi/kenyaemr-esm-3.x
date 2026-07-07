import {
  Button,
  ButtonSet,
  Column,
  DatePicker,
  DatePickerInput,
  Dropdown,
  Form,
  InlineNotification,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Stack,
  TextInput,
} from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import React, { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { LabManifestConfig } from '../config-schema';
import { useLabManifest } from '../hooks';
import {
  addOrderToManifest,
  labManifestOrderToManifestFormSchema,
  mutateManifestLinks,
} from '../lab-manifest.resources';
import { ActiveRequestOrder } from '../types';
import { collectionDateDiffersFromOrderRequest } from '../utils/sample-collection-date';
import { isDrtManifest } from '../utils/patient-identifier-display';
import ActiveOrdersSelectionPreview from './active-order-selection-preview';
import styles from './lab-manifest-form.scss';

interface LabManifestOrdersToManifestFormProps {
  onClose: () => void;
  props: {
    orders?: Array<ActiveRequestOrder>;
    manifestType?: number | string;
    selectedOrders: Array<{
      labManifest: {
        uuid: string;
      };
      order: {
        uuid: string;
      };
      payload: string;
    }>;
  };
}

type OrderToManifestFormType = z.infer<typeof labManifestOrderToManifestFormSchema>;

const LabManifestOrdersToManifestForm: React.FC<LabManifestOrdersToManifestFormProps> = ({
  onClose,
  props: { selectedOrders, orders, manifestType: manifestTypeFromProps },
}) => {
  const { t } = useTranslation();
  const form = useForm<OrderToManifestFormType>({
    resolver: zodResolver(labManifestOrderToManifestFormSchema),
    defaultValues: {
      sampleType: isDrtManifest(manifestTypeFromProps) ? 'DBS' : undefined,
    },
  });
  const { sampleTypes } = useConfig<LabManifestConfig>();

  const { manifest } = useLabManifest(selectedOrders[0]?.labManifest?.uuid);
  const resolvedManifestType = manifestTypeFromProps ?? manifest?.manifestType;
  const isDrt = isDrtManifest(resolvedManifestType ?? manifest?.manifestType);
  const sampleCollectionDate = form.watch('sampleCollectionDate');

  const selectedActiveOrders = useMemo(() => {
    if (!orders?.length || !selectedOrders?.length) {
      return [] as ActiveRequestOrder[];
    }

    return selectedOrders
      .map((selected) => orders.find((order) => order.orderUuid === selected.order.uuid))
      .filter((order): order is ActiveRequestOrder => Boolean(order));
  }, [orders, selectedOrders]);

  const showSampleCollectionDateWarning = useMemo(() => {
    if (!sampleCollectionDate) {
      return false;
    }

    return selectedActiveOrders.some((order) =>
      collectionDateDiffersFromOrderRequest(sampleCollectionDate, order.dateRequested),
    );
  }, [sampleCollectionDate, selectedActiveOrders]);

  const onSubmit = async (values: OrderToManifestFormType) => {
    const invalidOrders = (orders ?? []).filter((order) => order.hasProblem);
    if (invalidOrders.length > 0) {
      showSnackbar({
        title: t('cannotAddToManifest', 'Cannot add to manifest'),
        kind: 'error',
        subtitle: invalidOrders[0]?.problemMessage || t('missingManifestRequirements', 'Missing manifest requirements'),
      });
      return;
    }

    if (isDrt && !values.batchNumber?.trim()) {
      showSnackbar({
        title: t('cannotAddToManifest', 'Cannot add to manifest'),
        kind: 'error',
        subtitle: t('natNumberRequired', 'NAT number from ULIZA portal is required'),
      });
      return;
    }

    try {
      const results = await Promise.allSettled(
        selectedOrders.map((order) => addOrderToManifest({ ...order, ...values })),
      );
      results.forEach((res, index) => {
        if (res.status === 'fulfilled') {
          showSnackbar({
            title: 'Success',
            kind: 'success',
            subtitle: t('manifestorderAddSuccess', 'Order added succesfully'),
          });
        } else {
          showSnackbar({
            title: t('manifestOrderError', 'Error adding order {{order}} for {{patient}} to the manifest', {
              order: orders.find((order) => selectedOrders[index]?.order?.uuid === order.orderUuid)?.orderId,
              patient: orders.find((order) => selectedOrders[index]?.order?.uuid === order.orderUuid)?.patientName,
            }),
            kind: 'error',
            subtitle: `${res.reason?.responseBody?.error?.message ?? res?.reason?.message}`,
          });
        }
      });
      mutateManifestLinks(manifest?.uuid, manifest?.manifestStatus);
      onClose();
    } catch (error) {
      showSnackbar({
        title: t('manifestOrderError', 'Error adding order to the manifest'),
        kind: 'error',
        subtitle: ` ${error.reason?.responseBody?.error?.message ?? error?.reason?.message}`,
      });
    }
  };

  return (
    <Form onSubmit={form.handleSubmit(onSubmit)}>
      <ModalHeader closeModal={onClose} className={styles.heading}>
        {t('updateSampleDetails', 'Update Sample Details')}
      </ModalHeader>
      <ModalBody>
        <Stack gap={4} className={styles.grid}>
          <Column>
            <Controller
              control={form.control}
              name="sampleType"
              render={({ field }) => (
                <Dropdown
                  ref={field.ref}
                  invalid={!!form.formState.errors[field.name]?.message}
                  invalidText={form.formState.errors[field.name]?.message}
                  id="manifestType"
                  titleText={t('sampleType', 'Sample Type')}
                  onChange={(e) => {
                    field.onChange(e.selectedItem);
                  }}
                  initialSelectedItem={field.value}
                  label="Choose option"
                  items={sampleTypes
                    .filter((type) =>
                      type.labManifestType.includes(`${resolvedManifestType ?? manifest?.manifestType ?? ''}`),
                    )
                    .map((r) => r.sampleType)}
                  itemToString={(item) => item ?? ''}
                />
              )}
            />
          </Column>
          <Row className={styles.datePickersRow}>
            <Column className={styles.inputRow}>
              <Controller
                control={form.control}
                name="sampleCollectionDate"
                render={({ field }) => (
                  <DatePicker
                    className={styles.datePickerInput}
                    dateFormat="d/m/Y"
                    datePickerType="single"
                    value={field.value}
                    onChange={(dates) => {
                      const selectedDate = Array.isArray(dates) ? dates[0] : dates;
                      field.onChange(selectedDate);
                    }}
                    invalid={!!form.formState.errors[field.name]?.message}
                    invalidText={form.formState.errors[field.name]?.message}>
                    <DatePickerInput
                      id={field.name}
                      invalid={!!form.formState.errors[field.name]?.message}
                      invalidText={form.formState.errors[field.name]?.message}
                      placeholder="mm/dd/yyyy"
                      labelText={t('sampleCollectionDate', 'Sample collection date')}
                      size="lg"
                    />
                  </DatePicker>
                )}
              />
            </Column>
            <Column className={styles.inputRow}>
              <Controller
                control={form.control}
                name="sampleSeparationDate"
                render={({ field }) => (
                  <DatePicker
                    className={styles.datePickerInput}
                    dateFormat="d/m/Y"
                    datePickerType="single"
                    value={field.value}
                    onChange={(dates) => {
                      const selectedDate = Array.isArray(dates) ? dates[0] : dates;
                      field.onChange(selectedDate);
                    }}
                    invalid={!!form.formState.errors[field.name]?.message}
                    invalidText={form.formState.errors[field.name]?.message}>
                    <DatePickerInput
                      id={field.name}
                      invalid={!!form.formState.errors[field.name]?.message}
                      invalidText={form.formState.errors[field.name]?.message}
                      placeholder="mm/dd/yyyy"
                      labelText={t('sampleSeparationDate', 'Sample seperation date')}
                      size="lg"
                    />
                  </DatePicker>
                )}
              />
            </Column>
          </Row>
          {isDrt && (
            <Column>
              <Controller
                control={form.control}
                name="batchNumber"
                render={({ field }) => (
                  <TextInput
                    id="natNumber"
                    labelText={t('natNumber', 'NAT Number')}
                    placeholder={t('enterNatNumber', 'Enter NAT number from ULIZA portal')}
                    value={field.value ?? ''}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    invalid={!!form.formState.errors[field.name]?.message}
                    invalidText={form.formState.errors[field.name]?.message}
                  />
                )}
              />
            </Column>
          )}
          {showSampleCollectionDateWarning && (
            <InlineNotification
              className={styles.sampleCollectionDateWarning}
              kind="warning"
              lowContrast
              hideCloseButton
              title={t('confirmSampleCollectionDate', 'Kindly confirm the sample collection date.')}
              subtitle=""
            />
          )}
          <div className={styles.previewContainer}>
            <ActiveOrdersSelectionPreview
              orders={orders}
              manifestType={resolvedManifestType ?? manifest?.manifestType}
            />
          </div>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <ButtonSet className={styles.buttonSet}>
          <Button className={styles.button} kind="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button className={styles.button} kind="primary" disabled={form.formState.isSubmitting} type="submit">
            Add Samples
          </Button>
        </ButtonSet>
      </ModalFooter>
    </Form>
  );
};

export default LabManifestOrdersToManifestForm;
