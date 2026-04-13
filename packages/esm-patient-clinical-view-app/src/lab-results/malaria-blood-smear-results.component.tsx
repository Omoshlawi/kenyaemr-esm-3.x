import React, { useEffect, useMemo } from 'react';
import classNames from 'classnames';
import {
  Button,
  ButtonSet,
  ComboBox,
  Form,
  InlineLoading,
  NumberInput,
  RadioButton,
  RadioButtonGroup,
} from '@carbon/react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  showSnackbar,
  useAbortController,
  useLayoutType,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';
import { type Order } from '@openmrs/esm-patient-common-lib';
import { zodResolver } from '@hookform/resolvers/zod';
import { MALARIA_RESULT_CONCEPTS, MALARIA_SPECIES, MALARIA_STAGING } from './constants';
import { malariaResultSchema, type MalariaResultForm } from './malaria-results.schema';
import {
  saveMalariaLabResults,
  useMalariaResultsInvalidation,
  type MalariaObsPayload,
} from './malaria-results.resource';
import styles from './malaria-results.scss';

const PLASMODIUM_FALCIPARUM_UUID = 'b82a629a-8a85-45f0-8957-713635c36a56';
const MPS_SEEN_UUID = '2b8f98e3-eda1-4464-9ef7-d74b4eb2a5f5';

interface Props {
  order: Order;
  closeWorkspace: Workspace2DefinitionProps['closeWorkspace'];
  setHasUnsavedChanges: (value: boolean) => void;
}

