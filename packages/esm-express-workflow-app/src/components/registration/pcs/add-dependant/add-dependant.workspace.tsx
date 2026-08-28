import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  ButtonSet,
  Column,
  Form,
  Grid,
  InlineNotification,
  RadioButton,
  RadioButtonGroup,
  Row,
  TextInput,
} from '@carbon/react';
import {
  OpenmrsDatePicker,
  ResponsiveWrapper,
  showSnackbar,
  useConfig,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';

import { type ExpressWorkflowConfig } from '../../../../config-schema';
import { createDependantWithTemporaryId } from '../resources/link-dependant.resource';
import styles from './add-dependant.scss';

export interface AddDependantWorkspaceProps {
  /** The mother's PCS individual ID — the participant is created against it. */
  motherIndividualId: string;
  onCreated?: () => void;
}

/** The module's create endpoint is for infants, which is why the window is a year wide. */
const oneYearAgo = () => {
  const date = new Date();
  date.setFullYear(date.getFullYear() - 1);
  return date;
};

export const buildAddDependantSchema = (t: (key: string, fallback: string) => string) =>
  z.object({
    givenName: z.string().trim().min(1, t('givenNameRequired', 'Given name is required')),
    middleName: z.string().trim().optional(),
    familyName: z.string().trim().min(1, t('familyNameRequired', 'Family name is required')),
    dateOfBirth: z
      .date({ required_error: t('dateOfBirthRequired', 'Date of birth is required') })
      .max(new Date(), t('dateOfBirthInFuture', 'Date of birth cannot be in the future'))
      // PCS creates these participants for infants, so anyone older belongs to one of the
      // linking flows rather than this one.
      .min(oneYearAgo(), t('dependantMustBeUnderOne', 'This form is for infants — age cannot exceed one year')),
    sex: z.enum(['M', 'F'], {
      errorMap: () => ({ message: t('sexRequired', 'Sex is required') }),
    }),
  });

type AddDependantFormData = z.infer<ReturnType<typeof buildAddDependantSchema>>;

const AddDependantWorkspace: React.FC<Workspace2DefinitionProps<AddDependantWorkspaceProps, {}, {}>> = ({
  closeWorkspace,
  workspaceProps,
}) => {
  const { t } = useTranslation();
  const { nationalIdUUID, phoneAttributeTypeUUID } = useConfig<ExpressWorkflowConfig>();
  const { motherIndividualId, onCreated } = workspaceProps ?? {};
  const [submitError, setSubmitError] = useState<string | null>(null);

  const schema = useMemo(() => buildAddDependantSchema(t), [t]);

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty, isSubmitting },
  } = useForm<AddDependantFormData>({
    resolver: zodResolver(schema),
    defaultValues: { givenName: '', middleName: '', familyName: '' },
  });

  const onSubmit = async (data: AddDependantFormData) => {
    if (!motherIndividualId) {
      return;
    }
    setSubmitError(null);
    try {
      const { participant } = await createDependantWithTemporaryId({
        demographics: {
          firstName: data.givenName,
          middleName: data.middleName,
          lastName: data.familyName,
          sex: data.sex,
          dateOfBirth: data.dateOfBirth.toISOString().slice(0, 10),
        },
        motherIndividualId,
        nationalIdUUID,
        phoneAttributeTypeUUID,
      });

      showSnackbar({
        title: t('dependantAdded', 'Dependant added'),
        subtitle: participant?.individualId
          ? t('dependantAddedSubtitle', 'PCS issued {{individualId}} for this dependant.', {
              individualId: participant.individualId,
            })
          : undefined,
        kind: 'success',
        isLowContrast: true,
      });

      onCreated?.();
      reset();
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (e: any) {
      setSubmitError(
        e?.responseBody?.error?.message ?? e?.message ?? t('dependantAddFailed', 'The dependant could not be added.'),
      );
    }
  };

  if (!workspaceProps) {
    return null;
  }

  return (
    <Workspace2 title={t('addDependant', 'Add dependant')} hasUnsavedChanges={isDirty}>
      <Form onSubmit={handleSubmit(onSubmit)} className={styles.workspaceForm}>
        <Row className={styles.workspaceContent}>
          <Column>
            <Controller
              name="givenName"
              control={control}
              render={({ field, fieldState }) => (
                <TextInput
                  id="addDependantGivenName"
                  labelText={t('givenName', 'Given name')}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  invalid={Boolean(fieldState.error)}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
          </Column>

          <Column>
            <Controller
              name="middleName"
              control={control}
              render={({ field, fieldState }) => (
                <TextInput
                  id="addDependantMiddleName"
                  labelText={t('middleNameOptional', 'Middle name (optional)')}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  invalid={Boolean(fieldState.error)}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
          </Column>

          <Column>
            <Controller
              name="familyName"
              control={control}
              render={({ field, fieldState }) => (
                <TextInput
                  id="addDependantFamilyName"
                  labelText={t('familyName', 'Family name')}
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  invalid={Boolean(fieldState.error)}
                  invalidText={fieldState.error?.message}
                />
              )}
            />
          </Column>

          <Column>
            <Controller
              name="dateOfBirth"
              control={control}
              render={({ field, fieldState }) => (
                <ResponsiveWrapper>
                  <OpenmrsDatePicker
                    {...field}
                    id="addDependantDateOfBirth"
                    labelText={t('dateOfBirth', 'Date of birth')}
                    value={field.value as Date}
                    minDate={oneYearAgo()}
                    maxDate={new Date()}
                    invalid={Boolean(fieldState.error)}
                    invalidText={fieldState.error?.message}
                  />
                </ResponsiveWrapper>
              )}
            />
          </Column>

          <Column>
            <Controller
              name="sex"
              control={control}
              render={({ field: { onChange, value }, fieldState }) => (
                <RadioButtonGroup
                  legendText={t('sex', 'Sex')}
                  orientation="horizontal"
                  name="addDependantSex"
                  valueSelected={value ?? ''}
                  // Load-bearing: without it Carbon's internal state ignores a
                  // programmatic change to the selected value.
                  key={value ?? 'empty'}
                  onChange={(selected) => onChange(selected)}
                  invalid={Boolean(fieldState.error)}
                  invalidText={fieldState.error?.message}>
                  <RadioButton value="F" id="addDependantSexFemale" labelText={t('female', 'Female')} />
                  <RadioButton value="M" id="addDependantSexMale" labelText={t('male', 'Male')} />
                </RadioButtonGroup>
              )}
            />
          </Column>
          {submitError && (
            <InlineNotification
              className={styles.notification}
              kind="error"
              lowContrast
              hideCloseButton
              title={t('dependantAddFailedTitle', 'Could not add dependant')}
              subtitle={submitError}
            />
          )}
        </Row>

        <ButtonSet className={styles.workspaceButtonSet}>
          <Button kind="secondary" onClick={() => closeWorkspace({ discardUnsavedChanges: true })}>
            {t('cancel', 'Cancel')}
          </Button>
          <Button kind="primary" type="submit" disabled={isSubmitting}>
            {t('save', 'Save')}
          </Button>
        </ButtonSet>
      </Form>
    </Workspace2>
  );
};

export default AddDependantWorkspace;
