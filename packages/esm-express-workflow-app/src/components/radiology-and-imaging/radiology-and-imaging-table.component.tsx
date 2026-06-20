import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTableSkeleton, Layer } from '@carbon/react';
import { ErrorState, FHIRResource, useConfig } from '@openmrs/esm-framework';
import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import OrderTable from '../../shared/orders/OrderTable';
import { type ExpressWorkflowConfig } from '../../config-schema';
import { usePatientOrders } from '../../hooks/useOrders';
import styles from './radiology-and-imaging.scss';
import { getPatientPrintFields } from '../../shared/utils';

type RadiologyAndImagingTableProps = {
  patientUuid: string;
  patient: fhir.Patient;
};

const RadiologyAndImagingTable: React.FC<RadiologyAndImagingTableProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const { imagingOrderTypeUuid, imagingOrderableConceptSets, imagingConceptClassUuid } =
    useConfig<ExpressWorkflowConfig>();
  const {
    data: orders,
    isLoading,
    error,
    mutate: mutateOrders,
  } = usePatientOrders(patientUuid, 'any', imagingOrderTypeUuid, undefined, undefined);

  const filteredOrders = useMemo(
    () => orders?.filter((order) => order.concept?.conceptClass?.uuid === imagingConceptClassUuid),
    [imagingConceptClassUuid, orders],
  );

  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);

  const windowProps = useMemo(() => ({ encounterUuid: filteredOrders?.[0]?.encounter?.uuid }), [filteredOrders]);
  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid,
      visitContext: visitContext,
      mutateVisitContext: () => {
        mutateOrders();
        mutateVisitContext();
      },
    }),
    [patient, patientUuid, visitContext, mutateOrders, mutateVisitContext],
  );

  const launchAddLabOrder = useLaunchWorkspaceRequiringVisit(patientUuid, 'order-basket');

  const { patientName, patientId, patientAge } = getPatientPrintFields(patient);

  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (error) {
    return <ErrorState headerTitle={t('radiologyAndImagingOrders', 'Radiology & Imaging Orders')} error={error} />;
  }

  if (filteredOrders?.length === 0) {
    return (
      <Layer>
        <EmptyState
          displayText={t('orders', 'Orders')}
          headerTitle={t('radiologyAndImagingOrders', 'Radiology and Imaging Orders')}
          launchForm={() =>
            launchAddLabOrder(
              {
                orderTypeUuid: imagingOrderTypeUuid,
                orderableConceptSets: imagingOrderableConceptSets,
              },
              windowProps,
              groupProps,
            )
          }
        />
      </Layer>
    );
  }

  return (
    <OrderTable
      title={t('radiologyAndImagingOrders', 'Radiology & Imaging Orders')}
      orders={filteredOrders ?? []}
      onAdd={() =>
        launchAddLabOrder(
          {
            orderTypeUuid: imagingOrderTypeUuid,
            orderableConceptSets: imagingOrderableConceptSets,
          },
          windowProps,
          groupProps,
        )
      }
      containerClassName={styles.labTableContainer}
      tableCellClassName={styles.tableCell}
      priorityPillClassName={styles.priorityPill}
      statusPillClassName={styles.statusPill}
      module="@kenyaemr/esm-imaging-orders-app"
      orderType="radiology"
      patientName={patientName}
      patientId={patientId}
      patientAge={patientAge}
    />
  );
};

export default RadiologyAndImagingTable;
