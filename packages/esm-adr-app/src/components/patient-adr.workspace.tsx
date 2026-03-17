import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading, InlineNotification } from '@carbon/react';
import {
  ExtensionSlot,
  usePatient,
  useVisit,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';

type encounter = {
  formUuid: string;
  encounterDatetime: string;
  encounterType: string;
  encounterUuid: string;
  visitUuid: string;
  patientUuid: string;
  visitTypeUuid: string;
};

type PatientAdrWorkspaceProps = {
  encounter?: encounter;
};

const PatientAdrWorkspace: React.FC<Workspace2DefinitionProps<PatientAdrWorkspaceProps, {}, {}>> = (props) => {
  const { t } = useTranslation();
  const {
    workspaceProps: { encounter = {} as encounter },
    closeWorkspace,
  } = props;
  const { formUuid, encounterUuid, visitUuid, patientUuid, visitTypeUuid } = encounter || {};
  const { isLoading: isLoadingVisit, error: visitError } = useVisit(patientUuid);
  const { patient, isLoading: isLoadingPatient, error: patientError } = usePatient(patientUuid);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const state = useMemo<Record<string, unknown>>(
    () => ({
      view: 'form',
      formUuid: formUuid ?? null,
      visitUuid: visitUuid ?? null,
      visitTypeUuid: visitTypeUuid ?? null,
      patientUuid: patientUuid ?? null,
      patient,
      encounterUuid: encounterUuid ?? null,
      closeWorkspaceWithSavedChanges: () => closeWorkspace({ discardUnsavedChanges: true }),
      closeWorkspace,
      promptBeforeClosing: () => setHasUnsavedChanges(true),
    }),
    [patientUuid, encounterUuid, patient, closeWorkspace, formUuid, visitUuid, visitTypeUuid, hasUnsavedChanges],
  );

  const isLoading = isLoadingVisit || isLoadingPatient;
  const error = visitError || patientError;

  if (isLoading) {
    return (
      <Workspace2 hasUnsavedChanges={hasUnsavedChanges} title={t('adrAssessmentReview', 'ADR Assessment Review')}>
        <InlineLoading description={t('loading', 'Loading')} iconDescription={t('loading', 'Loading data...')} />
      </Workspace2>
    );
  }

  if (error) {
    return (
      <Workspace2 hasUnsavedChanges={hasUnsavedChanges} title={t('adrAssessmentReview', 'ADR Assessment Review')}>
        <InlineNotification
          aria-label={t('error', 'Error')}
          kind="error"
          onClose={() => {}}
          onCloseButtonClick={() => {}}
          statusIconDescription="notification"
          subtitle={t('errorLoadingPatientWorkspace', 'Error loading patient workspace {{errorMessage}}', {
            errorMessage: error?.message,
          })}
          title={t('error', 'Error')}
        />
      </Workspace2>
    );
  }

  return (
    <Workspace2 hasUnsavedChanges={hasUnsavedChanges} title={t('adrAssessmentReview', 'ADR Assessment Review')}>
      {patient && <ExtensionSlot name="form-widget-slot" state={state} />}
    </Workspace2>
  );
};

export default PatientAdrWorkspace;
