import React, { useMemo } from 'react';
import { useConfig } from '@openmrs/esm-framework';
import {
  EmptyState,
  invalidateVisitAndEncounterData,
  invalidateVisitByUuid,
  useLaunchWorkspaceRequiringVisit,
  usePatientChartStore,
} from '@openmrs/esm-patient-common-lib';
import { Layer } from '@carbon/react';
import { useTranslation } from 'react-i18next';

import OrderTable from '../../shared/orders/OrderTable';

import { type Order } from '../../types/order/order';
import { type ExpressWorkflowConfig } from '../../config-schema';
import styles from './procedures.scss';
import { useSWRConfig } from 'swr';

type ProceduresTableProps = {
  orders: Order[];
  patientUuid: string;
  patient: fhir.Patient;
};
const ProceduresTable: React.FC<ProceduresTableProps> = ({ orders, patientUuid, patient }) => {
  const { t } = useTranslation();
  const { imagingOrderTypeUuid, imagingOrderableConceptSets } = useConfig<ExpressWorkflowConfig>();
  const { visitContext } = usePatientChartStore(patientUuid);
  const { mutate: globalMutate } = useSWRConfig();
  const windowProps = useMemo(() => ({ encounterUuid: orders[0]?.encounter?.uuid }), [orders[0]?.encounter?.uuid]);
  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid: patient?.id,
      visitContext: visitContext,
      mutateVisitContext: () => {
        invalidateVisitByUuid(globalMutate, visitContext.uuid);
        invalidateVisitAndEncounterData(globalMutate, patient.id);
      },
    }),
    [globalMutate, visitContext, patient.id],
  );
  const launchOrderBasket = useLaunchWorkspaceRequiringVisit(patientUuid ?? '', 'order-basket');

  if (orders?.length === 0) {
    return (
      <Layer>
        <EmptyState
          displayText={t('orders', 'Orders')}
          headerTitle={t('proceduresOrders', 'Procedures Orders')}
          launchForm={() =>
            launchOrderBasket(
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
      title={t('proceduresOrders', 'Procedures Orders')}
      orders={orders}
      onAdd={() =>
        launchOrderBasket(
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
      module="@kenyaemr/esm-procedure-orders-app"
    />
  );
};

export default ProceduresTable;
