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
import { FHIRResource } from '@openmrs/esm-framework';
import {
  CardHeader,
  EmptyState,
  ErrorState,
  useLaunchWorkspaceRequiringVisit,
  usePatientChartStore,
} from '@openmrs/esm-patient-common-lib';
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getObsDisplayByConcept } from '../hiv-care-and-treatment.resource';
import { useTransferOut } from './program-management.resource';
type TransferOutProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const TransferOut: React.FC<TransferOutProps> = ({ patientUuid, patient }) => {
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
  const { t } = useTranslation();
  const title = t('transferOut', 'Transfer out');
  const launchWorkspace2 = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');
  const {
    transferOutEncounters,
    isLoading,
    error,
    transferOutFormUuid,
    mutate,
    concepts: { tranferOutVerifiedConceptUuid, transferOutDateConceptUuid, receivingFacilityConceptUuid },
  } = useTransferOut(patientUuid);
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
          workspaceTitle: t('transferOutForm', 'Transfer Out Form'),
          form: { uuid: transferOutFormUuid },
          encounterUuid: encounterUuid ?? '',
        },
        {},
        groupProps,
      );
    },
    [launchWorkspace2, t, transferOutFormUuid, groupProps],
  );
  const headers = [
    { key: 'receivingFacility', header: t('receivingFacility', 'Receiving Facility') },
    { key: 'transferDate', header: t('transferDate', 'Transfer Date') },
    { key: 'checked', header: t('checked', 'Checked') },
    { key: 'actions', header: t('actions', 'Actions') },
  ];
  const tableRows = useMemo(() => {
    return transferOutEncounters?.map((encounter) => {
      return {
        id: encounter.uuid,
        transferDate: getObsDisplayByConcept(encounter.obs, transferOutDateConceptUuid) ?? '--',
        receivingFacility: getObsDisplayByConcept(encounter.obs, receivingFacilityConceptUuid) ?? '--',
        checked: getObsDisplayByConcept(encounter.obs, tranferOutVerifiedConceptUuid) ?? '--',
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
    transferOutEncounters,
    t,
    transferOutDateConceptUuid,
    receivingFacilityConceptUuid,
    tranferOutVerifiedConceptUuid,
    handleLaunchForm,
  ]);

  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (error) {
    return <ErrorState headerTitle={title} error={error} />;
  }

  if (transferOutEncounters?.length === 0) {
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

export default TransferOut;
