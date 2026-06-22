import React, { useMemo } from 'react';
import { DataTableSkeleton, Layer } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { ErrorState, useConfig } from '@openmrs/esm-framework';
import styles from './laboratory-tabs.scss';
import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { ExpressWorkflowConfig } from '../../config-schema';
import OrderTable from '../../shared/orders/OrderTable';
import { getPatientPrintFields } from '../../shared/utils';
import { usePatientOrders } from '../../hooks/useOrders';

type LabTableProps = {
  patientUuid: string;
};

const LabTable: React.FC<LabTableProps> = ({ patientUuid }) => {
  const { labOrderTypeUuid, orderableConceptSets } = useConfig<ExpressWorkflowConfig>();
  const {
    data: orders,
    isLoading,
    error,
    mutate: mutateOrders,
  } = usePatientOrders(patientUuid, 'any', labOrderTypeUuid, undefined, undefined);

  const { t } = useTranslation();
  const { patient } = usePatientChartStore(patientUuid);
  const windowProps = useMemo(() => ({ encounterUuid: orders?.[0]?.encounter?.uuid }), [orders]);
  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid: patient?.id,
      visitContext: orders?.[0]?.encounter?.visit,
      mutateVisitContext: mutateOrders,
    }),
    [patient, orders, mutateOrders],
  );
  const launchAddLabOrder = useLaunchWorkspaceRequiringVisit(patientUuid, 'order-basket');
  const { patientName, patientId, patientAge } = getPatientPrintFields(patient);

  if (isLoading) {
    return <DataTableSkeleton />;
  }

  if (error) {
    return <ErrorState headerTitle={t('laboratoryOrders', 'Laboratory Orders')} error={error} />;
  }

  if (orders?.length === 0) {
    return (
      <Layer>
        <EmptyState
          displayText={t('orders', 'Orders')}
          headerTitle={t('laboratoryOrders', 'Laboratory Orders')}
          launchForm={() =>
            launchAddLabOrder({ orderTypeUuid: labOrderTypeUuid, orderableConceptSets }, windowProps, groupProps)
          }
        />
      </Layer>
    );
  }

  return (
    <OrderTable
      title={t('laboratoryOrders', 'Laboratory Orders')}
      orders={orders ?? []}
      onAdd={() => launchAddLabOrder(undefined, { encounterUuid: '' }, groupProps)}
      containerClassName={styles.labTableContainer}
      tableCellClassName={styles.tableCell}
      priorityPillClassName={styles.priorityPill}
      statusPillClassName={styles.statusPill}
      module="@openmrs/esm-laboratory-app"
      orderType="lab"
      patientName={patientName}
      patientId={patientId}
      patientAge={patientAge}
    />
  );
};

export default LabTable;
