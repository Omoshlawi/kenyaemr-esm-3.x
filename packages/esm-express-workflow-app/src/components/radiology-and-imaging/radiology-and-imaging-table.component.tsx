import React, { useMemo } from 'react';
import { useConfig } from '@openmrs/esm-framework';
import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import { Layer } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import OrderTable from '../../shared/orders/OrderTable';

import { type Order } from '../../types/order/order';
import { type ExpressWorkflowConfig } from '../../config-schema';
import styles from './radiology-and-imaging.scss';

type RadiologyAndImagingTableProps = {
  orders: Array<Order>;
  patientUuid: string;
  patient: fhir.Patient;
};
const RadiologyAndImagingTable: React.FC<RadiologyAndImagingTableProps> = ({ orders, patientUuid, patient }) => {
  const { t } = useTranslation();
  const { imagingOrderTypeUuid, imagingOrderableConceptSets } = useConfig<ExpressWorkflowConfig>();
  const { mutateVisitContext, visitContext } = usePatientChartStore(patientUuid);

  const windowProps = useMemo(() => ({ encounterUuid: orders[0]?.encounter?.uuid }), [orders[0]?.encounter?.uuid]);
  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid: patient?.id,
      visitContext: visitContext,
      mutateVisitContext: mutateVisitContext,
    }),
    [patient, visitContext, mutateVisitContext],
  );
  const launchAddLabOrder = useLaunchWorkspaceRequiringVisit(patientUuid, 'order-basket');

  if (orders?.length === 0) {
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
      orders={orders}
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
    />
  );
};

export default RadiologyAndImagingTable;
