import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InlineLoading } from '@carbon/react';
import {
  ExtensionSlot,
  useConnectivity,
  usePatient,
  useVisit,
  Workspace2,
  type Workspace2DefinitionProps,
} from '@openmrs/esm-framework';

type CustomFormEntryWorkspaceProps = {
  patientUuid?: string;
  form?: { uuid: string };
  formInfo?: { formUuid?: string; encounterUuid?: string };
  encounterUuid?: string;
  visitUuid?: string;
  visitStartDatetime?: string;
  visitStopDatetime?: string;
  workspaceTitle?: string;
  mutateForm?: () => void;
};

const CustomFormEntryWorkspace: React.FC<Workspace2DefinitionProps<CustomFormEntryWorkspaceProps, object, object>> = ({
  closeWorkspace,
  workspaceProps: {
    patientUuid,
    form,
    formInfo,
    encounterUuid,
    visitUuid,
    visitStartDatetime,
    visitStopDatetime,
    workspaceTitle,
    mutateForm,
  },
}) => {
  const { t } = useTranslation();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { patient, isLoading } = usePatient(patientUuid);
  const { currentVisit } = useVisit(patientUuid);
  const isOnline = useConnectivity();

  const formUuid = formInfo?.formUuid ?? form?.uuid;
  const resolvedEncounterUuid = formInfo?.encounterUuid ?? encounterUuid ?? '';
  const resolvedVisitUuid = visitUuid ?? currentVisit?.uuid ?? null;
  const resolvedVisitTypeUuid = currentVisit?.visitType?.uuid ?? null;
  const resolvedVisitStartDatetime = visitStartDatetime ?? currentVisit?.startDatetime ?? null;
  const resolvedVisitStopDatetime = visitStopDatetime ?? currentVisit?.stopDatetime ?? null;

  const state = useMemo(
    () => ({
      view: 'form',
      formUuid: formUuid ?? null,
      visitUuid: resolvedVisitUuid,
      visitTypeUuid: resolvedVisitTypeUuid,
      visitStartDatetime: resolvedVisitStartDatetime,
      visitStopDatetime: resolvedVisitStopDatetime,
      isOffline: !isOnline,
      patientUuid: patientUuid ?? null,
      patient,
      encounterUuid: resolvedEncounterUuid,
      closeWorkspace: () => {
        typeof mutateForm === 'function' && mutateForm();
        closeWorkspace();
      },
      closeWorkspaceWithSavedChanges: () => {
        typeof mutateForm === 'function' && mutateForm();
        closeWorkspace({ discardUnsavedChanges: true });
      },
      promptBeforeClosing: () => setHasUnsavedChanges(true),
    }),
    [
      formUuid,
      resolvedEncounterUuid,
      resolvedVisitUuid,
      resolvedVisitTypeUuid,
      resolvedVisitStartDatetime,
      resolvedVisitStopDatetime,
      isOnline,
      patientUuid,
      patient,
      closeWorkspace,
      mutateForm,
    ],
  );

  const title = workspaceTitle ?? t('formEntry', 'Form Entry');

  if (isLoading) {
    return (
      <Workspace2 title={title} hasUnsavedChanges={hasUnsavedChanges}>
        <InlineLoading description={t('loading', 'Loading...')} iconDescription={t('loading', 'Loading data...')} />
      </Workspace2>
    );
  }

  return (
    <Workspace2 title={title} hasUnsavedChanges={hasUnsavedChanges}>
      <ExtensionSlot name="form-widget-slot" state={state} />
    </Workspace2>
  );
};

export default CustomFormEntryWorkspace;
