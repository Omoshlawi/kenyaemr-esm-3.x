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
import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getObsDisplayByConcept } from '../hiv-care-and-treatment.resource';
import { useServiceDelivertModel } from './program-management.resource';

type ServiceDeliveryModelProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const ServiceDeliveryModel: React.FC<ServiceDeliveryModelProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);
  const launchWorkspace2 = useLaunchWorkspaceRequiringVisit(patientUuid, 'patient-form-entry-workspace');
  const {
    isLoading,
    error,
    mutate,
    serviceDeliveryEncounters,
    serviceDeliveryModelFormUuid,
    concepts: { differenciatedServiceDeliveryModelConceptUuid },
  } = useServiceDelivertModel(patientUuid);
  const title = t('serviceDeliveryModel', 'Service delivery model');
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
          workspaceTitle: t('serviceDeliveryModel', 'Service delivery model Form'),
          form: { uuid: serviceDeliveryModelFormUuid },
          encounterUuid: encounterUuid ?? '',
        },
        {},
        groupProps,
      );
    },
    [launchWorkspace2, t, serviceDeliveryModelFormUuid, groupProps],
  );

  const headers = [
    { key: 'date', header: t('date', 'Date') },
    { key: 'dsdModel', header: t('dsdModel', 'DSD Model') },
    { key: 'actions', header: t('actions', 'Actions') },
  ];
  const tableRows = useMemo(() => {
    return serviceDeliveryEncounters?.map((encounter) => {
      return {
        id: encounter.uuid,
        dsdModel: getObsDisplayByConcept(encounter.obs, differenciatedServiceDeliveryModelConceptUuid) ?? '--',
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
  }, [serviceDeliveryEncounters, differenciatedServiceDeliveryModelConceptUuid, t, handleLaunchForm]);

  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (error) {
    return <ErrorState headerTitle={title} error={error} />;
  }

  if (serviceDeliveryEncounters?.length === 0) {
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

export default ServiceDeliveryModel;
