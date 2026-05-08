import { InlineLoading, OverflowMenuItem } from '@carbon/react';
import { showSnackbar, useConfig } from '@openmrs/esm-framework';
import { useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import React, { FC, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CarePanelConfig } from '../config-schema';
import { type Enrollment, useFormsFilled, usePatientFormEncounter } from './care-program.resource';
import KvpLinkPatientToPeerEducator from './link-patient-to-peer-action.component';

type ProgramFormOverflowMenuItemProps = {
  patientUuid: string;
  form: CarePanelConfig['careProgramForms'][0]['forms'][0];
  mutate?: () => void;
  enrollment: Enrollment;
};

const ProgramFormOverflowMenuItem: FC<ProgramFormOverflowMenuItemProps> = ({
  form,
  patientUuid,
  mutate,
  enrollment,
}) => {
  const { mutateVisitContext, visitContext, patient: fhirPatient } = usePatientChartStore(patientUuid);
  const launchFormEntryWorkspace = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');
  const {
    formEncounters,
    error,
    isLoading,
    mutate: mutateFormEncounters,
  } = usePatientFormEncounter(patientUuid, form.formUuId, {
    scope: form.tags.includes('bound-to-current-visit') ? 'current-visit' : 'all-visits',
    currentVisit: visitContext,
  });
  const { hideFilledProgramForm, peerCalendarOutreactForm } = useConfig<CarePanelConfig>();
  const { t } = useTranslation();
  const {
    error: formFilledError,
    formsFilled: areAllDependancyFormsFilled,
    isLoading: isLoadingDependancyStatus,
    mutate: mutateDependancyStatus,
  } = useFormsFilled(patientUuid, form.dependancies);
  const groupProps = useMemo(
    () => ({
      patientUuid,
      patient: fhirPatient,
      visitContext,
      mutateVisitContext: () => {
        mutateVisitContext();
        mutate?.();
        mutateDependancyStatus();
        mutateFormEncounters();
      },
    }),
    [patientUuid, fhirPatient, visitContext, mutateVisitContext, mutate, mutateDependancyStatus, mutateFormEncounters],
  );

  const latestFormEncounter = useMemo(() => formEncounters.at(0)?.encounter, [formEncounters]);
  // Show form if
  // 1. Form is not yet filled AND (Form Has no dependancies OR Form has dependancies that are all filled)
  // 2. Form is filled already AND hideFilledProgramForm is configured to false (else launch in edit mode)
  const showForm = useMemo(() => {
    // Handle dicontinuation form
    if (form.tags.includes('discontinuation')) {
      return true;
    }
    // !latestFormEncounter -> current form is not yet filled
    if (!latestFormEncounter && (!form?.dependancies?.length || areAllDependancyFormsFilled)) {
      return true;
    }
    if (latestFormEncounter && !hideFilledProgramForm) {
      return true;
    }
    return false;
  }, [areAllDependancyFormsFilled, form?.dependancies?.length, form.tags, hideFilledProgramForm, latestFormEncounter]);

  useEffect(() => {
    if (error || formFilledError) {
      showSnackbar({ kind: 'error', title: t('error', 'Error'), subtitle: (error ?? formFilledError)?.message });
    }
  }, [error, formFilledError, t]);

  if (isLoading || isLoadingDependancyStatus) {
    return <InlineLoading />;
  }

  if (!showForm) {
    return null;
  }

  if (form.formUuId === peerCalendarOutreactForm) {
    return (
      <KvpLinkPatientToPeerEducator
        form={form}
        patientUuid={patientUuid}
        mutate={() => {
          mutate?.();
          mutateDependancyStatus();
          mutateFormEncounters();
        }}
      />
    );
  }

  const formLabel = t(form.formTranslationKey ?? form.formName, { defaultValue: form.formName });

  return (
    <OverflowMenuItem
      key={form.formUuId}
      itemText={formLabel}
      onClick={() => {
        /**
          launchWorkspace('patient-form-entry-workspace', {
            workspaceTitle: formLabel,
            mutateForm: () => {
              mutate?.();
              mutateDependancyStatus();
              mutateFormEncounters();
            },
            formInfo: {
              encounterUuid: form.tags.includes('discontinuation') ? '' : latestFormEncounter?.uuid ?? '',
              formUuid: form.formUuId,
              additionalProps: {
                enrollmentDetails: { dateEnrolled: new Date(enrollment.dateEnrolled), uuid: enrollment.uuid },
              },
            },
          });
         */
        return launchFormEntryWorkspace(
          {
            workspaceTitle: formLabel,
            form: {
              uuid: form.formUuId,
            },
            additionalProps: {
              enrollmentDetails: { dateEnrolled: new Date(enrollment.dateEnrolled), uuid: enrollment.uuid },
            },
            encounterUuid: form.tags.includes('discontinuation') ? '' : latestFormEncounter?.uuid ?? '',
          },
          {},
          groupProps,
        );
      }}
    />
  );
};

export default ProgramFormOverflowMenuItem;
