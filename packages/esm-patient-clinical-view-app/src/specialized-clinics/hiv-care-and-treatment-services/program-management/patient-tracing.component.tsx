/**
 * implementation of the defaulter tracing component for DRC Implementation
 */

import {
  Button,
  DataTable,
  DataTableSkeleton,
  Layer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';
import { Add, Edit } from '@carbon/react/icons';
import { CardHeader, ErrorState, FHIRResource, Obs } from '@openmrs/esm-framework';
import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import React, { FC, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormSchema } from '../hiv-care-and-treatment.resource';
import { usePatientTracing } from './program-management.resource';
type PatientTracingProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const PatientTracing: FC<PatientTracingProps> = ({ patient, patientUuid }) => {
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
  const { t } = useTranslation();
  const title = t('patientTracing', 'Patient Tracing');
  const launchWorkspace2 = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');
  const {
    patientTracingEncounters,
    isLoading,
    error,
    patientTracingFormUuid,
    mutate,
    concepts: { contactDateConceptUuid, contactMethodConceptUuid, tracingOutcomeConceptUuid },
  } = usePatientTracing(patientUuid);
  const {
    error: formSchemaError,
    isLoading: formSchemaIsLoading,
    getAnswerLabel,
  } = useFormSchema(patientTracingFormUuid);
  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid,
      visitContext,
      mutateVisitContext: () => {
        mutateVisitContext();
        mutate();
      },
    }),
    [patient, patientUuid, visitContext, mutateVisitContext, mutate],
  );

  const handleLaunchForm = useCallback(
    (encounterUuid?: string) => {
      launchWorkspace2(
        {
          workspaceTitle: t('patientTracingForm', 'Patient Tracing Form'),
          form: { uuid: patientTracingFormUuid },
          encounterUuid: encounterUuid ?? '',
        },
        {},
        groupProps,
      );
    },
    [launchWorkspace2, t, patientTracingFormUuid, groupProps],
  );

  const headers = [
    { key: 'contactDate', header: t('contactDate', 'Contact Date') },
    { key: 'contactMethod', header: t('contactMethod', 'Contact Method') },
    { key: 'contactOutcome', header: t('contactOutcome', 'Contact Outcome') },
    { key: 'actions', header: t('actions', 'Actions') },
  ];
  const tableRows = useMemo(() => {
    return patientTracingEncounters?.map((encounter) => {
      const observations = encounter.obs?.filter((obs) => !obs.voided) || [];
      const contactDateObs = observations.find((obs) => obs.concept?.uuid === contactDateConceptUuid) as Obs;
      const contactMethodObs = observations.find((obs) => obs.concept?.uuid === contactMethodConceptUuid) as Obs;
      const tracingOutcomeObs = observations.find((obs) => obs.concept?.uuid === tracingOutcomeConceptUuid) as Obs;

      return {
        id: encounter.uuid,
        contactDate: contactDateObs?.value ?? '--',
        contactMethod: contactMethodObs?.value ?? '--',
        contactOutcome: tracingOutcomeObs?.value ?? '--',
        actions: (
          <Button
            hasIconOnly
            renderIcon={Edit}
            aria-label="overflow-menu"
            onClick={() => handleLaunchForm(encounter.uuid)}
            kind="ghost"
            iconDescription={t('edit', 'Edit')}
          />
        ),
      };
    });
  }, [
    patientTracingEncounters,
    t,
    contactDateConceptUuid,
    contactMethodConceptUuid,
    tracingOutcomeConceptUuid,
    handleLaunchForm,
  ]);

  if (isLoading || formSchemaIsLoading) {
    return <DataTableSkeleton />;
  }
  if (error || formSchemaError) {
    return <ErrorState headerTitle={title} error={error ?? formSchemaError} />;
  }

  if (patientTracingEncounters?.length === 0) {
    return <EmptyState headerTitle={title} displayText={title} launchForm={() => handleLaunchForm()} />;
  }
  return (
    <Layer>
      <CardHeader title={title}>
        <Button onClick={() => handleLaunchForm()} renderIcon={Add} kind="ghost">
          {t('add', 'Add')}
        </Button>
      </CardHeader>
      <DataTable useZebraStyles size="sm" rows={tableRows as any} headers={headers}>
        {({ rows, headers, getTableProps, getHeaderProps, getRowProps }) => (
          <Table {...getTableProps()}>
            <TableHead>
              <TableRow>
                {headers.map((header) => (
                  <TableHeader {...getHeaderProps({ header })}>{header.header}</TableHeader>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow {...getRowProps({ row })}>
                  {row.cells.map((cell) => (
                    <TableCell key={cell.id}>{cell.value}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
    </Layer>
  );
};

export default PatientTracing;
