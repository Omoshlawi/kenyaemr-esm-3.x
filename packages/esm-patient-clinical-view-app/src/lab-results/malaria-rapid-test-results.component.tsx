import React, { useMemo } from 'react';
import classNames from 'classnames';
import { Button, ButtonSet, ComboBox, Form, InlineLoading } from '@carbon/react';
import { Controller, useForm, type DefaultValues } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  showSnackbar,
  useAbortController,
  useConfig,
  useLayoutType,
  useSession,
  Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { type Order } from '@openmrs/esm-patient-common-lib';
import { zodResolver } from '@hookform/resolvers/zod';
import { MALARIA_RESULT_CONCEPTS } from './constants';
import { malariaRapidTestSchema, type MalariaRapidTestForm } from './malaria-results.schema';
import {
  createMalariaRapidTest,
  getOpenmrsRestErrorMessage,
  saveMalariaLabResults,
  updateMalariaRapidTestToInProgress,
  useMalariaResultsInvalidation,
  type MalariaObsPayload,
} from './malaria-results.resource';
import styles from './malaria-results.scss';
import { updateStockItemUsage, useInventory } from './useInventory';

interface Props {
  order: Order;
  closeWorkspace: Workspace2DefinitionProps['closeWorkspace'];
  setHasUnsavedChanges: (value: boolean) => void;
}

