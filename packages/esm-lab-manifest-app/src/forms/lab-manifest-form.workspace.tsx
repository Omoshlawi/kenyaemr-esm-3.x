import {
  Button,
  ButtonSet,
  Column,
  DatePicker,
  DatePickerInput,
  Dropdown,
  Form,
  Stack,
  TextInput,
} from '@carbon/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { DefaultWorkspaceProps, useSession } from '@openmrs/esm-framework';
import React from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { LabManifestFilters, labManifestFormSchema, manifestTypes } from '../lab-manifest.resources';
import styles from './lab-manifest-form.scss';
import { County, LabManifest } from '../types';
interface LabManifestFormProps extends DefaultWorkspaceProps {
  patientUuid: string;
  manifest?: LabManifest;
}

type ContactListFormType = z.infer<typeof labManifestFormSchema>;

const LabManifestForm: React.FC<LabManifestFormProps> = ({
  closeWorkspace,
  closeWorkspaceWithSavedChanges,
  promptBeforeClosing,
  manifest,
}) => {
  const counties = require('../counties.json') as County[];
  const form = useForm<ContactListFormType>({
    defaultValues: {
      courierName: manifest?.courrier,
      labPersonContact: manifest?.labPersonContact,
      startDate: new Date(),
      endDate: new Date(),
      manifestStatus: manifest?.status,
      dispatchDate: new Date(),
    },
    resolver: zodResolver(labManifestFormSchema),
  });
  const { t } = useTranslation();
  const session = useSession();
  const observableSelectedCounty = form.watch('county');
  const onSubmit = async (values: ContactListFormType) => {};
  return (
    <Form onSubmit={form.handleSubmit(onSubmit)}>
      <span className={styles.contactFormTitle}>{t('formTitle', 'Fill in the form details')}</span>
      <Stack gap={4} className={styles.grid}>
        <Column>
          <Controller
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <DatePicker
                dateFormat="d/m/Y"
                id="startDate"
                datePickerType="single"
                {...field}
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}>
                <DatePickerInput
                  invalid={form.formState.errors[field.name]?.message}
                  invalidText={form.formState.errors[field.name]?.message}
                  placeholder="mm/dd/yyyy"
                  labelText={t('startDate', 'Start Date')}
                  size="xl"
                />
              </DatePicker>
            )}
          />
        </Column>
        <Column>
          <Controller
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <DatePicker
                dateFormat="d/m/Y"
                id="endDate"
                datePickerType="single"
                {...field}
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}>
                <DatePickerInput
                  invalid={form.formState.errors[field.name]?.message}
                  invalidText={form.formState.errors[field.name]?.message}
                  placeholder="mm/dd/yyyy"
                  labelText={t('endDate', 'End Date')}
                  size="xl"
                />
              </DatePicker>
            )}
          />
        </Column>
        <span className={styles.sectionHeader}>Manifest type</span>
        <Column>
          <Controller
            control={form.control}
            name="manifestType"
            render={({ field }) => (
              <Dropdown
                ref={field.ref}
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                id="manifestType"
                titleText={t('manifestType', 'Manifest Type')}
                onChange={(e) => {
                  field.onChange(e.selectedItem);
                }}
                initialSelectedItem={field.value}
                label="Choose option"
                items={manifestTypes.map((r) => r.value)}
                itemToString={(item) => manifestTypes.find((r) => r.value === item)?.label ?? ''}
              />
            )}
          />
        </Column>
        <span className={styles.sectionHeader}>Dispatch status</span>

        <Column>
          <Controller
            control={form.control}
            name="dispatchDate"
            render={({ field }) => (
              <DatePicker
                dateFormat="d/m/Y"
                id="dispatchDate"
                datePickerType="single"
                {...field}
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}>
                <DatePickerInput
                  invalid={form.formState.errors[field.name]?.message}
                  invalidText={form.formState.errors[field.name]?.message}
                  placeholder="mm/dd/yyyy"
                  labelText={t('dispatchDate', 'Dispatch Date')}
                  size="xl"
                />
              </DatePicker>
            )}
          />
        </Column>
        <Column>
          <Controller
            control={form.control}
            name="courierName"
            render={({ field }) => (
              <TextInput
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                {...field}
                placeholder="Courier name"
                labelText={t('courierName', 'Courier name')}
              />
            )}
          />
        </Column>
        <Column>
          <Controller
            control={form.control}
            name="personHandedTo"
            render={({ field }) => (
              <TextInput
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                {...field}
                placeholder="Person name"
                labelText={t('personHandedTo', 'Person handed to')}
              />
            )}
          />
        </Column>
        <span className={styles.sectionHeader}>Address</span>
        <Column>
          <Controller
            control={form.control}
            name="county"
            render={({ field }) => (
              <Dropdown
                ref={field.ref}
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                id="county"
                titleText={t('county', 'County')}
                onChange={(e) => {
                  field.onChange(e.selectedItem);
                  form.setValue('subCounty', undefined);
                  // form.resetField("subCounty")
                }}
                initialSelectedItem={field.value}
                label="Select county"
                items={counties.map((r) => r.name)}
                itemToString={(item) => item ?? ''}
              />
            )}
          />
        </Column>
        <Column>
          <Controller
            control={form.control}
            name="subCounty"
            render={({ field }) => (
              <Dropdown
                ref={field.ref}
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                id="subCounty"
                titleText={t('subCounty', 'Sub county')}
                initialSelectedItem={field.value}
                onChange={(e) => {
                  field.onChange(e.selectedItem);
                }}
                label="Select subcounty"
                items={(counties.find((c) => c.name == observableSelectedCounty)?.constituencies ?? []).map(
                  (r) => r.name,
                )}
                itemToString={(item) =>
                  (counties.find((c) => c.name == observableSelectedCounty)?.constituencies ?? []).find(
                    (c) => c.name === item,
                  )?.name ?? 'Select subcounty'
                }
              />
            )}
          />
        </Column>
        <Column>
          <Controller
            control={form.control}
            name="facilityEmail"
            render={({ field }) => (
              <TextInput
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                {...field}
                placeholder="Facility Email"
                labelText={t('facilityEmail', 'Facility email')}
              />
            )}
          />
        </Column>
        <Column>
          <Controller
            control={form.control}
            name="facilityPhoneContact"
            render={({ field }) => (
              <TextInput
                {...field}
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                placeholder="Phone number"
                labelText={t('facilityPhoneContact', 'Facility phone contact')}
              />
            )}
          />
        </Column>
        <Column>
          <Controller
            control={form.control}
            name="clinicianName"
            render={({ field }) => (
              <TextInput
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                {...field}
                placeholder="Clinician name"
                labelText={t('clinicianName', 'Clinician name')}
              />
            )}
          />
        </Column>
        <Column>
          <Controller
            control={form.control}
            name="clinicianContact"
            render={({ field }) => (
              <TextInput
                {...field}
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                placeholder="Clinician contact"
                labelText={t('clinicianContact', 'Clinician phone contact')}
              />
            )}
          />
        </Column>
        <Column>
          <Controller
            control={form.control}
            name="labPersonContact"
            render={({ field }) => (
              <TextInput
                {...field}
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                placeholder="Lab person contact"
                labelText={t('labPersonContact', 'Lab person contact')}
              />
            )}
          />
        </Column>
        <span className={styles.sectionHeader}>Manifest status</span>
        <Column>
          <Controller
            control={form.control}
            name="manifestStatus"
            render={({ field }) => (
              <Dropdown
                ref={field.ref}
                invalid={form.formState.errors[field.name]?.message}
                invalidText={form.formState.errors[field.name]?.message}
                id="manifestStatus"
                titleText={t('status', 'Status')}
                onChange={(e) => {
                  field.onChange(e.selectedItem);
                }}
                initialSelectedItem={field.value}
                label="Select status"
                items={LabManifestFilters.map((r) => r.value)}
                itemToString={(item) => LabManifestFilters.find((r) => r.value === item)?.label ?? ''}
              />
            )}
          />
        </Column>
      </Stack>

      <ButtonSet className={styles.buttonSet}>
        <Button className={styles.button} kind="secondary" onClick={closeWorkspace}>
          {t('discard', 'Discard')}
        </Button>
        <Button className={styles.button} kind="primary" type="submit" disabled={form.formState.isSubmitting}>
          {t('submit', 'Submit')}
        </Button>
      </ButtonSet>
    </Form>
  );
};

export default LabManifestForm;