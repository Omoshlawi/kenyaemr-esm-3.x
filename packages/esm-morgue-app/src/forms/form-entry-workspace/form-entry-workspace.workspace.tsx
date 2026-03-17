import { InlineLoading } from '@carbon/react';
import {
  ExtensionSlot,
  useConnectivity,
  usePatient,
  type Workspace2DefinitionProps,
  Workspace2,
} from '@openmrs/esm-framework';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type FormEntryWorkspaceProps = {
  formUuid?: string;
  patientUuid?: string;
  encounterUuid?: string;
  mutateForm: () => void;
};

const FormEntryWorkspace: React.FC<Workspace2DefinitionProps<FormEntryWorkspaceProps, object, object>> = ({
  closeWorkspace,
  workspaceProps: { formUuid, patientUuid, encounterUuid, mutateForm },
}) => {
  const { t } = useTranslation();
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const props = useMemo(
    () => ({ formUuid, patientUuid, encounterUuid, mutateForm }),
    [formUuid, patientUuid, encounterUuid, mutateForm],
  );
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
      promptBeforeClosing: () => setHasUnsavedChanges(true),
    }),
    [patient, patientUuid, encounterUuid, formUuid, isOnline, props, closeWorkspace, mutateForm],
  );

  if (isLoading) {
    return (
      <Workspace2 title={t('mortuaryFormEntry', 'Mortuary Form Entry')} hasUnsavedChanges={hasUnsavedChanges}>
        <InlineLoading status="active" iconDescription="Loading" description="Loading form..." />
      </Workspace2>
    );
  }

  return (
    <Workspace2 title={t('mortuaryFormEntry', 'Mortuary Form Entry')} hasUnsavedChanges={hasUnsavedChanges}>
      <ExtensionSlot name="form-widget-slot" state={state} />
    </Workspace2>
  );
};

export default FormEntryWorkspace;
