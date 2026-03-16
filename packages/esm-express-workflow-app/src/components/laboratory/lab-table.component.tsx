import React, { useMemo } from 'react';
import { Order } from '../../types/order/order';
import { Layer } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@openmrs/esm-framework';
import styles from './laboratory-tabs.scss';
import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { ExpressWorkflowConfig } from '../../config-schema';
import OrderTable from '../../shared/orders/OrderTable';

type LabTableProps = {
  orders: Array<Order>;
  patientUuid: string;
  mutateOrders: () => void;
};

const LabTable: React.FC<LabTableProps> = ({ orders, patientUuid, mutateOrders }) => {
  const { t } = useTranslation();
  const { patient } = usePatientChartStore(patientUuid);
  const windowProps = useMemo(() => ({ encounterUuid: orders[0]?.encounter?.uuid }), [orders[0]?.encounter?.uuid]);
  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid: patient?.id,
      visitContext: orders[0]?.encounter?.visit,
      mutateVisitContext: mutateOrders,
    }),
    [patient, orders[0]?.encounter?.visit, mutateOrders],
  );
  const { labOrderTypeUuid, orderableConceptSets } = useConfig<ExpressWorkflowConfig>();
  const launchAddLabOrder = useLaunchWorkspaceRequiringVisit(patientUuid, 'order-basket');

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
      orders={orders}
      onAdd={() => launchAddLabOrder(null, { encounterUuid: '' }, groupProps)}
      containerClassName={styles.labTableContainer}
      tableCellClassName={styles.tableCell}
      priorityPillClassName={styles.priorityPill}
      statusPillClassName={styles.statusPill}
    />
  );
};

export default LabTable;
