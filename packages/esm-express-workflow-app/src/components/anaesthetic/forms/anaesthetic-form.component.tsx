import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { Button, ButtonSet, Form, Grid, Column, InlineLoading, NumberInput } from '@carbon/react';
import { showSnackbar, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { z } from 'zod';
import TimePickerDropdown from './time-picker-dropdown.component';
import styles from '../anaesthetic-data-form.scss';

type PulseBPFormData = {
  heartRate: string;
  systolicBP: string;
  diastolicBP: string;
  spo2: string;
  etco2: string;
  time: string;
};

export type AnaestheticFormWorkspaceProps = {
  onSubmit: (data: {
    heartRate: number;
    systolicBP: number;
    diastolicBP: number;
    spo2: number;
    etco2: number;
    time: string;
  }) => Promise<void> | void;
  onDataSaved?: () => void;
  patient?: {
    uuid: string;
    name: string;
    gender: string;
    age: string;
  };
  existingTimeEntries?: Array<{ hour: number; time: string }>;
  minTime?: string;
};

const requiredNumberInRange = (message: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => {
      const parsedValue = Number.parseInt(value, 10);
      return !Number.isNaN(parsedValue) && parsedValue >= min && parsedValue <= max;
    }, message);

const PulseBPForm: React.FC<Workspace2DefinitionProps<AnaestheticFormWorkspaceProps, {}, {}>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const { onSubmit, onDataSaved, patient, existingTimeEntries = [], minTime } = workspaceProps ?? {};
  const { t } = useTranslation();
  const pulseBPFormSchema = React.useMemo(
    () =>
      z
        .object({
          time: z.string().trim().min(1, t('validTimeRequired', 'Please enter a valid time')),
          heartRate: requiredNumberInRange(
            t('validHeartRateRequired', 'Please enter a valid heart rate (0-230 bpm)'),
            0,
            230,
          ),
          systolicBP: requiredNumberInRange(
            t('validSystolicBPRequired', 'Please enter a valid systolic BP (0-250 mmHg)'),
            0,
            250,
          ),
          diastolicBP: requiredNumberInRange(
            t('validDiastolicBPRequired', 'Please enter a valid diastolic BP (0-150 mmHg)'),
            0,
            150,
          ),
          spo2: requiredNumberInRange(t('validSPO2Required', 'Please enter a valid SPO2 value (0-100)'), 0, 100),
          etco2: requiredNumberInRange(t('validEtCO2Required', 'Please enter a valid EtCO2 value (0-100)'), 0, 100),
        })
        .superRefine((data, ctx) => {
          const systolicValue = Number.parseInt(data.systolicBP, 10);
          const diastolicValue = Number.parseInt(data.diastolicBP, 10);

          if (systolicValue <= diastolicValue) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['systolicBP'],
              message: t('systolicHigherThanDiastolic', 'Systolic BP must be higher than diastolic BP'),
            });
          }
        }),
    [t],
  );

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<PulseBPFormData>({
    resolver: zodResolver(pulseBPFormSchema),
    defaultValues: {
      heartRate: '',
      systolicBP: '',
      diastolicBP: '',
      spo2: '',
      etco2: '',
      time: '',
    },
  });

  const onSubmitForm = async (data: PulseBPFormData) => {
    if (!onSubmit) {
      showSnackbar({
        title: t('validationError', 'Validation Error'),
        subtitle: t('missingSubmitHandler', 'No submit handler was provided for this form'),
        kind: 'error',
      });
      return;
    }

    const heartRateValue = Number.parseInt(data.heartRate, 10);
    const systolicValue = Number.parseInt(data.systolicBP, 10);
    const diastolicValue = Number.parseInt(data.diastolicBP, 10);
    const spo2Value = Number.parseInt(data.spo2, 10);
    const etco2Value = Number.parseInt(data.etco2, 10);

    try {
      await onSubmit({
        heartRate: heartRateValue,
        systolicBP: systolicValue,
        diastolicBP: diastolicValue,
        spo2: spo2Value,
        etco2: etco2Value,
        time: data.time.trim(),
      });

      showSnackbar({
        title: t('anaestheticSaved', 'Anaesthetic record saved'),
        subtitle: t('anaestheticSavedToBackend', 'Anaesthetic record has been saved to backend'),
        kind: 'success',
        isLowContrast: true,
      });

      onDataSaved?.();
      reset();
      await closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      showSnackbar({
        title: t('anaestheticSaveFailed', 'Failed to save anaesthetic record'),
        subtitle:
          error instanceof Error
            ? error.message
            : t('failedToSaveAnaestheticRecord', 'Failed to save anaesthetic record'),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  return (
    <Workspace2 title={t('anaestheticRecords', 'Anaesthetic records')} hasUnsavedChanges={isDirty}>
      <Form onSubmit={handleSubmit(onSubmitForm)} className={styles.workspaceForm} data-openmrs-role="Anaesthetic Form">
        <div className={styles.workspaceContent}>
          {patient ? (
            <p className={styles.patientSummary}>{`${patient.name}, ${patient.gender}, ${patient.age}`}</p>
          ) : null}
          <Grid>
            <Column lg={16} md={8} sm={4}>
              <Controller
                name="time"
                control={control}
                render={({ field, fieldState }) => (
                  <TimePickerDropdown
                    id="anaesthetic-record-time"
                    labelText={t('time', 'Time')}
                    value={field.value || ''}
                    onChange={field.onChange}
                    invalid={!!fieldState.error}
                    invalidText={fieldState.error?.message}
                    existingTimeEntries={existingTimeEntries}
                    minTime={minTime}
                  />
                )}
              />
            </Column>
            <Column lg={16} md={8} sm={4}>
              <Controller
                name="heartRate"
                control={control}
                render={({ field, fieldState }) => (
                  <NumberInput
                    id="heartRate"
                    label={t('heartRate', 'Heart Rate')}
                    helperText="Range: 0-230 bpm"
                    min={0}
                    max={230}
                    step={1}
                    value={field.value || ''}
                    onChange={(e, { value }) => field.onChange(String(value))}
                    invalid={!!fieldState.error}
                    invalidText={fieldState.error?.message}
                    allowEmpty
                  />
                )}
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <Controller
                name="systolicBP"
                control={control}
                render={({ field, fieldState }) => (
                  <NumberInput
                    id="systolicBP"
                    label={t('systolicBP', 'BP Systolic')}
                    helperText="Range: 0-250 mmHg"
                    min={0}
                    max={250}
                    step={1}
                    value={field.value || ''}
                    onChange={(e, { value }) => field.onChange(String(value))}
                    invalid={!!fieldState.error}
                    invalidText={fieldState.error?.message}
                    allowEmpty
                  />
                )}
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <Controller
                name="diastolicBP"
                control={control}
                render={({ field, fieldState }) => (
                  <NumberInput
                    id="diastolicBP"
                    label={t('diastolicBP', 'BP Diastolic')}
                    helperText="Range: 0-150 mmHg"
                    min={0}
                    max={150}
                    step={1}
                    value={field.value || ''}
                    onChange={(e, { value }) => field.onChange(String(value))}
                    invalid={!!fieldState.error}
                    invalidText={fieldState.error?.message}
                    allowEmpty
                  />
                )}
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <Controller
                name="spo2"
                control={control}
                render={({ field, fieldState }) => (
                  <NumberInput
                    id="spo2"
                    label={t('spo2', 'SPO2')}
                    min={0}
                    max={230}
                    step={1}
                    value={field.value || ''}
                    onChange={(e, { value }) => field.onChange(String(value))}
                    invalid={!!fieldState.error}
                    invalidText={fieldState.error?.message}
                    allowEmpty
                  />
                )}
              />
            </Column>
            <Column lg={8} md={4} sm={4}>
              <Controller
                name="etco2"
                control={control}
                render={({ field, fieldState }) => (
                  <NumberInput
                    id="etco2"
                    label={t('etco2', 'EtCO2')}
                    min={0}
                    max={230}
                    step={1}
                    value={field.value || ''}
                    onChange={(e, { value }) => field.onChange(String(value))}
                    invalid={!!fieldState.error}
                    invalidText={fieldState.error?.message}
                    allowEmpty
                  />
                )}
              />
            </Column>
          </Grid>
        </div>
        <ButtonSet className={styles.workspaceButtonSet}>
          <Button kind="secondary" type="button" onClick={() => closeWorkspace()}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <InlineLoading description={t('saving', 'Saving') + '...'} /> : t('save', 'Save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default PulseBPForm;
