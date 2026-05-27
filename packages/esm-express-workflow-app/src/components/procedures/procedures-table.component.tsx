import { DataTableSkeleton, Layer } from '@carbon/react';
import { ErrorState, FHIRResource, useConfig } from '@openmrs/esm-framework';
import {
  EmptyState,
  invalidateVisitAndEncounterData,
  invalidateVisitByUuid,
  useLaunchWorkspaceRequiringVisit,
  usePatientChartStore,
} from '@openmrs/esm-patient-common-lib';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import OrderTable from '../../shared/orders/OrderTable';

import { useSWRConfig } from 'swr';
import { type ExpressWorkflowConfig } from '../../config-schema';
import { usePatientOrders } from '../../hooks/useOrders';
import styles from './procedures.scss';

type ProceduresTableProps = {
  patientUuid: string;
  patient?: FHIRResource;
};
const ProceduresTable: React.FC<ProceduresTableProps> = ({ patientUuid, patient }) => {
  const { t } = useTranslation();
  const { imagingOrderTypeUuid, imagingOrderableConceptSets } = useConfig<ExpressWorkflowConfig>();
  const {
    data: orders,
    isLoading,
    error,
    mutate: mutateOrders,
  } = usePatientOrders(patientUuid, 'any', imagingOrderTypeUuid, undefined, undefined);

  const { visitContext } = usePatientChartStore(patientUuid);
  const { mutate: globalMutate } = useSWRConfig();
  const windowProps = useMemo(() => ({ encounterUuid: orders?.[0]?.encounter?.uuid }), [orders]);
  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid,
      visitContext: visitContext,
      mutateVisitContext: () => {
        mutateOrders();
        invalidateVisitByUuid(globalMutate, visitContext.uuid);
        invalidateVisitAndEncounterData(globalMutate, patientUuid);
      },
    }),
    [patient, patientUuid, visitContext, mutateOrders, globalMutate],
  );
  const launchOrderBasket = useLaunchWorkspaceRequiringVisit(patientUuid ?? '', 'order-basket');

  if (isLoading) {
    return <DataTableSkeleton />;
  }
  if (error) {
    return <ErrorState headerTitle={t('proceduresOrders', 'Procedures Orders')} error={error} />;
  }
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
      orders={orders ?? []}
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