const MalariaRapidTestResultsForm: React.FC<Props> = ({ order, closeWorkspace, setHasUnsavedChanges }) => {
  const { t } = useTranslation();
  const session = useSession();
  const { stockItemInventoryConceptUuids } = useConfig();
  const isTablet = useLayoutType() === 'tablet';
  const abortController = useAbortController();
  const { mutateLabOrder } = useMalariaResultsInvalidation(order);
  const { inventory } = useInventory(stockItemInventoryConceptUuids[0]);
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MalariaRapidTestForm>({
    resolver: zodResolver(malariaRapidTestSchema),
    defaultValues: {
      rapidTestResult: undefined as unknown as MalariaRapidTestForm['rapidTestResult'],
      speciesUuid: null,
    } as DefaultValues<MalariaRapidTestForm>,
    mode: 'onBlur',
  });

  const rapidTestResult = watch('rapidTestResult');
  const isPositive = rapidTestResult === '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

  const rapidTestItems = useMemo(
    () => [
      { id: '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', text: 'Positive' },
      { id: '664AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', text: 'Negative' },
      { id: '163611AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', text: 'Invalid' },
    ],
    [],
  );

  const speciesItems = useMemo(
    () => [{ id: 'b82a629a-8a85-45f0-8957-713635c36a56', text: 'Plasmodium falciparum' }],
    [],
  );

  const onSubmit = async (data: MalariaRapidTestForm) => {
    let resultUuid: string = MALARIA_RESULT_CONCEPTS.NEGATIVE;
    if (data.rapidTestResult === MALARIA_RESULT_CONCEPTS.POSITIVE) {
      resultUuid = MALARIA_RESULT_CONCEPTS.POSITIVE;
    } else if (data.rapidTestResult === MALARIA_RESULT_CONCEPTS.INVALID) {
      resultUuid = MALARIA_RESULT_CONCEPTS.INVALID;
    }
    const obs: Array<MalariaObsPayload> = [
      {
        concept: { uuid: MALARIA_RESULT_CONCEPTS.RAPID_TEST },
        value: { uuid: resultUuid },
        status: 'FINAL',
        order: { uuid: order.uuid },
      },
    ];

    if (isPositive && data.speciesUuid) {
      obs.push({
        concept: { uuid: MALARIA_RESULT_CONCEPTS.PLASMODIUM_SPECIES },
        value: { uuid: data.speciesUuid },
        status: 'FINAL',
        order: { uuid: order.uuid },
      });
    }

    try {
      const responsiblePersonUuid = session.currentProvider?.uuid ?? session.user?.uuid;
      if (responsiblePersonUuid) {
        await updateStockItemUsage({
          sourceUuid: data.stockItem.partyUuid,
          responsiblePersonUuid,
          stockItemUuid: data.stockItem.stockItemUuid,
          stockBatchUuid: data.stockItem.stockBatchUuid,
          stockItemPackagingUOMUuid: data.stockItem.quantityUoMUuid,
          hasExpiration: Boolean(data.stockItem.expiration),
        });
      }

      await saveMalariaLabResults(order, obs, abortController);

      showSnackbar({
        title: t('saveLabResults', 'Save lab results'),
        isLowContrast: true,
        kind: 'success',
        subtitle: t('successfullySavedLabResults', 'Lab results for {{orderNumber}} have been successfully saved', {
          orderNumber: order?.orderNumber,
        }),
      });

      if (resultUuid === MALARIA_RESULT_CONCEPTS.INVALID) {
        await createMalariaRapidTest(order);
        await updateMalariaRapidTestToInProgress(order);
        showSnackbar({
          title: t('createMalariaRapidTest', 'Create Malaria Rapid Test'),
          kind: 'success',
          isLowContrast: true,
          subtitle: t(
            'successfullyCreatedMalariaRapidTest',
            'Malaria rapid test has been successfully created, since the result entered is invalid',
          ),
        });
      }
      mutateLabOrder();
      closeWorkspace();
    } catch (err) {
      const errorMessage =
        getOpenmrsRestErrorMessage(err) ??
        t(
          'labResultsSaveGenericError',
          'Something went wrong while saving. Try again or contact support if this continues.',
        );
      showSnackbar({
        title: t('errorSavingLabResults', 'Error saving lab results'),
        kind: 'error',
        subtitle: errorMessage,
        isLowContrast: true,
      });
    }
  };

  return (
    <Form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
      <div className={styles.formContainer}>
        <Controller
          control={control}
          name="rapidTestResult"
          render={({ field }) => (
            <ComboBox
              id="malaria-rapid-test-result"
              itemToString={(item) => item?.text ?? ''}
              items={rapidTestItems}
              selectedItem={rapidTestItems.find((i) => i.id === field.value) ?? null}
              placeholder={t('selectMalariaRapidTestResults', 'Select Malaria Rapid Test Results')}
              onChange={({ selectedItem }) => {
                field.onChange(selectedItem?.id ?? null);
                setValue('speciesUuid', null);
              }}
              titleText={t('malariaRapidTestResults', 'Malaria Rapid Test Results')}
              invalid={Boolean(errors.rapidTestResult)}
              invalidText={errors.rapidTestResult?.message}
            />
          )}
        />

        {isPositive && (
          <Controller
            control={control}
            name="speciesUuid"
            render={({ field }) => (
              <ComboBox
                id="plasmodium-species"
                itemToString={(item) => item?.text ?? ''}
                items={speciesItems}
                selectedItem={speciesItems.find((i) => i.id === field.value) ?? null}
                onChange={({ selectedItem }) => field.onChange(selectedItem?.id ?? null)}
                placeholder={t('selectMalariaSpecies', 'Select Malaria Species')}
                titleText={t('malariaSpecies', 'Malaria Species')}
                invalid={Boolean(errors.speciesUuid)}
                invalidText={errors.speciesUuid?.message}
              />
            )}
          />
        )}

        <Controller
          control={control}
          name="stockItem"
          render={({ field }) => (
            <ComboBox
              id="malaria-rapid-test-stock-item"
              itemToString={(item) => (item ? `${item.batchNumber} — ${item.partyName} ${item.quantity}` : '')}
              items={inventory}
              onChange={({ selectedItem }) => field.onChange(selectedItem)}
              placeholder={t('selectMalariaRapidTestStockItem', 'Select Malaria Rapid Test Stock Item')}
              titleText={t('malariaRapidTestStockItem', 'MRT Stock Item')}
              invalid={Boolean(errors.stockItem)}
              invalidText={errors.stockItem?.message}
              helperText={t(
                'malariaRapidTestStockItemHelperText',
                'This is the lab kit used for the MRT test. It will be deducted from the stock item when the test is saved.',
              )}
            />
          )}
        />
      </div>

      <ButtonSet className={classNames({ [styles.tablet]: isTablet, [styles.desktop]: !isTablet })}>
        <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
          {t('cancel', 'Cancel')}
        </Button>
        <Button className={styles.button} kind="primary" type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <InlineLoading description={t('saving', 'Saving')} />
          ) : (
            <span>{t('saveAndClose', 'Save & close')}</span>
          )}
        </Button>
      </ButtonSet>
    </Form>
  );
};

export default MalariaRapidTestResultsForm;
