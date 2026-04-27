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
import { ErrorState, FHIRResource, formatDate, Obs, parseDate } from '@openmrs/esm-framework';
import {
  CardHeader,
  EmptyState,
  useLaunchWorkspaceRequiringVisit,
  usePatientChartStore,
} from '@openmrs/esm-patient-common-lib';
import React, { FC, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useArtTherapy } from './program-management.resource';
import { useFormSchema } from '../hiv-care-and-treatment.resource';
type ARTTherappyProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const ARTTherappy: FC<ARTTherappyProps> = ({ patientUuid, patient }) => {
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
  const { t } = useTranslation();
  const title = t('artTherapy', 'ART Therapy');
  const launchWorkspace2 = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');
  const {
    artTherapyEncounters,
    isLoading,
    error,
    artTherapyFormUuid,
    mutate,
    concepts: { therapyPlanConceptUuid, regimenLineConceptUuid, regimentConceptUuid },
  } = useArtTherapy(patientUuid);
  const { error: formSchemaError, isLoading: formSchemaIsLoading, getAnswerLabel } = useFormSchema(artTherapyFormUuid);
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
          workspaceTitle: t('artTherapyForm', 'ART Therapy Form'),
          form: { uuid: artTherapyFormUuid },
          encounterUuid: encounterUuid ?? '',
        },
        {},
        groupProps,
      );
    },
    [launchWorkspace2, t, artTherapyFormUuid, groupProps],
  );

  const headers = [
    { key: 'date', header: t('date', 'Date') },
    { key: 'therapyPlan', header: t('therapyPlan', 'Therapy Plan') },
    { key: 'regimenLine', header: t('regimenLine', 'Regimen Line') },
    { key: 'regimenLine', header: t('regimen', 'Regimen') },
    { key: 'actions', header: t('actions', 'Actions') },
  ];
  const tableRows = useMemo(() => {
    return artTherapyEncounters?.map((encounter) => {
      const observations = encounter.obs?.filter((obs) => !obs.voided) || [];
      const therapyPlanObs = observations.find((obs) => obs.concept?.uuid === therapyPlanConceptUuid) as Obs;
      const regimenLineObs = observations.find((obs) => obs.concept?.uuid === regimenLineConceptUuid) as Obs;
      const regimentObs = observations.find((obs) => obs.concept?.uuid === regimentConceptUuid) as Obs;

      return {
        id: encounter.uuid,
        therapyPlan: getAnswerLabel(therapyPlanConceptUuid, (therapyPlanObs?.value as any)?.uuid as string) ?? '--',
        regimenLine: (regimenLineObs?.value as any)?.name?.name ?? '--',
        regimen: getAnswerLabel(regimentConceptUuid, (regimentObs?.value as any)?.uuid as string) ?? '--',
        date: encounter.encounterDatetime ? formatDate(parseDate(encounter.encounterDatetime)) : '--',
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
    artTherapyEncounters,
    getAnswerLabel,
    handleLaunchForm,
    regimenLineConceptUuid,
    regimentConceptUuid,
    t,
    therapyPlanConceptUuid,
  ]);

  if (isLoading || formSchemaIsLoading) {
    return <DataTableSkeleton />;
  }
  if (error || formSchemaError) {
    return <ErrorState headerTitle={title} error={error ?? formSchemaError} />;
  }

  if (artTherapyEncounters?.length === 0) {
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

export default ARTTherappy;
