import React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { Button, ButtonSet, Form, Grid, Column, TextInput, Select, SelectItem } from '@carbon/react';
import { showSnackbar, useConfig, Workspace2, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import { z } from 'zod';
import type { ConfigObject } from '../../../config-schema';
import styles from '../anaesthetic-data-form.scss';

// ── Workspace props exposed to the launcher ──────────────────────────────────
export type InteroperativeRecordDrugGivenWorkspaceProps = {
  onSubmit: (data: {
    maintenanceAgent: string;
    concentrationRate: string;
    medicationGiven: string;
    fluidsGiven: string;
  }) => Promise<void> | void;
  onDataSaved?: () => void;
  patient?: {
    uuid: string;
    name: string;
    gender: string;
    age: string;
  };
};

// ── Zod schema ────────────────────────────────────────────────────────────────
const concentrationRatePattern = /^(?:\d+(?:\.\d+)?|\.\d+)%?$/;

const schema = z
  .object({
    maintenanceAgent: z.string(),
    concentrationRate: z.string(),
    medicationGiven: z.string(),
    fluidsGiven: z.string(),
  })
  .superRefine((val, ctx) => {
    const hasMaintenance = Boolean(val.maintenanceAgent);
    const concentrationRate = val.concentrationRate.trim();
    const hasMedication = Boolean(val.medicationGiven.trim());
    const hasFluids = Boolean(val.fluidsGiven.trim());

    if (!hasMaintenance && !hasMedication && !hasFluids) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['medicationGiven'],
        message: 'Enter a maintenance agent, medication given, or fluids given before saving',
      });
    }

    if (hasMaintenance && !concentrationRate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['concentrationRate'],
        message: 'Concentration rate is required when a maintenance agent is selected',
      });
    }

    if (concentrationRate && !concentrationRatePattern.test(concentrationRate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['concentrationRate'],
        message: 'Use 1, 2.3, 3%, or 4.5% only',
      });
    }
  });

type FormData = z.infer<typeof schema>;

// ─────────────────────────────────────────────────────────────────────────────

const InteroperativeRecordDrugGivenForm: React.FC<
  Workspace2DefinitionProps<InteroperativeRecordDrugGivenWorkspaceProps, {}, {}>
> = ({ closeWorkspace, workspaceProps }) => {
  const { t } = useTranslation();
  const { onSubmit, onDataSaved, patient } = workspaceProps ?? {};
  const config = useConfig<ConfigObject>();

  // Blank placeholder + configurable options – deployments (Kenya, DRC, Congo…) override via config
  const maintenanceOptions = [
    { value: '', label: t('chooseAnOption', 'Choose an option') },
    ...(config.maintenanceAgentOptions ?? []),
  ];

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      maintenanceAgent: '',
      concentrationRate: '',
      medicationGiven: '',
      fluidsGiven: '',
    },
  });

  const onSubmitForm = async (data: FormData) => {
    if (!patient?.uuid) {
      showSnackbar({
        title: t('validationError', 'Validation Error'),
        subtitle: !patient
          ? t('noPatientSelected', 'No patient selected')
          : t('patientMissingUuid', 'Patient is missing a UUID'),
        kind: 'error',
      });
      return;
    }

    if (!onSubmit) {
      showSnackbar({
        title: t('validationError', 'Validation Error'),
        subtitle: t('missingSubmitHandler', 'No submit handler was provided for this form'),
        kind: 'error',
      });
      return;
    }

    try {
      await onSubmit({
        maintenanceAgent: data.maintenanceAgent,
        concentrationRate: data.concentrationRate.trim(),
        medicationGiven: data.medicationGiven,
        fluidsGiven: data.fluidsGiven,
      });

      showSnackbar({
        title: t('drugOrderSaved', 'Drug order saved'),
        subtitle: t('drugOrderSavedToBackend', 'Drug order has been saved to backend'),
        kind: 'success',
        isLowContrast: true,
      });

      onDataSaved?.();
      reset();
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      showSnackbar({
        title: t('drugOrderSaveFailed', 'Failed to save drug order'),
        subtitle:
          error instanceof Error
            ? error.message
            : t('failedToSaveDrugsIvFluids', 'Failed to save drugs and IV fluids data'),
        kind: 'error',
        isLowContrast: true,
      });
    }
  };

  const patientLabel = patient ? `${patient.name}, ${patient.gender}, ${patient.age}` : undefined;

  return (
    <Workspace2 title={t('drugsIVFluids', 'Drugs and IV Fluids Given')} hasUnsavedChanges={isDirty}>
      {patientLabel && <p className={styles.patientSummary}>{patientLabel}</p>}
      <Form onSubmit={handleSubmit(onSubmitForm)} className={styles.workspaceForm}>
        <div className={styles.workspaceContent}>
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <Controller
                name="maintenanceAgent"
                control={control}
                render={({ field, fieldState }) => (
                  <Select
                    id="maintenance-agent-dropdown"
                    labelText={t('maintenanceOfAnaesthesia', 'Maintenance of Anaesthesia')}
                    invalid={!!fieldState.error}
                    invalidText={fieldState.error?.message}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value)}>
                    {maintenanceOptions.map((option) => (
                      <SelectItem key={option.value || 'blank'} value={option.value} text={option.label} />
                    ))}
                  </Select>
                )}
              />
            </Column>

            <Column sm={4} md={8} lg={16}>
              <Controller
                name="concentrationRate"
                control={control}
                render={({ field, fieldState }) => (
                  <TextInput
                    id="concentration-rate-input"
                    labelText={t('concentrationRate', 'Concentration rate')}
                    placeholder={t('enterConcentrationRate', 'Enter 1, 2.3, 3%, 4.5%')}
                    value={field.value}
                    onChange={(e) => {
                      const nextValue = e.target.value;
                      if (nextValue === '' || /^(?:\d+(?:\.\d*)?|\.\d*)%?$/.test(nextValue)) {
                        field.onChange(nextValue);
                      }
                    }}
                    invalid={!!fieldState.error}
                    invalidText={fieldState.error?.message}
                  />
                )}
              />
            </Column>

            <Column sm={4} md={4} lg={8}>
              <Controller
                name="medicationGiven"
                control={control}
                render={({ field, fieldState }) => (
                  <TextInput
                    id="medication-given-input"
                    labelText={t('medicationsGiven', 'Medications given')}
                    placeholder={t('enterMedicationGiven', 'Enter medications given')}
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!fieldState.error}
                    invalidText={fieldState.error?.message}
                  />
                )}
              />
            </Column>

            <Column sm={4} md={4} lg={8}>
              <Controller
                name="fluidsGiven"
                control={control}
                render={({ field, fieldState }) => (
                  <TextInput
                    id="fluids-given-input"
                    labelText={t('fluidsGiven', 'Fluids given')}
                    placeholder={t('enterFluidsGiven', 'Enter fluids given')}
                    value={field.value}
                    onChange={field.onChange}
                    invalid={!!fieldState.error}
                    invalidText={fieldState.error?.message}
                  />
                )}
              />
            </Column>
          </Grid>
        </div>

        <ButtonSet className={styles.workspaceButtonSet}>
          <Button kind="secondary" onClick={() => closeWorkspace({ discardUnsavedChanges: true })}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" type="submit">
            {t('save', 'Save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default InteroperativeRecordDrugGivenForm;
