import React, { useMemo } from 'react';
import styles from './summary-cards.scss';
import { useTranslation } from 'react-i18next';
import { useQueueEntries } from '../../../hooks/useServiceQueues';
import { Order } from '@openmrs/esm-framework';
import { SkeletonText } from '@carbon/react';

type ProcedureSummaryCardsProps = {
  activeQueue: string;
  activeOrders?: Array<Order>;
  inProgressOrders?: Array<Order>;
  completedOrders?: Array<Order>;
};
const ProcedureSummaryCards: React.FC<ProcedureSummaryCardsProps> = ({
  activeQueue,
  activeOrders = [],
  inProgressOrders = [],
  completedOrders = [],
}) => {
  const { queueEntries, isLoading, error } = useQueueEntries({ queues: [activeQueue] });
  function groupOrdersById(orders: Array<Order>) {
    if (orders && orders.length > 0) {
      const groupedOrders = orders.reduce((acc, item) => {
        if (!acc[item.patient.uuid]) {
          acc[item.patient.uuid] = [];
        }
        acc[item.patient.uuid].push(item);
        return acc;
      }, {});

      // Convert the result to an array of objects with patientId and orders
      return Object.keys(groupedOrders).map((patientId) => ({
        patientId: patientId,
        orders: groupedOrders[patientId],
      }));
    } else {
      return [];
    }
  }
  const activeOrdersCount = useMemo(
    () =>
      groupOrdersById(activeOrders).filter((patient) =>
        queueEntries.some((entry) => entry.patient.uuid === patient.patientId),
      ).length,
    [activeOrders, queueEntries],
  );
  const inProgressOrdersCount = useMemo(
    () =>
      groupOrdersById(inProgressOrders).filter((patient) =>
        queueEntries.some((entry) => entry.patient.uuid === patient.patientId),
      ).length,
    [inProgressOrders, queueEntries],
  );
  const completedOrdersCount = useMemo(
    () =>
      groupOrdersById(completedOrders).filter((patient) =>
        queueEntries.some((entry) => entry.patient.uuid === patient.patientId),
      ).length,
    [completedOrders, queueEntries],
  );

  const { t } = useTranslation();
  return (
    <div className={styles.tileContainer}>
      <div className={styles.tile}>
        <strong>{t('awaitingProcedure', 'Awaiting Procedure')}</strong>
        {isLoading ? <SkeletonText /> : <span>{activeOrdersCount}</span>}
      </div>
      <div className={styles.tile}>
        <strong>{t('ongoingProcedures', 'Ongoing Procedures')}</strong>
        {isLoading ? <SkeletonText /> : <span>{inProgressOrdersCount}</span>}
      </div>
      <div className={styles.tile}>
        <strong>{t('completedProcedures', 'Completed Procedures')}</strong>
        {isLoading ? <SkeletonText /> : <span>{completedOrdersCount}</span>}
      </div>
    </div>
  );
};

export default ProcedureSummaryCards;