const MalariaBloodSmearResultsForm: React.FC<Props> = ({ order, closeWorkspace, setHasUnsavedChanges }) => {
  const { t } = useTranslation();
  const isTablet = useLayoutType() === 'tablet';
  const abortController = useAbortController();
  const { mutateOrderData, mutateObstreeData, mutateEncounterData } = useMalariaResultsInvalidation(order);

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<MalariaResultForm>({
    resolver: zodResolver(malariaResultSchema),
    defaultValues: {
      malariaResult: undefined as unknown as MalariaResultForm['malariaResult'],
      speciesUuid: null,
      stagingUuid: null,
      parasitesCount: null,
      smearType: null,
    },
    mode: 'onBlur',
  });

  useEffect(() => {
    setHasUnsavedChanges(isDirty);
  }, [isDirty, setHasUnsavedChanges]);

  const malariaResult = watch('malariaResult');
  const selectedSpeciesUuid = watch('speciesUuid');
  const parasitesCount = watch('parasitesCount');
  const smearType = watch('smearType');

  const isPositive = malariaResult === MPS_SEEN_UUID;
  const isFalciparum = selectedSpeciesUuid === PLASMODIUM_FALCIPARUM_UUID;

  const calculatedParasiteCount = useMemo(() => {
    if (parasitesCount === null || smearType === null) {
      return '';
    }
    if (smearType === 'thin') {
      return Math.round((parasitesCount * 5000000) / 4000);
    }
    return Math.round((parasitesCount * 8000) / 200);
  }, [parasitesCount, smearType]);

  const malariaResultItems = useMemo(
    () => [
      { id: MPS_SEEN_UUID, text: 'MPS Seen' },
      { id: 'e037886b-7fb7-4cec-b8b5-c1d7de46ccc7', text: 'No Malaria Parasites' },
    ],
    [],
  );

  const speciesItems = useMemo(() => MALARIA_SPECIES.map((s) => ({ id: s.uuid, text: s.display })), []);

  const stagingItems = useMemo(() => MALARIA_STAGING.map((s) => ({ id: s.uuid, text: s.display })), []);

  const onSubmit = async (data: MalariaResultForm) => {
    const obs: Array<MalariaObsPayload> = [
      {
        concept: { uuid: MALARIA_RESULT_CONCEPTS.BLOOD_SMEAR },
        value: { uuid: data.malariaResult },
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

    if (isPositive && isFalciparum) {
      if (data.stagingUuid) {
        obs.push({
          concept: { uuid: MALARIA_RESULT_CONCEPTS.STAGING },
          value: { uuid: data.stagingUuid },
          status: 'FINAL',
          order: { uuid: order.uuid },
        });
      }
      if (data.parasitesCount !== null && data.smearType !== null) {
        const calcCount =
          data.smearType === 'thin'
            ? Math.round((data.parasitesCount * 5000000) / 4000)
            : Math.round((data.parasitesCount * 8000) / 200);
        obs.push({
          concept: { uuid: MALARIA_RESULT_CONCEPTS.PARASITE_COUNT },
          value: calcCount,
          status: 'FINAL',
          order: { uuid: order.uuid },
        });
      }
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

      closeWorkspace({ discardUnsavedChanges: true });
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
          name="malariaResult"
          render={({ field }) => (
            <ComboBox
              id="malaria-blood-smear-result"
              itemToString={(item) => item?.text ?? ''}
              items={malariaResultItems}
              selectedItem={malariaResultItems.find((i) => i.id === field.value) ?? null}
              placeholder={t('selectMalariaParasites', 'Select Malaria Parasites')}
              onChange={({ selectedItem }) => {
                field.onChange(selectedItem?.id ?? null);
                setValue('speciesUuid', null);
                setValue('stagingUuid', null);
                setValue('parasitesCount', null);
                setValue('smearType', null);
              }}
              titleText={t('malariaParasites', 'Malaria Parasites')}
              invalid={Boolean(errors.malariaResult)}
              invalidText={errors.malariaResult?.message}
            />
          )}
        />

        {isPositive && (
          <Controller
            control={control}
            name="speciesUuid"
            render={({ field }) => (
              <ComboBox
                id="malaria-species"
                itemToString={(item) => item?.text ?? ''}
                items={speciesItems}
                selectedItem={speciesItems.find((i) => i.id === field.value) ?? null}
                placeholder={t('selectMalariaSpecies', 'Select Malaria Species')}
                onChange={({ selectedItem }) => {
                  field.onChange(selectedItem?.id ?? null);
                  setValue('stagingUuid', null);
                  setValue('parasitesCount', null);
                  setValue('smearType', null);
                }}
                titleText={t('malariaSpecies', 'Malaria Species')}
                invalid={Boolean(errors.speciesUuid)}
                invalidText={errors.speciesUuid?.message}
              />
            )}
          />
        )}

        {isPositive && isFalciparum && (
          <>
            <Controller
              control={control}
              name="stagingUuid"
              render={({ field }) => (
                <ComboBox
                  id="malaria-staging"
                  itemToString={(item) => item?.text ?? ''}
                  items={stagingItems}
                  selectedItem={stagingItems.find((i) => i.id === field.value) ?? null}
                  placeholder={t('selectMalariaStaging', 'Select Malaria Staging')}
                  onChange={({ selectedItem }) => field.onChange(selectedItem?.id ?? null)}
                  titleText={t('malariaStaging', 'Malaria Staging')}
                  invalid={Boolean(errors.stagingUuid)}
                  invalidText={errors.stagingUuid?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="parasitesCount"
              render={({ field }) => (
                <NumberInput
                  id="malaria-parasites-count"
                  label={t('malariaParasitesCount', 'Positive ( No of Parasites/quantification)')}
                  placeholder={t('enterMalariaParasitesCount', 'Enter Malaria Parasites Count')}
                  min={0}
                  value={field.value ?? ''}
                  onChange={(_e, { value }) => {
                    const parsed = Number(value);
                    field.onChange(Number.isNaN(parsed) ? null : parsed);
                  }}
                  invalid={Boolean(errors.parasitesCount)}
                  invalidText={errors.parasitesCount?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="smearType"
              render={({ field }) => (
                <RadioButtonGroup
                  legendText={t('typeOfSmear', 'Type of Smear')}
                  name="type-of-smear"
                  valueSelected={field.value ?? undefined}
                  onChange={(value: string) => field.onChange(value as 'thin' | 'thick')}>
                  <RadioButton id="radio-thin" labelText={t('thinSmear', 'Thin Smear')} value="thin" />
                  <RadioButton id="radio-thick" labelText={t('thickSmear', 'Thick Smear')} value="thick" />
                </RadioButtonGroup>
              )}
            />

            <NumberInput
              id="parasite-count"
              label={t('parasiteCount', 'Parasite Count')}
              value={calculatedParasiteCount}
              readOnly
            />
          </>
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

export default MalariaBloodSmearResultsForm;
