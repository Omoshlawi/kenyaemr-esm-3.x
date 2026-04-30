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
import { CardHeader, ErrorState, FHIRResource, formatDate, parseDate } from '@openmrs/esm-framework';
import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import React, { FC, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getObsDisplayByConcept } from '../hiv-care-and-treatment.resource';
import { useClinicalVisit } from './program-management.resource';
type ClinicVisitsProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const ClinicalVisits: FC<ClinicVisitsProps> = ({ patient, patientUuid }) => {
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
  const { t } = useTranslation();
  const title = t('clinicalVisits', 'Clinical Visits');
  const launchWorkspace2 = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');
  const {
    clinicalVisitEncounters,
    isLoading,
    error,
    clinicalVisitFormUuid,
    mutate,
    concepts: { nextAppointmentDateConceptUuid, tbScreeningDoneConceptUuid, visitTypeConceptUuid },
  } = useClinicalVisit(patientUuid);
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
          workspaceTitle: t('clinicalVisitForm', 'Clinical Visit Form'),
          form: { uuid: clinicalVisitFormUuid },
          encounterUuid: encounterUuid ?? '',
        },
        {},
        groupProps,
      );
    },
    [launchWorkspace2, t, clinicalVisitFormUuid, groupProps],
  );

  const headers = [
    { key: 'encounterDate', header: t('encounterDate', 'EncounterDate') },
    { key: 'visitType', header: t('visitType', 'Visit Type') },
    { key: 'tbScreening', header: t('tbScreeningOutcome', 'TB Screening outcome') },
    { key: 'nextAppointmentDate', header: t('nextAppointmentDate', 'Next Appointment Date') },
    { key: 'actions', header: t('actions', 'Actions') },
  ];
  const tableRows = useMemo(() => {
    return clinicalVisitEncounters?.map((encounter) => {
      return {
        id: encounter.uuid,
        encounterDate: encounter.encounterDatetime ? formatDate(parseDate(encounter.encounterDatetime)) : '--',
        nextAppointmentDate: getObsDisplayByConcept(encounter?.obs, nextAppointmentDateConceptUuid) ?? '--',
        visitType: getObsDisplayByConcept(encounter?.obs, visitTypeConceptUuid) ?? '--',
        tbScreening: getObsDisplayByConcept(encounter?.obs, tbScreeningDoneConceptUuid) ?? '--',
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
    clinicalVisitEncounters,
    handleLaunchForm,
    nextAppointmentDateConceptUuid,
    t,
    tbScreeningDoneConceptUuid,
    visitTypeConceptUuid,
  ]);

  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (error) {
    return <ErrorState headerTitle={title} error={error} />;
  }

  if (clinicalVisitEncounters?.length === 0) {
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

export default ClinicalVisits;
