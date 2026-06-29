import { ErrorState, FHIRResource, useConfig } from '@openmrs/esm-framework';
import { EmptyState, useLaunchWorkspaceRequiringVisit, usePatientChartStore } from '@openmrs/esm-patient-common-lib';
import React, { FC, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ExpressWorkflowConfig } from '../../config-schema';
import { usePatientOrders } from '../../hooks/useOrders';
import OrderTable from '../../shared/orders/OrderTable';
import { DataTableSkeleton, Layer } from '@carbon/react';
import styles from '../laboratory/laboratory-tabs.scss';
import { getPatientPrintFields } from '../../shared/utils';

type HtsTestingPannelProps = {
  patientUuid: string;
  patient: FHIRResource;
};
const HtsTestingPannel: FC<HtsTestingPannelProps> = ({ patientUuid }) => {
  const { t } = useTranslation();
  const { labOrderTypeUuid, orderableConceptSets, hivRapidTestConceptUuid } = useConfig<ExpressWorkflowConfig>();
  const {
    data: _orders,
    isLoading,
    error,
    mutate: mutateOrders,
  } = usePatientOrders(patientUuid, 'any', labOrderTypeUuid, undefined, undefined, hivRapidTestConceptUuid);
  const orders = useMemo(
    () => _orders?.filter((order) => order.concept.uuid === hivRapidTestConceptUuid) ?? [],
    [_orders, hivRapidTestConceptUuid],
  );
  const { mutateVisitContext, visitContext, patient } = usePatientChartStore(patientUuid);
  const windowProps = useMemo(() => ({ encounterUuid: orders?.[0]?.encounter?.uuid }), [orders]);

  const groupProps = useMemo(
    () => ({
      patient,
      patientUuid: patientUuid,
      visitContext,
      mutateVisitContext: () => {
        mutateVisitContext();
        mutateOrders();
      },
    }),
    [patient, patientUuid, visitContext, mutateVisitContext, mutateOrders],
  );
  const launchAddLabOrder = useLaunchWorkspaceRequiringVisit(patientUuid, 'order-basket');
  const { patientName, patientId, patientAge } = useMemo(() => getPatientPrintFields(patient), [patient]);

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

export default HtsTestingPannel;
