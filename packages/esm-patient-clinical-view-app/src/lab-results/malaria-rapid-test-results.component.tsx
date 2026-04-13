import React, { useMemo } from 'react';
import classNames from 'classnames';
import { Button, ButtonSet, ComboBox, Form, InlineLoading } from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { showSnackbar, useAbortController, useLayoutType } from '@openmrs/esm-framework';
import { type Order } from '@openmrs/esm-patient-common-lib';
import { zodResolver } from '@hookform/resolvers/zod';
import { MALARIA_RESULT_CONCEPTS, MALARIA_SPECIES } from './constants';
import { malariaRapidTestSchema, type MalariaRapidTestForm } from './malaria-results.schema';
import {
  saveMalariaLabResults,
  useMalariaResultsInvalidation,
  type MalariaObsPayload,
} from './malaria-results.resource';
import styles from './malaria-results.scss';

interface Props {
  order: Order;
  closeWorkspace: () => void;
}

const MalariaRapidTestResultsForm: React.FC<Props> = ({ order, closeWorkspace }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const abortController = useAbortController();
  const { mutateOrderData, mutateObstreeData, mutateEncounterData } = useMalariaResultsInvalidation(order);

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
    },
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

  const speciesItems = useMemo(() => MALARIA_SPECIES.map((s) => ({ id: s.uuid, text: s.display })), []);

  const onSubmit = async (data: MalariaRapidTestForm) => {
    const resultUuid =
      data.rapidTestResult === '703AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
        ? MALARIA_RESULT_CONCEPTS.POSITIVE
        : MALARIA_RESULT_CONCEPTS.NEGATIVE;
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
        concept: { uuid: MALARIA_RESULT_CONCEPTS.SPECIES },
        value: { uuid: data.speciesUuid },
        status: 'FINAL',
        order: { uuid: order.uuid },
      });
    }

    try {
      await saveMalariaLabResults(order, obs, abortController);

      mutateOrderData();
      mutateObstreeData();
      mutateEncounterData();

      showSnackbar({
        title: t('saveLabResults', 'Save lab results'),
        kind: 'success',
        subtitle: t('successfullySavedLabResults', 'Lab results for {{orderNumber}} have been successfully saved', {
          orderNumber: order?.orderNumber,
        }),
      });

      closeWorkspace();
    } catch (err) {
      showSnackbar({
        title: t('errorSavingLabResults', 'Error saving lab results'),
        kind: 'error',
        subtitle: err?.message,
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
