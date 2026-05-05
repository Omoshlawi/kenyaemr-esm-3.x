import {
  Column,
  DatePicker,
  DatePickerInput,
  InlineLoading,
  InlineNotification,
  MultiSelect,
  NumberInput,
} from '@carbon/react';
import { useConfig, usePatient } from '@openmrs/esm-framework';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { BillingConfig } from '../../config-schema';
import { useSHASubBenefits } from '../../billing-form/social-health-authority/sha-virtual-claim.resource';
import styles from './packages-and-interventions-form.scss';
import PackageInterventions from './interventions-form.component';

type Props = {
  patientUuid: string;
  visitTypeUuid?: string;
};

const SHABenefitPackagesAndInterventions: React.FC<Props> = ({ patientUuid, visitTypeUuid }) => {
  const { t } = useTranslation();
  const { crIdentificationNumberUUID, inPatientVisitTypeUuid } = useConfig<BillingConfig>();
  const { error: patientError, isLoading: isLoadingPatient, patient } = usePatient(patientUuid);
  const form = useFormContext<{
    packages: Array<string>;
    interventions: Array<string>;
    policyNumber: string;
    admissionDate: Date | null;
    estimatedDaysOfAdmission: number;
  }>();
  const { setValue } = form;

  const [selectedSubBenefitCode, setSelectedSubBenefitCode] = useState<string | null>(null);
  const isInpatient = visitTypeUuid === inPatientVisitTypeUuid;

  const patientCRId = useMemo(() => {
    if (!patient?.identifier) {
      return null;
    }
    const byType = patient.identifier.find((id: fhir.Identifier) =>
      id?.type?.coding?.some((c) => c.code === crIdentificationNumberUUID),
    );
    if (byType?.value) {
      return byType.value;
    }
    const byPrefix = patient.identifier.find((id: fhir.Identifier) => id?.value?.startsWith('CR'));
    return byPrefix?.value ?? null;
  }, [patient, crIdentificationNumberUUID]);

  useEffect(() => {
    if (patientCRId) {
      setValue('policyNumber', patientCRId);
    }
  }, [patientCRId, setValue]);

  useEffect(() => {
    if (isInpatient) {
      setValue('admissionDate', new Date());
      setValue('estimatedDaysOfAdmission', 1);
    }
  }, [isInpatient, setValue]);

  const {
    subBenefits,
    isLoading: isLoadingSubBenefits,
    error: subBenefitsError,
  } = useSHASubBenefits(patientCRId ?? '');

  const selectedPackages = form.watch('packages');

  useEffect(() => {
    if (selectedPackages?.length > 0 && selectedSubBenefitCode === null) {
      setSelectedSubBenefitCode(selectedPackages[0]);
    }
  }, [selectedPackages]);

  if (isLoadingPatient) {
    return (
      <InlineLoading
        className={styles.loader}
        description={t('loadingPatient', 'Loading patient...')}
        iconDescription={t('loading', 'Loading')}
      />
    );
  }

  if (patientError) {
    return (
      <InlineNotification
        aria-label="closes notification"
        kind="error"
        lowContrast
        statusIconDescription="notification"
        title={t('errorLoadingPatient', 'Error loading patient')}
        subtitle={patientError?.message}
      />
    );
  }

  if (!patientCRId) {
    return (
      <InlineNotification
        aria-label="closes notification"
        kind="warning"
        lowContrast
        statusIconDescription="notification"
        title={t('noCRNumber', 'No SHA CR number')}
        subtitle={t(
          'patientHasNoCRNumber',
          'This patient does not have a SHA CR number. Virtual claim cannot be created.',
        )}
      />
    );
  }

  if (isLoadingSubBenefits) {
    return (
      <InlineLoading
        className={styles.loader}
        description={t('loadingSHABenefits', 'Loading SHA benefits...')}
        iconDescription={t('loading', 'Loading')}
      />
    );
  }

  if (subBenefitsError) {
    return (
      <InlineNotification
        aria-label="closes notification"
        kind="error"
        lowContrast
        statusIconDescription="notification"
        title={t('errorLoadingBenefits', 'Error loading SHA benefits')}
        subtitle={subBenefitsError?.message}
      />
    );
  }

  return (
    <div className={styles.container}>
      <Column className={styles.column}>
        <p className={styles.sectionTitle}>{t('shaPackages', 'SHA Benefit Packages')}</p>
        <Controller
          control={form.control}
          name="packages"
          render={({ field }) => (
            <MultiSelect
              ref={field.ref}
              id="sha-packages"
              titleText={t('package', 'Package')}
              label={t('choosePackage', 'Choose package')}
              items={subBenefits.map((b) => b.code)}
              itemToString={(code) => {
                const benefit = subBenefits.find((b) => b.code === code);
                return benefit ? `${benefit.code} — ${benefit.name}` : code ?? '';
              }}
              selectedItems={field.value ?? []}
              onChange={(e) => {
                field.onChange(e.selectedItems);
                setSelectedSubBenefitCode(e.selectedItems?.[0] ?? null);
              }}
              invalid={!!form.formState.errors[field.name]?.message}
              invalidText={form.formState.errors[field.name]?.message}
            />
          )}
        />
      </Column>

      <Column className={styles.column}>
        <PackageInterventions
          patientCRId={patientCRId}
          subBenefitCode={selectedSubBenefitCode ?? ''}
          patientUuid={patientUuid}
          selectedPackages={selectedPackages ?? []}
        />
      </Column>

      {isInpatient && (
        <>
          <Column className={styles.column}>
            <p className={styles.sectionTitle}>{t('inpatientDetails', 'Inpatient Details')}</p>
            <Controller
              control={form.control}
              name="admissionDate"
              render={({ field }) => (
                <DatePicker
                  datePickerType="single"
                  value={field.value ? new Date(field.value) : null}
                  onChange={(event) => {
                    if (event.length) {
                      field.onChange(event[0]);
                    }
                  }}>
                  <DatePickerInput
                    id="admission-date"
                    placeholder="mm/dd/yyyy"
                    labelText={t('admissionDate', 'Admission date')}
                    className={styles.dateInput}
                  />
                </DatePicker>
              )}
            />
          </Column>

          <Column className={styles.column}>
            <Controller
              control={form.control}
              name="estimatedDaysOfAdmission"
              render={({ field }) => (
                <NumberInput
                  id="estimated-days"
                  label={t('estimatedDaysOfAdmission', 'Estimated days of admission')}
                  min={1}
                  max={365}
                  value={field.value ?? 1}
                  onChange={(_e, { value }) => field.onChange(Number(value))}
                  className={styles.numberInput}
                />
              )}
            />
          </Column>
        </>
      )}
    </div>
  );
};

export default SHABenefitPackagesAndInterventions;
