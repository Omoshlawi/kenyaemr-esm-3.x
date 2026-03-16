import React from 'react';
import { CardHeader, EmptyState } from '@openmrs/esm-patient-common-lib';
import { useTranslation } from 'react-i18next';
import capitalize from 'lodash/capitalize';
import { ErrorState, launchWorkspace2, showModal, showSnackbar } from '@openmrs/esm-framework';
import { genericTableHeader, useEncounters } from './useEncounters';
import { DataTableSkeleton, Button } from '@carbon/react';
import GenericTable from './generic-table.component';
import { deleteEncounter } from '../../case-management/encounters/case-encounter-table.resource';

type GenericDashboardProps = {
  patientUuid: string;
  patient: fhir.Patient;
  clinicConfig: {
    formUuid: string;
    encounterTypeUuid: string;
    title: string;
  };
};

const GenericDashboard: React.FC<GenericDashboardProps> = ({ patientUuid, clinicConfig, patient }) => {
  const { t } = useTranslation();
  const { encounters, isLoading, error, mutate } = useEncounters(
    clinicConfig.encounterTypeUuid,
    clinicConfig.formUuid,
    patientUuid,
  );

  const clinicalFormTitle = capitalize(clinicConfig.title.replace('-', ' '));

  const handleWorkspaceForm = () => {
    launchWorkspace2(
      'patient-form-entry-workspace',
      {
        workspaceTitle: clinicalFormTitle.replace('clinic', 'form'),
        form: { uuid: clinicConfig.formUuid },
        encounterUuid: '',
        mutateForm: mutate,
      },
      { mutateVisitContext: () => mutate?.() },
    );
  };
  const handleWorkspaceEditForm = (encounterUuid: string = '') => {
    launchWorkspace2(
      'patient-form-entry-workspace',
      {
        form: { uuid: clinicConfig.formUuid },
        encounterUuid,
        workspaceTitle: clinicalFormTitle.replace('clinic', 'form'),
        mutateForm: mutate,
      },
      { mutateVisitContext: () => mutate?.() },
    );
  };

  const handleDeleteEncounter = React.useCallback(
    (encounterUuid: string, encounterTypeName?: string) => {
      const close = showModal('delete-encounter-modal', {
        close: () => close(),
        encounterTypeName: encounterTypeName || '',
        onConfirmation: () => {
          const abortController = new AbortController();
          deleteEncounter(encounterUuid, abortController)
            .then(() => {
              mutate?.();
              showSnackbar({
                isLowContrast: true,
                title: t('encounterDeleted', 'Encounter deleted'),
                subtitle: `Encounter ${t('successfullyDeleted', 'successfully deleted')}`,
                kind: 'success',
              });
            })
            .catch(() => {
              showSnackbar({
                isLowContrast: false,
                title: t('error', 'Error'),
                subtitle: `Encounter ${t('failedDeleting', "couldn't be deleted")}`,
                kind: 'error',
              });
            });
          close();
        },
      });
    },
    [t, mutate],
  );

  if (isLoading) {
    return <DataTableSkeleton headers={genericTableHeader} aria-label="sample table" />;
  }

  if (error) {
    return <ErrorState headerTitle={clinicalFormTitle} error={error} />;
  }

  if (encounters.length === 0) {
    return (
      <EmptyState headerTitle={clinicalFormTitle} displayText={clinicalFormTitle} launchForm={handleWorkspaceForm} />
    );
  }

  return (
    <div>
      <CardHeader title={clinicalFormTitle}>
        <Button onClick={handleWorkspaceForm} kind="ghost">
          {t('add', 'Add')}
        </Button>
      </CardHeader>
      <GenericTable
        encounters={encounters}
        onEdit={handleWorkspaceEditForm}
        onDelete={handleDeleteEncounter}
        headers={genericTableHeader}
      />
    </div>
  );
};

export default GenericDashboard;
