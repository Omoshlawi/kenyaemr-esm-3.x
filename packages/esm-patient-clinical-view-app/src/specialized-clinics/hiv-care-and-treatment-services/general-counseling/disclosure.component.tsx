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
import { useClosure } from './general-counseling.resource';

type DisclosureProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const Disclosure: FC<DisclosureProps> = ({ patient, patientUuid }) => {
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
  const { t } = useTranslation();
  const title = t('disclosure', 'Disclosure');
  const launchWorkspace2 = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');
  const {
    closureEncounters,
    isLoading,
    error,
    closureFormUuid,
    mutate,
    concepts: { disclosureStageConceptUuid, disclosureDateConceptUuid },
  } = useClosure(patientUuid);
  const { error: formSchemaError, isLoading: formSchemaIsLoading, getAnswerLabel } = useFormSchema(closureFormUuid);
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
          workspaceTitle: t('disclosureForm', 'Disclosure Form'),
          form: { uuid: closureFormUuid },
          encounterUuid: encounterUuid ?? '',
        },
        {},
        groupProps,
      );
    },
    [launchWorkspace2, t, closureFormUuid, groupProps],
  );

  const headers = [
    { key: 'disclosureDate', header: t('diclosureDate', 'Disclosure Date') },
    { key: 'disclosureState', header: t('disclosureStage', 'Disclosure Stage') },
    { key: 'actions', header: t('actions', 'Actions') },
  ];
  const tableRows = useMemo(() => {
    return closureEncounters?.map((encounter) => {
      const observations = encounter.obs?.filter((obs) => !obs.voided) || [];
      const disclosureDateObs = observations.find((obs) => obs.concept?.uuid === disclosureDateConceptUuid) as Obs;
      const disclosureStageObs = observations.find((obs) => obs.concept?.uuid === disclosureStageConceptUuid) as Obs;

      return {
        id: encounter.uuid,
        disclosureDate: (disclosureDateObs?.value as any)?.name?.name ?? '--',
        disclosureState: (disclosureStageObs?.value as any)?.name?.name ?? '--',
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
  }, [closureEncounters, t, disclosureDateConceptUuid, disclosureStageConceptUuid, handleLaunchForm]);

  if (isLoading || formSchemaIsLoading) {
    return <DataTableSkeleton />;
  }
  if (error || formSchemaError) {
    return <ErrorState headerTitle={title} error={error ?? formSchemaError} />;
  }

  if (closureEncounters?.length === 0) {
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

export default Disclosure;
