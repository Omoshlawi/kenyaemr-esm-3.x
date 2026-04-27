import React, { useEffect, useMemo, useState } from 'react';
import {
  Accordion,
  Button,
  ButtonSet,
  Column,
  DatePicker,
  DatePickerInput,
  Dropdown,
  Form,
  Stack,
  TextArea,
} from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import { z } from 'zod';

import {
  parseDate,
  showSnackbar,
  useConfig,
  useSession,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';

import { ConfigObject, PNSContactFormConfig } from '../config-schema';
import { useMappedRelationshipTypes } from '../family-partner-history/relationships.resource';
import usePersonAttributes from '../hooks/usePersonAttributes';
import RelationshipBaselineInfoFormSection from '../relationships/forms/baseline-info-form-section.component';
import PatientSearchCreate from '../relationships/forms/patient-search-create-form';
import { usePatientBirthdate } from '../relationships/relationship.resources';
import { ContactListFormSchema, saveContact } from './contact-list.resource';

import styles from './contact-list-form.scss';

type ContactListFormProps = {
  patientUuid: string;
};

type ContactListFormType = z.infer<typeof ContactListFormSchema>;

const ContactListForm: React.FC<Workspace2DefinitionProps<ContactListFormProps, object, object>> = ({
  closeWorkspace,
  workspaceProps: { patientUuid },
}) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const form = useForm<ContactListFormType>({
    mode: 'all',
    defaultValues: {
      personA: patientUuid,
      mode: 'search',
    },
    resolver: zodResolver(ContactListFormSchema),
  });
  const { t } = useTranslation();
  const session = useSession();
  const personUuid = form.watch('personB');
  const { attributes } = usePersonAttributes(personUuid);

  const config = useConfig<ConfigObject & PNSContactFormConfig>();
  const { data } = useMappedRelationshipTypes();
  const pnsRelationships = useMemo(
    () => config.relationshipTypesList.filter((rl) => rl.category.some((c) => c === 'pns')),
    [config],
  );
  const pnsRelationshipTypes = data
    ? pnsRelationships.map((rel) => ({
        ...rel,
        display: data!.find((r) => r.uuid === rel.uuid)?.display,
      }))
    : [];
  const { isLoading: isPatientloading, birthdate } = usePatientBirthdate(personUuid);
  const mode = form.watch('mode');
  const dobCreateMode = form.watch('personBInfo.birthdate');
  const patientAgeMonths = useMemo(() => {
    let birthDate: Date | null = null;
    if (mode === 'create') {
      birthDate = dobCreateMode;
    } else {
      birthDate = birthdate ? parseDate(birthdate) : null;
    }
    if (birthDate) {
      return dayjs().diff(birthDate, 'month');
    }
    return null;
  }, [mode, dobCreateMode, birthdate]);

  const onSubmit = async (values: ContactListFormType) => {
    try {
      await saveContact(values, config, session, attributes);
      closeWorkspace({ discardUnsavedChanges: true });
    } catch (error) {
      showSnackbar({
        title: 'Error',
        subtitle: t(
          'errorSavingRelationship',
          'Failure saving relationship! ' + (error?.message || JSON.stringify(error)),
        ),
        kind: 'error',
        timeoutInMs: 3000,
        isLowContrast: true,
      });
    }
  };

  useEffect(() => {
    setHasUnsavedChanges(form.formState.isDirty);
  }, [form.formState.isDirty, setHasUnsavedChanges]);

  return (
    <Workspace2 title={t('contactListForm', 'Contact List Form')} hasUnsavedChanges={hasUnsavedChanges}>
      <FormProvider {...form}>
        <Form onSubmit={form.handleSubmit(onSubmit)} className={styles.form}>
          <Stack gap={4} className={styles.grid}>
            <PatientSearchCreate />
            <span className={styles.sectionHeader}>{t('relationship', 'Relationship')}</span>
            <Column>
              <Controller
                control={form.control}
                name="startDate"
                render={({ field, fieldState: { error } }) => (
                  <DatePicker
                    className={styles.datePickerInput}
                    dateFormat="d/m/Y"
                    datePickerType="single"
                    {...field}
                    ref={undefined}
                    invalid={!!error?.message}
                    invalidText={error?.message}>
                    <DatePickerInput
                      id={`startdate-input`}
                      invalid={!!error?.message}
                      invalidText={error?.message}
                      placeholder="mm/dd/yyyy"
                      labelText={t('startDate', 'Start Date')}
                      size="lg"
                    />
                  </DatePicker>
                )}
              />
            </Column>
            <Column>
              <Controller
                control={form.control}
                name="endDate"
                render={({ field, fieldState: { error } }) => (
                  <DatePicker
                    className={styles.datePickerInput}
                    dateFormat="d/m/Y"
                    datePickerType="single"
                    {...field}
                    invalid={!!error?.message}
                    invalidText={error?.message}>
                    <DatePickerInput
                      id="endDate"
                      invalid={!!error?.message}
                      invalidText={error?.message}
                      placeholder="mm/dd/yyyy"
                      labelText={t('endDate', 'End Date')}
                      size="lg"
                    />
                  </DatePicker>
                )}
              />
            </Column>
            <Column>
              <Controller
                control={form.control}
                name="relationshipType"
                render={({ field, fieldState: { error } }) => (
                  <Dropdown
                    ref={field.ref}
                    invalid={!!error?.message}
                    invalidText={error?.message}
                    id="relationshipToPatient"
                    titleText={t('relationToPatient', 'Relation to patient')}
                    onChange={(e) => {
                      field.onChange(e.selectedItem);
                    }}
                    initialSelectedItem={field.value}
                    label="Select Realtionship"
                    items={pnsRelationshipTypes.map((r) => r.uuid)}
                    itemToString={(item) => pnsRelationshipTypes.find((r) => r.uuid === item)?.display ?? ''}
                  />
                )}
              />
            </Column>

            <RelationshipBaselineInfoFormSection patientAgeMonths={patientAgeMonths} patientUuid={personUuid} />
            {config.pnsContactFormConfig.hideComments === false && (
              <Column>
                <Controller
                  control={form.control}
                  name="comments"
                  render={({ field, fieldState: { error } }) => (
                    <TextArea
                      id={field.name}
                      invalid={!!error?.message}
                      invalidText={error?.message}
                      {...field}
                      placeholder={t('commentsPlaceholder', 'Comments')}
                      labelText={t('comments', 'Comments')}
                    />
                  )}
                />
              </Column>
            )}
          </Stack>

          <ButtonSet className={styles.buttonSet}>
            <Button className={styles.button} kind="secondary" onClick={() => closeWorkspace()}>
              {t('discard', 'Discard')}
            </Button>
            <Button className={styles.button} kind="primary" type="submit" disabled={form.formState.isSubmitting}>
              {t('submit', 'Submit')}
            </Button>
          </ButtonSet>
        </Form>
      </FormProvider>
    </Workspace2>
  );
};

export default ContactListForm;
