import { ExtensionSlot, useConnectivity, usePatient, type Workspace2DefinitionProps } from '@openmrs/esm-framework';
import React, { useMemo } from 'react';

type FormEntryWorkspaceProps = {
  formUuid?: string;
  patientUuid?: string;
  encounterUuid?: string;
  mutateForm: () => void;
};

const FormEntryWorkspace: React.FC<Workspace2DefinitionProps<FormEntryWorkspaceProps, object, object>> = (props) => {
  const {
    closeWorkspace,
    workspaceProps: { formUuid, patientUuid, encounterUuid, mutateForm },
  } = props;
  const { patient, isLoading } = usePatient(patientUuid);

  const isOnline = useConnectivity();
  const state = useMemo(
    () => ({
      ...props,
      view: 'form',
      formUuid: formUuid ?? null,
      visitUuid: '',
      visitTypeUuid: '',
      visitStartDatetime: null,
      visitStopDatetime: null,
      isOffline: !isOnline,
      patientUuid: patientUuid ?? null,
      patient,
      encounterUuid: encounterUuid ?? null,
      closeWorkspace: () => {
        typeof mutateForm === 'function' && mutateForm();
        closeWorkspace();
      },
      closeWorkspaceWithSavedChanges: () => {
        typeof mutateForm === 'function' && mutateForm();
        closeWorkspace({ discardUnsavedChanges: true });
      },
    }),
    [patient, patientUuid, encounterUuid, formUuid, isOnline, props, closeWorkspace, mutateForm],
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <ExtensionSlot name="form-widget-slot" state={state} />;
};

export default FormEntryWorkspace;
