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
import { getObsDisplayByConcept } from '../hiv-care-and-treatment.resource';
import { useMentallHealthAsesments } from './general-counseling.resource';

type MentalHealthAssesmentProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const MentalHealthAssesment: FC<MentalHealthAssesmentProps> = ({ patient, patientUuid }) => {
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
  const { t } = useTranslation();
  const title = t('mentalHealthAssessment', 'Mental Health Assessment');
  const launchWorkspace2 = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');
  const {
    mentalHealthAssesments,
    totalCount,
    isLoading,
    error,
    mentalHealthAssesmentFormUuid,
    mutate,
    concepts: {
      screeningDateConceptUuid,
      disInterestInThingsConceptUuid,
      depresssedConceptUuid,
      poorAppetiteConceptUuid,
      concentrationProblemConceptUuid,
    },
  } = useMentallHealthAsesments(patientUuid);
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
          workspaceTitle: t('mentalHealthAssessmentForm', 'Mental Health Asessment Form'),
          form: { uuid: mentalHealthAssesmentFormUuid },
          encounterUuid: encounterUuid ?? '',
        },
        {},
        groupProps,
      );
    },
    [launchWorkspace2, t, mentalHealthAssesmentFormUuid, groupProps],
  );

  const headers = [
    { key: 'screeningDate', header: t('screeningDate', 'Screening Date') },
    { key: 'disinterestInThings', header: t('disinterestInThings', 'Disinterested in things') },
    { key: 'depressed', header: t('depressed', 'Depressed') },
    { key: 'poorAppetite', header: t('poorAppetite', 'Poor Appetite') },
    { key: 'concentrationProblems', header: t('concentrationProblems', 'Concentration problems') },
    { key: 'actions', header: t('actions', 'Actions') },
  ];
  const tableRows = useMemo(() => {
    return mentalHealthAssesments?.map((encounter) => {
      const observations = encounter.obs?.filter((obs) => !obs.voided) || [];
      const poorAppetiteObs = observations.find((obs) => obs.concept?.uuid === poorAppetiteConceptUuid) as Obs;
      const concentrationProblemsObs = observations.find(
        (obs) => obs.concept?.uuid === concentrationProblemConceptUuid,
      ) as Obs;

      return {
        id: encounter.uuid,
        screeningDate: getObsDisplayByConcept(encounter?.obs, screeningDateConceptUuid) ?? '--',
        disinterestInThings: getObsDisplayByConcept(encounter.obs, disInterestInThingsConceptUuid) ?? '--',
        depressed: getObsDisplayByConcept(encounter.obs, depresssedConceptUuid) ?? '--',
        poorAppetite: (poorAppetiteObs?.value as any)?.name?.name ?? '--',
        concentrationProblems: (concentrationProblemsObs?.value as any)?.name?.name ?? '--',
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
    mentalHealthAssesments,
    t,
    screeningDateConceptUuid,
    disInterestInThingsConceptUuid,
    depresssedConceptUuid,
    poorAppetiteConceptUuid,
    concentrationProblemConceptUuid,
    handleLaunchForm,
  ]);

  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (error) {
    return <ErrorState headerTitle={title} error={error} />;
  }

  if (mentalHealthAssesments?.length === 0) {
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

export default MentalHealthAssesment;
